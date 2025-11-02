-- Machine Learning Database Schema
-- Time-series database schema for ML system data storage
-- Compatible with TimescaleDB (PostgreSQL extension) and standard PostgreSQL

-- Enable TimescaleDB extension (if using TimescaleDB)
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Price history table
CREATE TABLE IF NOT EXISTS price_history (
    timestamp BIGINT NOT NULL,
    chain_id VARCHAR(50) NOT NULL,
    token_address VARCHAR(66) NOT NULL,
    price DECIMAL(36, 18) NOT NULL,
    volume DECIMAL(36, 18) NOT NULL,
    liquidity DECIMAL(36, 18) NOT NULL,
    gas_price BIGINT,
    PRIMARY KEY (timestamp, chain_id, token_address)
);

-- Create hypertable for price_history (TimescaleDB)
-- SELECT create_hypertable('price_history', 'timestamp', if_not_exists => TRUE);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_price_history_chain_token 
    ON price_history (chain_id, token_address, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_timestamp 
    ON price_history (timestamp DESC);

-- Arbitrage execution history table
CREATE TABLE IF NOT EXISTS arbitrage_executions (
    id SERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    path_json TEXT NOT NULL,
    start_token VARCHAR(66) NOT NULL,
    end_token VARCHAR(66) NOT NULL,
    num_hops INTEGER NOT NULL,
    estimated_profit DECIMAL(36, 18) NOT NULL,
    actual_profit DECIMAL(36, 18),
    gas_used BIGINT,
    execution_time_ms INTEGER,
    result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failed', 'reverted', 'pending')),
    failure_reason TEXT,
    chain_id VARCHAR(50) NOT NULL,
    ml_confidence DECIMAL(5, 4),
    ml_recommendation VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_arbitrage_timestamp 
    ON arbitrage_executions (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_arbitrage_result 
    ON arbitrage_executions (result, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_arbitrage_chain 
    ON arbitrage_executions (chain_id, timestamp DESC);

-- Feature cache table (pre-computed features for fast lookup)
CREATE TABLE IF NOT EXISTS feature_cache (
    timestamp BIGINT NOT NULL,
    chain_id VARCHAR(50) NOT NULL,
    token_address VARCHAR(66) NOT NULL,
    features JSONB NOT NULL,
    created_at BIGINT NOT NULL,
    PRIMARY KEY (timestamp, chain_id, token_address)
);

-- TTL index for automatic cleanup (features older than retention period)
CREATE INDEX IF NOT EXISTS idx_feature_cache_created 
    ON feature_cache (created_at);
CREATE INDEX IF NOT EXISTS idx_feature_cache_lookup 
    ON feature_cache (chain_id, token_address, timestamp DESC);

-- Model metadata table
CREATE TABLE IF NOT EXISTS model_metadata (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('lstm', 'random_forest', 'garch', 'ensemble')),
    trained_at BIGINT NOT NULL,
    accuracy DECIMAL(5, 4),
    loss DECIMAL(12, 8),
    metrics JSONB,
    hyperparameters JSONB,
    file_path TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_model_type_active 
    ON model_metadata (model_type, is_active);
CREATE INDEX IF NOT EXISTS idx_model_version 
    ON model_metadata (version);

-- Pattern library table
CREATE TABLE IF NOT EXISTS pattern_library (
    id SERIAL PRIMARY KEY,
    pattern_id VARCHAR(100) NOT NULL UNIQUE,
    pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN ('time', 'chain', 'sequence', 'cluster')),
    description TEXT NOT NULL,
    conditions JSONB NOT NULL,
    confidence DECIMAL(5, 4) NOT NULL,
    historical_profit DECIMAL(36, 18) NOT NULL,
    occurrence_count INTEGER DEFAULT 0,
    last_matched BIGINT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pattern_type 
    ON pattern_library (pattern_type);
CREATE INDEX IF NOT EXISTS idx_pattern_confidence 
    ON pattern_library (confidence DESC);

-- Model performance tracking table
CREATE TABLE IF NOT EXISTS model_performance (
    id SERIAL PRIMARY KEY,
    model_version VARCHAR(50) NOT NULL,
    timestamp BIGINT NOT NULL,
    accuracy DECIMAL(5, 4),
    precision_score DECIMAL(5, 4),
    recall DECIMAL(5, 4),
    f1_score DECIMAL(5, 4),
    auc DECIMAL(5, 4),
    mse DECIMAL(12, 8),
    mae DECIMAL(12, 8),
    latency_ms INTEGER NOT NULL,
    prediction_count INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_performance_model_time 
    ON model_performance (model_version, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_timestamp 
    ON model_performance (timestamp DESC);

-- Training data table
CREATE TABLE IF NOT EXISTS training_data (
    id SERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    features JSONB NOT NULL,
    path_json TEXT NOT NULL,
    outcome JSONB NOT NULL,
    chain_id VARCHAR(50) NOT NULL,
    used_for_training BOOLEAN DEFAULT FALSE,
    data_quality DECIMAL(3, 2) CHECK (data_quality >= 0 AND data_quality <= 1)
);

CREATE INDEX IF NOT EXISTS idx_training_timestamp 
    ON training_data (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_training_unused 
    ON training_data (used_for_training, timestamp DESC) 
    WHERE used_for_training = FALSE;

-- Model alerts table
CREATE TABLE IF NOT EXISTS model_alerts (
    id SERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
    alert_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_alerts_unresolved 
    ON model_alerts (severity, timestamp DESC) 
    WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp 
    ON model_alerts (timestamp DESC);

-- Market volatility table
CREATE TABLE IF NOT EXISTS market_volatility (
    timestamp BIGINT NOT NULL,
    chain_id VARCHAR(50) NOT NULL,
    token_address VARCHAR(66) NOT NULL,
    volatility DECIMAL(12, 8) NOT NULL,
    window_minutes INTEGER NOT NULL,
    confidence_lower DECIMAL(12, 8),
    confidence_upper DECIMAL(12, 8),
    PRIMARY KEY (timestamp, chain_id, token_address, window_minutes)
);

CREATE INDEX IF NOT EXISTS idx_volatility_lookup 
    ON market_volatility (chain_id, token_address, timestamp DESC);

-- Gas price history table
CREATE TABLE IF NOT EXISTS gas_price_history (
    timestamp BIGINT NOT NULL,
    chain_id VARCHAR(50) NOT NULL,
    gas_price BIGINT NOT NULL,
    percentile_50 BIGINT,
    percentile_75 BIGINT,
    percentile_90 BIGINT,
    PRIMARY KEY (timestamp, chain_id)
);

CREATE INDEX IF NOT EXISTS idx_gas_price_chain 
    ON gas_price_history (chain_id, timestamp DESC);

-- Views for common queries

-- Recent profitable arbitrages view
CREATE OR REPLACE VIEW recent_profitable_arbitrages AS
SELECT 
    timestamp,
    chain_id,
    num_hops,
    estimated_profit,
    actual_profit,
    gas_used,
    ml_confidence,
    ml_recommendation
FROM arbitrage_executions
WHERE result = 'success' 
    AND actual_profit > 0
ORDER BY timestamp DESC
LIMIT 1000;

-- Model accuracy trends view
CREATE OR REPLACE VIEW model_accuracy_trends AS
SELECT 
    model_version,
    DATE_TRUNC('hour', TO_TIMESTAMP(timestamp / 1000)) as hour,
    AVG(accuracy) as avg_accuracy,
    AVG(precision_score) as avg_precision,
    AVG(recall) as avg_recall,
    AVG(latency_ms) as avg_latency_ms,
    SUM(prediction_count) as total_predictions
FROM model_performance
GROUP BY model_version, DATE_TRUNC('hour', TO_TIMESTAMP(timestamp / 1000))
ORDER BY hour DESC;

-- Active patterns view
CREATE OR REPLACE VIEW active_patterns AS
SELECT 
    pattern_id,
    pattern_type,
    description,
    confidence,
    historical_profit,
    occurrence_count,
    last_matched
FROM pattern_library
WHERE confidence > 0.6
ORDER BY confidence DESC, historical_profit DESC;

-- Cleanup function for old data (call periodically)
CREATE OR REPLACE FUNCTION cleanup_old_ml_data(retention_days INTEGER DEFAULT 90)
RETURNS TABLE (
    table_name TEXT,
    rows_deleted BIGINT
) AS $$
DECLARE
    cutoff_timestamp BIGINT;
    deleted_count BIGINT;
BEGIN
    cutoff_timestamp := EXTRACT(EPOCH FROM NOW() - (retention_days || ' days')::INTERVAL) * 1000;
    
    -- Clean price history
    DELETE FROM price_history WHERE timestamp < cutoff_timestamp;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN QUERY SELECT 'price_history'::TEXT, deleted_count;
    
    -- Clean feature cache
    DELETE FROM feature_cache WHERE created_at < cutoff_timestamp;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN QUERY SELECT 'feature_cache'::TEXT, deleted_count;
    
    -- Clean old model performance records
    DELETE FROM model_performance WHERE timestamp < cutoff_timestamp;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN QUERY SELECT 'model_performance'::TEXT, deleted_count;
    
    -- Clean resolved alerts older than 30 days
    DELETE FROM model_alerts 
    WHERE resolved = TRUE 
        AND resolved_at < (EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days') * 1000);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN QUERY SELECT 'model_alerts'::TEXT, deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO ml_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ml_user;
