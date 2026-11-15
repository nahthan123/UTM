package vn.utm.dto.response;
import java.time.Instant;
import java.util.UUID;
import vn.utm.common.enums.*;
import vn.utm.model.Drone;
public record DroneResponse(
        UUID id,
        Instant createdAt,
        Instant updatedAt,
        UUID createdBy,
        UUID updatedBy,
        Instant deletedAt,
        UUID deletedBy,
        boolean isActive,
        UserAccountResponse owner,
        String serialNumber,
        String model,
        DroneType droneType,
        Integer maxFlightTime,
        Double maxSpeed) {
    public static DroneResponse from(Drone entity) {
        if (entity == null) return null;
        return new DroneResponse(
                entity.getId(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy(),
                entity.getDeletedAt(),
                entity.getDeletedBy(),
                entity.isActive(),
                UserAccountResponse.from(entity.getOwner()),
                entity.getSerialNumber(),
                entity.getModel(),
                entity.getDroneType(),
                entity.getMaxFlightTime(),
                entity.getMaxSpeed());
    }
}
