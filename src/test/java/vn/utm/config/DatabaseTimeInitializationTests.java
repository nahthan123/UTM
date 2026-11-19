package vn.utm.config;

import java.sql.Connection;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class DatabaseTimeInitializationTests {
    private List<String> executedStatements(String platform, String migration) throws Exception {
        Connection connection = mock(Connection.class);
        Statement statement = mock(Statement.class);
        when(connection.createStatement()).thenReturn(statement);
        when(statement.getUpdateCount()).thenReturn(-1);
        List<String> executed = new ArrayList<>();
        when(statement.execute(anyString())).thenAnswer(invocation -> {
            executed.add(invocation.getArgument(0));
            return false;
        });
        // Use the same script loader as application startup, with no database connection.
        DatabaseTimeInitialization.migrationPopulator(platform, migration).populate(connection);
        return executed;
    }

    @Test void sqlServerMigrationKeepsConditionalBlocksInOneBatch() throws Exception {
        List<String> executed = executedStatements("sqlserver", "flight-integration");
        assertEquals(1, executed.size(), "T-SQL BEGIN/END blocks must not be split at inner semicolons");
        String batch = executed.getFirst().replaceAll("\\s+", " ").trim();
        assertTrue(batch.startsWith("IF OBJECT_ID('dbo.flight_plans', 'U') IS NOT NULL BEGIN"));
        assertTrue(batch.contains("ADD submission_id UNIQUEIDENTIFIER NULL;"));
        assertTrue(batch.contains("ADD review_note NVARCHAR(1000) NULL; END;"));
        assertTrue(batch.contains("CREATE TABLE dbo.integration_deliveries"));
        assertTrue(batch.contains("CREATE INDEX ix_delivery_status ON dbo.integration_deliveries(status, created_at);"));
        assertTrue(batch.endsWith("END;"));
    }

    @Test void h2MigrationStillSeparatesIndependentAlterStatements() throws Exception {
        List<String> executed = executedStatements("h2", "flight-integration");
        assertEquals(8, executed.size());
        assertTrue(executed.stream().allMatch(sql -> sql.startsWith("ALTER TABLE IF EXISTS flight_plans ADD COLUMN IF NOT EXISTS")));
        assertTrue(executed.getFirst().contains("submission_id UUID"));
        assertTrue(executed.getLast().contains("review_note VARCHAR(1000)"));
    }
}
