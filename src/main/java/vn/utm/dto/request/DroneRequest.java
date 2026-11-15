package vn.utm.dto.request;
import jakarta.validation.constraints.*;
public record DroneRequest(
        java.util.UUID ownerId,
        @NotBlank @Size(max = 100) String serialNumber,
        @NotBlank @Size(max = 100) String model,
        vn.utm.common.enums.DroneType droneType,
        @NotNull @Min(1) Integer maxFlightTime,
        @NotNull @DecimalMin(value = "0", inclusive = false) Double maxSpeed) {}
