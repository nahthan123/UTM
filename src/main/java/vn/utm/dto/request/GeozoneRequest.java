package vn.utm.dto.request;

import jakarta.validation.constraints.*;
import java.time.Instant;

public record GeozoneRequest(
        @NotBlank @Size(max = 50) String code,
        @NotBlank @Size(max = 150) String name,
        @NotBlank String zoneType,
        @NotBlank String category,
        @NotNull Double centerLat,
        @NotNull Double centerLng,
        @NotNull Double radiusMeters,
        Double minAltitudeM,
        Double maxAltitudeM,
        Instant effectiveFrom,
        Instant effectiveTo,
        @Size(max = 500) String description) {}
