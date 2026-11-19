package vn.utm.config;

import javax.sql.DataSource;
import org.springframework.boot.jdbc.init.DataSourceScriptDatabaseInitializer;
import org.springframework.boot.sql.init.DatabaseInitializationSettings;
import org.springframework.boot.sql.init.DatabaseInitializationMode;
import org.springframework.context.annotation.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import java.util.List;
import vn.utm.service.UtcDataMigration;

@Configuration
@org.springframework.boot.autoconfigure.EnableAutoConfiguration(exclude = org.springframework.boot.autoconfigure.sql.init.SqlInitializationAutoConfiguration.class)
public class DatabaseTimeInitialization {
    @Bean
    public DataSourceScriptDatabaseInitializer dataSourceScriptDatabaseInitializer(DataSource source) throws java.sql.SQLException {
        String product;
        try (var connection = source.getConnection()) { product = connection.getMetaData().getDatabaseProductName(); }
        DatabaseInitializationSettings settings = new DatabaseInitializationSettings();
        settings.setMode(DatabaseInitializationMode.ALWAYS);
        String platform = product.equals("H2") ? "h2" : "sqlserver";
        if (platform.equals("sqlserver")) settings.setSeparator(ScriptUtils.EOF_STATEMENT_SEPARATOR);
        settings.setSchemaLocations(List.of("classpath:db/" + platform + "-time-marker.sql"));
        return new DataSourceScriptDatabaseInitializer(source, settings) {
            @Override public boolean initializeDatabase() {
                boolean initialized = super.initializeDatabase();
                new UtcDataMigration(source).migrate();
                // Add classification after the pre-migration backup and UTC conversion.
                migrationPopulator(platform, "drone-type").execute(source);
                migrationPopulator(platform, "flight-integration").execute(source);
                return initialized;
            }
        };
    }

    static ResourceDatabasePopulator migrationPopulator(String platform, String migration) {
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator(
                new ClassPathResource("db/" + platform + "-" + migration + ".sql"));
        // JDBC accepts T-SQL batches; inner semicolons do not end IF/BEGIN/END blocks.
        // These startup scripts contain no SSMS GO directives and run as one batch each.
        if (platform.equals("sqlserver")) populator.setSeparator(ScriptUtils.EOF_STATEMENT_SEPARATOR);
        return populator;
    }
}
