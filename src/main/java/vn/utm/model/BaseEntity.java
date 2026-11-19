package vn.utm.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@MappedSuperclass
public abstract class BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false, updatable = false)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.TIMESTAMP)
    private Instant createdAt;
    @Column(nullable = false)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.TIMESTAMP)
    private Instant updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.TIMESTAMP)
    private Instant deletedAt;
    private UUID deletedBy;
    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @PrePersist
    protected void onCreate() { createdAt = updatedAt = Instant.now(); }

    @PreUpdate
    protected void onUpdate() { updatedAt = Instant.now(); }

    public void recordActor(UUID actor) {
        if (createdBy == null) createdBy = actor;
        updatedBy = actor;
    }

    public void softDelete(UUID actor) {
        active = false; deletedAt = Instant.now(); deletedBy = actor; updatedBy = actor;
    }

    public void restore(UUID actor) {
        active = true; deletedAt = null; deletedBy = null; updatedBy = actor;
    }

    public UUID getId() { return id; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public UUID getCreatedBy() { return createdBy; }
    public UUID getUpdatedBy() { return updatedBy; }
    public Instant getDeletedAt() { return deletedAt; }
    public UUID getDeletedBy() { return deletedBy; }
    @com.fasterxml.jackson.annotation.JsonProperty("isActive")
    public boolean isActive() { return active; }
}
