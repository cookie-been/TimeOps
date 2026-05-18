package com.timeops.platform.ssh;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "timeops.ssh")
public class SshProperties {

    private SshMode mode = SshMode.SIMULATED;
    private int connectTimeoutMillis = 5000;
    private int commandTimeoutMillis = 30000;
    private boolean strictHostKeyChecking;

    public SshMode getMode() {
        return mode;
    }

    public void setMode(SshMode mode) {
        this.mode = mode;
    }

    public int getConnectTimeoutMillis() {
        return connectTimeoutMillis;
    }

    public void setConnectTimeoutMillis(int connectTimeoutMillis) {
        this.connectTimeoutMillis = connectTimeoutMillis;
    }

    public int getCommandTimeoutMillis() {
        return commandTimeoutMillis;
    }

    public void setCommandTimeoutMillis(int commandTimeoutMillis) {
        this.commandTimeoutMillis = commandTimeoutMillis;
    }

    public boolean isStrictHostKeyChecking() {
        return strictHostKeyChecking;
    }

    public void setStrictHostKeyChecking(boolean strictHostKeyChecking) {
        this.strictHostKeyChecking = strictHostKeyChecking;
    }
}
