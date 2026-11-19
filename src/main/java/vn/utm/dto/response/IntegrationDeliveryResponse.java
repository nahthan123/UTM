package vn.utm.dto.response;

import java.time.Instant;
import java.util.UUID;
import vn.utm.common.enums.*;
import vn.utm.model.IntegrationDelivery;

public record IntegrationDeliveryResponse(
        UUID id, UUID flightId, IntegrationTarget target, String eventType, DeliveryStatus status,
        int attempts, Instant lastAttemptAt, Instant deliveredAt, String lastError,
        String receipt, String payloadJson, Instant createdAt) {
    public static IntegrationDeliveryResponse from(IntegrationDelivery delivery) {
        return new IntegrationDeliveryResponse(delivery.getId(), delivery.getFlight().getId(),
                delivery.getTarget(), delivery.getEventType(), delivery.getStatus(), delivery.getAttempts(),
                delivery.getLastAttemptAt(), delivery.getDeliveredAt(), delivery.getLastError(),
                delivery.getReceipt(), delivery.getPayloadJson(), delivery.getCreatedAt());
    }
}
