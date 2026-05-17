package com.timeops.platform.security;

public final class SecurityPathConstants {

    public static final String HEALTH_ENDPOINT = "/api/health";
    public static final String HEALTH_ENDPOINT_PATTERN = "/api/health/**";
    public static final String AUTH_BASE_PATH = "/api/auth";
    public static final String AUTH_LOGIN_PATH = "/login";
    public static final String AUTH_LOGIN_ENDPOINT = AUTH_BASE_PATH + AUTH_LOGIN_PATH;

    private SecurityPathConstants() {
    }
}
