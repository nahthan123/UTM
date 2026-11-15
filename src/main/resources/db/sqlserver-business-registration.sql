-- Apply to a SQL Server database already using the five-table UTM schema.
-- Fresh databases use sqlserver-schema.sql, which includes these columns.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.users', 'account_type') IS NULL
    ALTER TABLE dbo.users ADD account_type NVARCHAR(20) NOT NULL
        CONSTRAINT df_users_account_type DEFAULT 'INDIVIDUAL' WITH VALUES;
IF COL_LENGTH('dbo.users', 'national_id') IS NULL
    ALTER TABLE dbo.users ADD national_id NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.users', 'company_name') IS NULL
    ALTER TABLE dbo.users ADD company_name NVARCHAR(255) NULL;
IF COL_LENGTH('dbo.users', 'tax_code') IS NULL
    ALTER TABLE dbo.users ADD tax_code NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.users', 'representative') IS NULL
    ALTER TABLE dbo.users ADD representative NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.users', 'address') IS NULL
    ALTER TABLE dbo.users ADD address NVARCHAR(255) NULL;
IF COL_LENGTH('dbo.users', 'license_number') IS NULL
    ALTER TABLE dbo.users ADD license_number NVARCHAR(100) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ux_users_tax_code' AND object_id = OBJECT_ID('dbo.users'))
    EXEC(N'CREATE UNIQUE INDEX ux_users_tax_code ON dbo.users(tax_code) WHERE tax_code IS NOT NULL');

COMMIT TRANSACTION;
IF OBJECT_ID('dbo.utm_migrations', 'U') IS NULL
    CREATE TABLE dbo.utm_migrations (migration_id VARCHAR(100) NOT NULL PRIMARY KEY, applied_at DATETIME2(6) NOT NULL);
