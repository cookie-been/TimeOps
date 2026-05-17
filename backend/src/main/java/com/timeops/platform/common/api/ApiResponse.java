package com.timeops.platform.common.api;

public record ApiResponse<T>(boolean success, String code, String message, T data) {

    private static final String SUCCESS_CODE = "OK";
    private static final String SUCCESS_MESSAGE = "success";

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, SUCCESS_CODE, SUCCESS_MESSAGE, data);
    }
}
