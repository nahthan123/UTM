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
    private final GeozoneRepository geozones;
    private final AuthService auth;
    @Value("${utm.bootstrap.username:}") private String username;
    @Value("${utm.bootstrap.password:}") private String password;
    @Value("${utm.bootstrap.manager-username:}") private String managerUsername;
    @Value("${utm.bootstrap.manager-password:}") private String managerPassword;

    public InitialData(RoleRepository roles, UserAccountRepository users, GeozoneRepository geozones, AuthService auth) {
        this.roles = roles;
        this.users = users;
        this.geozones = geozones;
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
        seedStaffAccount(username, password, "Quản trị viên", "ADMIN");
        seedStaffAccount(managerUsername, managerPassword, "Quản lý Không phận (Nhà nước)", "MANAGER");
        seedDefaultGeozones();
    }

    private void seedStaffAccount(String targetUser, String targetPass, String fullName, String roleCode) {
        if (!targetUser.isBlank() && users.findByUsernameIgnoreCase(targetUser).isEmpty()) {
            if (!targetUser.matches("[a-zA-Z0-9_.-]{3,50}") || targetPass.length() < 12)
                throw new IllegalArgumentException("Bootstrap cần username hợp lệ và mật khẩu từ 12 ký tự");
            UserAccount user = new UserAccount();
            user.setUsername(targetUser); user.setPasswordHash(auth.hash(targetPass));
            user.setFullName(fullName); user.setEmail(targetUser + "@localhost"); user.setPhone("00000000");
            user.setRole(roles.findByCode(roleCode).orElseThrow());
            users.save(user);
        }
    }

    private void seedDefaultGeozones() {
        if (geozones.count() > 0) return;
        saveZone("NFZ-DAD-AIRPORT", "Vùng cấm bay Sân bay Quốc tế Đà Nẵng", "NFZ", "STATIC",
                16.0439, 108.1994, 2500.0, 0.0, 500.0, "Cấm toàn bộ UAV dân sự cất cánh/xâm nhập hành lang cất hạ cánh sân bay.");
        saveZone("NFZ-SONTRA-MIL", "Vùng cấm bay Quân sự Bán đảo Sơn Trà", "NFZ", "STATIC",
                16.1150, 108.2650, 1800.0, 0.0, 400.0, "Khu vực quốc phòng đặc biệt trên bán đảo Sơn Trà.");
        saveZone("RES-HAN-CENTER", "Vùng hạn chế Trung tâm Hành chính & Cầu Rồng", "RESTRICTED", "STATIC",
                16.0678, 108.2225, 750.0, 0.0, 120.0, "Khu vực đô thị đông dân cư; giới hạn trần bay tối đa 120m AGL.");
    }

    private void saveZone(String code, String name, String zoneType, String category,
            double lat, double lng, double radius, double minAlt, double maxAlt, String description) {
        Geozone z = new Geozone();
        z.setCode(code); z.setName(name); z.setZoneType(zoneType); z.setCategory(category);
        z.setCenterLat(lat); z.setCenterLng(lng); z.setRadiusMeters(radius);
        z.setMinAltitudeM(minAlt); z.setMaxAltitudeM(maxAlt); z.setDescription(description);
        geozones.save(z);
    }
}
