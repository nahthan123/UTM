package vn.utm.service;

import jakarta.servlet.http.HttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.utm.domain.*;
import vn.utm.repository.*;
import vn.utm.web.dto.*;

@Service
public class AuthService {
    public static final String SESSION_ACCOUNT_ID = "ACCOUNT_ID";
    private final UserAccountRepository accounts;
    private final CompanyRepository companies;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthService(UserAccountRepository accounts, CompanyRepository companies) {
        this.accounts = accounts;
        this.companies = companies;
    }

    @Transactional
    public UserAccount register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (accounts.existsByEmailIgnoreCase(email)) throw new IllegalArgumentException("Email đã được sử dụng");
        validateTypeFields(request);
        String identityCode = request.accountType() == AccountType.BUSINESS ? request.taxCode().trim() : request.nationalId().trim();
        if (companies.existsByTaxCode(identityCode)) throw new IllegalArgumentException("Mã định danh đã được đăng ký");

        CompanyProfile profile = new CompanyProfile();
        profile.setCompanyName(request.accountType() == AccountType.BUSINESS ? request.companyName().trim() : request.fullName().trim());
        profile.setTaxCode(identityCode);
        profile.setRepresentative(request.accountType() == AccountType.BUSINESS ? request.representative().trim() : request.fullName().trim());
        profile.setEmail(email);
        profile.setPhone(request.phone().trim());
        profile.setAddress(request.address().trim());
        profile.setLicenseNumber(request.licenseNumber());
        profile = companies.save(profile);

        UserAccount account = new UserAccount();
        account.setEmail(email);
        account.setPasswordHash(passwordEncoder.encode(request.password()));
        account.setAccountType(request.accountType());
        account.setPhone(request.phone().trim());
        account.setAddress(request.address().trim());
        account.setFullName(trimToNull(request.fullName()));
        account.setNationalId(trimToNull(request.nationalId()));
        account.setCompanyName(trimToNull(request.companyName()));
        account.setTaxCode(trimToNull(request.taxCode()));
        account.setRepresentative(trimToNull(request.representative()));
        account.setLicenseNumber(trimToNull(request.licenseNumber()));
        account.setOperatorProfile(profile);
        return accounts.save(account);
    }

    public UserAccount login(LoginRequest request) {
        UserAccount account = accounts.findByEmailIgnoreCase(request.email().trim())
                .orElseThrow(() -> new AuthRequiredException("Email hoặc mật khẩu không đúng"));
        if (!passwordEncoder.matches(request.password(), account.getPasswordHash()))
            throw new AuthRequiredException("Email hoặc mật khẩu không đúng");
        return account;
    }

    public UserAccount requireAccount(HttpSession session) {
        Object id = session.getAttribute(SESSION_ACCOUNT_ID);
        if (!(id instanceof Long accountId)) throw new AuthRequiredException("Vui lòng đăng nhập để tiếp tục");
        return accounts.findById(accountId).orElseThrow(() -> new AuthRequiredException("Phiên đăng nhập không còn hợp lệ"));
    }

    private void validateTypeFields(RegisterRequest request) {
        if (request.accountType() == AccountType.INDIVIDUAL) {
            requireText(request.fullName(), "Vui lòng nhập họ và tên");
            requireText(request.nationalId(), "Vui lòng nhập CCCD/Hộ chiếu");
        } else {
            requireText(request.companyName(), "Vui lòng nhập tên doanh nghiệp");
            requireText(request.taxCode(), "Vui lòng nhập mã số thuế");
            requireText(request.representative(), "Vui lòng nhập người đại diện");
        }
    }

    private void requireText(String value, String message) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(message);
    }
    private String trimToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
