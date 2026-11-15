-- Apply ONCE to a new, empty SQL Server database. Existing tables/data are not migrated.

CREATE TABLE dbo.roles (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    deleted_at DATETIME2(6) NULL,
    deleted_by UNIQUEIDENTIFIER NULL,
    is_active BIT NOT NULL DEFAULT 1,
    code NVARCHAR(50) NOT NULL UNIQUE,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(255) NULL,
    is_system BIT NOT NULL DEFAULT 0
);

CREATE TABLE dbo.users (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    deleted_at DATETIME2(6) NULL,
    deleted_by UNIQUEIDENTIFIER NULL,
    is_active BIT NOT NULL DEFAULT 1,
    role_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.roles(id),
    account_type NVARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL'
        CHECK (account_type IN ('INDIVIDUAL', 'BUSINESS')),
    national_id NVARCHAR(50) NULL,
    company_name NVARCHAR(255) NULL,
    tax_code NVARCHAR(50) NULL,
    representative NVARCHAR(100) NULL,
    address NVARCHAR(255) NULL,
    license_number NVARCHAR(100) NULL,
    username NVARCHAR(50) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    full_name NVARCHAR(100) NOT NULL,
    email NVARCHAR(100) NOT NULL UNIQUE,
    phone NVARCHAR(20) NOT NULL,
    avatar_url NVARCHAR(255) NULL,
    last_login_at DATETIME2(6) NULL,
    is_locked BIT NOT NULL DEFAULT 0,
    login_fail_count INT NOT NULL DEFAULT 0
);

CREATE TABLE dbo.drones (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    deleted_at DATETIME2(6) NULL,
    deleted_by UNIQUEIDENTIFIER NULL,
    is_active BIT NOT NULL DEFAULT 1,
    owner_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.users(id),
    serial_number NVARCHAR(100) NOT NULL UNIQUE,
    model NVARCHAR(100) NOT NULL,
    drone_type NVARCHAR(20) NULL CONSTRAINT ck_drones_type CHECK (drone_type IN ('MULTIROTOR', 'FIXED_WING', 'HYBRID')),
    max_flight_time INT NOT NULL CHECK (max_flight_time > 0),
    max_speed FLOAT NOT NULL CHECK (max_speed > 0)
);

CREATE TABLE dbo.flight_plans (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    deleted_at DATETIME2(6) NULL,
    deleted_by UNIQUEIDENTIFIER NULL,
    is_active BIT NOT NULL DEFAULT 1,
    drone_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.drones(id),
    operator_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.users(id),
    start_time DATETIME2(6) NOT NULL,
    end_time DATETIME2(6) NOT NULL,
    trajectory_json NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'PENDING',
    CONSTRAINT ck_flight_time CHECK (end_time > start_time),
    CONSTRAINT ck_flight_status CHECK (status IN ('PENDING','APPROVED','REJECTED','ACTIVE','COMPLETED','CANCELLED'))
);

CREATE TABLE dbo.system_logs (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    deleted_at DATETIME2(6) NULL,
    deleted_by UNIQUEIDENTIFIER NULL,
    is_active BIT NOT NULL DEFAULT 1,
    user_id UNIQUEIDENTIFIER NULL REFERENCES dbo.users(id),
    action_type NVARCHAR(50) NOT NULL,
    details NVARCHAR(MAX) NULL
);

CREATE INDEX ix_drones_owner ON dbo.drones(owner_id, is_active);
CREATE UNIQUE INDEX ux_users_tax_code ON dbo.users(tax_code) WHERE tax_code IS NOT NULL;
CREATE INDEX ix_flights_operator ON dbo.flight_plans(operator_id, is_active, created_at);
CREATE INDEX ix_flights_drone ON dbo.flight_plans(drone_id, status);
CREATE INDEX ix_flights_status ON dbo.flight_plans(status, is_active);
CREATE INDEX ix_logs_user ON dbo.system_logs(user_id, created_at);
CREATE INDEX ix_logs_action ON dbo.system_logs(action_type, created_at);

IF OBJECT_ID('dbo.utm_migrations', 'U') IS NULL
    CREATE TABLE dbo.utm_migrations (migration_id VARCHAR(100) NOT NULL PRIMARY KEY, applied_at DATETIME2(6) NOT NULL);
