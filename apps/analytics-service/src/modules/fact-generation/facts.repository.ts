import { Inject, Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { TIMESCALE_POOL } from "src/infrastructure/timescale/timescale.module";

export interface StoredFact {
  id: number;
  factText: string;
  factType: string;
  shortCode: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  similarity?: number;
}

@Injectable()
export class FactsRepository {
  private readonly logger = new Logger(FactsRepository.name);

  constructor(
    @Inject(TIMESCALE_POOL)
    private readonly pool: Pool,
  ) {}

  async searchSimilar(
    queryEmbedding: number[],
    limit: number = 5,
    factType?: string,
  ): Promise<StoredFact[]> {
    let query = `
      SELECT 
        id,
        fact_text,
        fact_type,
        short_code,
        metadata,
        created_at,
        1 - (embedding <=> $1::vector) as similarity
      FROM analytics_facts
      WHERE embedding IS NOT NULL
    `;
    const params: (string | number)[] = [`[${queryEmbedding.join(",")}]`];
    let paramIndex = 2;

    if (factType) {
      query += ` AND fact_type = $${paramIndex++}`;
      params.push(factType);
    }

    query += ` ORDER BY embedding <=> $1::vector LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows.map((row) => ({
      id: row.id,
      factText: row.fact_text,
      factType: row.fact_type,
      shortCode: row.short_code,
      metadata: row.metadata,
      createdAt: row.created_at,
      similarity: parseFloat(row.similarity),
    }));
  }

  async getRecentFacts(
    limit: number = 10,
    factType?: string,
  ): Promise<StoredFact[]> {
    let query = `
      SELECT 
        id,
        fact_text,
        fact_type,
        short_code,
        metadata,
        created_at
      FROM analytics_facts
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (factType) {
      query += ` AND fact_type = $${paramIndex++}`;
      params.push(factType);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows.map((row) => ({
      id: row.id,
      factText: row.fact_text,
      factType: row.fact_type,
      shortCode: row.short_code,
      metadata: row.metadata,
      createdAt: row.created_at,
    }));
  }

  async getFactsByShortCode(shortCode: string): Promise<StoredFact[]> {
    const query = `
      SELECT 
        id,
        fact_text,
        fact_type,
        short_code,
        metadata,
        created_at
      FROM analytics_facts
      WHERE short_code = $1
      ORDER BY created_at DESC
      LIMIT 20
    `;

    const result = await this.pool.query(query, [shortCode]);
    return result.rows.map((row) => ({
      id: row.id,
      factText: row.fact_text,
      factType: row.fact_type,
      shortCode: row.short_code,
      metadata: row.metadata,
      createdAt: row.created_at,
    }));
  }
}
