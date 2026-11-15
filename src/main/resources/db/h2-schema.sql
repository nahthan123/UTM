-- Apply ONCE to a new, empty H2 database. Existing tables/data are not migrated.

CREATE TABLE roles (
    id UUID NOT NULL PRIMARY KEY,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMP(6) NULL,
    deleted_by UUID NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE users (
    id UUID NOT NULL PRIMARY KEY,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMP(6) NULL,
    deleted_by UUID NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    role_id UUID NOT NULL REFERENCES roles(id),
    account_type VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL'
        CHECK (account_type IN ('INDIVIDUAL', 'BUSINESS')),
    national_id VARCHAR(50) NULL,
    company_name VARCHAR(255) NULL,
    tax_code VARCHAR(50) NULL,
    representative VARCHAR(100) NULL,
    address VARCHAR(255) NULL,
    license_number VARCHAR(100) NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    avatar_url VARCHAR(255) NULL,
    last_login_at TIMESTAMP(6) NULL,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    login_fail_count INT NOT NULL DEFAULT 0
);

CREATE TABLE drones (
    id UUID NOT NULL PRIMARY KEY,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMP(6) NULL,
    deleted_by UUID NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    owner_id UUID NOT NULL REFERENCES users(id),
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    model VARCHAR(100) NOT NULL,
    drone_type VARCHAR(20) NULL CONSTRAINT ck_drones_type CHECK (drone_type IN ('MULTIROTOR', 'FIXED_WING', 'HYBRID')),
    max_flight_time INT NOT NULL CHECK (max_flight_time > 0),
    max_speed DOUBLE PRECISION NOT NULL CHECK (max_speed > 0)
);

CREATE TABLE flight_plans (
    id UUID NOT NULL PRIMARY KEY,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMP(6) NULL,
    deleted_by UUID NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    drone_id UUID NOT NULL REFERENCES drones(id),
    operator_id UUID NOT NULL REFERENCES users(id),
    start_time TIMESTAMP(6) NOT NULL,
    end_time TIMESTAMP(6) NOT NULL,
    trajectory_json CLOB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    CONSTRAINT ck_flight_time CHECK (end_time > start_time),
    CONSTRAINT ck_flight_status CHECK (status IN ('PENDING','APPROVED','REJECTED','ACTIVE','COMPLETED','CANCELLED'))
);

CREATE TABLE system_logs (
    id UUID NOT NULL PRIMARY KEY,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMP(6) NULL,
    deleted_by UUID NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    user_id UUID NULL REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL,
    details CLOB NULL
);

CREATE INDEX ix_drones_owner ON drones(owner_id, is_active);
CREATE UNIQUE INDEX ux_users_tax_code ON users(tax_code);
CREATE INDEX ix_flights_operator ON flight_plans(operator_id, is_active, created_at);
CREATE INDEX ix_flights_drone ON flight_plans(drone_id, status);
CREATE INDEX ix_flights_status ON flight_plans(status, is_active);
CREATE INDEX ix_logs_user ON system_logs(user_id, created_at);
CREATE INDEX ix_logs_action ON system_logs(action_type, created_at);

CREATE TABLE IF NOT EXISTS utm_migrations (migration_id VARCHAR(100) PRIMARY KEY, applied_at TIMESTAMP NOT NULL);
