package com.timeops.platform.server.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record ServerCreateRequest(
        @NotNull(message = "customerId must not be null")
        UUID customerId,
        @NotBlank(message = "host must not be blank")
        String host,
        @NotNull(message = "sshPort must not be null")
        @Min(value = 1, message = "sshPort must be greater than 0")
        @Max(value = 65535, message = "sshPort must be less than or equal to 65535")
        Integer sshPort,
        @NotBlank(message = "sshUsername must not be blank")
        String sshUsername,
        @NotBlank(message = "sshPassword must not be blank")
        String sshPassword,
        String osLabel,
        List<String> tags,
        String notes
) {
}
