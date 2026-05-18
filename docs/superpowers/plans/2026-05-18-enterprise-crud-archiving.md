# Enterprise CRUD and Archiving Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the five core business modules to enterprise-grade create/read/update/archive/restore workflows with audit coverage and frontend operations.

**Architecture:** Add a shared archive state model to the five core tables, expose explicit per-module service methods and REST endpoints, then wire the frontend pages to support edit, archive, restore, and status filtering while preserving the current task and audit flows.

**Tech Stack:** Spring Boot 3, Spring Data JPA, Flyway, React 18, TypeScript, Ant Design, Vitest, JUnit 5

---

### Task 1: Add archive columns and active-key uniqueness to the database model

**Files:**
- Create: `backend/src/main/resources/db/migration/V8__add_archive_support.sql`
- Modify: entity classes for customer, server, template, release, instance
- Test: backend archive-related tests

- [x] **Step 1: Write failing backend tests for archive behavior**
- [x] **Step 2: Add migration for `record_status`, `active_key`, `archived_at`, `archived_by`, `updated_at`**
- [x] **Step 3: Update entities with explicit state fields and transition methods**
- [x] **Step 4: Run focused tests and verify archive persistence works**

### Task 2: Complete backend CRUD for customer and server

**Files:**
- Modify: customer DTOs, controller, service, repository, tests
- Modify: server DTOs, controller, service, repository, tests

- [x] **Step 1: Add failing controller/service tests for update/archive/restore**
- [x] **Step 2: Implement customer update/archive/restore and filtered list/get**
- [x] **Step 3: Implement server update/archive/restore and filtered list/get**
- [x] **Step 4: Verify audit entries and conflict behavior**

### Task 3: Complete backend CRUD for template and release

**Files:**
- Modify: template DTOs, controller, service, repository, tests
- Modify: release DTOs, controller, service, repository, tests

- [x] **Step 1: Add failing tests for template/release lifecycle**
- [x] **Step 2: Implement template update/archive/restore**
- [x] **Step 3: Implement release update/archive/restore**
- [x] **Step 4: Verify active-key reuse and restore conflict**

### Task 4: Complete backend CRUD for instance

**Files:**
- Modify: instance DTOs, controller, service, repository, tests

- [x] **Step 1: Add failing tests for instance update/archive/restore**
- [x] **Step 2: Implement filtered list/get and explicit update/archive/restore**
- [x] **Step 3: Verify archived dependencies are rejected correctly**

### Task 5: Add frontend enterprise operations for the five core pages

**Files:**
- Modify: `frontend/src/shared/api/client.ts`
- Modify: `frontend/src/shared/types.ts`
- Modify: customer, server, template, release, instance page components
- Modify: relevant frontend tests

- [x] **Step 1: Add failing frontend tests for edit/archive/restore flows**
- [x] **Step 2: Extend API client and types for lifecycle operations**
- [x] **Step 3: Add page-level status filters and edit drawers**
- [x] **Step 4: Add archive/restore actions and disabled states**
- [x] **Step 5: Verify active/archived list transitions in tests**

### Task 6: Final verification and documentation refresh

**Files:**
- Modify: `README.md`

- [x] **Step 1: Update README API and workflow documentation**
- [x] **Step 2: Run `cd backend && mvn -q test`**
- [x] **Step 3: Run `cd frontend && npm test`**
- [x] **Step 4: Run `cd frontend && npm run build`**
- [x] **Step 5: Re-verify the running product flows**
