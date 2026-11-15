package vn.utm.dto.request;
import jakarta.validation.constraints.*;
public record StatusRequest(
        @NotNull vn.utm.common.enums.FlightStatus status) {}
