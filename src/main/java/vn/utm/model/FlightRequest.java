package vn.utm.model;

import jakarta.persistence.*;
import vn.utm.common.enums.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "flight_requests")
public class FlightRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private String flightCode;
    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    private CompanyProfile company;
    @Column(nullable = false)
    private String missionName;
    @Column(nullable = false)
    private String departureLocation;
    @Column(nullable = false)
    private String destinationLocation;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DroneType droneType;
    @Column(nullable = false)
    private LocalDateTime scheduledAt;
    @Column(nullable = false)
    private Integer altitude;
    @Column(nullable = false)
    private Integer estimatedDuration;
    @Enumerated(EnumType.STRING)
    private FlightStatus status = FlightStatus.REGISTERED;
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime sentAt;

    public Long getId() {
        return id;
    }

    public String getFlightCode() {
        return flightCode;
    }

    public void setFlightCode(String flightCode) {
        this.flightCode = flightCode;
    }

    public CompanyProfile getCompany() {
        return company;
    }

    public void setCompany(CompanyProfile company) {
        this.company = company;
    }

    public String getMissionName() {
        return missionName;
    }

    public void setMissionName(String missionName) {
        this.missionName = missionName;
    }

    public String getDepartureLocation() {
        return departureLocation;
    }

    public void setDepartureLocation(String departureLocation) {
        this.departureLocation = departureLocation;
    }

    public String getDestinationLocation() {
        return destinationLocation;
    }

    public void setDestinationLocation(String destinationLocation) {
        this.destinationLocation = destinationLocation;
    }

    public DroneType getDroneType() {
        return droneType;
    }

    public void setDroneType(DroneType droneType) {
        this.droneType = droneType;
    }

    public LocalDateTime getScheduledAt() {
        return scheduledAt;
    }

    public void setScheduledAt(LocalDateTime scheduledAt) {
        this.scheduledAt = scheduledAt;
    }

    public Integer getAltitude() {
        return altitude;
    }

    public void setAltitude(Integer altitude) {
        this.altitude = altitude;
    }

    public Integer getEstimatedDuration() {
        return estimatedDuration;
    }

    public void setEstimatedDuration(Integer estimatedDuration) {
        this.estimatedDuration = estimatedDuration;
    }

    public FlightStatus getStatus() {
        return status;
    }

    public void setStatus(FlightStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }
}
