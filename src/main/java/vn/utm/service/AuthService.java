package vn.utm.service;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.utm.dto.request.*;
import vn.utm.common.enums.AccountType;
import vn.utm.model.*;
import vn.utm.repository.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@Service
public class AuthService {
    public static final String SESSION_ACCOUNT_ID = "ACCOUNT_ID";
    private final UserAccountRepository users;
    private final RoleRepository roles;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthService(UserAccountRepository users, RoleRepository roles) {
        this.users = users;
        this.roles = roles;
    }

    public String hash(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new IllegalArgumentException("Mật khẩu không được vượt quá 72 byte UTF-8");
        return encoder.encode(password);
    }

    @Transactional
    public UserAccount register(RegisterRequest request) {
        AccountType type = request.accountType() == null ? AccountType.INDIVIDUAL : request.accountType();
        if (type == AccountType.BUSINESS) {
            requireText(request.companyName(), "Vui lòng nhập tên doanh nghiệp");
            requireText(request.taxCode(), "Vui lòng nhập mã số thuế");
            requireText(request.representative(), "Vui lòng nhập người đại diện");
            requireText(request.address(), "Vui lòng nhập địa chỉ doanh nghiệp");
            if (users.findByTaxCodeIgnoreCase(request.taxCode().trim()).isPresent())
                throw new IllegalArgumentException("Mã số thuế đã được đăng ký");
        } else {
            requireText(request.fullName(), "Vui lòng nhập họ và tên");
        }
        String username = request.username().trim();
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (users.findByUsernameIgnoreCase(username).isPresent() || users.findByEmailIgnoreCase(email).isPresent())
            throw new IllegalArgumentException("Tên đăng nhập hoặc email đã được sử dụng");
        Role role = roles.findByCode("OPERATOR").filter(r -> r.isActive() && r.getDeletedAt() == null)
                .orElseThrow(() -> new IllegalStateException("Vai trò OPERATOR chưa sẵn sàng"));
        UserAccount user = new UserAccount();
        user.setRole(role);
        user.setUsername(username);
        user.setPasswordHash(hash(request.password()));
        user.setAccountType(type);
        user.setFullName(type == AccountType.BUSINESS ? request.representative().trim() : request.fullName().trim());
        user.setNationalId(type == AccountType.INDIVIDUAL ? trimToNull(request.nationalId()) : null);
        if (type == AccountType.BUSINESS) {
            user.setCompanyName(request.companyName().trim());
            user.setTaxCode(request.taxCode().trim().toUpperCase(Locale.ROOT));
            user.setRepresentative(request.representative().trim());
            user.setLicenseNumber(trimToNull(request.licenseNumber()));
        }
        user.setAddress(trimToNull(request.address()));
        user.setEmail(email);
        user.setPhone(request.phone().trim());
        user.setAvatarUrl(request.avatarUrl());
        users.saveAndFlush(user);
        user.recordActor(user.getId());
        return user;
    }

    private void requireText(String value, String message) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(message);
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    // Persist failed attempts even though the request receives a 401 response.
    @Transactional(noRollbackFor = AuthRequiredException.class)
    public UserAccount login(LoginRequest request) {
        UserAccount user = users.findByUsernameIgnoreCase(request.username().trim())
                .orElseThrow(() -> new AuthRequiredException("Tên đăng nhập hoặc mật khẩu không đúng"));
        if (!usable(user)) throw new AuthRequiredException("Tài khoản không khả dụng");
        if (!encoder.matches(request.password(), user.getPasswordHash())) {
            user.setLoginFailCount(user.getLoginFailCount() + 1);
            if (user.getLoginFailCount() >= 5) user.setLocked(true);
            throw new AuthRequiredException("Tên đăng nhập hoặc mật khẩu không đúng");
        }
        user.setLoginFailCount(0);
        user.setLastLoginAt(Instant.now());
        return user;
    }

    public UserAccount requireAccount(HttpSession session) {
        Object id = session.getAttribute(SESSION_ACCOUNT_ID);
        if (!(id instanceof UUID)) throw new AuthRequiredException("Vui lòng đăng nhập");
        return users.findById((UUID) id).filter(this::usable)
                .orElseThrow(() -> new AuthRequiredException("Phiên đăng nhập không còn hợp lệ"));
    }

    public Optional<UserAccount> findAccount(HttpSession session) {
        if (session == null) return Optional.empty();
        Object id = session.getAttribute(SESSION_ACCOUNT_ID);
        if (!(id instanceof UUID)) return Optional.empty();
        return users.findById((UUID) id).filter(this::usable);
    }

    private boolean usable(UserAccount user) {
        return user.isActive() && user.getDeletedAt() == null && !user.isLocked()
                && user.getRole().isActive() && user.getRole().getDeletedAt() == null;
    }

    public boolean isStaff(UserAccount user) {
        return Set.of("ADMIN", "MANAGER").contains(user.getRole().getCode());
    }

    public void requireStaff(UserAccount user) { if (!isStaff(user)) deny(); }
    public void requireOperator(UserAccount user) { if (!user.getRole().getCode().equals("OPERATOR")) deny(); }
    public void requireAdmin(UserAccount user) { if (!user.getRole().getCode().equals("ADMIN")) deny(); }
    public void requireManager(UserAccount user) { if (!user.getRole().getCode().equals("MANAGER")) deny(); }
    public void requireOwner(UUID id, UserAccount user) {
        if (!isStaff(user) && !id.equals(user.getId())) deny();
    }
    public void deny() { throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền thực hiện thao tác"); }
}
