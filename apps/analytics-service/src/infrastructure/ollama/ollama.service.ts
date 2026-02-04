import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppConfig } from "src/config/configuration";

interface EmbeddingResponse {
  embedding: number[];
}

interface GenerateResponse {
  response: string;
}

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly host: string;
  private readonly embeddingModel: string;

  constructor(private readonly configService: ConfigService<AppConfig>) {
    const ollamaConfig = this.configService.getOrThrow("ollama", {
      infer: true,
    });
    this.host = ollamaConfig.host;
    this.embeddingModel = ollamaConfig.embeddingModel;
  }

  async getEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.host}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.embeddingModel,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = (await response.json()) as EmbeddingResponse;
      return data.embedding;
    } catch (error) {
      this.logger.error(
        `Failed to get embedding: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw error;
    }
  }

  async generate(prompt: string, model: string = "llama3.2"): Promise<string> {
    try {
      const response = await fetch(`${this.host}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = (await response.json()) as GenerateResponse;
      return data.response;
    } catch (error) {
      this.logger.error(
        `Failed to generate: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.host}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async pullModel(model: string): Promise<void> {
    this.logger.log(`Pulling model: ${model}`);
    try {
      const response = await fetch(`${this.host}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: model }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.status}`);
      }

      this.logger.log(`Model ${model} pulled successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to pull model: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw error;
    }
  }
}
