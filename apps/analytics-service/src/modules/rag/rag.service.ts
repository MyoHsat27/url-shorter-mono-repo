import { Inject, Injectable, Logger } from "@nestjs/common";
import { OllamaService } from "src/infrastructure";
import {
  FactsRepository,
  StoredFact,
} from "../fact-generation/facts.repository";
import Redis from "ioredis";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  context: {
    focusedLinks?: string[];
    lastQueryEmbedding?: number[];
  };
}

const SESSION_TTL = 3600; // 1 hour

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private redis: Redis | null = null;

  constructor(
    private readonly ollamaService: OllamaService,
    private readonly factsRepository: FactsRepository,
    @Inject("REDIS_CLIENT")
    redisClient: Redis | null,
  ) {
    this.redis = redisClient;
  }

  async chat(
    sessionId: string,
    userMessage: string,
  ): Promise<{ response: string; facts: StoredFact[] }> {
    const session = await this.getSession(sessionId);
    session.messages.push({
      role: "user",
      content: userMessage,
      timestamp: Date.now(),
    });

    const relevantFacts = await this.retrieveFacts(userMessage);

    const factsContext = this.buildFactsContext(relevantFacts);
    const historyContext = session.messages
      .slice(-6)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    const prompt = this.buildPrompt(userMessage, factsContext, historyContext);

    let response: string;
    try {
      response = await this.ollamaService.generate(prompt);
    } catch (error) {
      this.logger.error("LLM generation failed, using fallback", error);
      response = this.generateFallbackResponse(relevantFacts);
    }

    session.messages.push({
      role: "assistant",
      content: response,
      timestamp: Date.now(),
    });
    await this.saveSession(session);

    return { response, facts: relevantFacts };
  }

  async *chatStream(
    sessionId: string,
    userMessage: string,
  ): AsyncGenerator<{ type: "chunk" | "facts"; data: string | StoredFact[] }> {
    const session = await this.getSession(sessionId);
    session.messages.push({
      role: "user",
      content: userMessage,
      timestamp: Date.now(),
    });

    const relevantFacts = await this.retrieveFacts(userMessage);

    yield { type: "facts", data: relevantFacts };

    const factsContext = this.buildFactsContext(relevantFacts);
    const historyContext = session.messages
      .slice(-6)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    const prompt = this.buildPrompt(userMessage, factsContext, historyContext);

    let fullResponse = "";
    try {
      for await (const chunk of this.ollamaService.generateStream(prompt)) {
        fullResponse += chunk;
        yield { type: "chunk", data: chunk };
      }
    } catch (error) {
      this.logger.error("LLM streaming failed, using fallback", error);
      const fallback = this.generateFallbackResponse(relevantFacts);
      fullResponse = fallback;
      yield { type: "chunk", data: fallback };
    }

    session.messages.push({
      role: "assistant",
      content: fullResponse,
      timestamp: Date.now(),
    });
    await this.saveSession(session);
  }

  private async retrieveFacts(userMessage: string): Promise<StoredFact[]> {
    let relevantFacts: StoredFact[] = [];

    try {
      const queryEmbedding = await this.ollamaService.getEmbedding(userMessage);
      relevantFacts = await this.factsRepository.searchSimilar(
        queryEmbedding,
        5,
      );
    } catch {
      this.logger.warn("Could not get embeddings, using recent facts");
    }

    // Always supplement with recent facts to ensure freshness
    const recentFacts = await this.factsRepository.getRecentFacts(10);

    // keep embedding-matched facts first, then add recent facts not already included
    const seenIds = new Set(relevantFacts.map((f) => f.id));
    for (const fact of recentFacts) {
      if (!seenIds.has(fact.id)) {
        relevantFacts.push(fact);
        seenIds.add(fact.id);
      }
      if (relevantFacts.length >= 10) break;
    }

    // If we still have no embedding-matched facts, use only recent
    if (relevantFacts.length === 0) {
      relevantFacts = recentFacts.slice(0, 10);
    }

    return relevantFacts;
  }

  private buildFactsContext(facts: StoredFact[]): string {
    if (facts.length === 0) return "";

    // Group facts by type for better context
    const grouped: Record<string, StoredFact[]> = {};
    for (const fact of facts) {
      const type = fact.factType;
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(fact);
    }

    const sections: string[] = [];
    const typeLabels: Record<string, string> = {
      trending: "Trending Links",
      traffic_pattern: "Traffic Patterns",
      location: "Geographic Data",
      summary: "Summary",
    };

    for (const [type, typeFacts] of Object.entries(grouped)) {
      const label = typeLabels[type] || type;
      sections.push(
        `### ${label}\n${typeFacts.map((f) => `- ${f.factText}`).join("\n")}`,
      );
    }

    return sections.join("\n\n");
  }

  private buildPrompt(
    userMessage: string,
    factsContext: string,
    historyContext: string,
  ): string {
    return `You are an analytics assistant for a URL shortener service. You help users understand their link performance, traffic patterns, geographic distribution, and trends.

## Available Analytics Data:
${factsContext || "No recent analytics data available."}

## Conversation History:
${historyContext || "This is the start of the conversation."}

## Current Question:
${userMessage}

## Instructions:
- Answer based ONLY on the analytics data provided above. Do not make up data.
- When mentioning links, always include both the short code and the actual URL if available.
- Be specific with numbers, percentages, and time periods when available.
- If the data doesn't contain information to answer the question, say so clearly and suggest what data might help.
- Keep responses concise but informative. Use bullet points for multiple insights.
- When discussing trends, reference the time period the data covers.
- If asked about "popular" or "trending" links, use the trending data.
- If asked about "traffic" or "when", use the traffic pattern data.
- If asked about "where" or "countries", use the geographic data.

Response:`;
  }

  private generateFallbackResponse(facts: StoredFact[]): string {
    if (facts.length === 0) {
      return "I don't have any recent analytics data to answer your question.";
    }

    const grouped: Record<string, string[]> = {};
    for (const f of facts) {
      const type = f.factType;
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(f.factText);
    }

    let response = "Here's what I know from recent analytics:\n\n";
    for (const [type, texts] of Object.entries(grouped)) {
      response += `**${type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")}:**\n`;
      response += texts.map((t) => `- ${t}`).join("\n") + "\n\n";
    }

    return response.trim();
  }

  private async getSession(sessionId: string): Promise<ChatSession> {
    if (this.redis) {
      try {
        const data = await this.redis.get(`chat:session:${sessionId}`);
        if (data) {
          return JSON.parse(data) as ChatSession;
        }
      } catch {
        this.logger.error("Failed to get session from Redis");
      }
    }

    return {
      sessionId,
      messages: [],
      context: {},
    };
  }

  private async saveSession(session: ChatSession): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.setex(
          `chat:session:${session.sessionId}`,
          SESSION_TTL,
          JSON.stringify(session),
        );
      } catch {
        this.logger.error("Failed to save session to Redis");
      }
    }
  }

  async clearSession(sessionId: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(`chat:session:${sessionId}`);
    }
  }
}
