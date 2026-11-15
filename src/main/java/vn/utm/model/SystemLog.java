package vn.utm.model;

import jakarta.persistence.*;

@Entity
@Table(name = "system_logs")
public class SystemLog extends BaseEntity {
    @ManyToOne @JoinColumn(name = "user_id")
    private UserAccount user;
    @Column(nullable = false, length = 50)
    private String actionType;
    @Lob @org.hibernate.annotations.Nationalized
    private String details;
    public UserAccount getUser() { return user; }
    public void setUser(UserAccount user) { this.user = user; }
    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }
    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
}
