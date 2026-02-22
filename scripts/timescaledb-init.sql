-- TimescaleDB Initialization Script
-- Enable required extensions

-- Enable TimescaleDB 
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Enable pgvector for AI embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Click Events Table (Hypertable)
CREATE TABLE IF NOT EXISTS click_events (
    time        TIMESTAMPTZ NOT NULL,
    short_code  TEXT NOT NULL,
    long_url    TEXT,
    user_agent  TEXT,
    ip_address  INET,
    country     TEXT,
    city        TEXT,
    referer     TEXT,
    device_type TEXT
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('click_events', 'time', if_not_exists => TRUE);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_click_events_short_code ON click_events (short_code, time DESC);

-- Hourly Stats (Continuous Aggregate)
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_stats
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    short_code,
    country,
    COUNT(*) AS clicks,
    COUNT(DISTINCT ip_address) AS unique_visitors
FROM click_events
GROUP BY bucket, short_code, country
WITH NO DATA;

-- Auto-refresh policy: refresh every 5 minutes, include data up to 1 minute ago
SELECT add_continuous_aggregate_policy('hourly_stats',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '5 minutes',
    if_not_exists => TRUE);

-- Analytics Facts Table (with Vector Embeddings)
CREATE TABLE IF NOT EXISTS analytics_facts (
    id          SERIAL PRIMARY KEY,
    fact_text   TEXT NOT NULL,
    embedding   vector(768),
    fact_type   TEXT NOT NULL,
    short_code  TEXT,
    time_range  TSTZRANGE,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_facts_embedding 
ON analytics_facts USING hnsw (embedding vector_cosine_ops);

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_facts_type ON analytics_facts (fact_type);
CREATE INDEX IF NOT EXISTS idx_facts_created ON analytics_facts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_facts_short_code ON analytics_facts (short_code);

-- Retention Policy | Keep raw click events for 30 days
SELECT add_retention_policy('click_events', INTERVAL '30 days', if_not_exists => TRUE);

-- Verify Setup
DO $$
BEGIN
    RAISE NOTICE 'TimescaleDB initialization complete!';
    RAISE NOTICE 'Tables: click_events (hypertable), analytics_facts (vector)';
    RAISE NOTICE 'Views: hourly_stats (continuous aggregate)';
END $$;
