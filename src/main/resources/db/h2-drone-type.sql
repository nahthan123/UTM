-- Keep legacy rows unclassified until an operator supplies the actual type.
ALTER TABLE IF EXISTS drones ADD COLUMN IF NOT EXISTS drone_type VARCHAR(20)
    CHECK (drone_type IN ('MULTIROTOR', 'FIXED_WING', 'HYBRID'));
