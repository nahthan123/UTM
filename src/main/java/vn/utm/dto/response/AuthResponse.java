package vn.utm.dto.response;
import java.util.UUID;
import vn.utm.model.UserAccount;
public record AuthResponse(UUID id, String username, String fullName, String email, String role,
                           vn.utm.common.enums.AccountType accountType, String displayName,
                           String companyName, String taxCode, String representative, String address, String licenseNumber) {
    public static AuthResponse from(UserAccount account) {
        return new AuthResponse(account.getId(), account.getUsername(), account.getFullName(),
                account.getEmail(), account.getRole().getCode(), account.getAccountType(), account.displayName(),
                account.getCompanyName(), account.getTaxCode(), account.getRepresentative(),
                account.getAddress(), account.getLicenseNumber());
    }
}
