package vn.utm.model;

import jakarta.persistence.*;

@Entity
@Table(name = "drones")
public class Drone extends BaseEntity {
    @ManyToOne(optional = false) @JoinColumn(name = "owner_id", nullable = false)
    private UserAccount owner;
    @Column(nullable = false, unique = true, length = 100)
    private String serialNumber;
    @Column(nullable = false, length = 100)
    private String model;
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private vn.utm.common.enums.DroneType droneType;
    @Column(nullable = false)
    private Integer maxFlightTime;
    @Column(nullable = false)
    private Double maxSpeed;
    public UserAccount getOwner() { return owner; }
    public void setOwner(UserAccount owner) { this.owner = owner; }
    public String getSerialNumber() { return serialNumber; }
    public void setSerialNumber(String serialNumber) { this.serialNumber = serialNumber; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public vn.utm.common.enums.DroneType getDroneType() { return droneType; }
    public void setDroneType(vn.utm.common.enums.DroneType droneType) { this.droneType = droneType; }
    public Integer getMaxFlightTime() { return maxFlightTime; }
    public void setMaxFlightTime(Integer maxFlightTime) { this.maxFlightTime = maxFlightTime; }
    public Double getMaxSpeed() { return maxSpeed; }
    public void setMaxSpeed(Double maxSpeed) { this.maxSpeed = maxSpeed; }
}
