package vn.utm.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.utm.common.enums.*;
import vn.utm.model.*;
import vn.utm.repository.*;

/** Durable handoff preparation. Mock delivery does not start or control a UAV. */
@Service
@Transactional
public class FlightIntegrationService {
    private static final Set<FlightStatus> ACCEPTED = Set.of(
            FlightStatus.APPROVED, FlightStatus.ACTIVE, FlightStatus.COMPLETED);
    private final IntegrationDeliveryRepository deliveries;
    private final FlightPlanRepository flights;
    private final SystemLogRepository logs;
    private final AuthService auth;
    private final ObjectMapper mapper;
    private final String mode;
    private final MonitoringHttpClient monitoring;

    public FlightIntegrationService(IntegrationDeliveryRepository deliveries, FlightPlanRepository flights, SystemLogRepository logs,
            AuthService auth, ObjectMapper mapper, @Value("${utm.integration.mode:mock}") String mode,
            MonitoringHttpClient monitoring) {
        this.deliveries = deliveries; this.flights = flights; this.logs = logs; this.auth = auth; this.mapper = mapper;
        this.mode = mode.trim().toLowerCase(Locale.ROOT);
        this.monitoring = monitoring;
        if (!Set.of("mock", "disabled", "http").contains(this.mode))
            throw new IllegalArgumentException("utm.integration.mode chỉ hỗ trợ mock, disabled hoặc http");
    }

    /** Called in the same transaction as the plan transition; no external side effects. */
    public void publish(FlightPlan flight, String eventType) {
        String payload;
        try {
            payload = mapper.writeValueAsString(envelope(flight, eventType, UUID.randomUUID(), Instant.now()));
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Không thể đóng gói kế hoạch để tích hợp", exception);
        }
        for (IntegrationTarget target : IntegrationTarget.values()) {
            if (deliveries.findByFlightIdAndTargetAndEventTypeAndFlightStatus(
                    flight.getId(), target, eventType, flight.getStatus()).isPresent()) continue;
            IntegrationDelivery delivery = new IntegrationDelivery();
            delivery.setFlight(flight); delivery.setTarget(target); delivery.setEventType(eventType);
            delivery.setFlightStatus(flight.getStatus()); delivery.setPayloadJson(payload);
            delivery.recordActor(flight.getUpdatedBy());
            deliveries.save(delivery);
            dispatch(delivery);
        }
    }

    @Transactional(readOnly = true)
    public List<IntegrationDelivery> list(String status, UserAccount actor) {
        auth.requireStaff(actor);
        if (status == null || status.isBlank()) return deliveries.findTop100ByOrderByCreatedAtDesc();
        DeliveryStatus parsed;
        try { parsed = DeliveryStatus.valueOf(status); }
        catch (IllegalArgumentException exception) { throw new IllegalArgumentException("Trạng thái tích hợp không hợp lệ"); }
        return deliveries.findTop100ByStatusOrderByCreatedAtDesc(parsed);
    }

    @Transactional(readOnly = true)
    public List<IntegrationDelivery> forFlight(FlightPlan flight, UserAccount actor) {
        auth.requireOwner(flight.getOperator().getId(), actor);
        return deliveries.findTop100ByFlightIdOrderByCreatedAtDesc(flight.getId());
    }

    @Transactional(readOnly = true)
    public JsonNode acceptedPlan(FlightPlan flight, UserAccount actor) {
        auth.requireOwner(flight.getOperator().getId(), actor);
        requireAccepted(flight);
        var snapshot = deliveries.findByFlightIdAndTargetAndEventTypeAndFlightStatus(
                flight.getId(), IntegrationTarget.SIMULATION, "flightplan.accepted", FlightStatus.APPROVED);
        try {
            // Download the original approved snapshot, even after a later lifecycle transition.
            if (snapshot.isPresent()) {
                ObjectNode exported = (ObjectNode) mapper.readTree(snapshot.get().getPayloadJson());
                exported.put("currentStatus", flight.getStatus().name());
                return exported;
            }
            // Older approved plans are exportable but have no fabricated delivery receipt.
            var legacy = envelope(flight, "flightplan.accepted", null, flight.getReviewedAt());
            legacy.put("exportOnly", true);
            legacy.put("deliveryRecorded", false);
            legacy.put("currentStatus", flight.getStatus());
            return mapper.valueToTree(legacy);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Không đọc được bản kế hoạch đã duyệt", exception);
        }
    }

    public IntegrationDelivery retry(UUID id, UserAccount actor) {
        auth.requireAdmin(actor);
        // Use a scalar lookup before locking: loading the delivery here would cache stale plan state.
        UUID flightId = deliveries.findFlightIdById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy bản ghi tích hợp"));
        // All lifecycle mutations take the plan lock before touching the outbox.
        FlightPlan flight = flights.findForUpdate(flightId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy kế hoạch bay"));
        IntegrationDelivery delivery = deliveries.findLockedById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy bản ghi tích hợp"));
        if (!flight.isActive() || flight.getDeletedAt() != null)
            throw new IllegalArgumentException("Kế hoạch đã ngừng hiệu lực");
        if (delivery.getEventType().equals("flightplan.accepted")) requireAccepted(flight);
        else if (flight.getStatus() != delivery.getFlightStatus())
            throw new IllegalArgumentException("Bản tin đã cũ so với trạng thái kế hoạch hiện tại");
        boolean liveHttp = mode.equals("http") && isHttpTargetSupported(delivery.getTarget());
        if (delivery.getStatus() == DeliveryStatus.DELIVERED
                || (delivery.getStatus() == DeliveryStatus.MOCK_DELIVERED && !liveHttp)) return delivery;
        if (liveHttp && flight.getStatus() != delivery.getFlightStatus())
            throw new IllegalArgumentException("Bản tin đã cũ so với trạng thái kế hoạch hiện tại");
        if (!liveHttp && delivery.getEventType().equals("flightplan.accepted") && !flight.getStartTime().isAfter(Instant.now()))
            throw new IllegalArgumentException("Kế hoạch đã qua giờ cất cánh; không gửi lại bản tin chấp thuận cũ");
        delivery.recordActor(actor.getId());
        if (liveHttp) sendMonitoring(delivery);
        else dispatch(delivery);
        SystemLog log = new SystemLog();
        log.setUser(actor); log.setActionType("INTEGRATION_RETRY");
        log.setDetails(id + ":" + delivery.getTarget() + ":" + delivery.getStatus());
        log.recordActor(actor.getId()); logs.save(log);
        return delivery;
    }

    private void requireAccepted(FlightPlan flight) {
        if (!flight.isActive() || flight.getDeletedAt() != null || !ACCEPTED.contains(flight.getStatus()))
            throw new IllegalArgumentException("Chỉ xuất hoặc gửi lại kế hoạch còn hiệu lực đã được duyệt");
    }

    private boolean isHttpTargetSupported(IntegrationTarget target) {
        return target == IntegrationTarget.MONITORING
                || (target == IntegrationTarget.SIMULATION && monitoring.supportsTarget(target));
    }

    /** Separate transaction invoked by the worker after the approval has committed. */
    public void deliverMonitoring(UUID id) {
        if (!mode.equals("http")) return;
        UUID flightId = deliveries.findFlightIdById(id).orElseThrow();
        FlightPlan flight = flights.findForUpdate(flightId).orElseThrow();
        IntegrationDelivery delivery = deliveries.findLockedById(id).orElseThrow();
        if (!isHttpTargetSupported(delivery.getTarget())
                || !Set.of(DeliveryStatus.PENDING, DeliveryStatus.FAILED).contains(delivery.getStatus())
                || delivery.getAttempts() >= MonitoringDeliveryWorker.MAX_ATTEMPTS) return;
        if (!flight.isActive() || flight.getDeletedAt() != null || flight.getStatus() != delivery.getFlightStatus()) {
            delivery.setStatus(DeliveryStatus.SUPERSEDED);
            delivery.setLastError("Bản tin đã được thay thế bởi trạng thái kế hoạch mới hơn");
            return;
        }
        sendMonitoring(delivery);
    }

    private void sendMonitoring(IntegrationDelivery delivery) {
        delivery.setAttempts(delivery.getAttempts() + 1);
        delivery.setLastAttemptAt(Instant.now());
        try {
            delivery.setReceipt(monitoring.send(delivery));
            delivery.setStatus(DeliveryStatus.DELIVERED);
            delivery.setDeliveredAt(Instant.now()); delivery.setLastError(null);
        } catch (java.io.IOException | InterruptedException | IllegalArgumentException exception) {
            if (exception instanceof InterruptedException) Thread.currentThread().interrupt();
            delivery.setStatus(DeliveryStatus.FAILED); delivery.setDeliveredAt(null); delivery.setReceipt(null);
            // Never store URLs, authorization headers or receiver response bodies in the portal.
            String msg = exception.getMessage();
            boolean isHttpError = exception instanceof java.io.IOException && msg != null
                    && (msg.startsWith("Máy chủ giám sát trả HTTP ") || msg.startsWith("Máy chủ SIMULATION trả HTTP "));
            delivery.setLastError(isHttpError
                    ? msg : "Không nhận được ACK từ máy chủ đầu nhận; có thể gửi lại cùng eventId");
        }
    }

    private Map<String, Object> envelope(FlightPlan flight, String eventType, UUID eventId, Instant occurredAt) {
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("schemaVersion", "1.0"); envelope.put("eventId", eventId);
        envelope.put("eventType", eventType); envelope.put("occurredAt", occurredAt);
        envelope.put("coordinateSystem", Map.of("horizontalReference", "WGS84", "epsg", 4326,
                "horizontalFields", List.of("latitude", "longitude"),
                "altitudeReference", flight.getAltitudeReference(), "altitudeUnit", "m", "timeReference", "UTC"));
        Map<String, Object> plan = new LinkedHashMap<>();
        plan.put("flightId", flight.getId()); plan.put("submissionId", flight.getSubmissionId());
        plan.put("uavCount", flight.getUavCount()); plan.put("operatorId", flight.getOperator().getId());
        plan.put("droneId", flight.getDrone().getId()); plan.put("serialNumber", flight.getDrone().getSerialNumber());
        plan.put("droneType", flight.getDrone().getDroneType());
        plan.put("performanceProfile", Map.of("maxSpeedMps", flight.getDrone().getMaxSpeed(),
                "maxFlightTimeMinutes", flight.getDrone().getMaxFlightTime()));
        plan.put("departureName", flight.getDepartureName()); plan.put("destinationName", flight.getDestinationName());
        plan.put("startTime", flight.getStartTime()); plan.put("endTime", flight.getEndTime());
        plan.put("status", flight.getStatus()); plan.put("reviewedAt", flight.getReviewedAt());
        plan.put("reviewedBy", flight.getReviewedBy()); plan.put("reviewNote", flight.getReviewNote());
        try { plan.put("waypoints", mapper.readTree(flight.getTrajectoryJson())); }
        catch (JsonProcessingException exception) { throw new IllegalArgumentException("Quỹ đạo kế hoạch không hợp lệ", exception); }
        envelope.put("flightPlan", plan);
        return envelope;
    }

    private void dispatch(IntegrationDelivery delivery) {
        if (mode.equals("disabled") || mode.equals("http")) {
            delivery.setStatus(DeliveryStatus.PENDING);
            delivery.setLastError(null);
            return;
        }
        delivery.setAttempts(delivery.getAttempts() + 1);
        delivery.setLastAttemptAt(Instant.now());
        try {
            JsonNode payload = mapper.readTree(delivery.getPayloadJson());
            JsonNode plan = payload.path("flightPlan");
            if (delivery.getEventType().equals("flightplan.accepted")
                    && !delivery.getFlight().getStartTime().isAfter(Instant.now()))
                throw new IllegalArgumentException("Kế hoạch đã qua giờ cất cánh");
            if (!payload.path("schemaVersion").asText().equals("1.0")
                    || !payload.path("eventType").asText().equals(delivery.getEventType())
                    || !plan.path("flightId").asText().equals(delivery.getFlight().getId().toString())
                    || !plan.path("waypoints").isArray() || plan.path("waypoints").size() < 2)
                throw new IllegalArgumentException("Bản tin không đúng hợp đồng dữ liệu mock");
            delivery.setStatus(DeliveryStatus.MOCK_DELIVERED);
            delivery.setDeliveredAt(Instant.now()); delivery.setLastError(null);
            delivery.setReceipt("MOCK: " + delivery.getTarget() + " đã nhận " + delivery.getEventType()
                    + "; eventId=" + payload.path("eventId").asText()
                    + ". Chỉ ghi nhận dữ liệu; chưa chạy mô phỏng hoặc giám sát thực tế.");
        } catch (JsonProcessingException | IllegalArgumentException exception) {
            delivery.setStatus(DeliveryStatus.FAILED); delivery.setDeliveredAt(null);
            delivery.setReceipt(null);
            String error = "Mock không nhận được bản tin: " + exception.getMessage();
            delivery.setLastError(error.substring(0, Math.min(error.length(), 1000)));
        }
    }
}
