package vn.utm.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import vn.utm.dto.request.*;
import vn.utm.dto.response.*;
import vn.utm.model.*;
import vn.utm.service.*;
import java.util.*;

@RestController
@RequestMapping("/api")
public class UtmController {
    private final UtmService service;
    private final QueryService queries;
    private final AuthService auth;

    public UtmController(UtmService service, QueryService queries, AuthService auth) {
        this.service = service; this.queries = queries; this.auth = auth;
    }

    @GetMapping("/users")
    @Operation(tags = {"Người dùng"}, summary = "Tra cứu người dùng", description = "ADMIN/MANAGER. Lọc theo tên đăng nhập, họ tên, email và tình trạng khóa.")
    @Parameters({
        @Parameter(name = "page", in = ParameterIn.QUERY, description = "Trang bắt đầu từ 0", schema = @Schema(type = "integer", minimum = "0", defaultValue = "0")),
        @Parameter(name = "size", in = ParameterIn.QUERY, description = "Số bản ghi mỗi trang", schema = @Schema(type = "integer", minimum = "1", maximum = "100", defaultValue = "10")),
        @Parameter(name = "sort", in = ParameterIn.QUERY, description = "Dạng trường,asc hoặc trường,desc. Trường hỗ trợ: created_at, updated_at, username, full_name, email.", schema = @Schema(type = "string", defaultValue = "created_at,desc")),
        @Parameter(name = "isActive", in = ParameterIn.QUERY, description = "true: đang hiệu lực; false: ngừng hiệu lực hoặc xóa mềm", schema = @Schema(type = "boolean", defaultValue = "true")),
        @Parameter(name = "keyword", in = ParameterIn.QUERY, description = "Tìm trong username, fullName hoặc email", schema = @Schema(type = "string")),
        @Parameter(name = "isLocked", in = ParameterIn.QUERY, description = "Lọc tình trạng khóa; bỏ trống để lấy tất cả", schema = @Schema(type = "boolean"))
    })
    public PageResponse<UserAccountResponse> users(@Parameter(hidden = true) @RequestParam Map<String, String> params, @Parameter(hidden = true) HttpSession session) {
        return queries.users(params, auth.requireAccount(session)).map(UserAccountResponse::from);
    }

    @GetMapping("/users/{id}")
    @Operation(tags = {"Người dùng"}, summary = "Xem người dùng", description = "Chủ tài khoản hoặc ADMIN/MANAGER.")
    public UserAccountResponse user(@PathVariable UUID id, @Parameter(hidden = true) HttpSession session) {
        return UserAccountResponse.from(service.user(id, auth.requireAccount(session)));
    }

    @GetMapping("/roles")
    @Operation(tags = {"Vai trò"}, summary = "Tra cứu vai trò", description = "Tài khoản đã đăng nhập.")
    @Parameters({
        @Parameter(name = "page", in = ParameterIn.QUERY, description = "Trang bắt đầu từ 0", schema = @Schema(type = "integer", minimum = "0", defaultValue = "0")),
        @Parameter(name = "size", in = ParameterIn.QUERY, description = "Số bản ghi mỗi trang", schema = @Schema(type = "integer", minimum = "1", maximum = "100", defaultValue = "10")),
        @Parameter(name = "sort", in = ParameterIn.QUERY, description = "Dạng trường,asc hoặc trường,desc. Trường hỗ trợ: created_at, updated_at, code, name.", schema = @Schema(type = "string", defaultValue = "created_at,desc")),
        @Parameter(name = "isActive", in = ParameterIn.QUERY, description = "true: đang hiệu lực; false: ngừng hiệu lực hoặc xóa mềm", schema = @Schema(type = "boolean", defaultValue = "true"))
    })
    public PageResponse<RoleResponse> roles(@Parameter(hidden = true) @RequestParam Map<String, String> params, @Parameter(hidden = true) HttpSession session) {
        auth.requireAccount(session);
        return queries.roles(params).map(RoleResponse::from);
    }

    @GetMapping("/roles/{id}")
    @Operation(tags = {"Vai trò"}, summary = "Xem vai trò", description = "Tài khoản đã đăng nhập.")
    public RoleResponse role(@PathVariable UUID id, @Parameter(hidden = true) HttpSession session) {
        auth.requireAccount(session);
        return RoleResponse.from(service.role(id));
    }

    @GetMapping("/drones")
    @Operation(tags = {"UAV"}, summary = "Tra cứu UAV", description = "OPERATOR chỉ thấy UAV của mình; ADMIN/MANAGER thấy toàn hệ thống.")
    @Parameters({
        @Parameter(name = "page", in = ParameterIn.QUERY, description = "Trang bắt đầu từ 0", schema = @Schema(type = "integer", minimum = "0", defaultValue = "0")),
        @Parameter(name = "size", in = ParameterIn.QUERY, description = "Số bản ghi mỗi trang", schema = @Schema(type = "integer", minimum = "1", maximum = "100", defaultValue = "10")),
        @Parameter(name = "sort", in = ParameterIn.QUERY, description = "Dạng trường,asc hoặc trường,desc. Trường hỗ trợ: created_at, updated_at, serial_number, model.", schema = @Schema(type = "string", defaultValue = "created_at,desc")),
        @Parameter(name = "isActive", in = ParameterIn.QUERY, description = "true: đang hiệu lực; false: ngừng hiệu lực hoặc xóa mềm", schema = @Schema(type = "boolean", defaultValue = "true"))
    })
    public PageResponse<DroneResponse> drones(@Parameter(hidden = true) @RequestParam Map<String, String> params, @Parameter(hidden = true) HttpSession session) {
        return queries.drones(params, null, null, auth.requireAccount(session)).map(DroneResponse::from);
    }

    @GetMapping("/drones/{id}")
    @Operation(tags = {"UAV"}, summary = "Xem hồ sơ UAV", description = "Chủ sở hữu hoặc ADMIN/MANAGER.")
    public DroneResponse drone(@PathVariable UUID id, @Parameter(hidden = true) HttpSession session) {
        return DroneResponse.from(service.drone(id, auth.requireAccount(session)));
    }

    @GetMapping("/drones/owner/{ownerId}")
    @Operation(tags = {"UAV"}, summary = "Tra cứu UAV theo chủ sở hữu", description = "Chủ sở hữu hoặc ADMIN/MANAGER.")
    @Parameters({
        @Parameter(name = "page", in = ParameterIn.QUERY, description = "Trang bắt đầu từ 0", schema = @Schema(type = "integer", minimum = "0", defaultValue = "0")),
        @Parameter(name = "size", in = ParameterIn.QUERY, description = "Số bản ghi mỗi trang", schema = @Schema(type = "integer", minimum = "1", maximum = "100", defaultValue = "10")),
        @Parameter(name = "sort", in = ParameterIn.QUERY, description = "Dạng trường,asc hoặc trường,desc. Trường hỗ trợ: created_at, updated_at, serial_number, model.", schema = @Schema(type = "string", defaultValue = "created_at,desc")),
        @Parameter(name = "isActive", in = ParameterIn.QUERY, description = "true: đang hiệu lực; false: ngừng hiệu lực hoặc xóa mềm", schema = @Schema(type = "boolean", defaultValue = "true"))
    })
    public PageResponse<DroneResponse> ownerDrones(@PathVariable UUID ownerId, @Parameter(hidden = true) @RequestParam Map<String, String> params, @Parameter(hidden = true) HttpSession session) {
        return queries.drones(params, ownerId, null, auth.requireAccount(session)).map(DroneResponse::from);
    }

    @GetMapping("/drones/search")
    @Operation(tags = {"UAV"}, summary = "Tìm UAV theo số sê-ri", description = "Tìm gần đúng, không phân biệt hoa thường; áp dụng quyền sở hữu.")
    @Parameters({
        @Parameter(name = "page", in = ParameterIn.QUERY, description = "Trang bắt đầu từ 0", schema = @Schema(type = "integer", minimum = "0", defaultValue = "0")),
        @Parameter(name = "size", in = ParameterIn.QUERY, description = "Số bản ghi mỗi trang", schema = @Schema(type = "integer", minimum = "1", maximum = "100", defaultValue = "10")),
        @Parameter(name = "sort", in = ParameterIn.QUERY, description = "Dạng trường,asc hoặc trường,desc. Trường hỗ trợ: created_at, updated_at, serial_number, model.", schema = @Schema(type = "string", defaultValue = "created_at,desc")),
        @Parameter(name = "isActive", in = ParameterIn.QUERY, description = "true: đang hiệu lực; false: ngừng hiệu lực hoặc xóa mềm", schema = @Schema(type = "boolean", defaultValue = "true"))
    })
    public PageResponse<DroneResponse> searchDrone(@Parameter(description = "Một phần số sê-ri cần tìm") @RequestParam String serialNumber, @Parameter(hidden = true) @RequestParam Map<String, String> params, @Parameter(hidden = true) HttpSession session) {
        return queries.drones(params, null, serialNumber, auth.requireAccount(session)).map(DroneResponse::from);
    }

    @GetMapping("/flights")
    @Operation(tags = {"Kế hoạch bay"}, summary = "Tra cứu kế hoạch bay", description = "OPERATOR chỉ thấy kế hoạch của mình; ADMIN/MANAGER thấy toàn hệ thống.")
    @Parameters({
        @Parameter(name = "page", in = ParameterIn.QUERY, description = "Trang bắt đầu từ 0", schema = @Schema(type = "integer", minimum = "0", defaultValue = "0")),
        @Parameter(name = "size", in = ParameterIn.QUERY, description = "Số bản ghi mỗi trang", schema = @Schema(type = "integer", minimum = "1", maximum = "100", defaultValue = "10")),
        @Parameter(name = "sort", in = ParameterIn.QUERY, description = "Dạng trường,asc hoặc trường,desc. Trường hỗ trợ: created_at, updated_at, start_time, status.", schema = @Schema(type = "string", defaultValue = "created_at,desc")),
        @Parameter(name = "isActive", in = ParameterIn.QUERY, description = "true: đang hiệu lực; false: ngừng hiệu lực hoặc xóa mềm", schema = @Schema(type = "boolean", defaultValue = "true")),
        @Parameter(name = "status", in = ParameterIn.QUERY, description = "Lọc trạng thái kế hoạch", schema = @Schema(implementation = vn.utm.common.enums.FlightStatus.class))
    })
    public PageResponse<FlightPlanResponse> flights(@Parameter(hidden = true) @RequestParam Map<String, String> params, @Parameter(hidden = true) HttpSession session) {
        return queries.flights(params, null, false, auth.requireAccount(session)).map(FlightPlanResponse::from);
    }

    @GetMapping("/flights/{id}")
    @Operation(tags = {"Kế hoạch bay"}, summary = "Xem kế hoạch bay", description = "Chủ kế hoạch hoặc ADMIN/MANAGER.")
    public FlightPlanResponse flight(@PathVariable UUID id, @Parameter(hidden = true) HttpSession session) {
        return FlightPlanResponse.from(service.flight(id, auth.requireAccount(session)));
    }

    @GetMapping("/flights/operator/{operatorId}")
    @Operation(tags = {"Kế hoạch bay"}, summary = "Tra cứu theo người vận hành", description = "Chính người vận hành hoặc ADMIN/MANAGER.")
    @Parameters({
        @Parameter(name = "page", in = ParameterIn.QUERY, description = "Trang bắt đầu từ 0", schema = @Schema(type = "integer", minimum = "0", defaultValue = "0")),
        @Parameter(name = "size", in = ParameterIn.QUERY, description = "Số bản ghi mỗi trang", schema = @Schema(type = "integer", minimum = "1", maximum = "100", defaultValue = "10")),
        @Parameter(name = "sort", in = ParameterIn.QUERY, description = "Dạng trường,asc hoặc trường,desc. Trường hỗ trợ: created_at, updated_at, start_time, status.", schema = @Schema(type = "string", defaultValue = "created_at,desc")),
        @Parameter(name = "isActive", in = ParameterIn.QUERY, description = "true: đang hiệu lực; false: ngừng hiệu lực hoặc xóa mềm", schema = @Schema(type = "boolean", defaultValue = "true")),
        @Parameter(name = "status", in = ParameterIn.QUERY, description = "Lọc trạng thái kế hoạch", schema = @Schema(implementation = vn.utm.common.enums.FlightStatus.class))
    })
    public PageResponse<FlightPlanResponse> operatorFlights(@PathVariable UUID operatorId, @Parameter(hidden = true) @RequestParam Map<String, String> params, @Parameter(hidden = true) HttpSession session) {
        return queries.flights(params, operatorId, false, auth.requireAccount(session)).map(FlightPlanResponse::from);
    }

    @GetMapping("/flights/active-or-approved")
    @Operation(tags = {"Kế hoạch bay"}, summary = "Xem kế hoạch đã duyệt hoặc đang bay", description = "Chỉ lấy APPROVED/ACTIVE, vẫn áp dụng quyền sở hữu và bộ lọc.")
    @Parameters({
        @Parameter(name = "page", in = ParameterIn.QUERY, description = "Trang bắt đầu từ 0", schema = @Schema(type = "integer", minimum = "0", defaultValue = "0")),
        @Parameter(name = "size", in = ParameterIn.QUERY, description = "Số bản ghi mỗi trang", schema = @Schema(type = "integer", minimum = "1", maximum = "100", defaultValue = "10")),
        @Parameter(name = "sort", in = ParameterIn.QUERY, description = "Dạng trường,asc hoặc trường,desc. Trường hỗ trợ: created_at, updated_at, start_time, status.", schema = @Schema(type = "string", defaultValue = "created_at,desc")),
        @Parameter(name = "isActive", in = ParameterIn.QUERY, description = "true: đang hiệu lực; false: ngừng hiệu lực hoặc xóa mềm", schema = @Schema(type = "boolean", defaultValue = "true")),
        @Parameter(name = "status", in = ParameterIn.QUERY, description = "Lọc trạng thái kế hoạch", schema = @Schema(implementation = vn.utm.common.enums.FlightStatus.class))
    })
    public PageResponse<FlightPlanResponse> activeFlights(@Parameter(hidden = true) @RequestParam Map<String, String> params, @Parameter(hidden = true) HttpSession session) {
        return queries.flights(params, null, true, auth.requireAccount(session)).map(FlightPlanResponse::from);
    }

    @GetMapping("/logs")
    @Operation(tags = {"Nhật ký"}, summary = "Tra cứu nhật ký", description = "ADMIN/MANAGER.")
    @Parameters({
        @Parameter(name = "page", in = ParameterIn.QUERY, description = "Trang bắt đầu từ 0", schema = @Schema(type = "integer", minimum = "0", defaultValue = "0")),
        @Parameter(name = "size", in = ParameterIn.QUERY, description = "Số bản ghi mỗi trang", schema = @Schema(type = "integer", minimum = "1", maximum = "100", defaultValue = "10")),
        @Parameter(name = "sort", in = ParameterIn.QUERY, description = "Dạng trường,asc hoặc trường,desc. Trường hỗ trợ: created_at, updated_at, actionType.", schema = @Schema(type = "string", defaultValue = "created_at,desc")),
        @Parameter(name = "isActive", in = ParameterIn.QUERY, description = "true: đang hiệu lực; false: ngừng hiệu lực hoặc xóa mềm", schema = @Schema(type = "boolean", defaultValue = "true"))
    })
    public PageResponse<SystemLogResponse> logs(@Parameter(hidden = true) @RequestParam Map<String, String> params, @Parameter(hidden = true) HttpSession session) {
        return queries.logs(params, null, null, auth.requireAccount(session)).map(SystemLogResponse::from);
    }

    @GetMapping("/logs/{id}")
    @Operation(tags = {"Nhật ký"}, summary = "Xem chi tiết nhật ký", description = "ADMIN/MANAGER.")
    public SystemLogResponse log(@PathVariable UUID id, @Parameter(hidden = true) HttpSession session) {
        return SystemLogResponse.from(service.log(id, auth.requireAccount(session)));
    }

    @GetMapping("/logs/user/{userId}")
    @Operation(tags = {"Nhật ký"}, summary = "Tra cứu nhật ký theo người dùng", description = "ADMIN/MANAGER.")
    @Parameters({
        @Parameter(name = "page", in = ParameterIn.QUERY, description = "Trang bắt đầu từ 0", schema = @Schema(type = "integer", minimum = "0", defaultValue = "0")),
        @Parameter(name = "size", in = ParameterIn.QUERY, description = "Số bản ghi mỗi trang", schema = @Schema(type = "integer", minimum = "1", maximum = "100", defaultValue = "10")),
        @Parameter(name = "sort", in = ParameterIn.QUERY, description = "Dạng trường,asc hoặc trường,desc. Trường hỗ trợ: created_at, updated_at, actionType.", schema = @Schema(type = "string", defaultValue = "created_at,desc")),
        @Parameter(name = "isActive", in = ParameterIn.QUERY, description = "true: đang hiệu lực; false: ngừng hiệu lực hoặc xóa mềm", schema = @Schema(type = "boolean", defaultValue = "true"))
    })
    public PageResponse<SystemLogResponse> userLogs(@PathVariable UUID userId, @Parameter(hidden = true) @RequestParam Map<String, String> params, @Parameter(hidden = true) HttpSession session) {
        return queries.logs(params, userId, null, auth.requireAccount(session)).map(SystemLogResponse::from);
    }

    @GetMapping("/logs/action")
    @Operation(tags = {"Nhật ký"}, summary = "Tra cứu nhật ký theo hành động", description = "ADMIN/MANAGER.")
    @Parameters({
        @Parameter(name = "page", in = ParameterIn.QUERY, description = "Trang bắt đầu từ 0", schema = @Schema(type = "integer", minimum = "0", defaultValue = "0")),
        @Parameter(name = "size", in = ParameterIn.QUERY, description = "Số bản ghi mỗi trang", schema = @Schema(type = "integer", minimum = "1", maximum = "100", defaultValue = "10")),
        @Parameter(name = "sort", in = ParameterIn.QUERY, description = "Dạng trường,asc hoặc trường,desc. Trường hỗ trợ: created_at, updated_at, actionType.", schema = @Schema(type = "string", defaultValue = "created_at,desc")),
        @Parameter(name = "isActive", in = ParameterIn.QUERY, description = "true: đang hiệu lực; false: ngừng hiệu lực hoặc xóa mềm", schema = @Schema(type = "boolean", defaultValue = "true"))
    })
    public PageResponse<SystemLogResponse> actionLogs(@Parameter(description = "Mã hành động, ví dụ FLIGHT_SUBMIT hoặc FLIGHT_STATUS") @RequestParam String type, @Parameter(hidden = true) @RequestParam Map<String, String> params, @Parameter(hidden = true) HttpSession session) {
        return queries.logs(params, null, type, auth.requireAccount(session)).map(SystemLogResponse::from);
    }

    @GetMapping("/logs/my")
    @Operation(tags = {"Nhật ký"}, summary = "Xem nhật ký của tôi", description = "Mọi tài khoản đều xem được lịch sử thao tác và chuyến bay của chính mình.")
    public PageResponse<SystemLogResponse> myLogs(@Parameter(hidden = true) @RequestParam Map<String, String> params, @Parameter(hidden = true) HttpSession session) {
        return queries.myLogs(params, auth.requireAccount(session)).map(SystemLogResponse::from);
    }

    @GetMapping(value = "/flights/export.csv", produces = "text/csv; charset=utf-8")
    @Operation(tags = {"Kế hoạch bay"}, summary = "Xuất báo cáo lịch sử bay CSV", description = "ADMIN/MANAGER xuất toàn hệ thống; OPERATOR chỉ xuất các chuyến bay của mình.")
    public ResponseEntity<String> exportFlightsCsv(@Parameter(hidden = true) HttpSession session) {
        String csv = queries.exportFlightsCsv(auth.requireAccount(session));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"utm-flight-history.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=utf-8"))
                .body(csv);
    }

    @PostMapping("/users")
    @Operation(tags = {"Người dùng"}, summary = "Tạo người dùng", description = "Chỉ ADMIN. Gán roleId từ danh mục vai trò; tài khoản mới cần mật khẩu.")
    @ResponseStatus(HttpStatus.CREATED)
    public UserAccountResponse createUser(@Valid @RequestBody UserRequest request, @Parameter(hidden = true) HttpSession session) {
        return UserAccountResponse.from(service.saveUser(null, request, auth.requireAccount(session)));
    }

    @PutMapping("/users/{id}")
    @Operation(tags = {"Người dùng"}, summary = "Cập nhật người dùng", description = "Chỉ ADMIN. Bỏ trường password để giữ mật khẩu hiện tại.")
    public UserAccountResponse updateUser(@PathVariable UUID id, @Valid @RequestBody UserRequest request, @Parameter(hidden = true) HttpSession session) {
        return UserAccountResponse.from(service.saveUser(id, request, auth.requireAccount(session)));
    }

    @PutMapping("/users/{id}/lock")
    @Operation(tags = {"Người dùng"}, summary = "Khóa tài khoản", description = "Chỉ ADMIN; không tự khóa tài khoản đang dùng.")
    public UserAccountResponse lock(@PathVariable UUID id, @Parameter(hidden = true) HttpSession session) {
        return UserAccountResponse.from(service.lock(id, true, auth.requireAccount(session)));
    }

    @PutMapping("/users/{id}/unlock")
    @Operation(tags = {"Người dùng"}, summary = "Mở khóa tài khoản", description = "Chỉ ADMIN; đồng thời đặt lại số lần đăng nhập sai.")
    public UserAccountResponse unlock(@PathVariable UUID id, @Parameter(hidden = true) HttpSession session) {
        return UserAccountResponse.from(service.lock(id, false, auth.requireAccount(session)));
    }

    @PostMapping("/roles")
    @Operation(tags = {"Vai trò"}, summary = "Tạo vai trò", description = "Chỉ ADMIN. Vai trò tùy chỉnh hiện là danh mục, chưa cấp quyền nghiệp vụ động.")
    @ResponseStatus(HttpStatus.CREATED)
    public RoleResponse createRole(@Valid @RequestBody RoleRequest request, @Parameter(hidden = true) HttpSession session) {
        return RoleResponse.from(service.saveRole(null, request, auth.requireAccount(session)));
    }

    @PutMapping("/roles/{id}")
    @Operation(tags = {"Vai trò"}, summary = "Cập nhật vai trò", description = "Chỉ ADMIN; không đổi mã vai trò hệ thống.")
    public RoleResponse updateRole(@PathVariable UUID id, @Valid @RequestBody RoleRequest request, @Parameter(hidden = true) HttpSession session) {
        return RoleResponse.from(service.saveRole(id, request, auth.requireAccount(session)));
    }

    @PutMapping("/roles/{id}/restore")
    @Operation(tags = {"Vai trò"}, summary = "Khôi phục vai trò", description = "Chỉ ADMIN.")
    public RoleResponse restoreRole(@PathVariable UUID id, @Parameter(hidden = true) HttpSession session) {
        return RoleResponse.from(service.changeRole(id, true, auth.requireAccount(session)));
    }

    @PostMapping("/drones")
    @Operation(tags = {"UAV"}, summary = "Khai báo UAV", description = "Chỉ OPERATOR. UAV mới thuộc người vận hành đang đăng nhập.")
    @ResponseStatus(HttpStatus.CREATED)
    public DroneResponse createDrone(@Valid @RequestBody DroneRequest request, @Parameter(hidden = true) HttpSession session) {
        return DroneResponse.from(service.saveDrone(null, request, auth.requireAccount(session)));
    }

    @PutMapping("/drones/{id}")
    @Operation(tags = {"UAV"}, summary = "Cập nhật UAV", description = "Chủ sở hữu hoặc ADMIN/MANAGER. Bỏ ownerId để giữ chủ sở hữu; bỏ droneType để giữ phân loại hiện có.")
    public DroneResponse updateDrone(@PathVariable UUID id, @Valid @RequestBody DroneRequest request, @Parameter(hidden = true) HttpSession session) {
        return DroneResponse.from(service.saveDrone(id, request, auth.requireAccount(session)));
    }

    @PutMapping("/drones/{id}/restore")
    @Operation(tags = {"UAV"}, summary = "Khôi phục UAV", description = "Chủ sở hữu hoặc ADMIN/MANAGER; chủ sở hữu phải còn hoạt động.")
    public DroneResponse restoreDrone(@PathVariable UUID id, @Parameter(hidden = true) HttpSession session) {
        return DroneResponse.from(service.changeDrone(id, true, auth.requireAccount(session)));
    }

    @PostMapping("/flights")
    @Operation(tags = {"Kế hoạch bay"}, summary = "Nộp kế hoạch một UAV", description = "Chỉ OPERATOR, UAV phải thuộc tài khoản hiện tại và đã có loại. Quỹ đạo mới dùng 0–120 m AGL; waypoint đầu/cuối khớp giờ cất/hạ cánh. Chưa kiểm tra xung đột không gian tự động.")
    @ResponseStatus(HttpStatus.CREATED)
    public FlightPlanResponse createFlight(@Valid @RequestBody FlightRequestDto request, @Parameter(hidden = true) HttpSession session) {
        return FlightPlanResponse.from(service.createFlight(request, auth.requireAccount(session)));
    }

    @PutMapping("/flights/{id}/status")
    @Operation(tags = {"Kế hoạch bay"}, summary = "Xét duyệt hoặc cập nhật trạng thái", description = "Chỉ ADMIN duyệt/từ chối PENDING. OPERATOR chủ sở hữu (hoặc ADMIN/MANAGER) cập nhật APPROVED → ACTIVE → COMPLETED. Ghi chú xét duyệt được gửi lại người vận hành; khi duyệt tạo bản tin bàn giao.")
    public FlightPlanResponse flightStatus(@PathVariable UUID id, @Valid @RequestBody StatusRequest request, @Parameter(hidden = true) HttpSession session) {
        return FlightPlanResponse.from(service.status(id, request.status(), request.reviewNote(), auth.requireAccount(session)));
    }

    @PutMapping("/flights/{id}/revoke")
    @Operation(tags = {"Kế hoạch bay"}, summary = "Thu hồi phép bay đã duyệt", description = "Chỉ ADMIN. Thu hồi kế hoạch APPROVED/ACTIVE (ví dụ khi có UVR khẩn cấp) và phát bản tin hủy sang mô phỏng/giám sát.")
    public FlightPlanResponse revoke(@PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            @Parameter(hidden = true) HttpSession session) {
        String note = body == null ? null : body.get("reviewNote");
        return FlightPlanResponse.from(service.revoke(id, note, auth.requireAccount(session)));
    }

    @PostMapping("/flights/batch")
    @Operation(tags = {"Kế hoạch bay"}, summary = "Nộp kế hoạch nhiều UAV", description = "Chỉ OPERATOR. Tối đa 50 UAV không trùng, dùng chung lộ trình; tạo kế hoạch riêng cho từng UAV với cùng submissionId. Mỗi kế hoạch cần duyệt riêng. Một UAV không hợp lệ làm hủy toàn bộ đợt nộp.")
    @ResponseStatus(HttpStatus.CREATED)
    public List<FlightPlanResponse> createFlightBatch(@Valid @RequestBody BatchFlightRequest request, @Parameter(hidden = true) HttpSession session) {
        return service.createFlightBatch(request, auth.requireAccount(session)).stream().map(FlightPlanResponse::from).toList();
    }

    @PutMapping("/flights/{id}/cancel")
    @Operation(tags = {"Kế hoạch bay"}, summary = "Hủy kế hoạch", description = "Chỉ chủ kế hoạch OPERATOR, trạng thái PENDING/APPROVED và trước giờ cất cánh. Kế hoạch đã duyệt phát bản tin hủy cho hai đích tích hợp.")
    public FlightPlanResponse cancel(@PathVariable UUID id, @Parameter(hidden = true) HttpSession session) {
        return FlightPlanResponse.from(service.cancel(id, auth.requireAccount(session)));
    }

    @PutMapping("/flights/{id}/restore")
    @Operation(tags = {"Kế hoạch bay"}, summary = "Khôi phục bản ghi kế hoạch", description = "ADMIN/MANAGER. Chỉ bỏ xóa mềm, không thay đổi trạng thái phê duyệt.")
    public FlightPlanResponse restoreFlight(@PathVariable UUID id, @Parameter(hidden = true) HttpSession session) {
        return FlightPlanResponse.from(service.restoreFlight(id, auth.requireAccount(session)));
    }

    @DeleteMapping("/users/{id}")
    @Operation(tags = {"Người dùng"}, summary = "Xóa mềm người dùng", description = "Chỉ ADMIN; không tự xóa tài khoản đang dùng.")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable UUID id, @Parameter(hidden = true) HttpSession session) {
        service.deleteUser(id, auth.requireAccount(session));
    }

    @DeleteMapping("/roles/{id}")
    @Operation(tags = {"Vai trò"}, summary = "Xóa mềm vai trò", description = "Chỉ ADMIN; không xóa vai trò hệ thống.")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRole(@PathVariable UUID id, @Parameter(hidden = true) HttpSession session) {
        service.changeRole(id, false, auth.requireAccount(session));
    }

    @DeleteMapping("/drones/{id}")
    @Operation(tags = {"UAV"}, summary = "Xóa mềm UAV", description = "Chủ sở hữu hoặc ADMIN/MANAGER; từ chối khi UAV còn kế hoạch chưa kết thúc.")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDrone(@PathVariable UUID id, @Parameter(hidden = true) HttpSession session) {
        service.changeDrone(id, false, auth.requireAccount(session));
    }

    @DeleteMapping("/logs/clear")
    @Operation(tags = {"Nhật ký"}, summary = "Xóa mềm nhật ký", description = "Chỉ ADMIN; giữ lại bản ghi LOG_CLEAR.")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearLogs(@Parameter(hidden = true) HttpSession session) {
        service.clearLogs(auth.requireAccount(session));
    }
}
