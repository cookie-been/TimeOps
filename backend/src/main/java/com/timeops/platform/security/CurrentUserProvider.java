package com.timeops.platform.security;

import com.timeops.platform.user.UserEntity;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class CurrentUserProvider {

    public UUID currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserEntity userEntity)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "current user not found");
        }
        return userEntity.getId();
    }
}
