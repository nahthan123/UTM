-- Idempotent additive migration. Existing route altitudes remain AMSL.
-- Fresh H2 databases are created by Hibernate after this initializer.
ALTER TABLE IF EXISTS flight_plans ADD COLUMN IF NOT EXISTS submission_id UUID;
ALTER TABLE IF EXISTS flight_plans ADD COLUMN IF NOT EXISTS uav_count INT DEFAULT 1 NOT NULL;
ALTER TABLE IF EXISTS flight_plans ADD COLUMN IF NOT EXISTS departure_name VARCHAR(255);
ALTER TABLE IF EXISTS flight_plans ADD COLUMN IF NOT EXISTS destination_name VARCHAR(255);
ALTER TABLE IF EXISTS flight_plans ADD COLUMN IF NOT EXISTS altitude_reference VARCHAR(10) DEFAULT 'AMSL' NOT NULL;
ALTER TABLE IF EXISTS flight_plans ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP(6);
ALTER TABLE IF EXISTS flight_plans ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE IF EXISTS flight_plans ADD COLUMN IF NOT EXISTS review_note VARCHAR(1000);
