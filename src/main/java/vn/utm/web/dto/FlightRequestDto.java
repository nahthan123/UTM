package vn.utm.web.dto;

import jakarta.validation.constraints.*;
import vn.utm.domain.DroneType;
import java.time.LocalDateTime;

public record FlightRequestDto(
        @NotNull Long companyId,
        @NotBlank String missionName,
        @NotBlank String departureLocation,
        @NotBlank String destinationLocation,
        @NotNull DroneType droneType,
        @NotNull @Future LocalDateTime scheduledAt,
        @NotNull @Min(20) @Max(120) Integer altitude,
        @NotNull @Min(5) @Max(240) Integer estimatedDuration) {}
