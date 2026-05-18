package com.timeops.platform.user.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record UpdateUserRolesRequest(
        @NotEmpty(message = "roleCodes must not be empty")
        List<String> roleCodes
) {
}
