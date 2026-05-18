package com.timeops.platform.ssh;

public record SshExecutionResult(int exitCode, String stdout, String stderr) {
}
