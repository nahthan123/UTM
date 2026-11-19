package vn.utm;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import vn.utm.service.UtcDataMigration;
import static org.junit.jupiter.api.Assertions.*;

@org.junit.jupiter.api.extension.ExtendWith(org.springframework.boot.test.system.OutputCaptureExtension.class)
class UtcDataMigrationTests {
    @org.junit.jupiter.api.io.TempDir java.nio.file.Path directory;
    private DriverManagerDataSource source() {
        return new DriverManagerDataSource("jdbc:h2:mem:migration-" + java.util.UUID.randomUUID() + ";DB_CLOSE_DELAY=-1", "sa", "");
    }
    private JdbcTemplate prepare(DriverManagerDataSource source, String json) {
        JdbcTemplate jdbc = new JdbcTemplate(source);
        jdbc.execute("CREATE TABLE utm_migrations(migration_id VARCHAR(100) PRIMARY KEY, applied_at TIMESTAMP NOT NULL)");
        jdbc.execute("CREATE TABLE flight_plans(id INT PRIMARY KEY, created_at TIMESTAMP, updated_at TIMESTAMP, deleted_at TIMESTAMP, start_time TIMESTAMP, end_time TIMESTAMP, trajectory_json CLOB)");
        jdbc.update("INSERT INTO flight_plans VALUES(1, TIMESTAMP '2027-01-01 09:00:00', TIMESTAMP '2027-01-01 09:00:00', NULL, TIMESTAMP '2027-01-01 09:00:00', TIMESTAMP '2027-01-01 09:20:00', ?)", json);
        return jdbc;
    }
    @Test void convertsExactlyOnceIncludingAuditAndTrajectory() {
        var source = source();
        var jdbc = prepare(source, "[{\"time\":\"2027-01-01T09:00:00\"},{\"time\":\"2027-01-01T09:20:00+07:00\"}]");
        new UtcDataMigration(source).migrate();
        assertEquals("2027-01-01T02:00", jdbc.queryForObject("SELECT start_time FROM flight_plans", java.time.LocalDateTime.class).toString());
        assertEquals(jdbc.queryForObject("SELECT start_time FROM flight_plans", java.time.LocalDateTime.class), jdbc.queryForObject("SELECT created_at FROM flight_plans", java.time.LocalDateTime.class));
        String json = jdbc.queryForObject("SELECT trajectory_json FROM flight_plans", String.class);
        assertTrue(json.contains("2027-01-01T02:00:00Z"));
        new UtcDataMigration(source).migrate();
        assertEquals("2027-01-01T02:00", jdbc.queryForObject("SELECT start_time FROM flight_plans", java.time.LocalDateTime.class).toString());
        assertEquals(json, jdbc.queryForObject("SELECT trajectory_json FROM flight_plans", String.class));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM utm_migrations", Integer.class));
    }
    @Test void malformedTrajectoryRollsBackMarkerAndAllUpdates() {
        var source = source(); var jdbc = prepare(source, "broken-json");
        assertThrows(IllegalStateException.class, () -> new UtcDataMigration(source).migrate());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM utm_migrations", Integer.class));
        assertEquals("2027-01-01T09:00", jdbc.queryForObject("SELECT start_time FROM flight_plans", java.time.LocalDateTime.class).toString());
    }

    @Test void droneTypeSchemaUpgradePreservesLegacyRowsAndCanRunTwice() {
        var source = source(); var jdbc = new JdbcTemplate(source);
        jdbc.execute("CREATE TABLE drones(id INT PRIMARY KEY, model VARCHAR(100))");
        jdbc.update("INSERT INTO drones VALUES(1, 'Legacy UAV')");
        var script = new org.springframework.jdbc.datasource.init.ResourceDatabasePopulator(
                new org.springframework.core.io.ClassPathResource("db/h2-drone-type.sql"));
        script.execute(source); script.execute(source);
        assertNull(jdbc.queryForObject("SELECT drone_type FROM drones WHERE id=1", String.class));
        assertEquals("Legacy UAV", jdbc.queryForObject("SELECT model FROM drones WHERE id=1", String.class));
        jdbc.update("UPDATE drones SET drone_type='HYBRID' WHERE id=1");
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE drones SET drone_type='INVALID' WHERE id=1"));
    }

    @Test void fullH2SchemaCreatesFiveBusinessTablesAndMigrationMarker() {
        var source = source();
        new org.springframework.jdbc.datasource.init.ResourceDatabasePopulator(
                new org.springframework.core.io.ClassPathResource("db/h2-schema.sql")).execute(source);
        var jdbc = new JdbcTemplate(source);
        for (String table : java.util.List.of("users", "roles", "drones", "flight_plans", "system_logs", "utm_migrations"))
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class));
        new UtcDataMigration(source).migrate();
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM utm_migrations", Integer.class));
    }

    @Test void fileDatabaseBackupCanRestoreOriginalBeforeMigration(org.springframework.boot.test.system.CapturedOutput output) throws Exception {
        var file = new DriverManagerDataSource("jdbc:h2:file:" + directory.resolve("utm-v2-db").toString().replace('\\', '/'), "sa", "");
        prepare(file, "[{\"time\":\"2027-01-01T09:00:00\"}]");
        new UtcDataMigration(file).migrate();
        var match = java.util.regex.Pattern.compile("Pre-migration H2 SQL backup: ([^\\r\\n]+)").matcher(output.getAll());
        assertTrue(match.find(), "Backup path must be reported");
        var backup = java.nio.file.Path.of(match.group(1).trim());
        assertTrue(java.nio.file.Files.isRegularFile(backup));
        try {
            var restored = new JdbcTemplate(source());
            restored.execute("RUNSCRIPT FROM '" + backup.toString().replace("'", "''") + "'");
            assertEquals("2027-01-01T09:00", restored.queryForObject("SELECT start_time FROM flight_plans", java.time.LocalDateTime.class).toString());
            assertEquals(0, restored.queryForObject("SELECT COUNT(*) FROM utm_migrations", Integer.class));
        } finally { java.nio.file.Files.deleteIfExists(backup); }
    }
}
