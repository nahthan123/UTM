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
    private java.util.UUID submissionId;
    @Column(nullable = false)
    private int uavCount = 1;
    @Column(length = 255)
    private String departureName;
    @Column(length = 255)
    private String destinationName;
    @Column(nullable = false, length = 10)
    private String altitudeReference = "AGL";
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.TIMESTAMP)
    private Instant reviewedAt;
    private java.util.UUID reviewedBy;
    @Column(length = 1000)
    private String reviewNote;
    public java.util.UUID getSubmissionId() { return submissionId; }
    public void setSubmissionId(java.util.UUID value) { submissionId = value; }
    public int getUavCount() { return uavCount; }
    public void setUavCount(int value) { uavCount = value; }
    public String getDepartureName() { return departureName; }
    public void setDepartureName(String value) { departureName = value; }
    public String getDestinationName() { return destinationName; }
    public void setDestinationName(String value) { destinationName = value; }
    public String getAltitudeReference() { return altitudeReference; }
    public void setAltitudeReference(String value) { altitudeReference = value; }
    public Instant getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(Instant value) { reviewedAt = value; }
    public java.util.UUID getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(java.util.UUID value) { reviewedBy = value; }
    public String getReviewNote() { return reviewNote; }
    public void setReviewNote(String value) { reviewNote = value; }
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
