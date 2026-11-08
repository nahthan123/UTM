package vn.utm.web.dto;

import jakarta.validation.constraints.*;
import vn.utm.domain.AccountType;

public record RegisterRequest(
        @NotNull AccountType accountType,
        @Email @NotBlank String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @Pattern(regexp = "^[0-9+ .-]{8,15}$", message = "Số điện thoại không hợp lệ") String phone,
        @NotBlank String address,
        String fullName,
        String nationalId,
        String companyName,
        String taxCode,
        String representative,
        String licenseNumber) {}
