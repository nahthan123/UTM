package vn.utm.config;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.module.SimpleModule;
import java.io.IOException;
import java.time.*;
import org.springframework.context.annotation.*;
import vn.utm.common.UtcTime;
@Configuration
public class TimeConfiguration {
    @Bean public com.fasterxml.jackson.databind.Module utcInputModule() {
        SimpleModule module = new SimpleModule();
        module.addDeserializer(Instant.class, new JsonDeserializer<Instant>() {
            @Override public Instant deserialize(JsonParser parser, DeserializationContext context) throws IOException {
                try { return UtcTime.parse(parser.getText()); }
                catch (RuntimeException ex) { return (Instant) context.handleWeirdStringValue(Instant.class, parser.getText(), "Invalid ISO datetime"); }
            }
        });
        return module;
    }
}
