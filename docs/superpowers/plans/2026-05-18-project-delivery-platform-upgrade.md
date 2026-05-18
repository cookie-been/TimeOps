# Project Delivery Platform Upgrade Implementation Plan

> **Status note (2026-05-18):** This plan is now partially stale. Large parts of P0 are already implemented in the worktree even though the checklist below is still unchecked. Use `docs/superpowers/handoffs/2026-05-18-repo-state.md` for the latest verified repo state, and use `docs/superpowers/plans/2026-05-18-delivery-platform-remaining-work.md` as the execution plan for the real remaining work.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade TimeOps from demo-style command triggering into a delivery-oriented operations platform that can run real-world project automation such as repository-based deploy, update, restart, backup, rollback, and verification flows.

**Architecture:** Keep the current Spring Boot task pipeline and React operations UI, but harden task execution in three phases. P0 makes the existing script pipeline viable for long-running real SSH jobs. P1 adds a structured step runner and runtime context injection from template, instance, and release data. P2 finishes the product surface with enterprise task actions, stronger frontend controls, and deployment-oriented guidance.

**Tech Stack:** Java 17, Spring Boot 3, Spring Scheduling, Spring Data JPA, Flyway, React 18, TypeScript, Ant Design, JUnit 5, Vitest

---

## File Structure

- Modify: `backend/src/main/java/com/timeops/platform/task/*`
  Expand task APIs, lifecycle fields, runtime context, and execution flow.
- Modify: `backend/src/main/java/com/timeops/platform/ssh/*`
  Improve long-running SSH execution behavior and failure visibility.
- Modify: `backend/src/main/java/com/timeops/platform/template/*`
  Keep template action validation aligned with script and step modes.
- Modify: `backend/src/main/java/com/timeops/platform/release/*`
  Reuse release metadata during runtime execution.
- Modify: `backend/src/main/java/com/timeops/platform/instance/*`
  Reuse merged instance config during runtime execution.
- Modify: `backend/src/main/resources/application.yml`
  Raise the real SSH command timeout to a delivery-safe default.
- Modify: `frontend/src/shared/types.ts`
  Extend task and template types for richer execution metadata and step actions.
- Modify: `frontend/src/shared/api/client.ts`
  Add update task creation and map richer task fields.
- Modify: `frontend/src/features/tasks/TaskCenterPage.tsx`
  Add enterprise task entry points and better visibility into execution records.
- Modify: `frontend/src/features/templates/TemplateListPage.tsx`
  Allow configuring structured actions instead of only deploy script text.
- Modify: backend and frontend task/template tests
  Cover P0/P1/P2 behavior with TDD.

### Task 1: P0 hardening for real project execution

**Files:**
- Modify: `backend/src/test/java/com/timeops/platform/task/OperationTaskServiceTest.java`
- Modify: `backend/src/test/java/com/timeops/platform/task/TaskCommandControllerTest.java`
- Modify: `backend/src/main/java/com/timeops/platform/task/OperationTaskEntity.java`
- Modify: `backend/src/main/java/com/timeops/platform/task/OperationTaskService.java`
- Modify: `backend/src/main/java/com/timeops/platform/task/TaskCommandController.java`
- Modify: `backend/src/main/java/com/timeops/platform/task/dto/OperationTaskResponse.java`
- Modify: `backend/src/main/java/com/timeops/platform/task/dto/TaskSubmissionResponse.java`
- Create: `backend/src/main/java/com/timeops/platform/task/dto/UpdateTaskRequest.java`
- Modify: `backend/src/main/java/com/timeops/platform/ssh/RealSshClient.java`
- Modify: `backend/src/main/resources/application.yml`
- Modify: `frontend/src/shared/types.ts`
- Modify: `frontend/src/shared/api/client.ts`
- Modify: `frontend/src/features/tasks/TaskCenterPage.tsx`
- Test: backend task tests, frontend task tests

- [ ] **Step 1: Write failing backend tests for task metadata, update endpoint, and failure detail preservation**
- [ ] **Step 2: Run focused backend tests and verify the new assertions fail for the expected reasons**
- [ ] **Step 3: Expose task lifecycle fields and `update` submission path in backend DTO/controller/service flow**
- [ ] **Step 4: Raise SSH command timeout and improve real SSH timeout/error visibility without breaking simulated mode**
- [ ] **Step 5: Add failing frontend task-center tests for update task creation and metadata rendering**
- [ ] **Step 6: Extend frontend types, API helpers, and task drawer/action entry points**
- [ ] **Step 7: Re-run focused backend/frontend tests and confirm P0 is green**

### Task 2: P1 structured execution and runtime context injection

**Files:**
- Modify: `backend/src/test/java/com/timeops/platform/task/OperationTaskServiceTest.java`
- Modify: `backend/src/test/java/com/timeops/platform/template/ProductTemplateControllerTest.java`
- Create: `backend/src/main/java/com/timeops/platform/task/TaskExecutionContext.java`
- Create: `backend/src/main/java/com/timeops/platform/task/TaskExecutionContextFactory.java`
- Create: `backend/src/main/java/com/timeops/platform/task/TemplateStepExecutor.java`
- Modify: `backend/src/main/java/com/timeops/platform/task/OperationTaskService.java`
- Modify: `backend/src/main/java/com/timeops/platform/template/dto/TemplateActionRequest.java`
- Modify: `backend/src/main/java/com/timeops/platform/template/dto/TemplateActionResponse.java`
- Modify: `frontend/src/shared/types.ts`
- Modify: `frontend/src/shared/api/client.ts`
- Modify: `frontend/src/features/templates/TemplateListPage.tsx`
- Test: backend task/template tests, frontend template tests

- [ ] **Step 1: Write failing backend tests for `STEP` action execution with work directory, environment, and release/instance context**
- [ ] **Step 2: Run focused backend tests and verify `STEP` actions still fail because they are not executed**
- [ ] **Step 3: Add a runtime context object that resolves template default work dir, merged instance config, and release source metadata**
- [ ] **Step 4: Implement a generic step runner that can execute command steps with optional work dir, env vars, and timeout override**
- [ ] **Step 5: Add failing frontend template tests for editing structured action definitions**
- [ ] **Step 6: Update template UI and API mapping to create and edit step-based actions**
- [ ] **Step 7: Re-run focused backend/frontend tests and confirm P1 is green**

### Task 3: P2 enterprise operations completeness

**Files:**
- Modify: `backend/src/test/java/com/timeops/platform/task/TaskCommandControllerTest.java`
- Modify: `backend/src/main/java/com/timeops/platform/task/TaskType.java`
- Modify: `backend/src/main/java/com/timeops/platform/template/TemplateActionType.java`
- Modify: task DTO/controller/service/frontend task center files
- Modify: `README.md`
- Test: backend task controller tests, frontend task tests, smoke verification docs

- [ ] **Step 1: Write failing tests for additional delivery actions such as backup, rollback, and verify**
- [ ] **Step 2: Extend task and template action enums plus API/controller support for enterprise delivery workflows**
- [ ] **Step 3: Add frontend segmented actions and validation for the expanded workflow surface**
- [ ] **Step 4: Refresh operator documentation and example template guidance for repo-driven projects**
- [ ] **Step 5: Run full backend/frontend verification plus deployment-style smoke checks**
