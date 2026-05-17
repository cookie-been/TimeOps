package com.timeops.platform.user;

import java.util.Collection;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.Set;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

public enum RoleCode {

    SUPER_ADMIN(EnumSet.allOf(Permission.class));

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
