package vn.utm.dto.request;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
public record FlightRequestDto(
        @Schema(description = "UUID của UAV thuộc người vận hành đang đăng nhập, đã khai báo loại UAV")
        @NotNull java.util.UUID droneId,
        @Schema(description = "Giờ cất cánh ở tương lai. ISO 8601 có Z/offset; không có offset được hiểu là UTC+7")
        @NotNull @Future java.time.Instant startTime,
        @Schema(description = "Giờ hạ cánh sau cất cánh, không vượt thời gian bay tối đa của UAV")
        @NotNull @Future java.time.Instant endTime,
        @Schema(type = "string", description = "CHUỖI JSON chứa mảng 2–10000 waypoint; không gửi trực tiếp một mảng. Mỗi điểm có latitude (±90), longitude (±180), altitude (0–120 m AGL), time (ISO 8601). Thời gian tăng dần; điểm đầu/cuối khớp startTime/endTime")
        @NotBlank @Size(max = 1000000) String trajectoryJson,
        @Schema(description = "Tên điểm đi; tọa độ lấy từ waypoint đầu")
        @Size(max = 255) String departureName,
        @Schema(description = "Tên điểm đến; tọa độ lấy từ waypoint cuối")
        @Size(max = 255) String destinationName) {
    public FlightRequestDto(java.util.UUID droneId, java.time.Instant startTime,
                            java.time.Instant endTime, String trajectoryJson) {
        this(droneId, startTime, endTime, trajectoryJson, null, null);
    }
}
