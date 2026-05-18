package com.timeops.platform.ssh;

public class SshExecutionException extends RuntimeException {

    private final Integer exitCode;
    private final String stdout;
    private final String stderr;

    public SshExecutionException(String message, Integer exitCode, String stdout, String stderr) {
        super(message);
        this.exitCode = exitCode;
        this.stdout = stdout == null ? "" : stdout;
        this.stderr = stderr == null ? "" : stderr;
    }

    public Integer getExitCode() {
        return exitCode;
    }

    public String getStdout() {
        return stdout;
    }

    public String getStderr() {
        return stderr;
    }
}
