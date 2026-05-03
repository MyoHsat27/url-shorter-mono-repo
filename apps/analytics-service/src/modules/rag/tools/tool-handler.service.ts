import { Inject, Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { TIMESCALE_POOL } from "src/infrastructure/timescale/timescale.module";

interface ToolResult {
  success: boolean;
  data: unknown;
  error?: string;
}

@Injectable()
export class ToolHandlerService {
  private readonly logger = new Logger(ToolHandlerService.name);

  constructor(
    @Inject(TIMESCALE_POOL)
    private readonly pool: Pool,
  ) {}

  /**
   * Execute a tool by name with the given input.
   * This is the dispatcher — the LLM says "call get_click_stats"
   * and this method routes to the right handler.
   */
  async execute(
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<ToolResult> {
    this.logger.log(
      `Executing tool: ${toolName} with input: ${JSON.stringify(input)}`,
    );

    switch (toolName) {
      case "get_click_stats":
        return this.getClickStats(input);
      case "get_trending_links":
        return this.getTrendingLinks(input);
      case "get_geo_breakdown":
        return this.getGeoBreakdown(input);
      case "get_traffic_pattern":
        return this.getTrafficPattern(input);
      default:
        return {
          success: false,
          data: null,
          error: `Unknown tool: ${toolName}`,
        };
    }
  }

  private async getClickStats(
    input: Record<string, unknown>,
  ): Promise<ToolResult> {
    try {
      const shortCode = input.short_code as string;
      const hours = Math.min((input.hours as number) || 24, 168);
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const result = await this.pool.query(
        `SELECT
          COUNT(*) as total_clicks,
          COUNT(DISTINCT ip_address) as unique_visitors,
          MIN(time) as first_click,
          MAX(time) as last_click,
          (SELECT long_url FROM click_events
           WHERE short_code = $1 AND long_url IS NOT NULL
           ORDER BY time DESC LIMIT 1) as long_url
        FROM click_events
        WHERE short_code = $1 AND time >= $2`,
        [shortCode, since.toISOString()],
      );

      const row = result.rows[0];

      // Also get hourly breakdown for this link
      const hourlyResult = await this.pool.query(
        `SELECT
          time_bucket('1 hour', time) as hour,
          COUNT(*) as clicks
        FROM click_events
        WHERE short_code = $1 AND time >= $2
        GROUP BY hour
        ORDER BY hour DESC
        LIMIT 24`,
        [shortCode, since.toISOString()],
      );

      return {
        success: true,
        data: {
          short_code: shortCode,
          long_url: row.long_url,
          period: `last ${hours} hours`,
          total_clicks: parseInt(row.total_clicks, 10),
          unique_visitors: parseInt(row.unique_visitors, 10),
          first_click: row.first_click,
          last_click: row.last_click,
          hourly_breakdown: hourlyResult.rows.map((r) => ({
            hour: r.hour,
            clicks: parseInt(r.clicks, 10),
          })),
        },
      };
    } catch (error) {
      this.logger.error(`get_click_stats failed: ${error}`);
      return {
        success: false,
        data: null,
        error: `Failed to get click stats: ${error instanceof Error ? error.message : "Unknown"}`,
      };
    }
  }

  private async getTrendingLinks(
    input: Record<string, unknown>,
  ): Promise<ToolResult> {
    try {
      const limit = Math.min((input.limit as number) || 5, 20);
      const hours = Math.min((input.hours as number) || 24, 168);
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const result = await this.pool.query(
        `SELECT
          ce.short_code,
          COUNT(*) as clicks,
          COUNT(DISTINCT ce.ip_address) as unique_visitors,
          (SELECT ce2.long_url FROM click_events ce2
           WHERE ce2.short_code = ce.short_code AND ce2.long_url IS NOT NULL
           ORDER BY ce2.time DESC LIMIT 1) as long_url
        FROM click_events ce
        WHERE ce.time >= $1
        GROUP BY ce.short_code
        ORDER BY clicks DESC
        LIMIT $2`,
        [since.toISOString(), limit],
      );

      return {
        success: true,
        data: {
          period: `last ${hours} hours`,
          links: result.rows.map((row, index) => ({
            rank: index + 1,
            short_code: row.short_code,
            long_url: row.long_url,
            clicks: parseInt(row.clicks, 10),
            unique_visitors: parseInt(row.unique_visitors, 10),
          })),
        },
      };
    } catch (error) {
      this.logger.error(`get_trending_links failed: ${error}`);
      return {
        success: false,
        data: null,
        error: `Failed to get trending links: ${error instanceof Error ? error.message : "Unknown"}`,
      };
    }
  }

  private async getGeoBreakdown(
    input: Record<string, unknown>,
  ): Promise<ToolResult> {
    try {
      const shortCode = input.short_code as string | undefined;
      const hours = Math.min((input.hours as number) || 24, 168);
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      let query = `
        SELECT
          COALESCE(country, 'Unknown') as country,
          COUNT(*) as clicks,
          COUNT(DISTINCT ip_address) as unique_visitors
        FROM click_events
        WHERE time >= $1
      `;
      const params: (string | number)[] = [since.toISOString()];

      if (shortCode) {
        query += ` AND short_code = $2`;
        params.push(shortCode);
      }

      query += ` GROUP BY country ORDER BY clicks DESC LIMIT 20`;

      const result = await this.pool.query(query, params);

      const totalClicks: number = result.rows.reduce(
        (sum: number, r) => sum + parseInt(r.clicks, 10),
        0,
      );

      return {
        success: true,
        data: {
          period: `last ${hours} hours`,
          ...(shortCode && { short_code: shortCode }),
          total_clicks: totalClicks,
          countries: result.rows.map((row) => ({
            country: row.country,
            clicks: parseInt(row.clicks, 10),
            unique_visitors: parseInt(row.unique_visitors, 10),
            percentage: Math.round(
              (parseInt(row.clicks, 10) / totalClicks) * 100,
            ),
          })),
        },
      };
    } catch (error) {
      this.logger.error(`get_geo_breakdown failed: ${error}`);
      return {
        success: false,
        data: null,
        error: `Failed to get geo breakdown: ${error instanceof Error ? error.message : "Unknown"}`,
      };
    }
  }

  private async getTrafficPattern(
    input: Record<string, unknown>,
  ): Promise<ToolResult> {
    try {
      const shortCode = input.short_code as string | undefined;
      const hours = Math.min((input.hours as number) || 24, 168);
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      let query = `
        SELECT
          EXTRACT(HOUR FROM time) as hour,
          COUNT(*) as clicks,
          COUNT(DISTINCT ip_address) as unique_visitors
        FROM click_events
        WHERE time >= $1
      `;
      const params: (string | number)[] = [since.toISOString()];

      if (shortCode) {
        query += ` AND short_code = $2`;
        params.push(shortCode);
      }

      query += ` GROUP BY hour ORDER BY hour`;

      const result = await this.pool.query(query, params);

      const rows = result.rows.map((r) => ({
        hour: parseInt(r.hour, 10),
        clicks: parseInt(r.clicks, 10),
        unique_visitors: parseInt(r.unique_visitors, 10),
      }));

      const peakHour = rows.reduce(
        (max, r) => (r.clicks > max.clicks ? r : max),
        rows[0] || { hour: 0, clicks: 0, unique_visitors: 0 },
      );

      const lowHour = rows.reduce(
        (min, r) => (r.clicks < min.clicks ? r : min),
        rows[0] || { hour: 0, clicks: 0, unique_visitors: 0 },
      );

      return {
        success: true,
        data: {
          period: `last ${hours} hours`,
          ...(shortCode && { short_code: shortCode }),
          peak_hour: `${peakHour.hour}:00 UTC (${peakHour.clicks} clicks)`,
          low_hour: `${lowHour.hour}:00 UTC (${lowHour.clicks} clicks)`,
          hourly_breakdown: rows,
        },
      };
    } catch (error) {
      this.logger.error(`get_traffic_pattern failed: ${error}`);
      return {
        success: false,
        data: null,
        error: `Failed to get traffic pattern: ${error instanceof Error ? error.message : "Unknown"}`,
      };
    }
  }
}
