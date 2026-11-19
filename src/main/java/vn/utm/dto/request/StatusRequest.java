package vn.utm.dto.request;
import jakarta.validation.constraints.*;
public record StatusRequest(
        @NotNull vn.utm.common.enums.FlightStatus status,
        @Size(max = 1000) String reviewNote) {
    public StatusRequest(vn.utm.common.enums.FlightStatus status) { this(status, null); }
}
