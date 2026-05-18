package com.timeops.platform.ssh;

public interface SshClient {

    SshExecutionResult execute(SshTarget sshTarget, String command);
}
