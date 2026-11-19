package vn.utm.dto.request;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
public record DroneRequest(
        @Schema(description = "Bỏ trống khi tạo để dùng tài khoản OPERATOR hiện tại; bỏ trống khi sửa để giữ chủ sở hữu")
        java.util.UUID ownerId,
        @NotBlank @Size(max = 100) String serialNumber,
        @NotBlank @Size(max = 100) String model,
        @Schema(description = "MULTIROTOR, FIXED_WING hoặc HYBRID (VTOL). API cũ có thể bỏ qua nhưng UAV phải có loại trước khi nộp kế hoạch")
        vn.utm.common.enums.DroneType droneType,
        @Schema(description = "Thời gian bay tối đa, số phút nguyên dương")
        @NotNull @Min(1) Integer maxFlightTime,
        @Schema(description = "Tốc độ tối đa, đơn vị m/s, hữu hạn và lớn hơn 0")
        @NotNull @DecimalMin(value = "0", inclusive = false) Double maxSpeed) {}
