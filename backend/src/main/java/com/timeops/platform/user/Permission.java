package com.timeops.platform.user;

public enum Permission {

    CUSTOMER_READ("CUSTOMER_READ"),
    CUSTOMER_WRITE("CUSTOMER_WRITE"),
    SERVER_READ("SERVER_READ"),
    SERVER_WRITE("SERVER_WRITE"),
    TEMPLATE_READ("TEMPLATE_READ"),
    TEMPLATE_WRITE("TEMPLATE_WRITE"),
    INSTANCE_READ("INSTANCE_READ"),
    INSTANCE_WRITE("INSTANCE_WRITE"),
    RELEASE_READ("RELEASE_READ"),
    RELEASE_WRITE("RELEASE_WRITE"),
    TASK_READ("TASK_READ"),
    TASK_EXECUTE("TASK_EXECUTE"),
    AUDIT_READ("AUDIT_READ"),
    USER_READ("USER_READ"),
    USER_WRITE("USER_WRITE"),
    ADHOC_COMMAND_EXECUTE("ADHOC_COMMAND_EXECUTE");

    private final String code;

    Permission(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
