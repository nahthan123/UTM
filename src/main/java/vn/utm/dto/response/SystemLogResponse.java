package vn.utm.dto.response;
import java.time.Instant;
import java.util.UUID;
import vn.utm.common.enums.*;
import vn.utm.model.SystemLog;
public record SystemLogResponse(
        UUID id,
        Instant createdAt,
        Instant updatedAt,
        UUID createdBy,
        UUID updatedBy,
        Instant deletedAt,
        UUID deletedBy,
        boolean isActive,
        UserAccountResponse user,
        String actionType,
        String details) {
    public static SystemLogResponse from(SystemLog entity) {
        if (entity == null) return null;
        return new SystemLogResponse(
                entity.getId(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy(),
                entity.getDeletedAt(),
                entity.getDeletedBy(),
                entity.isActive(),
                UserAccountResponse.from(entity.getUser()),
                entity.getActionType(),
                entity.getDetails());
    }
}
