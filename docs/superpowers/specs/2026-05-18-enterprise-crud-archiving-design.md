# Enterprise CRUD and Archiving Design

- Date: 2026-05-18
- Status: Approved for implementation
- Scope: Complete enterprise-grade CRUD for customer, server, template, release, and instance modules with soft delete / archive / restore support

## 1. Goal

Extend the current MVP into a maintainable enterprise admin surface for the five core business modules:

- customer
- server
- template
- release
- instance

The system must support create, read, update, archive, and restore workflows, preserve audit history, and allow reuse of business keys after archiving.

## 2. Non-Goals

- User management changes
- Task execution changes
- Audit log schema changes
- Hard delete for core business objects
- Cross-tenant isolation, because the current product is single-tenant

## 3. Alibaba Rules Applied

This implementation must follow the Alibaba Java Coding Guidelines as an execution rule set:

- Use explicit DTOs and service methods per module; do not introduce a universal update interface.
- Keep request validation on all user inputs.
- Keep table and column names lower case with underscores.
- Do not expose enum types in API response DTOs; return string values instead.
- Catch only expected exceptions and translate them at the service boundary.
- Keep SQL and repository access parameterized.
- Keep sensitive data masked in responses.

## 4. Business Rules

### 4.1 Record lifecycle

Each core object has three runtime states:

- `ACTIVE`
- `ARCHIVED`
- restored back to `ACTIVE`

Archive is reversible. No hard delete endpoint will be exposed.

### 4.2 Visibility

- List endpoints return only `ACTIVE` records by default.
- `status=ARCHIVED` returns archived records.
- `status=ALL` returns both active and archived records.

### 4.3 Update rules

- Update is allowed only for `ACTIVE` records.
- Archived records must be restored before editing.

### 4.4 Archive rules

- Archiving keeps the primary row and audit history.
- Archiving clears the active uniqueness key so the business key can be reused by a new active record.
- Archiving must not break foreign key references or historical task data.

### 4.5 Restore rules

- Restoring sets the record back to `ACTIVE`.
- Restore fails with conflict if another active record already uses the same business key.

### 4.6 Unique key rules

The following business keys are unique among active records only:

- customer: `name`
- server: `host + sshPort`
- template: `productCode`
- release: `templateId + versionLabel`
- instance: `customerId + instanceName`

Archived records do not consume uniqueness because the active key is cleared on archive.

## 5. Backend Architecture

### 5.1 Shared record model

Add a shared archive model to the five core entities:

- `recordStatus`
- `activeKey`
- `archivedAt`
- `archivedBy`
- `updatedAt`

The `activeKey` column is the DB-enforced uniqueness key for active records only. It is `NULL` when the record is archived.

### 5.2 Service boundaries

Each module gets explicit service methods:

- `listX(status)`
- `getX(id)`
- `createX(request)`
- `updateX(id, request)`
- `archiveX(id, operatorId)`
- `restoreX(id, operatorId)`

Each method performs module-specific validation. No shared update endpoint will be introduced.

### 5.3 API shape

Endpoints will be standardized:

- `GET /api/customers`
- `GET /api/customers/{id}`
- `POST /api/customers`
- `PUT /api/customers/{id}`
- `PATCH /api/customers/{id}/archive`
- `POST /api/customers/{id}/restore`

The same pattern applies to servers, templates, releases, and instances.

### 5.4 Security and audit

- All write endpoints require the same authz model already used by the existing module permissions.
- Every create/update/archive/restore action records an audit log entry.
- Server SSH passwords remain encrypted at rest and must never be echoed back.

## 6. Frontend Architecture

Each core module page gets:

- a status filter (`ACTIVE`, `ARCHIVED`, `ALL`)
- a detail / edit drawer
- archive action
- restore action
- validation messages that match backend rules

UI behavior:

- archived rows are visually muted
- edit actions are disabled for archived rows
- restore actions are shown only for archived rows

## 7. Error Handling

- Duplicate active business keys return `409 CONFLICT`.
- Editing archived records returns `400 BAD_REQUEST`.
- Restoring into an active-key conflict returns `409 CONFLICT`.
- Missing records return `404 NOT_FOUND`.
- Validation failures return `400 BAD_REQUEST`.

## 8. Testing Strategy

Backend tests:

- create, update, archive, restore happy paths
- active-key reuse after archive
- restore conflict
- archived records excluded from default lists
- audit record creation for write actions

Frontend tests:

- edit drawer opens with current values
- archive action removes record from active list
- archived filter renders archived rows
- restore action returns record to active list

## 9. Acceptance Criteria

The work is complete when:

- all five core modules support create/read/update/archive/restore
- archived data is hidden by default but recoverable
- business keys can be reused after archive
- audit logs capture all write actions
- frontend supports the enterprise workflows end to end
- tests pass for backend and frontend
