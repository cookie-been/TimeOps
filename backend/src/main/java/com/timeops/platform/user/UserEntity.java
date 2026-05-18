package com.timeops.platform.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Entity
@Table(name = "app_user")
public class UserEntity implements UserDetails {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 64)
    private String username;

    @Column(name = "display_name", nullable = false, length = 128)
    private String displayName;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(nullable = false)
    private boolean enabled;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "app_user_role",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<RoleEntity> roles = new LinkedHashSet<>();

    protected UserEntity() {
    }

    public UserEntity(
            UUID id,
            String username,
            String displayName,
            String passwordHash,
            boolean enabled,
            Set<RoleEntity> roles) {
        this.id = Objects.requireNonNull(id, "id must not be null");
        this.username = Objects.requireNonNull(username, "username must not be null");
        this.displayName = Objects.requireNonNull(displayName, "displayName must not be null");
        this.passwordHash = Objects.requireNonNull(passwordHash, "passwordHash must not be null");
        this.enabled = enabled;
        replaceRoles(roles);
    }

    public UUID getId() {
        return id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public Set<RoleEntity> getRoles() {
        return roles;
    }

    public void replaceRoles(Set<RoleEntity> roles) {
        this.roles.clear();
        if (roles != null) {
            this.roles.addAll(roles);
        }
    }

    public void changeEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream()
                .map(RoleEntity::getRoleCode)
                .flatMap(roleCode -> roleCode.toGrantedAuthorities().stream())
                .distinct()
                .toList();
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
