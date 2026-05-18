package com.timeops.platform.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateUserRequest(
        @NotBlank(message = "username must not be blank")
        @Size(max = 64, message = "username length must be less than or equal to 64")
        String username,
        @NotBlank(message = "displayName must not be blank")
        @Size(max = 128, message = "displayName length must be less than or equal to 128")
        String displayName,
        @NotBlank(message = "password must not be blank")
        @Size(min = 8, max = 128, message = "password length must be between 8 and 128")
        String password,
        @NotEmpty(message = "roleCodes must not be empty")
        List<String> roleCodes,
        boolean enabled
) {
}
