# Real SSH Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configurable real SSH execution path for operation tasks while preserving the current simulated default behavior.

**Architecture:** Keep `SshClient` as the stable execution interface and introduce a second implementation for real SSH. Select the implementation through Spring configuration so current tests, Docker Compose, and local startup continue to work in simulated mode unless explicitly switched to real mode.

**Tech Stack:** Java 17, Spring Boot 3, Spring conditional beans, existing task/audit modules, one Java SSH client library

---

## File Structure

- Modify: `backend/pom.xml`  
  Add the SSH library dependency used by the real implementation.
- Create: `backend/src/main/java/com/timeops/platform/ssh/SshMode.java`  
  Define the execution mode enum.
- Create: `backend/src/main/java/com/timeops/platform/ssh/SshProperties.java`  
  Bind `timeops.ssh.*` configuration.
- Create: `backend/src/main/java/com/timeops/platform/ssh/SshConfiguration.java`  
  Wire the correct `SshClient` bean based on configuration.
- Modify: `backend/src/main/java/com/timeops/platform/ssh/SimulatedSshClient.java`  
  Remove unconditional component registration so bean creation is controlled centrally.
- Create: `backend/src/main/java/com/timeops/platform/ssh/RealSshClient.java`  
  Execute commands over real SSH and return structured results.
- Modify: `backend/src/main/java/com/timeops/platform/task/OperationTaskService.java`  
  Persist SSH transport failures as `FAILED` tasks instead of letting the worker crash.
- Modify: `backend/src/main/resources/application.yml`  
  Add default SSH execution configuration.
- Modify: `backend/.env.example`  
  Document runtime toggles for real SSH mode.
- Modify: `README.md`  
  Explain simulated vs real mode and how to switch.
- Create: `backend/src/test/java/com/timeops/platform/ssh/SshConfigurationTest.java`  
  Verify bean selection by configuration.
- Modify: `backend/src/test/java/com/timeops/platform/task/OperationTaskServiceTest.java`  
  Add failure-path coverage for SSH exceptions and non-zero exit codes.

## Task 1: Add configuration model for SSH mode selection

**Files:**
- Create: `backend/src/main/java/com/timeops/platform/ssh/SshMode.java`
- Create: `backend/src/main/java/com/timeops/platform/ssh/SshProperties.java`
- Create: `backend/src/main/java/com/timeops/platform/ssh/SshConfiguration.java`
- Modify: `backend/src/main/java/com/timeops/platform/ssh/SimulatedSshClient.java`
- Modify: `backend/src/main/resources/application.yml`
- Test: `backend/src/test/java/com/timeops/platform/ssh/SshConfigurationTest.java`

- [x] **Step 1: Write the failing configuration selection test**

```java
package com.timeops.platform.ssh;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "timeops.ssh.mode=simulated")
class SshConfigurationTest {

    @Autowired
    private SshClient sshClient;

    @Test
    void shouldUseSimulatedClientByDefaultMode() {
        assertThat(sshClient).isInstanceOf(SimulatedSshClient.class);
    }
}
```

- [x] **Step 2: Run the new test and verify it fails for the right reason**

Run: `cd backend && mvn -q -Dtest=SshConfigurationTest test`

Expected:

- test fails because there is no explicit configuration test yet
- or bean wiring is not controllable by `timeops.ssh.mode`

- [x] **Step 3: Add minimal SSH mode/configuration types**

`backend/src/main/java/com/timeops/platform/ssh/SshMode.java`

```java
package com.timeops.platform.ssh;

public enum SshMode {
    SIMULATED,
    REAL
}
```

`backend/src/main/java/com/timeops/platform/ssh/SshProperties.java`

```java
package com.timeops.platform.ssh;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "timeops.ssh")
public class SshProperties {

    private SshMode mode = SshMode.SIMULATED;
    private int connectTimeoutMillis = 5000;
    private int commandTimeoutMillis = 30000;
    private boolean strictHostKeyChecking = false;

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
```

`backend/src/main/java/com/timeops/platform/ssh/SshConfiguration.java`

```java
package com.timeops.platform.ssh;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(SshProperties.class)
public class SshConfiguration {

    @Bean
    public SshClient sshClient(SshProperties sshProperties) {
        if (sshProperties.getMode() == SshMode.REAL) {
            return new RealSshClient(sshProperties);
        }
        return new SimulatedSshClient();
    }
}
```

`backend/src/main/java/com/timeops/platform/ssh/SimulatedSshClient.java`

```java
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
```

`backend/src/main/resources/application.yml` add:

```yaml
timeops:
  ssh:
    mode: ${TIMEOPS_SSH_MODE:simulated}
    connect-timeout-millis: ${TIMEOPS_SSH_CONNECT_TIMEOUT_MILLIS:5000}
    command-timeout-millis: ${TIMEOPS_SSH_COMMAND_TIMEOUT_MILLIS:30000}
    strict-host-key-checking: ${TIMEOPS_SSH_STRICT_HOST_KEY_CHECKING:false}
```

- [x] **Step 4: Add a placeholder real client so wiring compiles**

`backend/src/main/java/com/timeops/platform/ssh/RealSshClient.java`

```java
package com.timeops.platform.ssh;

public class RealSshClient implements SshClient {

    public RealSshClient(SshProperties sshProperties) {
    }

    @Override
    public SshExecutionResult execute(SshTarget sshTarget, String command) {
        throw new UnsupportedOperationException("Real SSH client not implemented yet");
    }
}
```

- [x] **Step 5: Run the configuration test and verify it passes**

Run: `cd backend && mvn -q -Dtest=SshConfigurationTest test`

Expected:

- `BUILD SUCCESS`
- simulated mode test passes

## Task 2: Implement real SSH client behind the existing interface

**Files:**
- Modify: `backend/pom.xml`
- Modify: `backend/src/main/java/com/timeops/platform/ssh/RealSshClient.java`
- Test: `backend/src/test/java/com/timeops/platform/task/OperationTaskServiceTest.java`

- [x] **Step 1: Write a failing task execution test for SSH transport failure**

Add this test to `backend/src/test/java/com/timeops/platform/task/OperationTaskServiceTest.java`:

```java
@Test
void shouldMarkTaskFailedWhenSshExecutionThrows() {
    OperationTaskEntity operationTaskEntity = operationTaskService.enqueueAdhoc(
            existingServerId(),
            "echo fail",
            TestDataConstants.ADMIN_USER_ID);

    failingSshClient.failWith(new IllegalStateException("connect timeout"));

    operationTaskService.execute(operationTaskEntity.getId());

    OperationTaskEntity executedTask = operationTaskRepository.findById(operationTaskEntity.getId()).orElseThrow();
    assertThat(executedTask.getStatus()).isEqualTo(TaskStatus.FAILED);
    assertThat(executedTask.getErrorLog()).contains("connect timeout");
}
```

- [x] **Step 2: Run the task service test and verify it fails**

Run: `cd backend && mvn -q -Dtest=OperationTaskServiceTest test`

Expected:

- failure because current service does not convert SSH exceptions into failed tasks

- [x] **Step 3: Add the SSH library dependency**

In `backend/pom.xml` add the real SSH client library dependency used for password-based command execution.

Use one dependency block only, for example:

```xml
<dependency>
    <groupId>com.hierynomus</groupId>
    <artifactId>sshj</artifactId>
    <version>0.38.0</version>
</dependency>
```

- [x] **Step 4: Implement minimal real SSH execution**

`backend/src/main/java/com/timeops/platform/ssh/RealSshClient.java`

```java
package com.timeops.platform.ssh;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;
import net.schmizz.sshj.SSHClient;
import net.schmizz.sshj.connection.channel.direct.Session;
import net.schmizz.sshj.transport.verification.PromiscuousVerifier;

public class RealSshClient implements SshClient {

    private final SshProperties sshProperties;

    public RealSshClient(SshProperties sshProperties) {
        this.sshProperties = sshProperties;
    }

    @Override
    public SshExecutionResult execute(SshTarget sshTarget, String command) {
        try (SSHClient sshClient = new SSHClient()) {
            if (!sshProperties.isStrictHostKeyChecking()) {
                sshClient.addHostKeyVerifier(new PromiscuousVerifier());
            }
            sshClient.setConnectTimeout(sshProperties.getConnectTimeoutMillis());
            sshClient.setTimeout(sshProperties.getCommandTimeoutMillis());
            sshClient.connect(sshTarget.host(), sshTarget.port());
            sshClient.authPassword(sshTarget.username(), sshTarget.password());

            try (Session session = sshClient.startSession()) {
                session.allocateDefaultPTY();
                Session.Command sshCommand = session.exec(command);
                ByteArrayOutputStream stdout = new ByteArrayOutputStream();
                ByteArrayOutputStream stderr = new ByteArrayOutputStream();
                sshCommand.getInputStream().transferTo(stdout);
                sshCommand.getErrorStream().transferTo(stderr);
                sshCommand.join(sshProperties.getCommandTimeoutMillis(), TimeUnit.MILLISECONDS);
                Integer exitStatus = sshCommand.getExitStatus();
                int exitCode = exitStatus == null ? 124 : exitStatus;
                return new SshExecutionResult(
                        exitCode,
                        stdout.toString(StandardCharsets.UTF_8),
                        stderr.toString(StandardCharsets.UTF_8));
            } finally {
                sshClient.disconnect();
            }
        } catch (Exception exception) {
            throw new IllegalStateException("SSH execution failed: " + exception.getMessage(), exception);
        }
    }
}
```

- [x] **Step 5: Run focused tests and verify they pass**

Run: `cd backend && mvn -q -Dtest=SshConfigurationTest,OperationTaskServiceTest test`

Expected:

- `BUILD SUCCESS`
- configuration selection test passes
- existing success-path task test still passes
- failure-path task test is still red until Task 3

## Task 3: Persist SSH failures as failed tasks

**Files:**
- Modify: `backend/src/main/java/com/timeops/platform/task/OperationTaskService.java`
- Modify: `backend/src/test/java/com/timeops/platform/task/OperationTaskServiceTest.java`

- [x] **Step 1: Expand the failing test to cover stderr and non-zero exit code**

Add this second test to `backend/src/test/java/com/timeops/platform/task/OperationTaskServiceTest.java`:

```java
@Test
void shouldMarkTaskFailedWhenSshReturnsNonZeroExitCode() {
    OperationTaskEntity operationTaskEntity = operationTaskService.enqueueAdhoc(
            existingServerId(),
            "exit 2",
            TestDataConstants.ADMIN_USER_ID);

    configurableSshClient.returnResult(new SshExecutionResult(2, "", "boom"));

    operationTaskService.execute(operationTaskEntity.getId());

    OperationTaskEntity executedTask = operationTaskRepository.findById(operationTaskEntity.getId()).orElseThrow();
    assertThat(executedTask.getStatus()).isEqualTo(TaskStatus.FAILED);
    assertThat(executedTask.getErrorLog()).contains("boom");
}
```

- [x] **Step 2: Refactor test setup so `OperationTaskServiceTest` can inject a controlled fake client**

Inside `backend/src/test/java/com/timeops/platform/task/OperationTaskServiceTest.java`, add a test configuration:

```java
@TestConfiguration
static class TestSshConfig {

    @Bean
    @Primary
    ConfigurableSshClient configurableSshClient() {
        return new ConfigurableSshClient();
    }
}
```

and a helper fake:

```java
static class ConfigurableSshClient implements SshClient {
    private RuntimeException runtimeException;
    private SshExecutionResult nextResult = new SshExecutionResult(0, "ok", "");

    void failWith(RuntimeException runtimeException) {
        this.runtimeException = runtimeException;
    }

    void returnResult(SshExecutionResult sshExecutionResult) {
        this.runtimeException = null;
        this.nextResult = sshExecutionResult;
    }

    @Override
    public SshExecutionResult execute(SshTarget sshTarget, String command) {
        if (runtimeException != null) {
            throw runtimeException;
        }
        return nextResult;
    }
}
```

- [x] **Step 3: Update `OperationTaskService.execute()` to persist failure state**

Replace the method body in `backend/src/main/java/com/timeops/platform/task/OperationTaskService.java` with:

```java
@Transactional
public void execute(UUID taskId) {
    OperationTaskEntity operationTaskEntity = operationTaskRepository.findById(taskId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "task does not exist"));
    ServerEntity serverEntity = resolveServer(operationTaskEntity);
    operationTaskEntity.markRunning();
    try {
        SshExecutionResult sshExecutionResult = sshClient.execute(
                new SshTarget(
                        serverEntity.getHost(),
                        serverEntity.getSshPort(),
                        serverEntity.getSshUsername(),
                        credentialCryptoService.decrypt(serverEntity.getSshPasswordCipher())),
                operationTaskEntity.getCommandInput());
        operationTaskEntity.markFinished(
                sshExecutionResult.exitCode(),
                sshExecutionResult.stdout(),
                sshExecutionResult.stderr());
    } catch (RuntimeException exception) {
        operationTaskEntity.markFinished(
                255,
                "",
                exception.getMessage() == null ? "SSH execution failed" : exception.getMessage());
    }
}
```

- [x] **Step 4: Run the task service tests and verify they pass**

Run: `cd backend && mvn -q -Dtest=OperationTaskServiceTest test`

Expected:

- `BUILD SUCCESS`
- success-path, non-zero exit code path, and exception path all pass

## Task 4: Document and validate mode switching

**Files:**
- Modify: `backend/.env.example`
- Modify: `README.md`
- Test: full backend and frontend verification commands

- [x] **Step 1: Add the SSH mode environment variables to `backend/.env.example`**

Append:

```dotenv
TIMEOPS_SSH_MODE=simulated
TIMEOPS_SSH_CONNECT_TIMEOUT_MILLIS=5000
TIMEOPS_SSH_COMMAND_TIMEOUT_MILLIS=30000
TIMEOPS_SSH_STRICT_HOST_KEY_CHECKING=false
```

- [x] **Step 2: Update `README.md` to explain execution modes**

Add a short section under the existing SSH note:

```md
## SSH 执行模式

后端支持两种任务执行模式：

- `simulated`：默认模式，用于本地开发、测试和 Docker Compose 示例
- `real`：通过真实 SSH 用户名密码连接目标主机并执行命令

切换方式：

```bash
export TIMEOPS_SSH_MODE=real
```

可选参数：

- `TIMEOPS_SSH_CONNECT_TIMEOUT_MILLIS`
- `TIMEOPS_SSH_COMMAND_TIMEOUT_MILLIS`
- `TIMEOPS_SSH_STRICT_HOST_KEY_CHECKING`
```
```

- [x] **Step 3: Run backend verification**

Run: `cd backend && mvn -q test`

Expected:

- `BUILD SUCCESS`

- [x] **Step 4: Run frontend verification**

Run: `cd frontend && npm test && npm run build`

Expected:

- test suite passes
- production build succeeds

- [x] **Step 5: Run container verification in default simulated mode**

Run: `docker compose up -d --build && docker compose ps`

Expected:

- services are `Up`
- default mode remains simulated
