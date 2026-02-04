/* eslint-disable @typescript-eslint/no-unused-vars */
import { Inject, Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { TIMESCALE_POOL } from "src/infrastructure/timescale/timescale.module";

export interface HourlyStats {
  bucket: Date;
  shortCode: string;
  country: string | null;
  clicks: number;
  uniqueVisitors: number;
}

export interface TopLink {
  shortCode: string;
  clicks: number;
  uniqueVisitors: number;
}

export interface TrafficByCountry {
  country: string;
  clicks: number;
  uniqueVisitors: number;
}

export interface TrafficByHour {
  hour: number;
  clicks: number;
}

@Injectable()
export class AnalyticsRepository {
  private readonly logger = new Logger(AnalyticsRepository.name);

  constructor(
    @Inject(TIMESCALE_POOL)
    private readonly pool: Pool,
  ) {}

  async getHourlyStats(
    shortCode?: string,
    startTime?: Date,
    endTime?: Date,
  ): Promise<HourlyStats[]> {
    let query = `
      SELECT 
        bucket,
        short_code,
        country,
        clicks,
        unique_visitors
      FROM hourly_stats
      WHERE 1=1
    `;
    const params: string[] = [];
    let paramIndex = 1;

    if (shortCode) {
      query += ` AND short_code = $${paramIndex++}`;
      params.push(shortCode);
    }
    if (startTime) {
      query += ` AND bucket >= $${paramIndex++}`;
      params.push(startTime.toISOString());
    }
    if (endTime) {
      query += ` AND bucket <= $${paramIndex++}`;
      params.push(endTime.toISOString());
    }

    query += ` ORDER BY bucket DESC LIMIT 168`; // 7 days of hourly data

    const result = await this.pool.query(query, params);
    return result.rows.map((row) => ({
      bucket: row.bucket,
      shortCode: row.short_code,
      country: row.country,
      clicks: parseInt(row.clicks, 10),
      uniqueVisitors: parseInt(row.unique_visitors, 10),
    }));
  }

  async getTopLinks(
    limit: number = 10,
    startTime?: Date,
    endTime?: Date,
  ): Promise<TopLink[]> {
    const query = `
      SELECT 
        short_code,
        SUM(clicks) as clicks,
        SUM(unique_visitors) as unique_visitors
      FROM hourly_stats
      GROUP BY short_code 
      ORDER BY clicks DESC 
      LIMIT ${limit}
    `;

    const result = await this.pool.query(query);

    return result.rows.map((row) => ({
      shortCode: row.short_code,
      clicks: parseInt(row.clicks, 10),
      uniqueVisitors: parseInt(row.unique_visitors, 10),
    }));
  }

  async getTrafficByCountry(
    startTime?: Date,
    endTime?: Date,
  ): Promise<TrafficByCountry[]> {
    let query = `
      SELECT 
        COALESCE(country, 'Unknown') as country,
        SUM(clicks) as clicks,
        SUM(unique_visitors) as unique_visitors
      FROM hourly_stats
      WHERE 1=1
    `;
    const params: string[] = [];
    let paramIndex = 1;

    if (startTime) {
      query += ` AND bucket >= $${paramIndex++}`;
      params.push(startTime.toISOString());
    }
    if (endTime) {
      query += ` AND bucket <= $${paramIndex++}`;
      params.push(endTime.toISOString());
    }

    query += ` GROUP BY country ORDER BY clicks DESC LIMIT 20`;

    const result = await this.pool.query(query, params);
    return result.rows.map((row) => ({
      country: row.country,
      clicks: parseInt(row.clicks, 10),
      uniqueVisitors: parseInt(row.unique_visitors, 10),
    }));
  }

  async getTrafficByHour(
    startTime?: Date,
    endTime?: Date,
  ): Promise<TrafficByHour[]> {
    let query = `
      SELECT 
        EXTRACT(HOUR FROM bucket) as hour,
        SUM(clicks) as clicks
      FROM hourly_stats
      WHERE 1=1
    `;
    const params: string[] = [];
    let paramIndex = 1;

    if (startTime) {
      query += ` AND bucket >= $${paramIndex++}`;
      params.push(startTime.toISOString());
    }
    if (endTime) {
      query += ` AND bucket <= $${paramIndex++}`;
      params.push(endTime.toISOString());
    }

    query += ` GROUP BY hour ORDER BY hour`;

    const result = await this.pool.query(query, params);
    return result.rows.map((row) => ({
      hour: parseInt(row.hour, 10),
      clicks: parseInt(row.clicks, 10),
    }));
  }

  async getTotalClicks(shortCode?: string): Promise<number> {
    let query = `SELECT COUNT(*) as total FROM click_events WHERE 1=1`;
    const params: string[] = [];

    if (shortCode) {
      query += ` AND short_code = $1`;
      params.push(shortCode);
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].total, 10);
  }
}
