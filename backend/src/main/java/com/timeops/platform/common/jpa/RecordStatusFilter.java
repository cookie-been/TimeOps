package com.timeops.platform.common.jpa;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public enum RecordStatusFilter {
    ACTIVE,
    ARCHIVED,
    ALL;

    public static RecordStatusFilter fromText(String text) {
        try {
            return RecordStatusFilter.valueOf(text.toUpperCase());
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid status filter: " + text);
        }
    }
}
