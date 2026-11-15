package vn.utm.dto.request;
import jakarta.validation.constraints.*;
public record RegisterRequest(
        @NotBlank @Pattern(regexp = "[a-zA-Z0-9_.-]{3,50}") String username,
        @NotBlank @Size(min = 8, max = 72) String password,
        @Size(max = 100) String fullName,
        @NotBlank @Email @Size(max = 100) String email,
        @NotBlank @Pattern(regexp = "^[0-9+ .-]{8,20}$") String phone,
        @Size(max = 255) String avatarUrl,
        vn.utm.common.enums.AccountType accountType,
        @Size(max = 50) String nationalId,
        @Size(max = 255) String companyName,
        @Size(max = 50) String taxCode,
        @Size(max = 100) String representative,
        @Size(max = 255) String address,
        @Size(max = 100) String licenseNumber) {}
