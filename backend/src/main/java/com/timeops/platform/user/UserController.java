package com.timeops.platform.user;

import com.timeops.platform.audit.AuditService;
import com.timeops.platform.common.api.ApiResponse;
import com.timeops.platform.user.dto.CreateUserRequest;
import com.timeops.platform.user.dto.RoleOptionResponse;
import com.timeops.platform.user.dto.UpdateUserRolesRequest;
import com.timeops.platform.user.dto.UpdateUserStatusRequest;
import com.timeops.platform.user.dto.UserSummaryResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final AuditService auditService;

    public UserController(UserService userService, AuditService auditService) {
        this.userService = userService;
        this.auditService = auditService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('USER_READ')")
    public ApiResponse<List<UserSummaryResponse>> listUsers() {
        return ApiResponse.ok(userService.listUsers());
    }

    @GetMapping("/roles")
    @PreAuthorize("hasAuthority('USER_READ')")
    public ApiResponse<List<RoleOptionResponse>> listRoles() {
        return ApiResponse.ok(userService.listRoles());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('USER_WRITE')")
    public ApiResponse<UserSummaryResponse> createUser(@Valid @RequestBody CreateUserRequest createUserRequest) {
        UserSummaryResponse userSummaryResponse = userService.createUser(
                createUserRequest.username(),
                createUserRequest.displayName(),
                createUserRequest.password(),
                createUserRequest.roleCodes(),
                createUserRequest.enabled());
        auditService.record(
                currentUserId(),
                "USER_CREATED",
                "USER",
                userSummaryResponse.id().toString(),
                null,
                Map.of(
                        "username", userSummaryResponse.username(),
                        "displayName", userSummaryResponse.displayName(),
                        "roleCodes", userSummaryResponse.roles(),
                        "enabled", userSummaryResponse.enabled()));
        return ApiResponse.ok(userSummaryResponse);
    }

    @PutMapping("/{userId}/roles")
    @PreAuthorize("hasAuthority('USER_WRITE')")
    public ApiResponse<UserSummaryResponse> updateUserRoles(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateUserRolesRequest updateUserRolesRequest) {
        UserSummaryResponse userSummaryResponse = userService.updateUserRoles(userId, updateUserRolesRequest.roleCodes());
        auditService.record(
                currentUserId(),
                "USER_ROLE_UPDATED",
                "USER",
                userId.toString(),
                null,
                Map.of("roleCodes", userSummaryResponse.roles()));
        return ApiResponse.ok(userSummaryResponse);
    }

    @PutMapping("/{userId}/status")
    @PreAuthorize("hasAuthority('USER_WRITE')")
    public ApiResponse<UserSummaryResponse> updateUserStatus(
            @PathVariable UUID userId,
            @RequestBody UpdateUserStatusRequest updateUserStatusRequest) {
        UserSummaryResponse userSummaryResponse = userService.updateUserStatus(userId, updateUserStatusRequest.enabled());
        auditService.record(
                currentUserId(),
                "USER_STATUS_UPDATED",
                "USER",
                userId.toString(),
                null,
                Map.of("enabled", userSummaryResponse.enabled()));
        return ApiResponse.ok(userSummaryResponse);
    }

    private UUID currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserEntity userEntity)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "current user not found");
        }
        return userEntity.getId();
    }
}
