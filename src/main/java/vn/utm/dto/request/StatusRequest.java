package vn.utm.dto.request;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
public record StatusRequest(
        @Schema(description = "ADMIN: PENDING → APPROVED/REJECTED. ADMIN/MANAGER: APPROVED → ACTIVE → COMPLETED. Hủy dùng endpoint cancel")
        @NotNull vn.utm.common.enums.FlightStatus status,
        @Schema(description = "Ghi chú gửi người vận hành khi ADMIN duyệt hoặc từ chối")
        @Size(max = 1000) String reviewNote) {
    public StatusRequest(vn.utm.common.enums.FlightStatus status) { this(status, null); }
}
