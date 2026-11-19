-- Additive, repeatable migration for existing databases; no route conversion.
IF OBJECT_ID('dbo.flight_plans', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.flight_plans', 'submission_id') IS NULL
        ALTER TABLE dbo.flight_plans ADD submission_id UNIQUEIDENTIFIER NULL;
    IF COL_LENGTH('dbo.flight_plans', 'uav_count') IS NULL
        ALTER TABLE dbo.flight_plans ADD uav_count INT NOT NULL CONSTRAINT df_flights_uav_count DEFAULT 1;
    IF COL_LENGTH('dbo.flight_plans', 'departure_name') IS NULL
        ALTER TABLE dbo.flight_plans ADD departure_name NVARCHAR(255) NULL;
    IF COL_LENGTH('dbo.flight_plans', 'destination_name') IS NULL
        ALTER TABLE dbo.flight_plans ADD destination_name NVARCHAR(255) NULL;
    IF COL_LENGTH('dbo.flight_plans', 'altitude_reference') IS NULL
        ALTER TABLE dbo.flight_plans ADD altitude_reference NVARCHAR(10) NOT NULL CONSTRAINT df_flights_altitude_ref DEFAULT 'AMSL';
    IF COL_LENGTH('dbo.flight_plans', 'reviewed_at') IS NULL
        ALTER TABLE dbo.flight_plans ADD reviewed_at DATETIME2(6) NULL;
    IF COL_LENGTH('dbo.flight_plans', 'reviewed_by') IS NULL
        ALTER TABLE dbo.flight_plans ADD reviewed_by UNIQUEIDENTIFIER NULL;
    IF COL_LENGTH('dbo.flight_plans', 'review_note') IS NULL
        ALTER TABLE dbo.flight_plans ADD review_note NVARCHAR(1000) NULL;
END;

IF OBJECT_ID('dbo.flight_plans', 'U') IS NOT NULL AND OBJECT_ID('dbo.integration_deliveries', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.integration_deliveries (
        id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        created_at DATETIME2(6) NOT NULL,
        updated_at DATETIME2(6) NOT NULL,
        created_by UNIQUEIDENTIFIER NULL,
        updated_by UNIQUEIDENTIFIER NULL,
        deleted_at DATETIME2(6) NULL,
        deleted_by UNIQUEIDENTIFIER NULL,
        is_active BIT NOT NULL DEFAULT 1,
        flight_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.flight_plans(id),
        target NVARCHAR(20) NOT NULL,
        event_type NVARCHAR(80) NOT NULL,
        flight_status NVARCHAR(20) NOT NULL,
        status NVARCHAR(30) NOT NULL,
        payload_json NVARCHAR(MAX) NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        last_attempt_at DATETIME2(6) NULL,
        delivered_at DATETIME2(6) NULL,
        last_error NVARCHAR(1000) NULL,
        receipt NVARCHAR(1000) NULL,
        CONSTRAINT ux_delivery_event UNIQUE (flight_id, target, event_type, flight_status)
    );
    CREATE INDEX ix_delivery_status ON dbo.integration_deliveries(status, created_at);
END;
