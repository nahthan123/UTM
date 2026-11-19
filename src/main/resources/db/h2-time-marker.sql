CREATE TABLE IF NOT EXISTS utm_migrations (
    migration_id VARCHAR(100) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL
);
