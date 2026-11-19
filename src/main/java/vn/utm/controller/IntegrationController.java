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
import vn.utm.dto.response.IntegrationDeliveryResponse;
import vn.utm.model.UserAccount;
import vn.utm.service.*;

@RestController
@RequestMapping("/api")
@Transactional(readOnly = true)
@Tag(name = "Tích hợp", description = "Bàn giao kế hoạch đã duyệt tới mô phỏng/giám sát. MOCK_DELIVERED chỉ là phản hồi giả lập, chưa chạy chuyến bay.")
public class IntegrationController {
    private final FlightIntegrationService integration;
    private final UtmService utm;
    private final AuthService auth;

    public IntegrationController(FlightIntegrationService integration, UtmService utm, AuthService auth) {
        this.integration = integration; this.utm = utm; this.auth = auth;
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
}
