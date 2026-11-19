package vn.utm.model;

import jakarta.persistence.*;
import java.time.Instant;
import vn.utm.common.enums.*;

/** A durable snapshot and receipt for each downstream destination. */
@Entity
@Table(name = "integration_deliveries", uniqueConstraints = @UniqueConstraint(
        name = "uk_delivery_flight_target_event_status",
        columnNames = {"flight_id", "target", "event_type", "flight_status"}))
public class IntegrationDelivery extends BaseEntity {
    @ManyToOne(optional = false) @JoinColumn(name = "flight_id", nullable = false)
    private FlightPlan flight;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private IntegrationTarget target;
    @Column(nullable = false, length = 80)
    private String eventType;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private FlightStatus flightStatus;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private DeliveryStatus status = DeliveryStatus.PENDING;
    @Lob @org.hibernate.annotations.Nationalized @Column(nullable = false)
    private String payloadJson;
    @Column(nullable = false)
    private int attempts;
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.TIMESTAMP)
    private Instant lastAttemptAt;
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.TIMESTAMP)
    private Instant deliveredAt;
    @org.hibernate.annotations.Nationalized @Column(length = 1000)
    private String lastError;
    @org.hibernate.annotations.Nationalized @Column(length = 1000)
    private String receipt;

    public FlightPlan getFlight() { return flight; }
    public void setFlight(FlightPlan flight) { this.flight = flight; }
    public IntegrationTarget getTarget() { return target; }
    public void setTarget(IntegrationTarget target) { this.target = target; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public FlightStatus getFlightStatus() { return flightStatus; }
    public void setFlightStatus(FlightStatus flightStatus) { this.flightStatus = flightStatus; }
    public DeliveryStatus getStatus() { return status; }
    public void setStatus(DeliveryStatus status) { this.status = status; }
    public String getPayloadJson() { return payloadJson; }
    public void setPayloadJson(String payloadJson) { this.payloadJson = payloadJson; }
    public int getAttempts() { return attempts; }
    public void setAttempts(int attempts) { this.attempts = attempts; }
    public Instant getLastAttemptAt() { return lastAttemptAt; }
    public void setLastAttemptAt(Instant lastAttemptAt) { this.lastAttemptAt = lastAttemptAt; }
    public Instant getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(Instant deliveredAt) { this.deliveredAt = deliveredAt; }
    public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; }
    public String getReceipt() { return receipt; }
    public void setReceipt(String receipt) { this.receipt = receipt; }
}
