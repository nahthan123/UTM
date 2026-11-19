package vn.utm.service;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.utm.common.UtcTime;

/** Runs before Hibernate and seed data. Marker and conversion commit atomically. */
public class UtcDataMigration {
    public static final String ID = "utc-v1-legacy-plus07";
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper = new ObjectMapper();
    public UtcDataMigration(javax.sql.DataSource source) { jdbc = new JdbcTemplate(source); }

    public void migrate() {
        backupLegacyH2();
        new TransactionTemplate(new DataSourceTransactionManager(Objects.requireNonNull(jdbc.getDataSource())))
                .executeWithoutResult(transaction -> {
            if (!jdbc.queryForList("SELECT migration_id FROM utm_migrations WHERE migration_id = ?", ID).isEmpty()) return;
            // Claim before changes; a concurrent startup cannot also commit this migration.
            jdbc.update("INSERT INTO utm_migrations(migration_id, applied_at) VALUES (?, ?)", ID, Timestamp.from(Instant.now()));
            for (String table : List.of("roles", "users", "drones", "flight_plans", "system_logs")) {
                boolean exists = Boolean.TRUE.equals(jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Boolean>) connection -> {
                    try (var tables = connection.getMetaData().getTables(connection.getCatalog(), connection.getSchema(), null, new String[]{"TABLE"})) {
                        while (tables.next()) if (table.equalsIgnoreCase(tables.getString("TABLE_NAME"))) return true;
                        return false;
                    }
                }));
                if (!exists) continue; // New database: Hibernate creates already-UTC tables afterwards.
                List<String> columns = new ArrayList<>(List.of("created_at", "updated_at", "deleted_at"));
                if (table.equals("users")) columns.add("last_login_at");
                if (table.equals("flight_plans")) { columns.add("start_time"); columns.add("end_time"); }
                jdbc.update("UPDATE " + table + " SET " + columns.stream()
                        .map(column -> column + " = DATEADD(HOUR, -7, " + column + ")")
                        .collect(java.util.stream.Collectors.joining(", ")));
                if (table.equals("flight_plans")) {
                    jdbc.query("SELECT id, trajectory_json FROM flight_plans", (org.springframework.jdbc.core.RowCallbackHandler) row -> {
                        Object id = row.getObject("id");
                        try {
                            JsonNode points = mapper.readTree(row.getString("trajectory_json"));
                            if (!points.isArray()) throw new IllegalArgumentException("Invalid legacy trajectory");
                            for (JsonNode point : points) ((ObjectNode) point).put("time", UtcTime.parse(point.path("time").asText()).toString());
                            jdbc.update("UPDATE flight_plans SET trajectory_json = ? WHERE id = ?", mapper.writeValueAsString(points), id);
                        } catch (java.io.IOException | RuntimeException ex) {
                            throw new IllegalStateException("Cannot migrate legacy trajectory; transaction rolled back", ex);
                        }
                    });
                }
            }
        });
    }

    private void backupLegacyH2() {
        if (!jdbc.queryForList("SELECT migration_id FROM utm_migrations WHERE migration_id = ?", ID).isEmpty()) return;
        jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Void>) connection -> {
            if (connection.getMetaData().getURL().startsWith("jdbc:h2:file:")) {
                try (var tables = connection.getMetaData().getTables(connection.getCatalog(), connection.getSchema(), "FLIGHT_PLANS", new String[]{"TABLE"})) {
                    if (!tables.next()) return null;
                }
                try {
                    java.nio.file.Path backup = java.nio.file.Files.createTempFile("utm-v2-before-utc-", ".sql");
                    try (var statement = connection.createStatement()) {
                        statement.execute("SCRIPT TO '" + backup.toString().replace("'", "''") + "'");
                    }
                    org.slf4j.LoggerFactory.getLogger(UtcDataMigration.class).info("Pre-migration H2 SQL backup: {}", backup);
                } catch (java.io.IOException ex) { throw new IllegalStateException("Cannot create pre-migration backup", ex); }
            }
            return null;
        });
    }
}
