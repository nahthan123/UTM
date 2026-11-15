package vn.utm.model;

import jakarta.persistence.*;
import java.time.Instant;
import vn.utm.common.enums.AccountType;

@Entity
@Table(name = "users")
public class UserAccount extends BaseEntity {
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @org.hibernate.annotations.ColumnDefault("'INDIVIDUAL'")
    private AccountType accountType = AccountType.INDIVIDUAL;
    @Column(length = 50)
    private String nationalId;
    @Column(length = 255)
    private String companyName;
    @Column(unique = true, length = 50)
    private String taxCode;
    @Column(length = 100)
    private String representative;
    @Column(length = 255)
    private String address;
    @Column(length = 100)
    private String licenseNumber;
    @ManyToOne(optional = false) @JoinColumn(name = "role_id", nullable = false)
    private Role role;
    @Column(nullable = false, unique = true, length = 50)
    private String username;
    @com.fasterxml.jackson.annotation.JsonIgnore @Column(nullable = false, length = 255)
    private String passwordHash;
    @Column(nullable = false, length = 100)
    private String fullName;
    @Column(nullable = false, unique = true, length = 100)
    private String email;
    @Column(nullable = false, length = 20)
    private String phone;
    @Column(length = 255)
    private String avatarUrl;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.TIMESTAMP)
    private Instant lastLoginAt;
    @Column(name = "is_locked", nullable = false)
    private boolean locked;
    @Column(nullable = false)
    private int loginFailCount;
    public AccountType getAccountType() { return accountType == null ? AccountType.INDIVIDUAL : accountType; }
    public void setAccountType(AccountType accountType) { this.accountType = accountType; }
    public String getNationalId() { return nationalId; }
    public void setNationalId(String nationalId) { this.nationalId = nationalId; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getTaxCode() { return taxCode; }
    public void setTaxCode(String taxCode) { this.taxCode = taxCode; }
    public String getRepresentative() { return representative; }
    public void setRepresentative(String representative) { this.representative = representative; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }
    public String displayName() { return getAccountType() == AccountType.BUSINESS ? companyName : fullName; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public Instant getLastLoginAt() { return lastLoginAt; }
    public void setLastLoginAt(Instant lastLoginAt) { this.lastLoginAt = lastLoginAt; }
    @com.fasterxml.jackson.annotation.JsonProperty("isLocked")
    public boolean isLocked() { return locked; }
    public void setLocked(boolean locked) { this.locked = locked; }
    public int getLoginFailCount() { return loginFailCount; }
    public void setLoginFailCount(int loginFailCount) { this.loginFailCount = loginFailCount; }
}
