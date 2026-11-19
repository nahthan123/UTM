package vn.utm.model;

import jakarta.persistence.*;

@Entity
@Table(name = "roles")
public class Role extends BaseEntity {
    @Column(nullable = false, unique = true, length = 50)
    private String code;
    @Column(nullable = false, length = 100)
    private String name;
    @Column(length = 255)
    private String description;
    @Column(name = "is_system", nullable = false)
    private boolean system;
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    @com.fasterxml.jackson.annotation.JsonProperty("isSystem")
    public boolean isSystem() { return system; }
    public void setSystem(boolean system) { this.system = system; }
}
