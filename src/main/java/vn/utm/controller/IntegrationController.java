package vn.utm.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpSession;
import java.util.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import vn.utm.common.enums.FlightStatus;
import vn.utm.dto.response.IntegrationDeliveryResponse;
import vn.utm.model.*;
import vn.utm.repository.*;
import vn.utm.service.*;

@RestController
@RequestMapping("/api")
@Transactional(readOnly = true)
@Tag(name = "Tích hợp", description = "Bàn giao kế hoạch đã duyệt tới mô phỏng/giám sát. MOCK_DELIVERED chỉ là phản hồi giả lập, chưa chạy chuyến bay.")
public class IntegrationController {
    private final FlightIntegrationService integration;
    private final UtmService utm;
    private final AuthService auth;
    private final MonitoringFeedbackService monitoringFeedback;
    private final DroneRepository drones;
    private final FlightPlanRepository flights;

    public IntegrationController(FlightIntegrationService integration, UtmService utm, AuthService auth,
            MonitoringFeedbackService monitoringFeedback, DroneRepository drones, FlightPlanRepository flights) {
        this.integration = integration; this.utm = utm; this.auth = auth;
        this.monitoringFeedback = monitoringFeedback;
        this.drones = drones;
        this.flights = flights;
    }

    @GetMapping("/integrations")
    @Operation(summary = "Xem bản tin tích hợp", description = "ADMIN/MANAGER. Tối đa 100 bản tin mới nhất; không dùng tham số phân trang.")
    public List<IntegrationDeliveryResponse> list(
            @Parameter(description = "Lọc trạng thái bàn giao", schema = @Schema(implementation = vn.utm.common.enums.DeliveryStatus.class))
            @RequestParam(required = false) String status, @Parameter(hidden = true) HttpSession session) {
        return integration.list(status, auth.requireAccount(session)).stream().map(IntegrationDeliveryResponse::from).toList();
    }

    @GetMapping("/flights/{id}/integration")
    @Operation(summary = "Xem bàn giao theo kế hoạch", description = "Chủ kế hoạch hoặc ADMIN/MANAGER; tối đa 100 bản tin mới nhất của kế hoạch.")
    public List<IntegrationDeliveryResponse> forFlight(@PathVariable UUID id, @Parameter(hidden = true) HttpSession session) {
        UserAccount actor = auth.requireAccount(session);
        return integration.forFlight(utm.flight(id, actor), actor).stream().map(IntegrationDeliveryResponse::from).toList();
    }

    @GetMapping("/flights/{id}/accepted-plan")
    @Operation(summary = "Tải lộ trình đã duyệt", description = "Chủ kế hoạch hoặc ADMIN/MANAGER. Chỉ xuất kế hoạch còn hiệu lực ở APPROVED/ACTIVE/COMPLETED. Snapshot giữ thông tin lúc duyệt; currentStatus cho biết trạng thái hiện tại.")
    public JsonNode acceptedPlan(@PathVariable UUID id, @Parameter(hidden = true) HttpSession session) {
        UserAccount actor = auth.requireAccount(session);
        return integration.acceptedPlan(utm.flight(id, actor), actor);
    }

    @PostMapping("/integrations/{id}/retry")
    @Operation(summary = "Gửi lại bản tin tích hợp", description = "Chỉ ADMIN. Không phát lặp bản tin đã tiếp nhận; từ chối chấp thuận cũ khi kế hoạch đã hủy hoặc qua giờ cất cánh.")
    @Transactional
    public IntegrationDeliveryResponse retry(@PathVariable UUID id, @Parameter(hidden = true) HttpSession session) {
        return IntegrationDeliveryResponse.from(integration.retry(id, auth.requireAccount(session)));
    }

    @CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS})
    @PostMapping("/integration/monitoring-updates")
    @Operation(summary = "Nhận tiến độ giám sát từ Khối 4", description = "Tiếp nhận monitoring.progress định kỳ từ Khối 4 (Nhật Anh :3000).")
    public Map<String, Object> receiveMonitoringProgress(@RequestBody Map<String, Object> payload) {
        return monitoringFeedback.recordProgress(payload);
    }

    @CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS})
    @PostMapping("/integration/monitoring-decisions")
    @Operation(summary = "Nhận quyết định điều phối từ Khối 4", description = "Tiếp nhận monitoring.decision từ Khối 4 (Nhật Anh :3000).")
    public Map<String, Object> receiveMonitoringDecision(@RequestBody Map<String, Object> payload) {
        return monitoringFeedback.recordDecision(payload);
    }

    @CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.OPTIONS})
    @GetMapping("/integration/monitoring-feed")
    @Operation(summary = "Xem luồng phản hồi giám sát từ Khối 4", description = "OPERATOR chỉ thấy UAV/chuyến bay của mình; ADMIN/MANAGER thấy toàn hệ thống.")
    public Map<String, Object> getMonitoringFeed(@Parameter(hidden = true) HttpSession session) {
        var account = auth.findAccount(session);
        if (account.isPresent() && "OPERATOR".equals(account.get().getRole().getCode())) {
            UUID ownerId = account.get().getId();
            Set<String> allowedUavs = new HashSet<>();
            for (Drone d : drones.findByOwnerId(ownerId)) {
                if (d.getSerialNumber() != null) allowedUavs.add(d.getSerialNumber());
                if (d.getId() != null) allowedUavs.add(d.getId().toString());
            }
            Set<String> allowedFlights = new HashSet<>();
            for (FlightPlan f : flights.findByOperatorId(ownerId)) {
                if (f.getId() != null) allowedFlights.add(f.getId().toString());
            }
            return monitoringFeedback.snapshot(allowedUavs, allowedFlights, "OWN_ONLY");
        }
        return monitoringFeedback.snapshot();
    }

    @CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.OPTIONS})
    @GetMapping("/integration/registered-uavs")
    @Operation(summary = "Danh sách UAV đã đăng ký cho Khối 2 đồng bộ", description = "Trả toàn bộ UAV đang hiệu lực kèm kế hoạch bay APPROVED/ACTIVE mới nhất (nếu có).")
    public List<Map<String, Object>> getRegisteredUavs() {
        List<Drone> activeDrones = drones.findAll().stream()
                .filter(d -> d.isActive() && d.getDeletedAt() == null)
                .sorted(Comparator.comparing(Drone::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        List<FlightPlan> activePlans = flights.findAll().stream()
                .filter(f -> f.isActive() && f.getDeletedAt() == null
                        && (f.getStatus() == FlightStatus.APPROVED || f.getStatus() == FlightStatus.ACTIVE))
                .sorted(Comparator.comparing(FlightPlan::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        Map<UUID, FlightPlan> latestPlanByDrone = new HashMap<>();
        for (FlightPlan fp : activePlans) {
            if (fp.getDrone() != null && fp.getDrone().getId() != null) {
                latestPlanByDrone.putIfAbsent(fp.getDrone().getId(), fp);
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Drone d : activeDrones) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("droneId", d.getId());
            item.put("serialNumber", d.getSerialNumber());
            item.put("model", d.getModel());
            item.put("droneType", d.getDroneType());
            item.put("maxSpeed", d.getMaxSpeed());
            item.put("ownerUsername", d.getOwner() != null ? d.getOwner().getUsername() : null);
            FlightPlan fp = latestPlanByDrone.get(d.getId());
            if (fp != null) {
                Map<String, Object> fpMap = new LinkedHashMap<>();
                fpMap.put("flightId", fp.getId());
                fpMap.put("status", fp.getStatus());
                fpMap.put("departureName", fp.getDepartureName());
                fpMap.put("destinationName", fp.getDestinationName());
                fpMap.put("trajectoryJson", fp.getTrajectoryJson());
                item.put("activeFlightPlan", fpMap);
            } else {
                item.put("activeFlightPlan", null);
            }
            result.add(item);
        }
        return result;
    }
}
