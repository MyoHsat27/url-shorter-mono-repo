import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppConfig } from "src/config/configuration";

interface EmbeddingResponse {
  embedding: number[];
}

interface GenerateResponse {
  response: string;
}

@Injectable()
export class OllamaService implements OnModuleInit {
  private readonly logger = new Logger(OllamaService.name);
  private readonly host: string;
  private readonly embeddingModel: string;
  private readonly generateModel: string;

  constructor(private readonly configService: ConfigService<AppConfig>) {
    const ollamaConfig = this.configService.getOrThrow("ollama", {
      infer: true,
    });
    this.host = ollamaConfig.host;
    this.embeddingModel = ollamaConfig.embeddingModel;
    this.generateModel = ollamaConfig.generateModel;
  }

  async onModuleInit() {
    if (await this.isAvailable()) {
      await this.checkRequiredModels();
    } else {
      this.logger.warn(
        "Ollama is not reachable. RAG features will be disabled.",
      );
    }
  }

  private async checkRequiredModels() {
    try {
      const response = await fetch(`${this.host}/api/tags`);
      if (!response.ok) return;
      const data = (await response.json()) as { models: { name: string }[] };
      const installedModels = data.models.map((m) => m.name);

      if (!installedModels.some((m) => m.includes(this.embeddingModel))) {
        this.logger.warn(
          `Embedding model '${this.embeddingModel}' not found. Please run 'ollama pull ${this.embeddingModel}'`,
        );
      }

      if (!installedModels.some((m) => m.includes(this.generateModel))) {
        this.logger.warn(
          `Generation model '${this.generateModel}' not found. Please run 'ollama pull ${this.generateModel}'`,
        );
      }
    } catch (e) {
      this.logger.error("Failed to check Ollama models", e);
    }
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
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
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

  async generate(prompt: string, model?: string): Promise<string> {
    const modelToUse = model || this.generateModel;
    try {
      const response = await fetch(`${this.host}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelToUse,
          prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
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
    } catch (e) {
      this.logger.warn(`Ollama check failed: ${e instanceof Error ? e.message : "Unknown error"}`);
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
  async *generateStream(prompt: string, model?: string): AsyncGenerator<string> {
    const modelToUse = model || this.generateModel;
    try {
      const response = await fetch(`${this.host}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelToUse,
          prompt,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error("Response body is empty");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        
        // Keep the last part in the buffer as it might be incomplete
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "") continue;
          try {
            const json = JSON.parse(line);
            if (json.response) {
              yield json.response;
            }
            if (json.done) return;
          } catch (e) {
            this.logger.warn(`Failed to parse chunk: ${line}`, e);
          }
        }
      }
      
      // Process remaining buffer if any
      if (buffer.trim()) {
        try {
          const json = JSON.parse(buffer);
          if (json.response) yield json.response;
        } catch (e) {
          this.logger.warn(`Failed to parse final chunk: ${buffer}`, e);
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to generate stream: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw error;
    }
  }
}
