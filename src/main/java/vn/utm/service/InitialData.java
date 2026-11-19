package vn.utm.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.utm.model.*;
import vn.utm.repository.*;

@Component
@org.springframework.core.annotation.Order(100)
public class InitialData implements CommandLineRunner {
    private final RoleRepository roles;
    private final UserAccountRepository users;
    private final AuthService auth;
    @Value("${utm.bootstrap.username:}") private String username;
    @Value("${utm.bootstrap.password:}") private String password;

    public InitialData(RoleRepository roles, UserAccountRepository users, AuthService auth) {
        this.roles = roles;
        this.users = users;
        this.auth = auth;
    }

    @Override
    @Transactional
    public void run(String... args) {
        for (String code : new String[]{"ADMIN", "MANAGER", "OPERATOR"}) {
            if (roles.findByCode(code).isEmpty()) {
                Role role = new Role();
                role.setCode(code); role.setName(code); role.setSystem(true);
                roles.save(role);
            }
        }
        if (!username.isBlank() && users.findByUsernameIgnoreCase(username).isEmpty()) {
            if (!username.matches("[a-zA-Z0-9_.-]{3,50}") || password.length() < 12)
                throw new IllegalArgumentException("Bootstrap cần username hợp lệ và mật khẩu từ 12 ký tự");
            UserAccount user = new UserAccount();
            user.setUsername(username); user.setPasswordHash(auth.hash(password));
            user.setFullName("Quản trị viên"); user.setEmail(username + "@localhost"); user.setPhone("00000000");
            user.setRole(roles.findByCode("ADMIN").orElseThrow());
            users.save(user);
        }
    }
}
