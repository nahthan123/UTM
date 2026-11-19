package vn.utm.dto.request;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
public record UserRequest(
        @Schema(description = "UUID vai trò lấy từ GET /api/roles; chỉ ADMIN được tạo/sửa người dùng")
        @NotNull java.util.UUID roleId,
        @NotBlank @Pattern(regexp = "[a-zA-Z0-9_.-]{3,50}") String username,
        @Schema(format = "password", accessMode = Schema.AccessMode.WRITE_ONLY, description = "Bắt buộc khi tạo; bỏ trường này khi cập nhật để giữ mật khẩu")
        @Size(min = 8, max = 72) String password,
        @NotBlank @Size(max = 100) String fullName,
        @NotBlank @Email @Size(max = 100) String email,
        @NotBlank @Pattern(regexp = "^[0-9+ .-]{8,20}$") String phone,
        @Size(max = 255) String avatarUrl) {}
