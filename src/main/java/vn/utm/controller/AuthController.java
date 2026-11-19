package vn.utm.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import vn.utm.dto.request.LoginRequest;
import vn.utm.dto.request.RegisterRequest;
import vn.utm.dto.response.AuthResponse;
import vn.utm.model.UserAccount;
import vn.utm.service.AuthService;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Xác thực", description = "Đăng nhập tạo cookie phiên JSESSIONID; trình duyệt tự gửi cookie cho các API tiếp theo.")
public class AuthController {
    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/register")
    @Operation(summary = "Đăng ký người vận hành", description = "Tạo tài khoản cá nhân/doanh nghiệp với vai trò OPERATOR và đăng nhập ngay. Không nhận quyền ADMIN từ request.")
    @SecurityRequirements
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request, @Parameter(hidden = true) HttpServletRequest servletRequest) {
        UserAccount account = auth.register(request);
        HttpSession session = servletRequest.getSession(true);
        servletRequest.changeSessionId();
        session.setAttribute(AuthService.SESSION_ACCOUNT_ID, account.getId());
        return AuthResponse.from(account);
    }

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập", description = "Dùng Try it out với username và password hiện có. Cookie HttpOnly được trình duyệt lưu để thử các API cùng website; không nhập JWT hoặc cookie vào Authorize.")
    @SecurityRequirements
    public AuthResponse login(@Valid @RequestBody LoginRequest request, @Parameter(hidden = true) HttpServletRequest servletRequest) {
        UserAccount account = auth.login(request);
        HttpSession session = servletRequest.getSession(true);
        servletRequest.changeSessionId();
        session.setAttribute(AuthService.SESSION_ACCOUNT_ID, account.getId());
        return AuthResponse.from(account);
    }

    @GetMapping("/me")
    @Operation(summary = "Xem tài khoản đang đăng nhập")
    public AuthResponse me(@Parameter(hidden = true) HttpSession session) {
        return AuthResponse.from(auth.requireAccount(session));
    }

    @PostMapping("/logout")
    @Operation(summary = "Đăng xuất", description = "Hủy phiên hiện tại. Muốn thử API theo tài khoản khác, đăng xuất rồi đăng nhập lại.")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Parameter(hidden = true) HttpSession session) {
        session.invalidate();
    }
}
