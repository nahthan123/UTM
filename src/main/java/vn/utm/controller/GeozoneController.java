package vn.utm.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.utm.dto.request.GeozoneRequest;
import vn.utm.dto.response.*;
import vn.utm.service.*;

@RestController
@RequestMapping("/api/geozones")
@Tag(name = "Vùng cấm bay", description = "Geozones tĩnh (NFZ/Restricted) và động (UVR/TFR): MANAGER toàn quyền CRUD; ADMIN & OPERATOR xem để đối chiếu.")
public class GeozoneController {
    private final GeozoneService service;
    private final AuthService auth;

    public GeozoneController(GeozoneService service, AuthService auth) {
        this.service = service;
        this.auth = auth;
    }

    @GetMapping
    @Operation(summary = "Tra cứu vùng cấm/hạn chế bay", description = "Tất cả vai trò đã đăng nhập đều xem được vùng cấm/hạn chế.")
    @Parameters({
        @Parameter(name = "page", in = ParameterIn.QUERY, schema = @Schema(type = "integer", minimum = "0", defaultValue = "0")),
        @Parameter(name = "size", in = ParameterIn.QUERY, schema = @Schema(type = "integer", minimum = "1", maximum = "100", defaultValue = "10")),
        @Parameter(name = "sort", in = ParameterIn.QUERY, schema = @Schema(type = "string", defaultValue = "created_at,desc")),
        @Parameter(name = "isActive", in = ParameterIn.QUERY, schema = @Schema(type = "boolean", defaultValue = "true")),
        @Parameter(name = "zoneType", in = ParameterIn.QUERY, schema = @Schema(type = "string")),
        @Parameter(name = "category", in = ParameterIn.QUERY, schema = @Schema(type = "string")),
        @Parameter(name = "keyword", in = ParameterIn.QUERY, schema = @Schema(type = "string"))
    })
    public PageResponse<GeozoneResponse> list(@Parameter(hidden = true) @RequestParam Map<String, String> params,
            @Parameter(hidden = true) HttpSession session) {
        return service.list(params, auth.requireAccount(session)).map(GeozoneResponse::from);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết vùng cấm/hạn chế bay")
    public GeozoneResponse get(@PathVariable UUID id, @Parameter(hidden = true) HttpSession session) {
        auth.requireAccount(session);
        return GeozoneResponse.from(service.get(id));
    }

    @PostMapping
    @Operation(summary = "Tạo vùng cấm/hạn chế mới", description = "Chỉ MANAGER (Nhà nước).")
    @ResponseStatus(HttpStatus.CREATED)
    public GeozoneResponse create(@Valid @RequestBody GeozoneRequest request, @Parameter(hidden = true) HttpSession session) {
        return GeozoneResponse.from(service.save(null, request, auth.requireAccount(session)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật vùng cấm/hạn chế", description = "Chỉ MANAGER (Nhà nước).")
    public GeozoneResponse update(@PathVariable UUID id, @Valid @RequestBody GeozoneRequest request,
            @Parameter(hidden = true) HttpSession session) {
        return GeozoneResponse.from(service.save(id, request, auth.requireAccount(session)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa mềm vùng cấm/hạn chế", description = "Chỉ MANAGER (Nhà nước).")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, @Parameter(hidden = true) HttpSession session) {
        service.changeActive(id, false, auth.requireAccount(session));
    }

    @PutMapping("/{id}/restore")
    @Operation(summary = "Khôi phục vùng cấm/hạn chế", description = "Chỉ MANAGER (Nhà nước).")
    public GeozoneResponse restore(@PathVariable UUID id, @Parameter(hidden = true) HttpSession session) {
        return GeozoneResponse.from(service.changeActive(id, true, auth.requireAccount(session)));
    }
}
