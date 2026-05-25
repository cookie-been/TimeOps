package com.timeops.platform.ssh;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import net.schmizz.sshj.SSHClient;
import net.schmizz.sshj.connection.channel.direct.Session;
import net.schmizz.sshj.transport.verification.PromiscuousVerifier;

public class RealSshClient implements SshClient {

    private final SshProperties sshProperties;
    private final ExecutorService executorService = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "ssh-reader");
        t.setDaemon(true);
        return t;
    });

    public RealSshClient(SshProperties sshProperties) {
        this.sshProperties = sshProperties;
    }

    @Override
    public SshExecutionResult execute(SshTarget sshTarget, String command) {
        try (SSHClient sshClient = new SSHClient()) {
            configureHostVerification(sshClient);
            sshClient.setConnectTimeout(sshProperties.getConnectTimeoutMillis());
            sshClient.setTimeout(sshProperties.getCommandTimeoutMillis());
            sshClient.connect(sshTarget.host(), sshTarget.port());
            sshClient.authPassword(sshTarget.username(), sshTarget.password());

            try (Session session = sshClient.startSession()) {
                Session.Command sshCommand = session.exec(command);
                try {
                    return waitForCommandResult(sshCommand);
                } finally {
                    sshCommand.close();
                }
            } finally {
                if (sshClient.isConnected()) {
                    sshClient.disconnect();
                }
            }
        } catch (SshExecutionException exception) {
            throw exception;
        } catch (Exception exception) {
            String message = exception.getMessage() == null ? "unknown error" : exception.getMessage();
            throw new IllegalStateException("SSH execution failed: " + message, exception);
        }
    }

    private void configureHostVerification(SSHClient sshClient) throws IOException {
        if (sshProperties.isStrictHostKeyChecking()) {
            sshClient.loadKnownHosts();
            return;
        }
        sshClient.addHostKeyVerifier(new PromiscuousVerifier());
    }

    private SshExecutionResult waitForCommandResult(Session.Command sshCommand)
            throws IOException, InterruptedException, ExecutionException, TimeoutException {
        Future<String> stdoutFuture = executorService.submit(() -> readStream(sshCommand.getInputStream()));
        Future<String> stderrFuture = executorService.submit(() -> readStream(sshCommand.getErrorStream()));

        sshCommand.join(sshProperties.getCommandTimeoutMillis(), TimeUnit.MILLISECONDS);
        Integer exitStatus = sshCommand.getExitStatus();
        if (exitStatus == null) {
            sshCommand.close();
            throw new SshExecutionException(
                    "SSH command timed out after " + sshProperties.getCommandTimeoutMillis() + " ms",
                    124,
                    waitForStream(stdoutFuture, 1000L),
                    waitForStream(stderrFuture, 1000L));
        }

        long readTimeoutMillis = Math.max(1000L, sshProperties.getCommandTimeoutMillis());
        String stdout = stdoutFuture.get(readTimeoutMillis, TimeUnit.MILLISECONDS);
        String stderr = stderrFuture.get(readTimeoutMillis, TimeUnit.MILLISECONDS);
        return new SshExecutionResult(exitStatus, stdout, stderr);
    }

    private String readStream(InputStream inputStream) throws IOException {
        if (inputStream == null) {
            return "";
        }
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        inputStream.transferTo(byteArrayOutputStream);
        return byteArrayOutputStream.toString(StandardCharsets.UTF_8);
    }

    private String waitForStream(Future<String> streamFuture, long timeoutMillis) {
        try {
            return streamFuture.get(timeoutMillis, TimeUnit.MILLISECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return "";
        } catch (ExecutionException | TimeoutException exception) {
            return "";
        }
    }
}
