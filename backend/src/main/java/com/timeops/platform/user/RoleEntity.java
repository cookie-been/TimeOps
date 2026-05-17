package com.timeops.platform.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "app_role")
public class RoleEntity {

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_code", nullable = false, unique = true, length = 64)
    private RoleCode roleCode;

    @Column(name = "role_name", nullable = false, length = 128)
    private String roleName;

    protected RoleEntity() {
    }

    public UUID getId() {
        return id;
    }

    public RoleCode getRoleCode() {
        return roleCode;
    }

    public String getRoleName() {
        return roleName;
    }
}
