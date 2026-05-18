# Delivery Platform Remaining Work Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the real remaining delivery-platform work by adding structured `STEP` execution with runtime context, then expanding delivery task types to backup, rollback, and verify.

**Architecture:** Reuse the existing task pipeline, template model, and task center UI instead of reworking P0. First add a backend execution context plus step runner so template actions can run structured commands using template default work dir, merged instance config, and release metadata. Then widen the task and template action surface with a small set of delivery-oriented actions and update the frontend and docs to match.

**Tech Stack:** Java 17, Spring Boot 3, Spring Data JPA, Jackson, React 18, TypeScript, Ant Design, JUnit 5, Vitest

---

## File Structure

- Modify: `backend/src/test/java/com/timeops/platform/task/OperationTaskServiceTest.java`
  Add failing and passing coverage for `STEP` execution and the new delivery action types.
- Modify: `backend/src/test/java/com/timeops/platform/task/TaskCommandControllerTest.java`
  Add controller coverage for backup, rollback, and verify task submission plus audit recording.
- Modify: `backend/src/test/java/com/timeops/platform/template/ProductTemplateControllerTest.java`
  Add template API coverage for editing structured `STEP` actions.
- Create: `backend/src/main/java/com/timeops/platform/task/TaskExecutionContext.java`
  Hold resolved server, instance, release, template, work dir, and environment variables for task execution.
- Create: `backend/src/main/java/com/timeops/platform/task/TaskExecutionContextFactory.java`
  Build the runtime context from instance, release, template, and decrypted server credentials.
- Create: `backend/src/main/java/com/timeops/platform/task/TemplateStepExecutor.java`
  Convert `stepDefinition` into concrete shell commands and invoke `SshClient`.
- Modify: `backend/src/main/java/com/timeops/platform/task/OperationTaskEntity.java`
  Persist any extra metadata needed by the broader delivery actions without disturbing current behavior.
- Modify: `backend/src/main/java/com/timeops/platform/task/OperationTaskService.java`
  Route task execution through `SCRIPT` vs `STEP` handling and add enqueue helpers for backup, rollback, and verify.
- Modify: `backend/src/main/java/com/timeops/platform/task/TaskType.java`
  Add `BACKUP`, `ROLLBACK`, and `VERIFY`.
- Modify: `backend/src/main/java/com/timeops/platform/task/TaskCommandController.java`
  Expose new task submission endpoints and audit actions.
- Create: `backend/src/main/java/com/timeops/platform/task/dto/BackupTaskRequest.java`
  Carry `instanceId` for backup requests.
- Create: `backend/src/main/java/com/timeops/platform/task/dto/RollbackTaskRequest.java`
  Carry `instanceId` and `releaseId` for rollback requests.
- Create: `backend/src/main/java/com/timeops/platform/task/dto/VerifyTaskRequest.java`
  Carry `instanceId` and optional `releaseId` for verification requests.
- Modify: `backend/src/main/java/com/timeops/platform/template/TemplateActionType.java`
  Add `BACKUP`, `ROLLBACK`, and `VERIFY`.
- Modify: `backend/src/main/java/com/timeops/platform/template/TemplateActionEntity.java`
  Preserve action mode and structured definition semantics for all action types.
- Modify: `backend/src/main/java/com/timeops/platform/template/ProductTemplateService.java`
  Validate the richer action type set and keep `STEP` editing safe.
- Modify: `backend/src/main/java/com/timeops/platform/template/dto/TemplateActionRequest.java`
  Accept structured action payloads with per-step metadata.
- Modify: `backend/src/main/java/com/timeops/platform/template/dto/TemplateActionResponse.java`
  Return the structured step payload to the UI.
- Modify: `frontend/src/shared/types.ts`
  Add typed task kinds and richer template action data for `STEP` actions.
- Modify: `frontend/src/shared/api/client.ts`
  Add backup, rollback, and verify API helpers and keep task fallback data aligned.
- Modify: `frontend/src/features/tasks/TaskCenterPage.tsx`
  Add delivery-oriented task creation modes and form validation for the expanded action surface.
- Modify: `frontend/src/features/templates/TemplateListPage.tsx`
  Replace the single deploy-script editor with a minimal structured action editor that can switch between `SCRIPT` and `STEP`.
- Modify: `frontend/src/test/task-create.test.tsx`
  Add failing and passing tests for backup, rollback, and verify creation flows.
- Modify: `frontend/src/test/task-center.test.tsx`
  Add coverage for the wider task mode surface and metadata rendering.
- Modify: `frontend/src/test/template-lifecycle.test.tsx`
  Add coverage for editing `STEP`-mode template actions.
- Modify: `README.md`
  Document structured action editing and the new delivery task workflows.

### Task 1: Add backend `STEP` execution context and runner

**Files:**
- Modify: `backend/src/test/java/com/timeops/platform/task/OperationTaskServiceTest.java`
- Create: `backend/src/main/java/com/timeops/platform/task/TaskExecutionContext.java`
- Create: `backend/src/main/java/com/timeops/platform/task/TaskExecutionContextFactory.java`
- Create: `backend/src/main/java/com/timeops/platform/task/TemplateStepExecutor.java`
- Modify: `backend/src/main/java/com/timeops/platform/task/OperationTaskService.java`
- Test: `backend/src/test/java/com/timeops/platform/task/OperationTaskServiceTest.java`

- [x] **Step 1: Write the failing backend test for `STEP` execution using template default work dir, merged instance config, and release metadata**
- [x] **Step 2: Run `cd backend && mvn -q -Dtest=OperationTaskServiceTest test` and verify the new `STEP` assertion fails because execution still uses plain `commandInput`**
- [x] **Step 3: Add `TaskExecutionContext` and `TaskExecutionContextFactory` to resolve server, instance, template, release, work dir, and environment values**
- [x] **Step 4: Add `TemplateStepExecutor` and update `OperationTaskService.execute()` to dispatch `SCRIPT` actions through the current path and `STEP` actions through the new runner**
- [x] **Step 5: Re-run `cd backend && mvn -q -Dtest=OperationTaskServiceTest test` and verify the `STEP` execution test passes**

### Task 2: Finish template editing support for structured actions

**Files:**
- Modify: `backend/src/test/java/com/timeops/platform/template/ProductTemplateControllerTest.java`
- Modify: `backend/src/main/java/com/timeops/platform/template/ProductTemplateService.java`
- Modify: `backend/src/main/java/com/timeops/platform/template/dto/TemplateActionRequest.java`
- Modify: `backend/src/main/java/com/timeops/platform/template/dto/TemplateActionResponse.java`
- Modify: `frontend/src/shared/types.ts`
- Modify: `frontend/src/features/templates/TemplateListPage.tsx`
- Modify: `frontend/src/test/template-lifecycle.test.tsx`
- Test: backend template controller test, frontend template lifecycle test

- [x] **Step 1: Write the failing backend and frontend tests for editing a `STEP` action with structured fields**
- [x] **Step 2: Run `cd backend && mvn -q -Dtest=ProductTemplateControllerTest test` and `cd frontend && npm test -- src/test/template-lifecycle.test.tsx` to verify those assertions fail**
- [x] **Step 3: Expand template request/response typing so `STEP` actions can carry structured step data cleanly**
- [x] **Step 4: Replace the single deploy-script UI with a minimal action editor that supports `SCRIPT` and `STEP` for at least deploy/update/restart/verify-style actions**
- [x] **Step 5: Re-run the focused backend and frontend template tests and verify they pass**

### Task 3: Add backup, rollback, and verify task types end to end

**Files:**
- Modify: `backend/src/test/java/com/timeops/platform/task/TaskCommandControllerTest.java`
- Modify: `backend/src/test/java/com/timeops/platform/task/OperationTaskServiceTest.java`
- Modify: `backend/src/main/java/com/timeops/platform/task/TaskType.java`
- Modify: `backend/src/main/java/com/timeops/platform/task/OperationTaskService.java`
- Modify: `backend/src/main/java/com/timeops/platform/task/TaskCommandController.java`
- Create: `backend/src/main/java/com/timeops/platform/task/dto/BackupTaskRequest.java`
- Create: `backend/src/main/java/com/timeops/platform/task/dto/RollbackTaskRequest.java`
- Create: `backend/src/main/java/com/timeops/platform/task/dto/VerifyTaskRequest.java`
- Modify: `backend/src/main/java/com/timeops/platform/template/TemplateActionType.java`
- Modify: `frontend/src/shared/types.ts`
- Modify: `frontend/src/shared/api/client.ts`
- Modify: `frontend/src/features/tasks/TaskCenterPage.tsx`
- Modify: `frontend/src/test/task-create.test.tsx`
- Modify: `frontend/src/test/task-center.test.tsx`
- Test: backend task tests, frontend task tests

- [x] **Step 1: Write the failing backend and frontend tests for backup, rollback, and verify submission flows**
- [x] **Step 2: Run `cd backend && mvn -q -Dtest=TaskCommandControllerTest,OperationTaskServiceTest test` and `cd frontend && npm test -- src/test/task-create.test.tsx src/test/task-center.test.tsx` to verify the new assertions fail**
- [x] **Step 3: Add the new task types, request DTOs, enqueue methods, and controller endpoints with audit recording**
- [x] **Step 4: Add frontend task modes, API helpers, and form validation for backup, rollback, and verify**
- [x] **Step 5: Re-run the focused backend and frontend task tests and verify they pass**

### Task 4: Refresh operator documentation and run full verification

**Files:**
- Modify: `README.md`
- Test: backend full suite, frontend full suite, frontend build

- [x] **Step 1: Update `README.md` to describe structured template actions and the backup/rollback/verify delivery workflows**
- [x] **Step 2: Run `cd backend && mvn -q test` and verify all backend tests pass**
- [x] **Step 3: Run `cd frontend && npm test` and verify all frontend tests pass**
- [x] **Step 4: Run `cd frontend && npm run build` and verify the production build succeeds**
