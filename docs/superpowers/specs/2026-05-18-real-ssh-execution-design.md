# TimeOps Real SSH Execution Design

- Date: 2026-05-18
- Status: Draft for review
- Scope: Replace the current task execution simulation with a configurable real SSH implementation while preserving the existing MVP workflow and local developer experience

## 1. Goal

TimeOps currently executes operation tasks through `SimulatedSshClient`, which is sufficient for demonstrating task orchestration and audit flow but does not provide real remote execution.

This design adds a real SSH implementation behind the existing `SshClient` interface and keeps simulation as the default mode. The product remains runnable out of the box, while operators can opt into real SSH execution through backend configuration.

## 2. Non-Goals

This change does not include:

- SSH key authentication
- Interactive shell sessions
- File upload or artifact transfer
- Host fingerprint persistence UI
- Multi-hop bastion support
- Streaming logs over WebSocket

The first version is limited to non-interactive password-based command execution over SSH.

## 3. Recommended Approach

Use two `SshClient` implementations behind the same interface:

- `SimulatedSshClient`: keep existing behavior for tests, demos, and default local startup
- `RealSshClient`: execute commands against the configured target over SSH

Select the implementation through backend configuration. This avoids breaking the current runnable product and keeps the test suite independent from external infrastructure.

## 4. Architecture

### 4.1 Component Layout

- Keep `SshClient` interface unchanged
- Keep `SshTarget` as the runtime transport object containing host, port, username, and decrypted password
- Add `RealSshClient` in `backend/src/main/java/com/timeops/platform/ssh/`
- Add SSH mode configuration under `timeops.ssh`
- Make bean selection conditional on configuration

### 4.2 Configuration

Introduce backend configuration:

- `timeops.ssh.mode`
  - `simulated`
  - `real`
- `timeops.ssh.connect-timeout-millis`
- `timeops.ssh.command-timeout-millis`
- `timeops.ssh.strict-host-key-checking`

Default values:

- mode: `simulated`
- strict host key checking: `false`
- conservative timeouts suitable for MVP verification

The default remains simulation so current Docker Compose and local startup continue to work without requiring an accessible SSH server.

### 4.3 Library Choice

Use a Java SSH library rather than shelling out to the system `ssh` binary. The implementation should stay inside the Spring Boot process and return a structured `SshExecutionResult`.

Selection criteria:

- Stable password authentication support
- Explicit timeout controls
- Separate stdout and stderr capture
- Clear exception model

## 5. Runtime Behavior

### 5.1 Task Submission

No API changes are required. Existing task creation endpoints remain unchanged:

- `POST /api/tasks/adhoc`
- `POST /api/tasks/deploy`
- `POST /api/tasks/restart`

### 5.2 Task Execution

`OperationTaskService.execute()` continues to:

1. Resolve target server
2. Decrypt stored password
3. Build `SshTarget`
4. Execute command through `SshClient`
5. Persist exit code, stdout, stderr, timestamps, and final status

### 5.3 Simulated Mode

Behavior remains exactly as it is today:

- command succeeds immediately
- task reaches `SUCCESS`
- output contains the simulated execution message

### 5.4 Real Mode

Behavior in real mode:

- connect to target host and port
- authenticate with username and password
- execute the single command contained in `commandInput`
- wait for completion subject to command timeout
- capture exit code, stdout, and stderr
- mark task as:
  - `SUCCESS` when exit code is `0`
  - `FAILED` otherwise

## 6. Failure Handling

The current implementation assumes `sshClient.execute()` returns a result. Real SSH introduces transport and authentication failures that must be persisted as task failures instead of crashing the worker.

Required behavior:

- Wrap SSH execution in error handling inside `OperationTaskService.execute()`
- On connection/authentication/timeout/command exceptions:
  - set task `startedAt` if execution began
  - set task `endedAt`
  - set task status to `FAILED`
  - persist a non-zero synthetic exit code
  - write a short machine-readable summary to `errorLog`
  - keep `outputLog` empty unless partial stdout exists

This ensures failed remote execution still appears in task center and audit workflows as a completed failure, not a hung or lost task.

## 7. Security Constraints

- SSH passwords remain encrypted at rest through the existing `CredentialCryptoService`
- Passwords must never be written into task output, error logs, or audit details
- `strict-host-key-checking=false` is acceptable for MVP bootstrap but must be explicit in config
- Any exception text returned to users must avoid echoing credentials

## 8. Testing Strategy

### 8.1 Unit / Service Tests

Add tests for:

- simulated mode still returns success
- SSH execution exception marks task as `FAILED`
- non-zero exit code marks task as `FAILED`
- stdout and stderr are persisted

### 8.2 Integration Behavior

Keep existing integration tests on simulated mode. They should not depend on external SSH reachability.

Add at least one Spring-level test proving configuration selects the expected `SshClient` implementation.

### 8.3 Manual Verification

Manual validation should include:

1. start backend in simulated mode and verify current deploy flow still succeeds
2. start backend in real mode against a reachable SSH host
3. submit an ad hoc task such as `echo hello`
4. confirm task becomes `SUCCESS`
5. confirm stdout contains the real command output
6. confirm authentication failure becomes `FAILED`

## 9. Delivery Impact

### 9.1 Files Expected to Change

- `backend/pom.xml`
- `backend/src/main/java/com/timeops/platform/ssh/RealSshClient.java`
- `backend/src/main/java/com/timeops/platform/ssh/SimulatedSshClient.java`
- `backend/src/main/java/com/timeops/platform/task/OperationTaskService.java`
- `backend/src/main/resources/application.yml`
- `backend/.env.example`
- `README.md`
- backend tests covering task failure and configuration selection

### 9.2 Local and Docker Behavior

- Default compose behavior stays simulated
- No existing local startup command changes are required
- Real SSH mode is opt-in through environment or application config

## 10. Acceptance Criteria

This work is complete when all of the following are true:

- Existing local product startup still works without external SSH infrastructure
- Existing test suite remains green
- Real SSH mode can be enabled by configuration only
- A task in real mode can execute a remote command and store its real stdout/stderr
- Connection or authentication failures produce persisted `FAILED` tasks
- Documentation explains how to switch between simulated and real mode

