import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Pool } from "pg";
import { TIMESCALE_POOL } from "src/infrastructure/timescale/timescale.module";
import { OllamaService } from "src/infrastructure/ollama/ollama.service";
import { AnalyticsRepository } from "../click-analytics/repositories/analytics.repository";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

interface GeneratedFact {
  factText: string;
  factType: string;
  shortCode?: string;
  metadata: Record<string, unknown>;
}

export const FACT_GENERATION_QUEUE = "fact-generation";
export const FACT_GENERATION_JOB = "generate-facts";

@Injectable()
export class FactGenerationService implements OnModuleInit {
  private readonly logger = new Logger(FactGenerationService.name);

  constructor(
    @Inject(TIMESCALE_POOL)
    private readonly pool: Pool,
    private readonly ollamaService: OllamaService,
    private readonly analyticsRepository: AnalyticsRepository,
    @InjectQueue(FACT_GENERATION_QUEUE)
    private readonly factQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.scheduleHourlyJob();
  }

  private async scheduleHourlyJob(): Promise<void> {
    const existingJobs = await this.factQueue.getRepeatableJobs();
    for (const job of existingJobs) {
      if (job.name === FACT_GENERATION_JOB) {
        await this.factQueue.removeRepeatableByKey(job.key);
      }
    }

    await this.factQueue.add(
      FACT_GENERATION_JOB,
      {},
      {
        repeat: {
          pattern: "0 * * * *",
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );

    this.logger.log("Scheduled hourly fact generation job");
  }

  async generateFacts(): Promise<void> {
    this.logger.log("Starting fact generation...");

    try {
      const facts: GeneratedFact[] = [];

      const trendingFacts = await this.generateTrendingFacts();
      facts.push(...trendingFacts);

      const trafficFacts = await this.generateTrafficPatternFacts();
      facts.push(...trafficFacts);

      const locationFacts = await this.generateLocationFacts();
      facts.push(...locationFacts);

      await this.embedAndStoreFacts(facts);

      this.logger.log(`Generated and stored ${facts.length} facts`);
    } catch (error) {
      this.logger.error(
        `Fact generation failed: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw error;
    }
  }

  private async generateTrendingFacts(): Promise<GeneratedFact[]> {
    const facts: GeneratedFact[] = [];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    this.logger.warn(
      `Querying top links from ${oneDayAgo.toISOString()} to ${now.toISOString()}`,
    );

    const topLinks = await this.analyticsRepository.getTopLinks(
      5,
      oneDayAgo,
      now,
    );

    this.logger.debug(
      `Found ${topLinks.length} top links: ${JSON.stringify(topLinks)}`,
    );

    for (const link of topLinks) {
      const previousTopLinks = await this.analyticsRepository.getTopLinks(
        10,
        twoDaysAgo,
        oneDayAgo,
      );
      const previousStats = previousTopLinks.find(
        (l) => l.shortCode === link.shortCode,
      );

      let changeText = "";
      if (previousStats && previousStats.clicks > 0) {
        const change = Math.round(
          ((link.clicks - previousStats.clicks) / previousStats.clicks) * 100,
        );
        if (change > 0) {
          changeText = `, up ${change}% from yesterday`;
        } else if (change < 0) {
          changeText = `, down ${Math.abs(change)}% from yesterday`;
        }
      }

      facts.push({
        factText: `Link '${link.shortCode}' received ${link.clicks} clicks in the last 24 hours with ${link.uniqueVisitors} unique visitors${changeText}.`,
        factType: "trending",
        shortCode: link.shortCode,
        metadata: {
          clicks: link.clicks,
          uniqueVisitors: link.uniqueVisitors,
          period: "24h",
        },
      });
    }

    return facts;
  }

  private async generateTrafficPatternFacts(): Promise<GeneratedFact[]> {
    const facts: GeneratedFact[] = [];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const trafficByHour = await this.analyticsRepository.getTrafficByHour(
      oneDayAgo,
      now,
    );

    if (trafficByHour.length > 0) {
      const sorted = [...trafficByHour].sort((a, b) => b.clicks - a.clicks);
      const peakHour = sorted[0];
      const lowHour = sorted[sorted.length - 1];

      if (peakHour) {
        facts.push({
          factText: `Peak traffic hour is ${peakHour.hour}:00 UTC with ${peakHour.clicks} clicks in the last 24 hours.`,
          factType: "traffic_pattern",
          metadata: { peakHour: peakHour.hour, clicks: peakHour.clicks },
        });
      }

      if (lowHour && lowHour.hour !== peakHour?.hour) {
        facts.push({
          factText: `Lowest traffic hour is ${lowHour.hour}:00 UTC with ${lowHour.clicks} clicks.`,
          factType: "traffic_pattern",
          metadata: { lowHour: lowHour.hour, clicks: lowHour.clicks },
        });
      }
    }

    return facts;
  }

  private async generateLocationFacts(): Promise<GeneratedFact[]> {
    const facts: GeneratedFact[] = [];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const trafficByCountry = await this.analyticsRepository.getTrafficByCountry(
      oneDayAgo,
      now,
    );

    if (trafficByCountry.length > 0) {
      const topCountry = trafficByCountry[0];
      facts.push({
        factText: `Top traffic source is ${topCountry.country} with ${topCountry.clicks} clicks and ${topCountry.uniqueVisitors} unique visitors in the last 24 hours.`,
        factType: "location",
        metadata: {
          country: topCountry.country,
          clicks: topCountry.clicks,
          uniqueVisitors: topCountry.uniqueVisitors,
        },
      });

      const totalClicks = trafficByCountry.reduce(
        (sum, c) => sum + c.clicks,
        0,
      );
      const topCountries = trafficByCountry.slice(0, 3);
      const topCountriesShare = Math.round(
        (topCountries.reduce((sum, c) => sum + c.clicks, 0) / totalClicks) *
          100,
      );

      facts.push({
        factText: `Top 3 countries (${topCountries.map((c) => c.country).join(", ")}) account for ${topCountriesShare}% of total traffic.`,
        factType: "location",
        metadata: {
          topCountries: topCountries.map((c) => c.country),
          sharePercentage: topCountriesShare,
        },
      });
    }

    return facts;
  }

  private async embedAndStoreFacts(facts: GeneratedFact[]): Promise<void> {
    const isOllamaAvailable = await this.ollamaService.isAvailable();

    for (const fact of facts) {
      try {
        let embedding: number[] | null = null;

        if (isOllamaAvailable) {
          embedding = await this.ollamaService.getEmbedding(fact.factText);
        } else {
          this.logger.warn(
            "Ollama not available, storing fact without embedding",
          );
        }

        const query = `
          INSERT INTO analytics_facts (fact_text, embedding, fact_type, short_code, metadata)
          VALUES ($1, $2, $3, $4, $5)
        `;

        await this.pool.query(query, [
          fact.factText,
          embedding ? `[${embedding.join(",")}]` : null,
          fact.factType,
          fact.shortCode || null,
          JSON.stringify(fact.metadata),
        ]);
      } catch (error) {
        this.logger.error(
          `Failed to store fact: ${error instanceof Error ? error.message : "Unknown"}`,
        );
      }
    }
  }

  async triggerGeneration(): Promise<{ generated: number }> {
    await this.generateFacts();

    const result = await this.pool.query(
      "SELECT COUNT(*) as count FROM analytics_facts WHERE created_at > NOW() - INTERVAL '1 minute'",
    );

    return { generated: parseInt(result.rows[0].count, 10) };
  }
}
