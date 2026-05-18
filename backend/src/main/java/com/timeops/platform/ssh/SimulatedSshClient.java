package com.timeops.platform.ssh;

public class SimulatedSshClient implements SshClient {

    @Override
    public SshExecutionResult execute(SshTarget sshTarget, String command) {
        String stdout = "Simulated execution on %s:%d as %s -> %s".formatted(
                sshTarget.host(),
                sshTarget.port(),
                sshTarget.username(),
                command);
        return new SshExecutionResult(0, stdout, "");
    }
}
