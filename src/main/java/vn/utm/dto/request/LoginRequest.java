package vn.utm.dto.request;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
public record LoginRequest(
        @Schema(description = "Tên đăng nhập đã đăng ký, không phải email")
        @NotBlank String username,
        @Schema(description = "Mật khẩu của tài khoản", format = "password", accessMode = Schema.AccessMode.WRITE_ONLY)
        @NotBlank String password) {}
