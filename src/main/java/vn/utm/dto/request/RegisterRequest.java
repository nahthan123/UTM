package vn.utm.dto.request;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
@Schema(description = "Cá nhân cần fullName. Doanh nghiệp cần accountType=BUSINESS, companyName, taxCode, representative và address. Tài khoản luôn nhận OPERATOR")
public record RegisterRequest(
        @NotBlank @Pattern(regexp = "[a-zA-Z0-9_.-]{3,50}") String username,
        @Schema(format = "password", accessMode = Schema.AccessMode.WRITE_ONLY, description = "Ít nhất 8 ký tự, không quá 72 byte UTF-8")
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
