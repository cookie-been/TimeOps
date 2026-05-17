# TimeOps MVP Design

- Date: 2026-05-17
- Status: Approved in conversation, written for review
- Scope: MVP design only, no implementation in this document

## 1. Product Positioning

TimeOps is an internal operations platform for standardized customer delivery and lifecycle maintenance after product purchase.

The MVP serves a narrow and deliberate use case:

- Internal users only
- Target servers are Linux hosts
- Connection method is SSH with username/password
- Primary deployment target is Docker Compose based applications
- Product delivery supports both Git-based releases and uploaded release packages
- Primary post-deployment operation is application update
- High-risk ad-hoc command execution is allowed with full audit
- Multiple internal users with role-based access control are required

The product is not positioned as a generic SSH panel or a full DevOps platform. It is a standardized delivery control plane centered on reusable product templates, customer-specific deployment instances, controlled execution, and auditability.

## 2. MVP Goals

The MVP must make these workflows reliable and repeatable:

1. Register a customer and its target server
2. Define a reusable product deployment template
3. Create a customer deployment instance from that template
4. Deliver an initial deployment to the customer server
5. Push application updates later from Git or a release package
6. Execute approved operational actions remotely
7. Record every sensitive action in an auditable trail

## 3. Explicit Non-Goals

The MVP does not include:

- Customer-facing portal
- Formal multi-server environment orchestration
- Automated monitoring and alerting
- Full rollback framework
- Interactive browser shell
- CI/CD pipeline orchestration
- Gray release, canary release, or staged rollout

These can be added later without invalidating the core model defined here.

## 4. Recommended Product Direction

Three directions were considered:

1. Lightweight SSH operations console
2. Standardized delivery platform
3. Full DevOps or PaaS platform

The recommended direction is option 2: a standardized delivery platform.

Reasoning:

- The business problem is not just remote command execution
- The same product is sold repeatedly with customer-specific overrides
- Delivery, update, and audit are the real value chain
- A template-and-instance model matches the operating model better than a raw machine-centric design

## 5. High-Level Architecture

The MVP should use a modular monolith with asynchronous task execution, not microservices.

### 5.1 Main parts

- Admin web application
- Backend control plane API
- Asynchronous task executor
- Relational database
- Local release file storage

### 5.2 Why this shape

The early complexity lives in task execution, credential handling, authorization, and audit. It does not justify service fragmentation yet. A modular monolith keeps the system easier to build, reason about, and maintain while preserving clear internal module boundaries.

### 5.3 Architecture summary

- The web application is the internal operations console
- The backend API owns business rules, RBAC, credential handling, and audit persistence
- The task executor performs SSH-based remote actions and streams structured output back to the backend
- The database stores metadata, configuration, tasks, users, roles, and audit records
- Release packages are stored as managed files and referenced by release records

## 6. Core Domain Model

The MVP should define the following primary entities.

### 6.1 Customer

Represents a purchasing organization.

Fields:

- name
- contact person
- contact phone or email
- contract start date
- contract expiry date
- notes

### 6.2 Server

Represents a customer-provided Linux server.

Fields:

- customer id
- host or IP
- SSH port
- SSH username
- encrypted SSH password
- operating system label
- machine tags
- last connectivity status
- notes

Rules:

- One customer can have multiple servers
- Passwords are stored encrypted and never rendered back in plaintext

### 6.3 ProductTemplate

Defines the standard delivery model for a product line.

Fields:

- template name
- product code
- supported release source types
- default working directory
- default environment variables
- default configuration schema
- description

Purpose:

- Encapsulates how this product is usually deployed and updated
- Separates product defaults from customer-specific overrides

### 6.4 TemplateAction

Defines executable operations under a product template.

Initial action types:

- initial deployment
- application update
- restart service
- health or status check

Execution modes:

- script mode
- step mode

MVP rule:

- The implementation can start with script mode
- The data model must already support step mode for future structured orchestration

### 6.5 DeploymentInstance

Represents a real customer deployment of a product on a server.

Fields:

- customer id
- template id
- primary server id
- instance name
- environment label
- current release id
- status
- notes

Examples:

- Customer A / Official Site / Production
- Customer B / Admin System / Production

This is the operational center of the platform.

### 6.6 InstanceConfig

Stores customer-specific overrides for a deployment instance.

Examples:

- domain
- install path
- ports
- license key
- theme
- feature toggles
- third-party integration values

Rule:

- Final runtime config is produced by merging template defaults with instance overrides

### 6.7 Release

Represents a deployable version.

Supported source types:

- Git source
- uploaded release package

Typical fields:

- template id
- version label
- source type
- repository URL or package file reference
- branch, tag, or commit when source type is Git
- changelog
- created by
- created at

### 6.8 OperationTask

Represents one executed operation.

Task categories:

- deployment
- update
- restart
- health check
- ad-hoc command

Fields:

- task number
- initiator user id
- target deployment instance id or server id
- action reference
- release reference when applicable
- command input when applicable
- status
- started at
- ended at
- exit code
- output log
- error log

This entity anchors both task tracking and auditability.

## 7. Functional Modules

The MVP admin console should include these modules.

### 7.1 Dashboard

Purpose:

- Show recent task totals, success rate, failed tasks, and pending issues
- Provide fast entry points for deployment, update, and task review

### 7.2 Customer Management

Purpose:

- Maintain customer records
- View related servers, deployment instances, and recent operations

### 7.3 Server Management

Purpose:

- Register SSH targets
- Test connectivity
- Manage machine tags and metadata
- Show latest connectivity and task status

Constraints:

- Password is masked on read
- Password update is a separate audited operation

### 7.4 Product Template Management

Purpose:

- Maintain deployment defaults
- Define standard actions and scripts
- Manage config schema and release source compatibility

### 7.5 Deployment Instance Management

Purpose:

- Bind customer, template, server, and overrides into an operational object
- Launch deployment, update, restart, status check, and ad-hoc command actions

### 7.6 Release Management

Purpose:

- Register Git-based releases
- Upload and manage release packages
- Attach releases to product templates

### 7.7 Task Center

Purpose:

- Unified queue and history of all operations
- Filter by task type, status, user, customer, server, and date
- View execution logs and duration

### 7.8 Audit Log

Purpose:

- Persist all sensitive actions
- Provide traceability across login, credential changes, deployment, update, delete, and command execution

### 7.9 Users and Roles

Purpose:

- Manage internal accounts
- Assign roles
- Enforce action-level permissions

## 8. Navigation Structure

Recommended primary navigation:

- Dashboard
- Customers
- Servers
- Product Templates
- Deployment Instances
- Releases
- Task Center
- Audit Log
- Users and Roles

This matches the natural operating sequence from setup to repeated maintenance.

## 9. Key Business Flows

### 9.1 Initial Deployment Flow

1. Create customer
2. Register server
3. Create deployment instance from a product template
4. Select release source, Git or release package
5. Merge template defaults and instance overrides
6. Connect to the target server over SSH
7. Transfer or fetch deployment assets
8. Generate runtime config files as needed
9. Execute the deployment action
10. Persist task output and final result

### 9.2 Application Update Flow

1. Open a deployment instance
2. Select the target release
3. Execute the template update action
4. Pull code or transfer package
5. Preserve or update config as needed
6. Restart the Docker Compose services
7. Mark the current running release on success
8. Persist task logs and outcome

### 9.3 Ad-Hoc Command Flow

1. Select target server or deployment instance
2. Enter command
3. Validate permission
4. Require explicit risk confirmation
5. Execute over SSH
6. Store the full command, output, exit code, operator, and timestamp

### 9.4 Audit Correlation Flow

Every significant operation must be traceable through:

- actor
- target
- action type
- template or release context
- timestamps
- result
- execution logs

The audit log must be able to link back to the originating task record.

## 10. Security Requirements

Security is first-class for this product because the platform stores server credentials and can run high-risk commands.

### 10.1 Credential Handling

- SSH passwords must be encrypted at rest
- Plaintext passwords must never be displayed in the UI
- Password changes must be separately audited
- Decryption should occur only at execution time in backend memory

### 10.2 Access Control

The MVP must implement RBAC with at least these roles:

- Super Admin
- Delivery or Implementation
- Operations
- Audit or Read Only

Permission granularity for the MVP:

- module-level access
- action-level permissions

Special permission:

- ad-hoc command execution must be isolated as its own permission point

### 10.3 High-Risk Operation Controls

Require additional confirmation for:

- deleting servers
- changing credentials
- manually retrying failed tasks
- executing ad-hoc commands

### 10.4 Output Sanitization

Execution logs and audit logs should apply masking rules for:

- passwords
- tokens
- API keys
- secrets embedded in environment variables

Without this, the audit system becomes a leak surface.

## 11. Audit Requirements

The audit system is a core capability, not an accessory.

It must record at minimum:

- who performed the action
- which target was affected
- what action was performed
- what template, release, or command was involved
- when it started
- when it ended
- whether it succeeded
- the relevant output and exit code

Ad-hoc commands must be easy to filter and highlight due to their elevated risk.

## 12. Technical Recommendations

Because the platform is an internal enterprise operations console with long-lived value in RBAC, audit, and maintainability, the recommended stack should favor backend structure and clear domain boundaries over maximum short-term speed.

### 12.1 Recommended stack

- Frontend: React + Ant Design
- Backend: Spring Boot
- Database: MySQL or PostgreSQL
- Task execution: backend-managed async task queue
- Remote execution: mature SSH library in the backend
- Package storage: local managed storage in MVP

### 12.2 Why Spring Boot is recommended here

- Strong fit for enterprise admin systems
- Mature patterns for RBAC, audit, transactions, and modular business domains
- Better long-term maintainability for complex permission and execution workflows
- A good base for later separation of executor components if scale demands it

### 12.3 Suggested backend module boundaries

- auth and users
- roles and permissions
- customers
- servers
- product templates
- deployment instances
- releases
- tasks
- audit
- credential encryption

These modules can live inside one deployable service while retaining explicit ownership boundaries.

## 13. Data and Execution Design Principles

The following design principles should remain stable through implementation:

1. Product definition must stay separate from customer-specific overrides
2. Operational work must revolve around deployment instances, not bare machines
3. All remote execution must flow through a task model
4. Sensitive actions must be auditable by design
5. The model should allow future multi-server expansion without redoing the core entities

## 14. Future-Compatible Extension Points

The MVP should remain compatible with later additions:

- server groups or multi-node environments
- step-based workflow orchestration
- rollback snapshots
- monitoring and alert integrations
- customer-facing status portal
- object storage for release artifacts

## 15. Suggested Implementation Order

Recommended order after planning:

1. Authentication, users, roles, and permission framework
2. Customer and server management
3. Product templates and template actions
4. Deployment instances and instance config
5. Releases
6. Task engine and SSH execution
7. Deployment and update flows
8. Audit views and reporting

This order reduces rework because task execution and audit depend on the earlier domain objects being stable.

## 16. Final MVP Summary

The approved MVP includes:

- customer management
- server management
- product template management
- deployment instance management
- release management
- initial deployment
- application update
- ad-hoc command execution
- task center
- audit log
- users and roles

The MVP should be implemented as a Spring Boot based enterprise admin platform with React and Ant Design on the frontend, centered on reusable product templates, customer deployment instances, asynchronous SSH execution, and strict auditability.
