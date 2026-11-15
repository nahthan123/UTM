package vn.utm.dto.request;
import jakarta.validation.constraints.*;
public record RoleRequest(
        @NotBlank @Pattern(regexp = "[A-Z][A-Z0-9_]{0,49}") String code,
        @NotBlank @Size(max = 100) String name,
        @Size(max = 255) String description) {}
