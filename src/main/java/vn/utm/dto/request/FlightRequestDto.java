package vn.utm.dto.request;
import jakarta.validation.constraints.*;
public record FlightRequestDto(
        @NotNull java.util.UUID droneId,
        @NotNull @Future java.time.Instant startTime,
        @NotNull @Future java.time.Instant endTime,
        @NotBlank @Size(max = 1000000) String trajectoryJson,
        @Size(max = 255) String departureName,
        @Size(max = 255) String destinationName) {
    public FlightRequestDto(java.util.UUID droneId, java.time.Instant startTime,
                            java.time.Instant endTime, String trajectoryJson) {
        this(droneId, startTime, endTime, trajectoryJson, null, null);
    }
}
