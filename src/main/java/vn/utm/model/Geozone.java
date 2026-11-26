package vn.utm.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "geozones")
public class Geozone extends BaseEntity {
    @Column(nullable = false, unique = true, length = 50)
    private String code;
    @Column(nullable = false, length = 150)
    private String name;
    @Column(nullable = false, length = 30)
    private String zoneType; // NFZ, RESTRICTED, TFR_UVR
    @Column(nullable = false, length = 20)
    private String category; // STATIC, DYNAMIC
    @Column(nullable = false)
    private double centerLat;
    @Column(nullable = false)
    private double centerLng;
    @Column(nullable = false)
    private double radiusMeters;
    @Column(nullable = false)
    private double minAltitudeM;
    @Column(nullable = false)
    private double maxAltitudeM = 120;
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.TIMESTAMP)
    private Instant effectiveFrom;
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.TIMESTAMP)
    private Instant effectiveTo;
    @Column(length = 500)
    private String description;

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getZoneType() { return zoneType; }
    public void setZoneType(String zoneType) { this.zoneType = zoneType; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public double getCenterLat() { return centerLat; }
    public void setCenterLat(double centerLat) { this.centerLat = centerLat; }
    public double getCenterLng() { return centerLng; }
    public void setCenterLng(double centerLng) { this.centerLng = centerLng; }
    public double getRadiusMeters() { return radiusMeters; }
    public void setRadiusMeters(double radiusMeters) { this.radiusMeters = radiusMeters; }
    public double getMinAltitudeM() { return minAltitudeM; }
    public void setMinAltitudeM(double minAltitudeM) { this.minAltitudeM = minAltitudeM; }
    public double getMaxAltitudeM() { return maxAltitudeM; }
    public void setMaxAltitudeM(double maxAltitudeM) { this.maxAltitudeM = maxAltitudeM; }
    public Instant getEffectiveFrom() { return effectiveFrom; }
    public void setEffectiveFrom(Instant effectiveFrom) { this.effectiveFrom = effectiveFrom; }
    public Instant getEffectiveTo() { return effectiveTo; }
    public void setEffectiveTo(Instant effectiveTo) { this.effectiveTo = effectiveTo; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
