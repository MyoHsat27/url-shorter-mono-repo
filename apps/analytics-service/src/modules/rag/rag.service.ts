/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
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

    let relevantFacts: StoredFact[] = [];
    try {
      const queryEmbedding = await this.ollamaService.getEmbedding(userMessage);
      relevantFacts = await this.factsRepository.searchSimilar(
        queryEmbedding,
        5,
      );
    } catch (error) {
      this.logger.warn("Could not get embeddings, using recent facts");
      relevantFacts = await this.factsRepository.getRecentFacts(5);
    }

    const factsContext = relevantFacts.map((f) => `- ${f.factText}`).join("\n");

    const historyContext = session.messages
      .slice(-6)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    const prompt = this.buildPrompt(userMessage, factsContext, historyContext);

    let response: string;
    try {
      response = await this.ollamaService.generate(prompt);
    } catch (error) {
      this.logger.error("LLM generation failed, using fallback");
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

  private buildPrompt(
    userMessage: string,
    factsContext: string,
    historyContext: string,
  ): string {
    return `You are an analytics assistant for a URL shortener service. Answer questions about link performance, traffic patterns, and trends based on the provided data.

## Available Analytics Data:
${factsContext || "No recent analytics data available."}

## Conversation History:
${historyContext || "This is the start of the conversation."}

## Current Question:
${userMessage}

## Instructions:
- Answer based on the analytics data provided
- Be specific with numbers when available
- If data is not available, say so clearly
- Keep responses concise but informative
- Use bullet points for multiple insights

Response:`;
  }

  private generateFallbackResponse(facts: StoredFact[]): string {
    if (facts.length === 0) {
      return "I don't have any recent analytics data to answer your question. Please try generating facts first or wait for more data to be collected.";
    }

    return `Based on recent data:\n${facts.map((f) => `• ${f.factText}`).join("\n")}`;
  }

  private async getSession(sessionId: string): Promise<ChatSession> {
    if (this.redis) {
      try {
        const data = await this.redis.get(`chat:session:${sessionId}`);
        if (data) {
          return JSON.parse(data);
        }
      } catch (error) {
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
      } catch (error) {
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
