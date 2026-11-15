package vn.utm.dto.request;
import jakarta.validation.constraints.*;
public record UserRequest(
        @NotNull java.util.UUID roleId,
        @NotBlank @Pattern(regexp = "[a-zA-Z0-9_.-]{3,50}") String username,
        @Size(min = 8, max = 72) String password,
        @NotBlank @Size(max = 100) String fullName,
        @NotBlank @Email @Size(max = 100) String email,
        @NotBlank @Pattern(regexp = "^[0-9+ .-]{8,20}$") String phone,
        @Size(max = 255) String avatarUrl) {}
