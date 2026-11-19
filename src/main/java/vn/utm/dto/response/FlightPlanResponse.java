package vn.utm.dto.response;
import java.time.Instant;
import java.util.UUID;
import vn.utm.common.enums.*;
import vn.utm.model.FlightPlan;
public record FlightPlanResponse(
        UUID id,
        Instant createdAt,
        Instant updatedAt,
        UUID createdBy,
        UUID updatedBy,
        Instant deletedAt,
        UUID deletedBy,
        boolean isActive,
        DroneResponse drone,
        UserAccountResponse operator,
        Instant startTime,
        Instant endTime,
        String trajectoryJson,
        FlightStatus status,
        UUID submissionId,
        int uavCount,
        String departureName,
        String destinationName,
        String altitudeReference,
        Instant reviewedAt,
        UUID reviewedBy,
        String reviewNote) {
    public static FlightPlanResponse from(FlightPlan entity) {
        if (entity == null) return null;
        return new FlightPlanResponse(
                entity.getId(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy(),
                entity.getDeletedAt(),
                entity.getDeletedBy(),
                entity.isActive(),
                DroneResponse.from(entity.getDrone()),
                UserAccountResponse.from(entity.getOperator()),
                entity.getStartTime(),
                entity.getEndTime(),
                entity.getTrajectoryJson(),
                entity.getStatus(), entity.getSubmissionId(), entity.getUavCount(),
                entity.getDepartureName(), entity.getDestinationName(), entity.getAltitudeReference(),
                entity.getReviewedAt(), entity.getReviewedBy(), entity.getReviewNote());
    }
}
