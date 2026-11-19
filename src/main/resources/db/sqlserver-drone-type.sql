-- Safe for both existing and not-yet-created tables; never guess legacy types.
IF OBJECT_ID('dbo.drones', 'U') IS NOT NULL AND COL_LENGTH('dbo.drones', 'drone_type') IS NULL
    ALTER TABLE dbo.drones ADD drone_type NVARCHAR(20) NULL
        CONSTRAINT ck_drones_type CHECK (drone_type IN ('MULTIROTOR', 'FIXED_WING', 'HYBRID'));
