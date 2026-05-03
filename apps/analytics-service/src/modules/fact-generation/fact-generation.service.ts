import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Pool } from "pg";
import { TIMESCALE_POOL } from "src/infrastructure/timescale/timescale.module";
import { BedrockService } from "src/infrastructure/bedrock/bedrock.service";
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
    private readonly bedrockService: BedrockService,
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

      const summaryFacts = await this.generateSummaryFacts();
      facts.push(...summaryFacts);

      if (facts.length > 0) {
        await this.deleteOldFacts();
        await this.embedAndStoreFacts(facts);
      }

      this.logger.log(`Generated and stored ${facts.length} facts`);
    } catch (error) {
      this.logger.error(
        `Fact generation failed: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw error;
    }
  }

  private formatLinkName(shortCode: string, longUrl: string | null): string {
    if (longUrl) {
      try {
        const url = new URL(longUrl);
        const display =
          url.hostname + (url.pathname !== "/" ? url.pathname : "");
        return `'${shortCode}' (${display})`;
      } catch {
        return `'${shortCode}' (${longUrl})`;
      }
    }
    return `'${shortCode}'`;
  }

  private async generateTrendingFacts(): Promise<GeneratedFact[]> {
    const facts: GeneratedFact[] = [];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const topLinks = await this.analyticsRepository.getTopLinks(
      5,
      oneDayAgo,
      now,
    );

    if (topLinks.length === 0) {
      facts.push({
        factText: `No link clicks recorded in the last 24 hours as of ${now.toISOString()}.`,
        factType: "trending",
        metadata: { period: "24h", noData: true },
      });
      return facts;
    }

    const previousTopLinks = await this.analyticsRepository.getTopLinks(
      10,
      twoDaysAgo,
      oneDayAgo,
    );

    for (const link of topLinks) {
      const previousStats = previousTopLinks.find(
        (l) => l.shortCode === link.shortCode,
      );

      let changeText = "";
      if (previousStats && previousStats.clicks > 0) {
        const change = Math.round(
          ((link.clicks - previousStats.clicks) / previousStats.clicks) * 100,
        );
        if (change > 0) {
          changeText = `, up ${change}% from the previous day`;
        } else if (change < 0) {
          changeText = `, down ${Math.abs(change)}% from the previous day`;
        } else {
          changeText = `, same as the previous day`;
        }
      } else {
        changeText = " (new in this period)";
      }

      const linkName = this.formatLinkName(link.shortCode, link.longUrl);

      facts.push({
        factText: `Link ${linkName} received ${link.clicks} clicks in the last 24 hours with ${link.uniqueVisitors} unique visitors${changeText}. Data as of ${now.toISOString()}.`,
        factType: "trending",
        shortCode: link.shortCode,
        metadata: {
          clicks: link.clicks,
          uniqueVisitors: link.uniqueVisitors,
          longUrl: link.longUrl,
          period: "24h",
          generatedAt: now.toISOString(),
        },
      });
    }

    const totalClicks = topLinks.reduce((sum, l) => sum + l.clicks, 0);
    const totalVisitors = topLinks.reduce(
      (sum, l) => sum + l.uniqueVisitors,
      0,
    );
    facts.push({
      factText: `In the last 24 hours, the top ${topLinks.length} links received a combined ${totalClicks} clicks from ${totalVisitors} unique visitors. The most popular link was ${this.formatLinkName(topLinks[0].shortCode, topLinks[0].longUrl)} with ${topLinks[0].clicks} clicks.`,
      factType: "trending",
      metadata: {
        totalClicks,
        totalVisitors,
        topLinkCount: topLinks.length,
        period: "24h",
        generatedAt: now.toISOString(),
      },
    });

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

    if (trafficByHour.length === 0) {
      return facts;
    }

    const totalClicks = trafficByHour.reduce((sum, h) => sum + h.clicks, 0);
    const sorted = [...trafficByHour].sort((a, b) => b.clicks - a.clicks);
    const peakHour = sorted[0];
    const lowHour = sorted[sorted.length - 1];

    if (peakHour) {
      const peakPct = Math.round((peakHour.clicks / totalClicks) * 100);
      facts.push({
        factText: `Peak traffic hour in the last 24 hours is ${peakHour.hour}:00 UTC with ${peakHour.clicks} clicks (${peakPct}% of total traffic).`,
        factType: "traffic_pattern",
        metadata: {
          peakHour: peakHour.hour,
          clicks: peakHour.clicks,
          percentage: peakPct,
          generatedAt: now.toISOString(),
        },
      });
    }

    if (lowHour && lowHour.hour !== peakHour?.hour) {
      facts.push({
        factText: `Lowest traffic hour in the last 24 hours is ${lowHour.hour}:00 UTC with ${lowHour.clicks} clicks.`,
        factType: "traffic_pattern",
        metadata: {
          lowHour: lowHour.hour,
          clicks: lowHour.clicks,
          generatedAt: now.toISOString(),
        },
      });
    }

    facts.push({
      factText: `Total traffic in the last 24 hours: ${totalClicks} clicks spread across ${trafficByHour.length} active hours.`,
      factType: "traffic_pattern",
      metadata: {
        totalClicks,
        activeHours: trafficByHour.length,
        generatedAt: now.toISOString(),
      },
    });

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

    if (trafficByCountry.length === 0) {
      return facts;
    }

    const topCountry = trafficByCountry[0];
    facts.push({
      factText: `Top traffic source in the last 24 hours is ${topCountry.country} with ${topCountry.clicks} clicks and ${topCountry.uniqueVisitors} unique visitors.`,
      factType: "location",
      metadata: {
        country: topCountry.country,
        clicks: topCountry.clicks,
        uniqueVisitors: topCountry.uniqueVisitors,
        generatedAt: now.toISOString(),
      },
    });

    if (trafficByCountry.length >= 3) {
      const totalClicks = trafficByCountry.reduce(
        (sum, c) => sum + c.clicks,
        0,
      );
      const topCountries = trafficByCountry.slice(0, 3);
      const topCountriesClicks = topCountries.reduce(
        (sum, c) => sum + c.clicks,
        0,
      );
      const topCountriesShare = Math.round(
        (topCountriesClicks / totalClicks) * 100,
      );

      facts.push({
        factText: `Top 3 countries (${topCountries.map((c) => c.country).join(", ")}) account for ${topCountriesShare}% of total traffic in the last 24 hours. Total traffic came from ${trafficByCountry.length} countries.`,
        factType: "location",
        metadata: {
          topCountries: topCountries.map((c) => c.country),
          sharePercentage: topCountriesShare,
          totalCountries: trafficByCountry.length,
          generatedAt: now.toISOString(),
        },
      });
    }

    return facts;
  }

  private async generateSummaryFacts(): Promise<GeneratedFact[]> {
    const facts: GeneratedFact[] = [];
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weeklyTopLinks = await this.analyticsRepository.getTopLinks(
      10,
      oneWeekAgo,
      now,
    );

    if (weeklyTopLinks.length > 0) {
      const totalWeeklyClicks = weeklyTopLinks.reduce(
        (sum, l) => sum + l.clicks,
        0,
      );

      const topLinksText = weeklyTopLinks
        .slice(0, 5)
        .map(
          (l, i) =>
            `${i + 1}. ${this.formatLinkName(l.shortCode, l.longUrl)} - ${l.clicks} clicks`,
        )
        .join("; ");

      facts.push({
        factText: `Weekly summary (last 7 days): ${totalWeeklyClicks} total clicks across ${weeklyTopLinks.length} links. Top 5: ${topLinksText}.`,
        factType: "summary",
        metadata: {
          totalClicks: totalWeeklyClicks,
          linkCount: weeklyTopLinks.length,
          period: "7d",
          generatedAt: now.toISOString(),
        },
      });
    }

    return facts;
  }

  private async deleteOldFacts(): Promise<void> {
    try {
      const result = await this.pool.query("DELETE FROM analytics_facts");
      this.logger.log(`Cleaned up ${result.rowCount} old facts`);
    } catch (error) {
      this.logger.error(
        `Failed to clean up old facts: ${error instanceof Error ? error.message : "Unknown"}`,
      );
    }
  }

  private async embedAndStoreFacts(facts: GeneratedFact[]): Promise<void> {
    const isBedrockAvailable = await this.bedrockService.isAvailable();

    for (const fact of facts) {
      try {
        let embedding: number[] | null = null;

        if (isBedrockAvailable) {
          try {
            embedding = await this.bedrockService.getEmbedding(fact.factText);
          } catch (error) {
            this.logger.warn(
              `Embedding failed for fact, storing without embedding: ${error instanceof Error ? error.message : "Unknown"}`,
            );
          }
        } else {
          this.logger.warn(
            "Bedrock not available, storing fact without embedding",
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
