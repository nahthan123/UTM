package vn.utm.common;
import java.time.*;
public final class UtcTime {
    private UtcTime() {}
    public static Instant parse(String value) {
        try { return OffsetDateTime.parse(value).toInstant(); }
        catch (java.time.format.DateTimeParseException ex) {
            return LocalDateTime.parse(value).toInstant(ZoneOffset.ofHours(7));
        }
    }
}
