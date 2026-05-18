# Real SSH Compose Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separate one-command Docker Compose entry for a real SSH demo stack without changing the default simulated stack.

**Architecture:** Keep the existing `docker-compose.yml` as the default product entry. Add a standalone `docker-compose.real-ssh.yml` that brings up its own Postgres, backend, frontend, and demo SSH target on separate ports, then document the exact URLs and demo credentials in `README.md`.

**Tech Stack:** Docker Compose, Spring Boot backend image, React/Vite frontend image, linuxserver OpenSSH server image

---

### Task 1: Add the standalone real SSH compose stack

**Files:**
- Create: `docker-compose.real-ssh.yml`
- Test: `docker compose -f docker-compose.real-ssh.yml config`

- [x] **Step 1: Write the failing verification**

Run:

```bash
docker compose -f docker-compose.real-ssh.yml config
```

Expected:

- command fails with `no such file or directory`

- [x] **Step 2: Create the standalone compose file**

Create a full compose stack with:

- `name: timeops-real`
- `postgres` service with its own named volume
- `backend` service in `real` SSH mode on port `8081`
- `frontend` service on port `8088`
- `ssh-target` demo service reachable inside the stack as `ssh-target:2222`

- [x] **Step 3: Verify the compose definition parses**

Run:

```bash
docker compose -f docker-compose.real-ssh.yml config
```

Expected:

- command exits `0`
- rendered config includes `TIMEOPS_SSH_MODE: real`
- rendered config includes `ssh-target`

### Task 2: Document how to use the new entry

**Files:**
- Modify: `README.md`
- Test: `rg -n "real-ssh|8088|ssh-target|Passw0rd123!" README.md`

- [x] **Step 1: Update the Docker Compose documentation**

Document:

- default stack command and URLs stay unchanged
- separate real SSH demo command uses `docker-compose.real-ssh.yml`
- demo frontend URL `http://localhost:8088`
- demo backend URL `http://localhost:8081`
- demo SSH host `ssh-target`
- demo SSH port `2222`
- demo SSH username `tester`
- demo SSH password `Passw0rd123!`

- [x] **Step 2: Verify the README contains the new entry points**

Run:

```bash
rg -n "real-ssh|8088|ssh-target|Passw0rd123!" README.md
```

Expected:

- command exits `0`
- output shows the new real SSH demo section

### Task 3: Prove the new stack works and does not break the default stack

**Files:**
- Verify only, no source changes

- [x] **Step 1: Start the real SSH demo stack**

Run:

```bash
docker compose -f docker-compose.real-ssh.yml up -d --build
```

Expected:

- `postgres`, `backend`, `frontend`, and `ssh-target` start successfully

- [x] **Step 2: Verify health endpoints**

Run:

```bash
curl -sS http://localhost:8081/api/health
curl -I -sS http://localhost:8088/
```

Expected:

- backend health returns `UP`
- frontend returns `HTTP/1.1 200 OK`

- [x] **Step 3: Verify a real SSH task succeeds**

Use the backend on `8081` to:

- login with `admin / Admin@123`
- create a customer, server, template, release, instance
- create a deploy task against `ssh-target:2222`
- confirm the task reaches `SUCCESS`
- confirm output contains real remote output such as `hello-real`

- [x] **Step 4: Verify the default stack still works**

Run:

```bash
curl -sS http://localhost:8080/api/health
curl -I -sS http://localhost/
```

Expected:

- default backend still returns `UP`
- default frontend still returns `HTTP/1.1 200 OK`
