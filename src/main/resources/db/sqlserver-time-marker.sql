IF OBJECT_ID('dbo.utm_migrations', 'U') IS NULL
    CREATE TABLE dbo.utm_migrations (migration_id VARCHAR(100) NOT NULL PRIMARY KEY, applied_at DATETIME2(6) NOT NULL);
