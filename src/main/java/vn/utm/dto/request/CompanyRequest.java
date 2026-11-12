package vn.utm.dto.request;

import jakarta.validation.constraints.*;

public record CompanyRequest(
                @NotBlank String companyName,
                @NotBlank String taxCode,
                @NotBlank String representative,
                @Email @NotBlank String email,
                @Pattern(regexp = "^[0-9+ .-]{8,15}$", message = "Số điện thoại không hợp lệ") String phone,
                @NotBlank String address,
                String licenseNumber) {
}
