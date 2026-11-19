package vn.utm.dto.request;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BatchFlightRequest(
        @NotEmpty @Size(max = 50) List<@NotNull UUID> droneIds,
        @NotNull @Future Instant startTime,
        @NotNull @Future Instant endTime,
        @NotBlank @Size(max = 1000000) String trajectoryJson,
        @NotBlank @Size(max = 255) String departureName,
        @NotBlank @Size(max = 255) String destinationName) {}
