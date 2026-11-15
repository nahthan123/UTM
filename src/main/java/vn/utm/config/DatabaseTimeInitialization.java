package vn.utm.config;

import javax.sql.DataSource;
import org.springframework.boot.jdbc.init.DataSourceScriptDatabaseInitializer;
import org.springframework.boot.sql.init.DatabaseInitializationSettings;
import org.springframework.boot.sql.init.DatabaseInitializationMode;
import org.springframework.context.annotation.*;
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
        settings.setSchemaLocations(List.of("classpath:db/" + platform + "-time-marker.sql"));
        return new DataSourceScriptDatabaseInitializer(source, settings) {
            @Override public boolean initializeDatabase() {
                boolean initialized = super.initializeDatabase();
                new UtcDataMigration(source).migrate();
                // Add classification after the pre-migration backup and UTC conversion.
                var resource = new org.springframework.core.io.ClassPathResource("db/" + platform + "-drone-type.sql");
                new org.springframework.jdbc.datasource.init.ResourceDatabasePopulator(resource).execute(source);
                return initialized;
            }
        };
    }
}
