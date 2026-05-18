package com.timeops.platform.user;

import java.util.Collection;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.Set;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

public enum RoleCode {

    SUPER_ADMIN(EnumSet.allOf(Permission.class)),
    OPS_ADMIN(EnumSet.of(
            Permission.CUSTOMER_READ,
            Permission.CUSTOMER_WRITE,
            Permission.SERVER_READ,
            Permission.SERVER_WRITE,
            Permission.TEMPLATE_READ,
            Permission.TEMPLATE_WRITE,
            Permission.INSTANCE_READ,
            Permission.INSTANCE_WRITE,
            Permission.RELEASE_READ,
            Permission.RELEASE_WRITE,
            Permission.TASK_READ,
            Permission.TASK_EXECUTE,
            Permission.AUDIT_READ,
            Permission.USER_READ,
            Permission.ADHOC_COMMAND_EXECUTE
    )),
    AUDITOR(EnumSet.of(
            Permission.CUSTOMER_READ,
            Permission.SERVER_READ,
            Permission.TEMPLATE_READ,
            Permission.INSTANCE_READ,
            Permission.RELEASE_READ,
            Permission.TASK_READ,
            Permission.AUDIT_READ,
            Permission.USER_READ
    ));

    private static final String ROLE_PREFIX = "ROLE_";

    private final Set<Permission> permissions;

    RoleCode(Set<Permission> permissions) {
        this.permissions = Set.copyOf(permissions);
    }

    public Collection<GrantedAuthority> toGrantedAuthorities() {
        Set<GrantedAuthority> grantedAuthorities = new LinkedHashSet<>();
        grantedAuthorities.add(new SimpleGrantedAuthority(ROLE_PREFIX + name()));
        for (Permission permission : permissions) {
            grantedAuthorities.add(new SimpleGrantedAuthority(permission.getCode()));
        }
        return grantedAuthorities;
    }
}
