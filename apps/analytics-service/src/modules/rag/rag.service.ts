import { Inject, Injectable, Logger } from "@nestjs/common";
import { BedrockService } from "src/infrastructure/bedrock/bedrock.service";
import {
  FactsRepository,
  StoredFact,
} from "../fact-generation/facts.repository";
import { ToolHandlerService } from "./tools/tool-handler.service";
import { ANALYTICS_TOOLS } from "./tools/tool-definitions";
import Redis from "ioredis";
import {
  type Message,
  type ContentBlock,
} from "@aws-sdk/client-bedrock-runtime";

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
const MAX_TOOL_ITERATIONS = 3; // Prevent runaway tool-calling loops

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private redis: Redis | null = null;

  constructor(
    private readonly bedrockService: BedrockService,
    private readonly factsRepository: FactsRepository,
    private readonly toolHandler: ToolHandlerService,
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
    const systemPrompt = this.buildSystemPrompt(relevantFacts);

    let response: string;
    try {
      response = await this.converseWithTools(
        userMessage,
        systemPrompt,
        session,
      );
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userId?: string,
  ): AsyncGenerator<{ type: "chunk" | "facts"; data: string | StoredFact[] }> {
    const session = await this.getSession(sessionId);
    session.messages.push({
      role: "user",
      content: userMessage,
      timestamp: Date.now(),
    });

    const relevantFacts = await this.retrieveFacts(userMessage);
    yield { type: "facts", data: relevantFacts };

    const systemPrompt = this.buildSystemPrompt(relevantFacts);

    let fullResponse = "";
    try {
      // Build the Bedrock messages array from conversation
      const messages = this.buildBedrockMessages(userMessage, session);

      // Tool-calling loop: LLM may request tools multiple times
      for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
        const converseResult = await this.bedrockService.converse(
          messages,
          systemPrompt,
          ANALYTICS_TOOLS,
        );

        if (
          converseResult.stopReason === "tool_use" &&
          converseResult.toolUseRequests.length > 0
        ) {
          // LLM wants to call a tool — add assistant message with tool request
          messages.push({
            role: "assistant",
            content: converseResult.output,
          });

          // Execute each tool and add results
          const toolResults: ContentBlock[] = [];
          for (const toolReq of converseResult.toolUseRequests) {
            this.logger.log(
              `LLM requested tool: ${toolReq.name}(${JSON.stringify(toolReq.input)})`,
            );
            const result = await this.toolHandler.execute(
              toolReq.name,
              toolReq.input,
            );

            toolResults.push({
              toolResult: {
                toolUseId: toolReq.toolUseId,
                content: [{ json: result.data as Record<string, unknown> }],
                status: result.success ? "success" : "error",
              },
            });
          }

          // Add tool results as a user message (Bedrock Converse API format)
          messages.push({
            role: "user",
            content: toolResults,
          });

          // Continue the loop — LLM will process the tool results
          continue;
        }

        // No more tool calls — stream the final response
        for await (const chunk of this.bedrockService.converseStream(
          messages,
          systemPrompt,
          ANALYTICS_TOOLS,
        )) {
          fullResponse += chunk;
          yield { type: "chunk", data: chunk };
        }
        break;
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

  /**
   * Non-streaming converse with tool-calling loop.
   * Used by the non-streaming chat() endpoint.
   */
  private async converseWithTools(
    userMessage: string,
    systemPrompt: string,
    session: ChatSession,
  ): Promise<string> {
    const messages = this.buildBedrockMessages(userMessage, session);

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const result = await this.bedrockService.converse(
        messages,
        systemPrompt,
        ANALYTICS_TOOLS,
      );

      if (
        result.stopReason === "tool_use" &&
        result.toolUseRequests.length > 0
      ) {
        messages.push({ role: "assistant", content: result.output });

        const toolResults: ContentBlock[] = [];
        for (const toolReq of result.toolUseRequests) {
          this.logger.log(
            `LLM requested tool: ${toolReq.name}(${JSON.stringify(toolReq.input)})`,
          );
          const toolResult = await this.toolHandler.execute(
            toolReq.name,
            toolReq.input,
          );

          toolResults.push({
            toolResult: {
              toolUseId: toolReq.toolUseId,
              content: [{ json: toolResult.data as Record<string, unknown> }],
              status: toolResult.success ? "success" : "error",
            },
          });
        }

        messages.push({ role: "user", content: toolResults });
        continue;
      }

      // Extract text from the final response
      return result.output
        .map((block) => ("text" in block ? block.text : ""))
        .filter(Boolean)
        .join("");
    }

    return "I was unable to complete the analysis. Please try rephrasing your question.";
  }

  /**
   * Build Bedrock Converse API messages from session history + current message.
   */
  private buildBedrockMessages(
    userMessage: string,
    session: ChatSession,
  ): Message[] {
    const messages: Message[] = [];

    // Include last 6 messages from history
    const history = session.messages.slice(-7, -1); // Exclude the current message we just pushed
    for (const msg of history) {
      messages.push({
        role: msg.role,
        content: [{ text: msg.content }],
      });
    }

    // Add current user message
    messages.push({
      role: "user",
      content: [{ text: userMessage }],
    });

    return messages;
  }

  private async retrieveFacts(userMessage: string): Promise<StoredFact[]> {
    let relevantFacts: StoredFact[] = [];

    try {
      const queryEmbedding =
        await this.bedrockService.getEmbedding(userMessage);
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

  /**
   * Build the system prompt with pre-fetched facts as context.
   * The LLM uses this context for general questions AND has tools for live queries.
   */
  private buildSystemPrompt(facts: StoredFact[]): string {
    const factsContext = this.buildFactsContext(facts);

    return `You are an analytics assistant for a URL shortener service. You help users understand their link performance, traffic patterns, geographic distribution, and trends.

## Pre-loaded Analytics Context:
${factsContext || "No pre-loaded analytics data available."}

## Tools Available:
You have access to tools that query LIVE data from the database. Use them when:
- The user asks about a SPECIFIC link (use get_click_stats)
- The user wants REAL-TIME trending data (use get_trending_links)
- The user asks about geographic distribution (use get_geo_breakdown)
- The user asks about traffic patterns or peak hours (use get_traffic_pattern)

For general questions, use the pre-loaded context above. For specific or time-sensitive questions, prefer using tools for fresh data.

## Instructions:
- When you have both pre-loaded context and tool results, prefer the tool results (they are more current).
- When mentioning links, always include both the short code and the full URL if available.
- Be specific with numbers, percentages, and time periods.
- If the data doesn't contain information to answer the question, say so clearly.
- Keep responses concise but informative. Use bullet points for multiple insights.`;
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
