package vn.utm.dto.response;
import java.time.Instant;
import java.util.UUID;
import vn.utm.common.enums.*;
import vn.utm.model.UserAccount;
public record UserAccountResponse(
        UUID id,
        Instant createdAt,
        Instant updatedAt,
        UUID createdBy,
        UUID updatedBy,
        Instant deletedAt,
        UUID deletedBy,
        boolean isActive,
        AccountType accountType,
        String nationalId,
        String companyName,
        String taxCode,
        String representative,
        String address,
        String licenseNumber,
        RoleResponse role,
        String username,
        String fullName,
        String email,
        String phone,
        String avatarUrl,
        Instant lastLoginAt,
        boolean isLocked,
        int loginFailCount) {
    public static UserAccountResponse from(UserAccount entity) {
        if (entity == null) return null;
        return new UserAccountResponse(
                entity.getId(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy(),
                entity.getDeletedAt(),
                entity.getDeletedBy(),
                entity.isActive(),
                entity.getAccountType(),
                entity.getNationalId(),
                entity.getCompanyName(),
                entity.getTaxCode(),
                entity.getRepresentative(),
                entity.getAddress(),
                entity.getLicenseNumber(),
                RoleResponse.from(entity.getRole()),
                entity.getUsername(),
                entity.getFullName(),
                entity.getEmail(),
                entity.getPhone(),
                entity.getAvatarUrl(),
                entity.getLastLoginAt(),
                entity.isLocked(),
                entity.getLoginFailCount());
    }
}
