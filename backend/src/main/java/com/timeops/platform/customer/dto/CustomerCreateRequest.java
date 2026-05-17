package com.timeops.platform.customer.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CustomerCreateRequest(
        @NotBlank(message = "name must not be blank")
        String name,
        String contactName,
        String contactPhone,
        @Email(message = "contactEmail must be a valid email address")
        String contactEmail,
        String notes
) {
}
