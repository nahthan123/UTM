package vn.utm.dto.response;
import java.time.Instant;
import java.util.UUID;
import vn.utm.common.enums.*;
import vn.utm.model.Role;
public record RoleResponse(
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
        String description,
        boolean isSystem) {
    public static RoleResponse from(Role entity) {
        if (entity == null) return null;
        return new RoleResponse(
                entity.getId(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy(),
                entity.getDeletedAt(),
                entity.getDeletedBy(),
                entity.isActive(),
                entity.getCode(),
                entity.getName(),
                entity.getDescription(),
                entity.isSystem());
    }
}
