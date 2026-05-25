# TimeOps Repo State Handoff

- Date: 2026-05-25 (updated)
- Workspace: `D:\workspace\timeops`
- Branch: `main` (the `codex/timeops-frontend-polish` branch was merged into main via fast-forward on 2026-05-20)
- Recent commits:
  - `0251e5e chore: ignore codex temp files`
  - `5e7cd50 feat: add server remote terminal`
  - `735eead Polish frontend deployment workflows`
  - `596df02 docs: add codex continuity guide`
  - `27e00f4 feat: normalize template action execution order`

## Snapshot

- Working tree currently contains the server remote terminal follow-up plus documentation updates.
- The large platform baseline, template editor expansion, and manual template action ordering UI are committed.
- Main continuity risk is making sure future work starts from the newer delivery-platform baseline, ordering semantics, and server terminal follow-up instead of the stale upgrade plan.

## What Is Already Present In The Worktree

- Backend modules exist for:
  - `security`, `user`
  - `customer`, `server`
  - `template`, `release`, `instance`
  - `task`, `audit`
  - `ssh` with simulated and real execution paths
- Frontend pages exist for:
  - login
  - customers, servers, templates, releases, instances
  - task center, audit log, user roles
- Real SSH support is not just a stub:
  - `backend/src/main/java/com/timeops/platform/ssh/RealSshClient.java`
  - `backend/src/main/java/com/timeops/platform/ssh/SshConfiguration.java`
  - `docker-compose.real-ssh.yml`
- Enterprise archive/restore model is present through shared JPA support:
  - `backend/src/main/java/com/timeops/platform/common/jpa/AbstractArchivableEntity.java`
  - `backend/src/main/resources/db/migration/V8__add_archive_support.sql`
- `UPDATE` task flow already exists in code, even though one later plan file is still unchecked:
  - `backend/src/main/java/com/timeops/platform/task/TaskType.java`
  - `backend/src/test/java/com/timeops/platform/task/TaskCommandControllerTest.java`
  - `frontend/src/test/task-create.test.tsx`

## Plan File State

- `docs/superpowers/plans/2026-05-17-timeops-mvp-implementation.md`: appears fully checked.
- `docs/superpowers/plans/2026-05-18-enterprise-crud-archiving.md`: fully checked.
- `docs/superpowers/plans/2026-05-18-real-ssh-execution.md`: fully checked.
- `docs/superpowers/plans/2026-05-18-real-ssh-compose-entry.md`: fully checked.
- `docs/superpowers/plans/2026-05-18-project-delivery-platform-upgrade.md`: checklist is still unchecked and is stale relative to current code. Treat it as a backlog/spec, not as ground truth for implemented status.
- `docs/superpowers/plans/2026-05-18-delivery-platform-remaining-work.md`: effectively complete for the currently planned scope.

## Delivery Upgrade Reality Check

- P0 in `2026-05-18-project-delivery-platform-upgrade.md` is mostly already implemented even though the checklist is unchecked:
  - backend `UPDATE` task endpoint exists
  - frontend update task creation exists
  - task DTOs already expose status, logs, exit code, start/end/create time
  - real SSH timeout default is already raised to `1800000` ms
  - failure detail preservation is already covered in `OperationTaskServiceTest`
- P1 is now implemented:
  - `TaskExecutionContext`, `TaskExecutionContextFactory`, and `TemplateStepExecutor` are present
  - `OperationTaskService.execute()` dispatches `STEP` actions through the structured runner
  - `STEP` mode currently supports a minimal JSON shape with `script` plus runtime-env toggles
  - frontend template editing supports multiple delivery actions with per-action `SCRIPT` / `STEP` switching
- P2 is now mostly implemented:
  - backend and frontend support `BACKUP`, `ROLLBACK`, and `VERIFY`
  - template action types include `BACKUP`, `ROLLBACK`, and `VERIFY`
  - task center create drawer and task type tags expose the new delivery actions
  - remaining work is mainly README sync and fresh full-suite verification

## Verification Run On 2026-05-18

- `cd frontend && npm test`
  - passed
  - 12 test files
  - 19 tests
- `cd frontend && npm run build`
  - passed
- `cd backend && mvn -q -DskipTests package`
  - passed
- `cd backend && mvn -q test`
  - now passes
  - 16 test classes
  - 30 tests

## Latest Follow-up

- The earlier backend failure in `OperationTaskServiceTest` was caused by flaky test data generation, not production task logic.
- Root cause:
  - `existingServerId()` previously mapped random suffixes into only 200 possible IP addresses, so rows in the shared test database could collide on `managed_server.active_key`.
- Fix applied:
  - `backend/src/test/java/com/timeops/platform/task/OperationTaskServiceTest.java`
  - added a regression test proving distinct suffixes generate distinct hosts
  - changed test host generation from a lossy `10.20.30.x` hash bucket to a unique hostname form: `task-host-<token>.internal`
- Fresh verification after the fix:
  - `cd backend && mvn -q -Dtest=OperationTaskServiceTest#shouldGenerateDistinctTestHostsForDifferentSuffixes test`
    - passed
  - `cd backend && mvn -q -Dtest=OperationTaskServiceTest test`
    - passed
  - `cd backend && mvn -q test`
    - passed

## Delivery Platform Progress On 2026-05-18

- Backend `STEP` execution path is now live:
  - `backend/src/main/java/com/timeops/platform/task/TaskExecutionContext.java`
  - `backend/src/main/java/com/timeops/platform/task/TaskExecutionContextFactory.java`
  - `backend/src/main/java/com/timeops/platform/task/TemplateStepExecutor.java`
- `OperationTaskServiceTest.shouldExecuteStepActionWithRuntimeContext` verifies:
  - template default work dir injection
  - merged config env injection
  - release version and git ref injection
  - instance environment injection
- Template editing now preserves `STEP` action definitions end to end:
  - backend controller coverage added
  - frontend template lifecycle test added
  - frontend template page now supports enabling and editing `DEPLOY`, `UPDATE`, `BACKUP`, `ROLLBACK`, `VERIFY`, and `RESTART`
- Delivery task surface widened end to end:
  - backend task types and endpoints now include `BACKUP`, `ROLLBACK`, and `VERIFY`
  - frontend task center can create backup, rollback, and verify tasks
  - presentation tags and audit labels recognize the new task types

## Fresh Verification On 2026-05-18

- Focused verification:
  - `cd backend && mvn -q -Dtest=TaskCommandControllerTest test`
    - passed
  - `cd backend && mvn -q -Dtest=OperationTaskServiceTest,ProductTemplateControllerTest test`
    - passed
  - `cd frontend && npm test -- src/test/task-create.test.tsx src/test/task-center.test.tsx`
    - passed
- Full verification:
  - `cd backend && mvn -q test`
    - passed
    - 16 test classes, all green
  - `cd frontend && npm test`
    - passed
    - 12 test files, 26 tests
  - `cd frontend && npm run build`
    - passed

## Latest Frontend Follow-up On 2026-05-18

- `TemplateListPage` no longer edits only the deploy action.
- The template drawer now supports enabling and editing:
  - `DEPLOY`
  - `UPDATE`
  - `BACKUP`
  - `ROLLBACK`
  - `VERIFY`
  - `RESTART`
- Each supported action can independently choose `SCRIPT` or `STEP`.
- Existing unknown action types are preserved when editing.
- Focused verification after this follow-up:
  - `cd frontend && npm test -- src/test/template-lifecycle.test.tsx`
    - passed
  - `cd frontend && npm run build`
    - passed

## Latest Frontend Follow-up On 2026-05-19

- `TemplateListPage` now supports manual ordering for enabled delivery actions inside the template drawer.
- Enabled actions are rendered as an ordered stack with per-action move up / move down controls.
- Template submission now preserves the user-selected order in the outgoing `actions` payload instead of always falling back to the static action-type order.
- The template list table now shows action order summaries such as `1.部署 2.备份 3.验证` instead of only showing an action count.
- Ordering state is synchronized on submit so quick enable/disable changes do not race the payload builder.
- New frontend regression coverage:
  - `TemplateListPage lifecycle > supports reordering enabled delivery actions before save`
- Fresh verification after this follow-up:
  - `cd frontend && npm test`
    - passed
    - 12 test files, 26 tests
  - `cd frontend && npm run build`
    - passed

## Latest Ordering Semantics Follow-up On 2026-05-19

- Template action payloads now carry explicit `executionOrder` values from the frontend instead of relying only on array position.
- Backend template update/create handling now recognizes explicit ordering and sorts action requests by `executionOrder` before persisting them.
- Backend validation now rejects invalid explicit ordering shapes:
  - `executionOrder < 1`
  - duplicate `executionOrder`
  - partially-specified explicit ordering where only some actions provide `executionOrder`
- Template action persistence is now normalized to 1-based order values instead of the earlier 0-based entity assignment.
- Frontend mock template create/update paths now preserve explicit `executionOrder` when payloads already provide it.
- New regression coverage:
  - `TemplateListPage lifecycle > supports reordering enabled delivery actions before save`
  - `ProductTemplateControllerTest.shouldRespectExplicitExecutionOrderOnUpdate`
- Fresh verification after this follow-up:
  - `cd backend && mvn -q test`
    - passed
    - 16 test classes
    - 34 tests
  - `cd frontend && npm test`
    - passed
    - 12 test files, 26 tests
  - `cd frontend && npm run build`
    - passed

## Latest Server Terminal Follow-up On 2026-05-20

- Work was done on branch `codex/timeops-frontend-polish` and merged into `main` on 2026-05-20.
- Server management now has an operator-facing remote terminal drawer:
  - runs commands through the existing `ADHOC_COMMAND` task path
  - supports command presets, history navigation, local `help` / `history` / `clear`, clear screen, manual refresh, and terminal-style output rendering
  - preserves task status, stdout, stderr, exit code, and audit behavior through the normal task model
- Backend task API now exposes:
  - `GET /api/tasks/{taskId}` for task detail refresh
  - `GET /api/tasks/{taskId}/events` as a text/event-stream endpoint for task snapshots
- `TaskEventStreamService` polls the task supplier once per second and completes the stream after a terminal task status.
- Frontend API client now subscribes to task events with `fetch` streaming and falls back to task-detail polling if the stream is unavailable.
- README now documents the server remote terminal and task detail/event endpoints.
- New regression coverage:
  - `TaskCommandControllerTest.shouldReturnTaskDetailsById`
  - `TaskCommandControllerTest.shouldStreamTaskEventsById`
  - `ServerListPage terminal > runs terminal commands in an interactive shell-like drawer`
  - `ServerListPage terminal > supports local built-in commands`
- Fresh WSL verification on 2026-05-20:
  - `cd backend && mvn -q -Dtest=TaskCommandControllerTest test`
    - passed
  - `cd frontend && npm test -- src/test/server-terminal.test.tsx`
    - passed
  - `cd backend && mvn -q test`
    - passed
  - `cd frontend && npm test`
    - passed
    - 15 test files
    - 31 tests
  - `cd frontend && npm run build`
    - passed

## Recommended Immediate Next Steps

1. Treat `docs/superpowers/plans/2026-05-18-project-delivery-platform-upgrade.md` as historical context only; it is intentionally marked stale at the top.
2. Start the next feature from the committed baseline at `44e0a88`, the template editor follow-up at `10b8bdc`, and the template ordering slice at `64a48ec`.
3. The next natural delivery-platform slice is higher-level template workflow authoring or richer operator-facing action summaries, not more low-level ordering cleanup.
4. If new delivery-platform work is needed beyond that, write a fresh scoped plan instead of reusing the old unchecked upgrade checklist.
5. Keep using this handoff file as the continuity anchor if context is compressed again.

## Maintenance On 2026-05-25

- Fixed `RealSshClient` thread pool: replaced per-call `Executors.newFixedThreadPool(2)` with a shared daemon `CachedThreadPool` instance field to avoid thread leakage under concurrent SSH execution.
- Updated `AGENTS.md` branch info from `timeops-mvp-impl` to `main`.
- Updated this handoff file to reflect the current `main` branch and merge state.
- Confirmed `OperationTaskService.execute()` already had `@Transactional` — but the annotation was removed and replaced with `TransactionTemplate` to split the method into three phases: load+mark RUNNING (short tx) → SSH execution (no tx, up to 30 min) → persist result (short tx). This prevents database connections from being held open for the entire SSH execution duration.
- Fixed NPE risk in `OperationTaskService.buildErrorLog()` when `SshExecutionException.getStderr()` returns null.
