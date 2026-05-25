# TimeOps Codex Continuity Guide

This repository is meant to be resumed across machines and compressed sessions.

## Start Here

Before making changes, read these files in order:

1. `docs/superpowers/handoffs/2026-05-18-repo-state.md`
2. `docs/superpowers/plans/2026-05-18-delivery-platform-remaining-work.md`

Do not treat this file as the detailed project log. Treat it as the bootstrap file that points Codex at the right continuity anchors.

## Source Of Truth

- The main continuity anchor is `docs/superpowers/handoffs/2026-05-18-repo-state.md`.
- The file `docs/superpowers/plans/2026-05-18-project-delivery-platform-upgrade.md` is stale. Use it only as historical backlog context, not as implementation truth.
- Prefer the latest committed code and latest handoff notes over older plans.

## Current Branch And Recent Commits

- Expected working branch: `main` (the `codex/timeops-frontend-polish` branch has been merged into main)
- Recent commits:
  - `0251e5e chore: ignore codex temp files`
  - `5e7cd50 feat: add server remote terminal`
  - `735eead Polish frontend deployment workflows`
  - `596df02 docs: add codex continuity guide`
  - `27e00f4 feat: normalize template action execution order`

If this file is being read on a branch other than `main`, verify whether the branch intentionally diverged before changing code.

## Current Delivery Platform State

- Backend delivery actions support `DEPLOY`, `UPDATE`, `BACKUP`, `ROLLBACK`, `VERIFY`, `RESTART`, and `ADHOC_COMMAND`.
- `STEP` execution is implemented through:
  - `backend/src/main/java/com/timeops/platform/task/TaskExecutionContext.java`
  - `backend/src/main/java/com/timeops/platform/task/TaskExecutionContextFactory.java`
  - `backend/src/main/java/com/timeops/platform/task/TemplateStepExecutor.java`
- Frontend template editing supports multiple delivery actions with per-action `SCRIPT` / `STEP` mode switching.
- Template action ordering is now supported in the UI.
- Template action payloads and backend persistence now use explicit `executionOrder` semantics and normalize to 1-based order values.

## Verification Baseline

Last known green verification on 2026-05-20:

- `cd backend && mvn -q test`
  - passed
  - 16 test classes
  - 34 tests
- `cd frontend && npm test`
  - passed
  - 15 test files
  - 31 tests
- `cd frontend && npm run build`
  - passed

## Recommended Next Slice

The next natural feature area is not more low-level ordering cleanup.

Start from one of these:

1. Higher-level template workflow authoring
2. Richer operator-facing template action summaries
3. Another clearly scoped delivery-platform slice backed by a fresh plan

## Continuity Rules

- When resuming on a new machine or after context compression, read the handoff file before exploring broadly.
- After meaningful progress, update `docs/superpowers/handoffs/2026-05-18-repo-state.md`.
- Keep new work scoped and additive. Do not reopen stale plan checklists as if they were current status.
- If a new implementation slice is large enough to span multiple steps, write a fresh scoped plan instead of reusing the stale upgrade plan.
