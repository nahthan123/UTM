package vn.utm.controller;

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
public class AuthController {
    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request, HttpServletRequest servletRequest) {
        UserAccount account = auth.register(request);
        HttpSession session = servletRequest.getSession(true);
        servletRequest.changeSessionId();
        session.setAttribute(AuthService.SESSION_ACCOUNT_ID, account.getId());
        return AuthResponse.from(account);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        UserAccount account = auth.login(request);
        HttpSession session = servletRequest.getSession(true);
        servletRequest.changeSessionId();
        session.setAttribute(AuthService.SESSION_ACCOUNT_ID, account.getId());
        return AuthResponse.from(account);
    }

    @GetMapping("/me")
    public AuthResponse me(HttpSession session) {
        return AuthResponse.from(auth.requireAccount(session));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpSession session) {
        session.invalidate();
    }
}
