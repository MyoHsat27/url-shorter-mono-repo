import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  ConverseCommand,
  ConverseStreamCommand,
  type ContentBlock,
  type Message,
  type Tool,
} from "@aws-sdk/client-bedrock-runtime";
import { AppConfig } from "src/config/configuration";

export interface ToolDefinition {
  name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputSchema: Record<string, any>;
}

export interface ToolUseRequest {
  toolUseId: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ConverseResponse {
  stopReason: string;
  output: ContentBlock[];
  toolUseRequests: ToolUseRequest[];
  usage?: { inputTokens: number; outputTokens: number };
}

@Injectable()
export class BedrockService implements OnModuleInit {
  private readonly logger = new Logger(BedrockService.name);
  private client: BedrockRuntimeClient;
  private readonly modelId: string;
  private readonly embeddingModelId: string;

  constructor(private readonly configService: ConfigService<AppConfig>) {
    const bedrockConfig = this.configService.getOrThrow("bedrock", {
      infer: true,
    });
    const awsConfig = this.configService.getOrThrow("aws", { infer: true });

    this.modelId = bedrockConfig.modelId;
    this.embeddingModelId = bedrockConfig.embeddingModelId;

    this.client = new BedrockRuntimeClient({
      region: awsConfig.region,
      ...(awsConfig.endpoint && { endpoint: awsConfig.endpoint }),
      ...(awsConfig.accessKeyId &&
        awsConfig.secretAccessKey && {
          credentials: {
            accessKeyId: awsConfig.accessKeyId,
            secretAccessKey: awsConfig.secretAccessKey,
          },
        }),
    });
  }

  async onModuleInit() {
    const available = await this.isAvailable();
    if (available) {
      this.logger.log(
        `Bedrock connected. Model: ${this.modelId}, Embedding: ${this.embeddingModelId}`,
      );
    } else {
      this.logger.warn(
        "Bedrock is not reachable. RAG features will be degraded.",
      );
    }
  }

  async getEmbedding(text: string): Promise<number[]> {
    try {
      const command = new InvokeModelCommand({
        modelId: this.embeddingModelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          inputText: text,
        }),
      });

      const response = await this.client.send(command);
      const body = JSON.parse(new TextDecoder().decode(response.body));
      return body.embedding as number[];
    } catch (error) {
      this.logger.error(
        `Failed to get embedding: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw error;
    }
  }

  async generate(prompt: string): Promise<string> {
    try {
      const messages: Message[] = [
        { role: "user", content: [{ text: prompt }] },
      ];

      const command = new ConverseCommand({
        modelId: this.modelId,
        messages,
        inferenceConfig: {
          maxTokens: 2048,
          temperature: 0.7,
        },
      });

      const response = await this.client.send(command);
      const output = response.output?.message?.content;

      if (!output || output.length === 0) {
        throw new Error("Empty response from Bedrock");
      }

      return output
        .map((block) => ("text" in block ? block.text : ""))
        .join("");
    } catch (error) {
      this.logger.error(
        `Failed to generate: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw error;
    }
  }

  async *generateStream(prompt: string): AsyncGenerator<string> {
    try {
      const messages: Message[] = [
        { role: "user", content: [{ text: prompt }] },
      ];

      const command = new ConverseStreamCommand({
        modelId: this.modelId,
        messages,
        inferenceConfig: {
          maxTokens: 2048,
          temperature: 0.7,
        },
      });

      const response = await this.client.send(command);

      if (!response.stream) {
        throw new Error("No stream in response");
      }

      for await (const event of response.stream) {
        if (
          event.contentBlockDelta?.delta &&
          "text" in event.contentBlockDelta.delta
        ) {
          yield event.contentBlockDelta.delta.text ?? "";
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to generate stream: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw error;
    }
  }

  /**
   * Converse with tool definitions. The LLM can request tool calls.
   * Returns the response including any tool use requests.
   */
  async converse(
    messages: Message[],
    systemPrompt: string,
    tools?: ToolDefinition[],
  ): Promise<ConverseResponse> {
    try {
      const toolConfig = tools
        ? {
            tools: tools.map(
              (t): Tool => ({
                toolSpec: {
                  name: t.name,
                  description: t.description,
                  inputSchema: { json: t.inputSchema },
                },
              }),
            ),
          }
        : undefined;

      const command = new ConverseCommand({
        modelId: this.modelId,
        system: [{ text: systemPrompt }],
        messages,
        toolConfig,
        inferenceConfig: {
          maxTokens: 2048,
          temperature: 0.7,
        },
      });

      const response = await this.client.send(command);

      const contentBlocks = response.output?.message?.content ?? [];
      const toolUseRequests: ToolUseRequest[] = [];

      for (const block of contentBlocks) {
        if ("toolUse" in block && block.toolUse) {
          toolUseRequests.push({
            toolUseId: block.toolUse.toolUseId ?? "",
            name: block.toolUse.name ?? "",
            input: (block.toolUse.input as Record<string, unknown>) ?? {},
          });
        }
      }

      return {
        stopReason: response.stopReason ?? "end_turn",
        output: contentBlocks,
        toolUseRequests,
        usage: response.usage
          ? {
              inputTokens: response.usage.inputTokens ?? 0,
              outputTokens: response.usage.outputTokens ?? 0,
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to converse: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw error;
    }
  }

  /**
   * Stream the final response after tool calls are resolved.
   * Use this for the last turn when no more tool calls are expected.
   */
  async *converseStream(
    messages: Message[],
    systemPrompt: string,
    tools?: ToolDefinition[],
  ): AsyncGenerator<string> {
    try {
      const toolConfig = tools
        ? {
            tools: tools.map(
              (t): Tool => ({
                toolSpec: {
                  name: t.name,
                  description: t.description,
                  inputSchema: { json: t.inputSchema },
                },
              }),
            ),
          }
        : undefined;

      const command = new ConverseStreamCommand({
        modelId: this.modelId,
        system: [{ text: systemPrompt }],
        messages,
        toolConfig,
        inferenceConfig: {
          maxTokens: 2048,
          temperature: 0.7,
        },
      });

      const response = await this.client.send(command);

      if (!response.stream) {
        throw new Error("No stream in response");
      }

      for await (const event of response.stream) {
        if (
          event.contentBlockDelta?.delta &&
          "text" in event.contentBlockDelta.delta
        ) {
          yield event.contentBlockDelta.delta.text ?? "";
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to converse stream: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple test: try to invoke the embedding model with minimal input
      await this.getEmbedding("test");
      return true;
    } catch (error) {
      this.logger.warn(
        `Bedrock availability check failed: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      return false;
    }
  }
}
