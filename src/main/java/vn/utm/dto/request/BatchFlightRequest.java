package vn.utm.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BatchFlightRequest(
        @Schema(description = "1–50 UUID UAV không trùng, thuộc tài khoản OPERATOR hiện tại. Số lượng UAV do server tính từ danh sách này")
        @NotEmpty @Size(max = 50) List<@NotNull UUID> droneIds,
        @Schema(description = "Giờ cất cánh ở tương lai, ISO 8601. Không có offset được hiểu là UTC+7")
        @NotNull @Future Instant startTime,
        @Schema(description = "Giờ hạ cánh sau cất cánh; thời lượng phải phù hợp mọi UAV được chọn")
        @NotNull @Future Instant endTime,
        @Schema(type = "string", description = "CHUỖI JSON chứa mảng 2–10000 waypoint dùng chung: latitude, longitude, altitude (0–120 m AGL), time (ISO 8601). Thời gian tăng dần; waypoint đầu/cuối khớp startTime/endTime. Chưa kiểm tra xung đột không gian giữa UAV")
        @NotBlank @Size(max = 1000000) String trajectoryJson,
        @Schema(description = "Tên điểm đi; tọa độ là waypoint đầu")
        @NotBlank @Size(max = 255) String departureName,
        @Schema(description = "Tên điểm đến; tọa độ là waypoint cuối")
        @NotBlank @Size(max = 255) String destinationName) {}
