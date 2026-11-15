package vn.utm.dto.request;
import jakarta.validation.constraints.*;
public record FlightRequestDto(
        @NotNull java.util.UUID droneId,
        @NotNull @Future java.time.Instant startTime,
        @NotNull @Future java.time.Instant endTime,
        @NotBlank @Size(max = 1000000) String trajectoryJson) {}
