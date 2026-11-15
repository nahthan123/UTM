package vn.utm.model;

import jakarta.persistence.*;
import java.time.Instant;
import vn.utm.common.enums.FlightStatus;

@Entity
@Table(name = "flight_plans")
public class FlightPlan extends BaseEntity {
    @ManyToOne(optional = false) @JoinColumn(name = "drone_id", nullable = false)
    private Drone drone;
    @ManyToOne(optional = false) @JoinColumn(name = "operator_id", nullable = false)
    private UserAccount operator;
    @Column(nullable = false)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.TIMESTAMP)
    private Instant startTime;
    @Column(nullable = false)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.TIMESTAMP)
    private Instant endTime;
    @Lob @org.hibernate.annotations.Nationalized @Column(nullable = false)
    private String trajectoryJson;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private FlightStatus status = FlightStatus.PENDING;
    public Drone getDrone() { return drone; }
    public void setDrone(Drone drone) { this.drone = drone; }
    public UserAccount getOperator() { return operator; }
    public void setOperator(UserAccount operator) { this.operator = operator; }
    public Instant getStartTime() { return startTime; }
    public void setStartTime(Instant startTime) { this.startTime = startTime; }
    public Instant getEndTime() { return endTime; }
    public void setEndTime(Instant endTime) { this.endTime = endTime; }
    public String getTrajectoryJson() { return trajectoryJson; }
    public void setTrajectoryJson(String trajectoryJson) { this.trajectoryJson = trajectoryJson; }
    public FlightStatus getStatus() { return status; }
    public void setStatus(FlightStatus status) { this.status = status; }
}
