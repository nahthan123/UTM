package vn.utm.dto.response;

import java.time.Instant;
import java.util.UUID;
import vn.utm.model.Geozone;

public record GeozoneResponse(
        UUID id,
        Instant createdAt,
        Instant updatedAt,
        UUID createdBy,
        UUID updatedBy,
        Instant deletedAt,
        UUID deletedBy,
        boolean isActive,
        String code,
        String name,
        String zoneType,
        String category,
        double centerLat,
        double centerLng,
        double radiusMeters,
        double minAltitudeM,
        double maxAltitudeM,
        Instant effectiveFrom,
        Instant effectiveTo,
        String description) {
    public static GeozoneResponse from(Geozone z) {
        if (z == null) return null;
        return new GeozoneResponse(
                z.getId(), z.getCreatedAt(), z.getUpdatedAt(), z.getCreatedBy(), z.getUpdatedBy(),
                z.getDeletedAt(), z.getDeletedBy(), z.isActive(),
                z.getCode(), z.getName(), z.getZoneType(), z.getCategory(),
                z.getCenterLat(), z.getCenterLng(), z.getRadiusMeters(),
                z.getMinAltitudeM(), z.getMaxAltitudeM(),
                z.getEffectiveFrom(), z.getEffectiveTo(), z.getDescription());
    }
}
