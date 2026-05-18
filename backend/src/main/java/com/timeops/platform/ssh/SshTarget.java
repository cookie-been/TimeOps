package com.timeops.platform.ssh;

public record SshTarget(
        String host,
        Integer port,
        String username,
        String password
) {
}
