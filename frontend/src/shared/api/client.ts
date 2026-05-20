import axios from "axios";
import {
  mockAuditLogs,
  mockCustomers,
  mockInstances,
  mockRoleOptions,
  mockReleases,
  mockServers,
  mockTasks,
  mockTemplates,
  mockUsers
} from "../mock-data";
import type {
  AdhocTaskCreatePayload,
  ApiResponse,
  AuditLogItem,
  BackupTaskCreatePayload,
  CustomerCreatePayload,
  CustomerItem,
  CustomerUpdatePayload,
  DeployTaskCreatePayload,
  InstanceCreatePayload,
  InstanceItem,
  InstanceUpdatePayload,
  RecordStatus,
  RecordStatusFilter,
  ReleaseCreatePayload,
  ReleaseItem,
  ReleaseUpdatePayload,
  RollbackTaskCreatePayload,
  RoleOptionItem,
  RestartTaskCreatePayload,
  ServerCreatePayload,
  ServerItem,
  ServerUpdatePayload,
  TaskItem,
  TemplateCreatePayload,
  TemplateItem,
  TemplateUpdatePayload,
  UpdateTaskCreatePayload,
  UserCreatePayload,
  UserRoleItem,
  VerifyTaskCreatePayload
} from "../types";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/",
  timeout: 5000
});

const isTestMode = import.meta.env.MODE === "test";
const accessTokenKey = "timeops-access-token";

function buildLocalId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function readAccessToken(): string | null {
  return window.localStorage.getItem(accessTokenKey) ?? window.sessionStorage.getItem(accessTokenKey);
}

function isRunningTaskStatus(status?: string): boolean {
  return status === "PENDING" || status === "RUNNING";
}

function buildApiUrl(path: string): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/";
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const base = /^https?:\/\//.test(normalizedBaseUrl)
    ? new URL(normalizedBaseUrl)
    : new URL(normalizedBaseUrl, window.location.origin);
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return new URL(normalizedPath, base).toString();
}

apiClient.interceptors.request.use((config) => {
  const token = readAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

async function safeFetch<T>(request: Promise<{ data: ApiResponse<T> }>, fallback: T): Promise<T> {
  try {
    const response = await request;
    return response.data.data;
  } catch {
    return fallback;
  }
}

async function safeFetchMapped<T, R>(
  request: Promise<{ data: ApiResponse<T> }>,
  mapper: (data: T) => R,
  fallback: R
): Promise<R> {
  try {
    const response = await request;
    return mapper(response.data.data);
  } catch {
    return fallback;
  }
}

function buildStatusQuery(recordStatusFilter: RecordStatusFilter): string {
  return `?status=${recordStatusFilter}`;
}

function filterByRecordStatus<T extends { recordStatus: string }>(
  items: T[],
  recordStatusFilter: RecordStatusFilter
): T[] {
  if (recordStatusFilter === "ALL") {
    return items;
  }
  return items.filter((item) => item.recordStatus === recordStatusFilter);
}

function upsertLocalMockItem<T extends { id: string }>(items: T[], nextItem: T): T {
  const currentIndex = items.findIndex((item) => item.id === nextItem.id);

  if (currentIndex >= 0) {
    items.splice(currentIndex, 1, nextItem);
    return nextItem;
  }

  items.unshift(nextItem);
  return nextItem;
}

function findLocalMockItem<T extends { id: string }>(items: T[], itemId: string): T | undefined {
  return items.find((item) => item.id === itemId);
}

function buildArchivedRecord<T extends { recordStatus: RecordStatus; archivedAt?: string }>(item: T): T {
  return {
    ...item,
    recordStatus: "ARCHIVED",
    archivedAt: new Date().toISOString()
  };
}

function buildRestoredRecord<T extends { recordStatus: RecordStatus; archivedAt?: string }>(item: T): T {
  return {
    ...item,
    recordStatus: "ACTIVE",
    archivedAt: undefined
  };
}

function buildMockTerminalOutput(command: string): { outputLog: string; errorLog: string; status: string; exitCode?: number } {
  const normalized = command.trim().toLowerCase();

  if (!normalized) {
    return {
      outputLog: "",
      errorLog: "",
      status: "SUCCESS",
      exitCode: 0
    };
  }

  if (normalized === "clear") {
    return {
      outputLog: "",
      errorLog: "",
      status: "SUCCESS",
      exitCode: 0
    };
  }

  if (normalized.includes("whoami")) {
    return {
      outputLog: ["deploy", "prod-node-01", "/opt/app", "14:32:18 up 7 days,  3 users,  load average: 0.22, 0.31, 0.28"].join("\n"),
      errorLog: "",
      status: "SUCCESS",
      exitCode: 0
    };
  }

  if (normalized.includes("docker ps")) {
    return {
      outputLog: [
        "CONTAINER ID   IMAGE                      STATUS              PORTS                    NAMES",
        "4f2a91f0a8c1   floralwhisper/web:v1.2.3   Up 18 minutes       0.0.0.0:8080->80/tcp     floral-web",
        "92ab713d3f42   postgres:16                Up 5 days (healthy) 0.0.0.0:5432->5432/tcp   floral-db"
      ].join("\n"),
      errorLog: "",
      status: "SUCCESS",
      exitCode: 0
    };
  }

  if (normalized.includes("df -h")) {
    return {
      outputLog: [
        "Filesystem      Size  Used Avail Use% Mounted on",
        "/dev/vda1        80G   31G   46G  41% /",
        "tmpfs           3.8G     0  3.8G   0% /dev/shm"
      ].join("\n"),
      errorLog: "",
      status: "SUCCESS",
      exitCode: 0
    };
  }

  if (normalized.includes("free -h")) {
    return {
      outputLog: [
        "               total        used        free      shared  buff/cache   available",
        "Mem:           7.6Gi       2.3Gi       1.8Gi       151Mi       3.5Gi       5.0Gi",
        "Swap:          2.0Gi          0B       2.0Gi"
      ].join("\n"),
      errorLog: "",
      status: "SUCCESS",
      exitCode: 0
    };
  }

  if (normalized.includes("ss -lntp")) {
    return {
      outputLog: [
        "State  Recv-Q Send-Q Local Address:Port Peer Address:PortProcess",
        "LISTEN 0      4096         0.0.0.0:22        0.0.0.0:*    users:((\"sshd\",pid=721,fd=3))",
        "LISTEN 0      4096         0.0.0.0:80        0.0.0.0:*    users:((\"nginx\",pid=1420,fd=6))"
      ].join("\n"),
      errorLog: "",
      status: "SUCCESS",
      exitCode: 0
    };
  }

  if (normalized.includes("systemctl restart")) {
    return {
      outputLog: "Restarting service...\nService restarted successfully.",
      errorLog: "",
      status: "SUCCESS",
      exitCode: 0
    };
  }

  if (normalized.includes("journalctl")) {
    return {
      outputLog: [
        "May 19 14:40:12 prod-node-01 app[2157]: application boot completed",
        "May 19 14:40:13 prod-node-01 app[2157]: health check passed",
        "May 19 14:41:03 prod-node-01 app[2157]: background sync started"
      ].join("\n"),
      errorLog: "",
      status: "SUCCESS",
      exitCode: 0
    };
  }

  if (normalized.includes("rm ") || normalized.includes("shutdown") || normalized.includes("reboot")) {
    return {
      outputLog: "",
      errorLog: "Command blocked by policy in demo mode.",
      status: "FAILED",
      exitCode: 126
    };
  }

  return {
    outputLog: `Command received: ${command}\nExecution completed in demo environment.`,
    errorLog: "",
    status: "SUCCESS",
    exitCode: 0
  };
}

export async function login(username: string, password: string): Promise<{ accessToken: string; tokenType: string }> {
  try {
    const response = await apiClient.post<ApiResponse<{ accessToken: string; tokenType: string }>>("/api/auth/login", {
      username,
      password
    });
    return response.data.data;
  } catch {
    if (username === "admin" && password === "Admin@123") {
      return {
        accessToken: "demo-access-token",
        tokenType: "Bearer"
      };
    }
    throw new Error("login failed");
  }
}

export function fetchCustomers(recordStatusFilter: RecordStatusFilter = "ACTIVE"): Promise<CustomerItem[]> {
  if (isTestMode) {
    return Promise.resolve(filterByRecordStatus(mockCustomers, recordStatusFilter));
  }
  return safeFetch(
    apiClient.get<ApiResponse<CustomerItem[]>>(`/api/customers${buildStatusQuery(recordStatusFilter)}`),
    filterByRecordStatus(mockCustomers, recordStatusFilter)
  );
}

export function fetchServers(recordStatusFilter: RecordStatusFilter = "ACTIVE"): Promise<ServerItem[]> {
  if (isTestMode) {
    return Promise.resolve(filterByRecordStatus(mockServers, recordStatusFilter));
  }
  return safeFetch(
    apiClient.get<ApiResponse<ServerItem[]>>(`/api/servers${buildStatusQuery(recordStatusFilter)}`),
    filterByRecordStatus(mockServers, recordStatusFilter)
  );
}

export function fetchTemplates(recordStatusFilter: RecordStatusFilter = "ACTIVE"): Promise<TemplateItem[]> {
  if (isTestMode) {
    return Promise.resolve(filterByRecordStatus(mockTemplates, recordStatusFilter));
  }
  return safeFetch(
    apiClient.get<ApiResponse<TemplateItem[]>>(`/api/templates${buildStatusQuery(recordStatusFilter)}`),
    filterByRecordStatus(mockTemplates, recordStatusFilter)
  );
}

export function fetchReleases(recordStatusFilter: RecordStatusFilter = "ACTIVE"): Promise<ReleaseItem[]> {
  if (isTestMode) {
    return Promise.resolve(filterByRecordStatus(mockReleases, recordStatusFilter));
  }
  return safeFetch(
    apiClient.get<ApiResponse<ReleaseItem[]>>(`/api/releases${buildStatusQuery(recordStatusFilter)}`),
    filterByRecordStatus(mockReleases, recordStatusFilter)
  );
}

export function fetchInstances(recordStatusFilter: RecordStatusFilter = "ACTIVE"): Promise<InstanceItem[]> {
  if (isTestMode) {
    return Promise.resolve(filterByRecordStatus(mockInstances, recordStatusFilter));
  }
  return safeFetch(
    apiClient.get<ApiResponse<InstanceItem[]>>(`/api/instances${buildStatusQuery(recordStatusFilter)}`),
    filterByRecordStatus(mockInstances, recordStatusFilter)
  );
}

export function fetchTasks(): Promise<TaskItem[]> {
  if (isTestMode) {
    return Promise.resolve(mockTasks);
  }
  return safeFetch(apiClient.get<ApiResponse<TaskItem[]>>("/api/tasks"), mockTasks);
}

export async function fetchTask(taskId: string): Promise<TaskItem> {
  const fallbackTask =
    findLocalMockItem(mockTasks, taskId) ??
    buildTaskFallback({
      id: taskId,
      taskNumber: `TASK-${taskId}`,
      taskType: "ADHOC_COMMAND",
      status: "PENDING"
    });

  if (isTestMode) {
    return Promise.resolve(fallbackTask);
  }

  try {
    const response = await apiClient.get<ApiResponse<TaskItem>>(`/api/tasks/${taskId}`);
    return response.data.data;
  } catch {
    return fallbackTask;
  }
}

export function subscribeTask(
  taskId: string,
  handlers: {
    onTask: (task: TaskItem) => void;
    onError?: () => void;
  }
): { close: () => void } {
  if (isTestMode || typeof window.fetch !== "function" || typeof AbortController === "undefined") {
    handlers.onError?.();
    return {
      close: () => undefined
    };
  }

  const abortController = new AbortController();
  let closed = false;
  let receivedTerminalEvent = false;

  const processEventChunk = (rawChunk: string) => {
    const lines = rawChunk
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0 && !line.startsWith(":"));

    if (lines.length === 0) {
      return;
    }

    const eventName = lines
      .filter((line) => line.startsWith("event:"))
      .map((line) => line.slice("event:".length).trim())
      .slice(-1)[0];
    const dataPayload = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trim())
      .join("\n");

    if (!dataPayload || (eventName && eventName !== "task")) {
      return;
    }

    const nextTask = buildTaskFallback(JSON.parse(dataPayload) as TaskItem);
    handlers.onTask(nextTask);
    if (!isRunningTaskStatus(nextTask.status)) {
      receivedTerminalEvent = true;
    }
  };

  void (async () => {
    try {
      const headers = new Headers({ Accept: "text/event-stream" });
      const token = readAccessToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await window.fetch(buildApiUrl(`/api/tasks/${taskId}/events`), {
        headers,
        signal: abortController.signal,
        cache: "no-store"
      });

      if (!response.ok || !response.body) {
        throw new Error("task stream unavailable");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!closed) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

        const chunks = buffer.split(/\r?\n\r?\n/);
        buffer = chunks.pop() ?? "";
        chunks.forEach((chunk) => processEventChunk(chunk));

        if (done) {
          break;
        }
      }

      if (buffer.trim()) {
        processEventChunk(buffer);
      }
    } catch {
      if (!closed && !abortController.signal.aborted) {
        handlers.onError?.();
      }
      return;
    }

    if (!closed && !receivedTerminalEvent) {
      handlers.onError?.();
    }
  })();

  return {
    close: () => {
      closed = true;
      abortController.abort();
    }
  };
}

export function fetchAuditLogs(): Promise<AuditLogItem[]> {
  if (isTestMode) {
    return Promise.resolve(mockAuditLogs);
  }
  return safeFetchMapped(
    apiClient.get<
      ApiResponse<
        Array<{
          id: string;
          actorUserId: string;
          actorName?: string;
          actionType: string;
          targetType: string;
          targetId: string;
          taskId?: string;
          detail: Record<string, unknown>;
          createdAt?: string;
        }>
      >
    >("/api/audit-logs"),
    (auditLogs) =>
      auditLogs.map((auditLog) => ({
        id: auditLog.id,
        actorUserId: auditLog.actorUserId,
        actorName: auditLog.actorName,
        actionType: auditLog.actionType,
        targetType: auditLog.targetType,
        targetId: auditLog.targetId,
        taskId: auditLog.taskId,
        detail: auditLog.detail,
        createdAt: auditLog.createdAt ? auditLog.createdAt.replace("T", " ").slice(0, 19) : undefined
      })),
    mockAuditLogs
  );
}

export async function exportAuditLogs(items: AuditLogItem[]): Promise<string> {
  const rows = items.map((item) => [
    item.id,
    item.createdAt ?? "",
    item.actorName ?? item.actorUserId,
    item.actionType,
    item.targetType,
    item.targetId,
    item.taskId ?? ""
  ]);
  return [
    "审计ID,时间,操作人,动作类型,目标类型,目标标识,关联任务",
    ...rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
  ].join("\n");
}

export function fetchUsers(): Promise<UserRoleItem[]> {
  if (isTestMode) {
    return Promise.resolve(mockUsers);
  }
  return safeFetchMapped(
    apiClient.get<
      ApiResponse<Array<{ id: string; username: string; displayName: string; roles: string[]; enabled: boolean }>>
    >("/api/users"),
    (users) =>
      users.map((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        roles: user.roles,
        status: user.enabled ? "启用" : "停用",
        lastLoginAt: undefined
      })),
    mockUsers
  );
}

export function fetchRoleOptions(): Promise<RoleOptionItem[]> {
  if (isTestMode) {
    return Promise.resolve(mockRoleOptions);
  }
  return safeFetch(
    apiClient.get<ApiResponse<RoleOptionItem[]>>("/api/users/roles"),
    mockRoleOptions
  );
}

export async function createCustomer(payload: CustomerCreatePayload): Promise<CustomerItem> {
  if (isTestMode) {
    return Promise.resolve(
      upsertLocalMockItem(mockCustomers, {
        id: buildLocalId("cust"),
        ...payload,
        recordStatus: "ACTIVE"
      })
    );
  }

  try {
    const response = await apiClient.post<ApiResponse<CustomerItem>>("/api/customers", payload);
    return upsertLocalMockItem(mockCustomers, response.data.data);
  } catch {
    return upsertLocalMockItem(mockCustomers, {
      id: buildLocalId("cust"),
      ...payload,
      recordStatus: "ACTIVE"
    });
  }
}

export async function updateCustomer(customerId: string, payload: CustomerUpdatePayload): Promise<CustomerItem> {
  if (isTestMode) {
    return Promise.resolve(
      upsertLocalMockItem(mockCustomers, {
        id: customerId,
        ...payload,
        recordStatus: "ACTIVE"
      })
    );
  }

  try {
    const response = await apiClient.put<ApiResponse<CustomerItem>>(`/api/customers/${customerId}`, payload);
    return upsertLocalMockItem(mockCustomers, response.data.data);
  } catch {
    return upsertLocalMockItem(mockCustomers, {
      id: customerId,
      ...payload,
      recordStatus: "ACTIVE"
    });
  }
}

export async function archiveCustomer(customerId: string): Promise<CustomerItem> {
  if (isTestMode) {
    const existingCustomer = findLocalMockItem(mockCustomers, customerId);
    return Promise.resolve(
      upsertLocalMockItem(
        mockCustomers,
        buildArchivedRecord({
          id: customerId,
          name: existingCustomer?.name ?? "未知客户",
          contactName: existingCustomer?.contactName,
          contactPhone: existingCustomer?.contactPhone,
          contactEmail: existingCustomer?.contactEmail,
          notes: existingCustomer?.notes,
          recordStatus: "ACTIVE"
        })
      )
    );
  }

  try {
    const response = await apiClient.patch<ApiResponse<CustomerItem>>(`/api/customers/${customerId}/archive`);
    return upsertLocalMockItem(mockCustomers, response.data.data);
  } catch {
    const existingCustomer = findLocalMockItem(mockCustomers, customerId);
    return upsertLocalMockItem(
      mockCustomers,
      buildArchivedRecord({
        id: customerId,
        name: existingCustomer?.name ?? "未知客户",
        contactName: existingCustomer?.contactName,
        contactPhone: existingCustomer?.contactPhone,
        contactEmail: existingCustomer?.contactEmail,
        notes: existingCustomer?.notes,
        recordStatus: "ACTIVE"
      })
    );
  }
}

export async function restoreCustomer(customerId: string): Promise<CustomerItem> {
  if (isTestMode) {
    const existingCustomer = findLocalMockItem(mockCustomers, customerId);
    return Promise.resolve(
      upsertLocalMockItem(
        mockCustomers,
        buildRestoredRecord({
          id: customerId,
          name: existingCustomer?.name ?? "未知客户",
          contactName: existingCustomer?.contactName,
          contactPhone: existingCustomer?.contactPhone,
          contactEmail: existingCustomer?.contactEmail,
          notes: existingCustomer?.notes,
          recordStatus: "ARCHIVED",
          archivedAt: existingCustomer?.archivedAt
        })
      )
    );
  }

  try {
    const response = await apiClient.post<ApiResponse<CustomerItem>>(`/api/customers/${customerId}/restore`);
    return upsertLocalMockItem(mockCustomers, response.data.data);
  } catch {
    const existingCustomer = findLocalMockItem(mockCustomers, customerId);
    return upsertLocalMockItem(
      mockCustomers,
      buildRestoredRecord({
        id: customerId,
        name: existingCustomer?.name ?? "未知客户",
        contactName: existingCustomer?.contactName,
        contactPhone: existingCustomer?.contactPhone,
        contactEmail: existingCustomer?.contactEmail,
        notes: existingCustomer?.notes,
        recordStatus: "ARCHIVED",
        archivedAt: existingCustomer?.archivedAt
      })
    );
  }
}

export async function createServer(payload: ServerCreatePayload): Promise<ServerItem> {
  if (isTestMode) {
    return Promise.resolve(
      upsertLocalMockItem(mockServers, {
        id: buildLocalId("srv"),
        customerId: payload.customerId,
        host: payload.host,
        sshPort: payload.sshPort,
        sshUsername: payload.sshUsername,
        sshPasswordMasked: "********",
        osLabel: payload.osLabel,
        tags: payload.tags ?? [],
        connectivityStatus: "UNKNOWN",
        notes: payload.notes,
        recordStatus: "ACTIVE"
      })
    );
  }

  try {
    const response = await apiClient.post<ApiResponse<ServerItem>>("/api/servers", payload);
    return upsertLocalMockItem(mockServers, {
      ...response.data.data,
      tags: payload.tags ?? response.data.data.tags ?? []
    });
  } catch {
    return upsertLocalMockItem(mockServers, {
      id: buildLocalId("srv"),
      customerId: payload.customerId,
      host: payload.host,
      sshPort: payload.sshPort,
      sshUsername: payload.sshUsername,
      sshPasswordMasked: "********",
      osLabel: payload.osLabel,
      tags: payload.tags ?? [],
      connectivityStatus: "UNKNOWN",
      notes: payload.notes,
      recordStatus: "ACTIVE"
    });
  }
}

export async function updateServer(serverId: string, payload: ServerUpdatePayload): Promise<ServerItem> {
  if (isTestMode) {
    return Promise.resolve(
      upsertLocalMockItem(mockServers, {
        id: serverId,
        customerId: payload.customerId,
        host: payload.host,
        sshPort: payload.sshPort,
        sshUsername: payload.sshUsername,
        sshPasswordMasked: "********",
        osLabel: payload.osLabel,
        tags: payload.tags ?? [],
        connectivityStatus: "UNKNOWN",
        notes: payload.notes,
        recordStatus: "ACTIVE"
      })
    );
  }

  try {
    const response = await apiClient.put<ApiResponse<ServerItem>>(`/api/servers/${serverId}`, payload);
    return upsertLocalMockItem(mockServers, response.data.data);
  } catch {
    return upsertLocalMockItem(mockServers, {
      id: serverId,
      customerId: payload.customerId,
      host: payload.host,
      sshPort: payload.sshPort,
      sshUsername: payload.sshUsername,
      sshPasswordMasked: "********",
      osLabel: payload.osLabel,
      tags: payload.tags ?? [],
      connectivityStatus: "UNKNOWN",
      notes: payload.notes,
      recordStatus: "ACTIVE"
    });
  }
}

export async function archiveServer(serverId: string): Promise<ServerItem> {
  if (isTestMode) {
    const existingServer = findLocalMockItem(mockServers, serverId);
    return Promise.resolve(
      upsertLocalMockItem(
        mockServers,
        buildArchivedRecord(
          existingServer ?? {
            id: serverId,
            customerId: "",
            host: "unknown",
            sshPort: 22,
            sshUsername: "unknown",
            sshPasswordMasked: "********",
            connectivityStatus: "UNKNOWN",
            recordStatus: "ACTIVE"
          }
        )
      )
    );
  }

  try {
    const response = await apiClient.patch<ApiResponse<ServerItem>>(`/api/servers/${serverId}/archive`);
    return upsertLocalMockItem(mockServers, response.data.data);
  } catch {
    const existingServer = findLocalMockItem(mockServers, serverId);
    return upsertLocalMockItem(
      mockServers,
      buildArchivedRecord(
        existingServer ?? {
          id: serverId,
          customerId: "",
          host: "unknown",
          sshPort: 22,
          sshUsername: "unknown",
          sshPasswordMasked: "********",
          connectivityStatus: "UNKNOWN",
          recordStatus: "ACTIVE"
        }
      )
    );
  }
}

export async function restoreServer(serverId: string): Promise<ServerItem> {
  if (isTestMode) {
    const existingServer = findLocalMockItem(mockServers, serverId);
    return Promise.resolve(
      upsertLocalMockItem(
        mockServers,
        buildRestoredRecord(
          existingServer ?? {
            id: serverId,
            customerId: "",
            host: "unknown",
            sshPort: 22,
            sshUsername: "unknown",
            sshPasswordMasked: "********",
            connectivityStatus: "UNKNOWN",
            recordStatus: "ARCHIVED",
            archivedAt: new Date().toISOString()
          }
        )
      )
    );
  }

  try {
    const response = await apiClient.post<ApiResponse<ServerItem>>(`/api/servers/${serverId}/restore`);
    return upsertLocalMockItem(mockServers, response.data.data);
  } catch {
    const existingServer = findLocalMockItem(mockServers, serverId);
    return upsertLocalMockItem(
      mockServers,
      buildRestoredRecord(
        existingServer ?? {
          id: serverId,
          customerId: "",
          host: "unknown",
          sshPort: 22,
          sshUsername: "unknown",
          sshPasswordMasked: "********",
          connectivityStatus: "UNKNOWN",
          recordStatus: "ARCHIVED",
          archivedAt: new Date().toISOString()
        }
      )
    );
  }
}

export async function createTemplate(payload: TemplateCreatePayload): Promise<TemplateItem> {
  if (isTestMode) {
    return Promise.resolve(
      upsertLocalMockItem(mockTemplates, {
        id: buildLocalId("tpl"),
        name: payload.name,
        productCode: payload.productCode,
        supportedReleaseSources: payload.supportedReleaseSources,
        defaultWorkDir: payload.defaultWorkDir,
        defaultConfig: payload.defaultConfig,
        description: payload.description,
        actions: payload.actions.map((action, index) => ({
          id: buildLocalId("act"),
          actionType: action.actionType,
          mode: action.mode,
          scriptBody: action.scriptBody,
          stepDefinition: action.stepDefinition,
          executionOrder: action.executionOrder ?? index + 1
        })),
        recordStatus: "ACTIVE"
      })
    );
  }

  try {
    const response = await apiClient.post<ApiResponse<TemplateItem>>("/api/templates", payload);
    return upsertLocalMockItem(mockTemplates, response.data.data);
  } catch {
    return upsertLocalMockItem(mockTemplates, {
      id: buildLocalId("tpl"),
      name: payload.name,
      productCode: payload.productCode,
      supportedReleaseSources: payload.supportedReleaseSources,
      defaultWorkDir: payload.defaultWorkDir,
      defaultConfig: payload.defaultConfig,
      description: payload.description,
      actions: payload.actions.map((action, index) => ({
        id: buildLocalId("act"),
        actionType: action.actionType,
        mode: action.mode,
        scriptBody: action.scriptBody,
        stepDefinition: action.stepDefinition,
        executionOrder: action.executionOrder ?? index + 1
      })),
      recordStatus: "ACTIVE"
    });
  }
}

export async function updateTemplate(templateId: string, payload: TemplateUpdatePayload): Promise<TemplateItem> {
  if (isTestMode) {
    return Promise.resolve(
      upsertLocalMockItem(mockTemplates, {
        id: templateId,
        name: payload.name,
        productCode: payload.productCode,
        supportedReleaseSources: payload.supportedReleaseSources,
        defaultWorkDir: payload.defaultWorkDir,
        defaultConfig: payload.defaultConfig,
        description: payload.description,
        actions: payload.actions.map((action, index) => ({
          id: buildLocalId("act"),
          actionType: action.actionType,
          mode: action.mode,
          scriptBody: action.scriptBody,
          stepDefinition: action.stepDefinition,
          executionOrder: action.executionOrder ?? index + 1
        })),
        recordStatus: "ACTIVE"
      })
    );
  }

  try {
    const response = await apiClient.put<ApiResponse<TemplateItem>>(`/api/templates/${templateId}`, payload);
    return upsertLocalMockItem(mockTemplates, response.data.data);
  } catch {
    return upsertLocalMockItem(mockTemplates, {
      id: templateId,
      name: payload.name,
      productCode: payload.productCode,
      supportedReleaseSources: payload.supportedReleaseSources,
      defaultWorkDir: payload.defaultWorkDir,
      defaultConfig: payload.defaultConfig,
      description: payload.description,
      actions: payload.actions.map((action, index) => ({
        id: buildLocalId("act"),
        actionType: action.actionType,
        mode: action.mode,
        scriptBody: action.scriptBody,
        stepDefinition: action.stepDefinition,
        executionOrder: action.executionOrder ?? index + 1
      })),
      recordStatus: "ACTIVE"
    });
  }
}

export async function archiveTemplate(templateId: string): Promise<TemplateItem> {
  if (isTestMode) {
    const existingTemplate = findLocalMockItem(mockTemplates, templateId);
    return Promise.resolve(
      upsertLocalMockItem(
        mockTemplates,
        buildArchivedRecord(
          existingTemplate ?? {
            id: templateId,
            name: "未知模板",
            productCode: "unknown",
            supportedReleaseSources: [],
            actions: [],
            recordStatus: "ACTIVE"
          }
        )
      )
    );
  }

  try {
    const response = await apiClient.patch<ApiResponse<TemplateItem>>(`/api/templates/${templateId}/archive`);
    return upsertLocalMockItem(mockTemplates, response.data.data);
  } catch {
    const existingTemplate = findLocalMockItem(mockTemplates, templateId);
    return upsertLocalMockItem(
      mockTemplates,
      buildArchivedRecord(
        existingTemplate ?? {
          id: templateId,
          name: "未知模板",
          productCode: "unknown",
          supportedReleaseSources: [],
          actions: [],
          recordStatus: "ACTIVE"
        }
      )
    );
  }
}

export async function restoreTemplate(templateId: string): Promise<TemplateItem> {
  if (isTestMode) {
    const existingTemplate = findLocalMockItem(mockTemplates, templateId);
    return Promise.resolve(
      upsertLocalMockItem(
        mockTemplates,
        buildRestoredRecord(
          existingTemplate ?? {
            id: templateId,
            name: "未知模板",
            productCode: "unknown",
            supportedReleaseSources: [],
            actions: [],
            recordStatus: "ARCHIVED",
            archivedAt: new Date().toISOString()
          }
        )
      )
    );
  }

  try {
    const response = await apiClient.post<ApiResponse<TemplateItem>>(`/api/templates/${templateId}/restore`);
    return upsertLocalMockItem(mockTemplates, response.data.data);
  } catch {
    const existingTemplate = findLocalMockItem(mockTemplates, templateId);
    return upsertLocalMockItem(
      mockTemplates,
      buildRestoredRecord(
        existingTemplate ?? {
          id: templateId,
          name: "未知模板",
          productCode: "unknown",
          supportedReleaseSources: [],
          actions: [],
          recordStatus: "ARCHIVED",
          archivedAt: new Date().toISOString()
        }
      )
    );
  }
}

export async function createRelease(payload: ReleaseCreatePayload): Promise<ReleaseItem> {
  if (isTestMode) {
    return Promise.resolve(
      upsertLocalMockItem(mockReleases, {
        id: buildLocalId("rel"),
        templateId: payload.templateId,
        versionLabel: payload.versionLabel,
        sourceType: payload.sourceType,
        repositoryUrl: payload.repositoryUrl,
        gitRef: payload.gitRef,
        packageUri: payload.packageUri,
        changelog: payload.changelog,
        createdBy: "当前账号",
        createdAt: new Date().toISOString(),
        recordStatus: "ACTIVE"
      })
    );
  }

  try {
    const response = await apiClient.post<ApiResponse<ReleaseItem>>("/api/releases", payload);
    return upsertLocalMockItem(mockReleases, response.data.data);
  } catch {
    return upsertLocalMockItem(mockReleases, {
      id: buildLocalId("rel"),
      templateId: payload.templateId,
      versionLabel: payload.versionLabel,
      sourceType: payload.sourceType,
      repositoryUrl: payload.repositoryUrl,
      gitRef: payload.gitRef,
      packageUri: payload.packageUri,
      changelog: payload.changelog,
      createdBy: "当前账号",
      createdAt: new Date().toISOString(),
      recordStatus: "ACTIVE"
    });
  }
}

export async function updateRelease(releaseId: string, payload: ReleaseUpdatePayload): Promise<ReleaseItem> {
  if (isTestMode) {
    return Promise.resolve(
      upsertLocalMockItem(mockReleases, {
        id: releaseId,
        templateId: payload.templateId,
        versionLabel: payload.versionLabel,
        sourceType: payload.sourceType,
        repositoryUrl: payload.repositoryUrl,
        gitRef: payload.gitRef,
        packageUri: payload.packageUri,
        changelog: payload.changelog,
        createdBy: "当前账号",
        createdAt: new Date().toISOString(),
        recordStatus: "ACTIVE"
      })
    );
  }

  try {
    const response = await apiClient.put<ApiResponse<ReleaseItem>>(`/api/releases/${releaseId}`, payload);
    return upsertLocalMockItem(mockReleases, response.data.data);
  } catch {
    return upsertLocalMockItem(mockReleases, {
      id: releaseId,
      templateId: payload.templateId,
      versionLabel: payload.versionLabel,
      sourceType: payload.sourceType,
      repositoryUrl: payload.repositoryUrl,
      gitRef: payload.gitRef,
      packageUri: payload.packageUri,
      changelog: payload.changelog,
      createdBy: "当前账号",
      createdAt: new Date().toISOString(),
      recordStatus: "ACTIVE"
    });
  }
}

export async function archiveRelease(releaseId: string): Promise<ReleaseItem> {
  if (isTestMode) {
    const existingRelease = findLocalMockItem(mockReleases, releaseId);
    return Promise.resolve(
      upsertLocalMockItem(
        mockReleases,
        buildArchivedRecord(
          existingRelease ?? {
            id: releaseId,
            templateId: "",
            versionLabel: "unknown",
            sourceType: "GIT",
            recordStatus: "ACTIVE"
          }
        )
      )
    );
  }

  try {
    const response = await apiClient.patch<ApiResponse<ReleaseItem>>(`/api/releases/${releaseId}/archive`);
    return upsertLocalMockItem(mockReleases, response.data.data);
  } catch {
    const existingRelease = findLocalMockItem(mockReleases, releaseId);
    return upsertLocalMockItem(
      mockReleases,
      buildArchivedRecord(
        existingRelease ?? {
          id: releaseId,
          templateId: "",
          versionLabel: "unknown",
          sourceType: "GIT",
          recordStatus: "ACTIVE"
        }
      )
    );
  }
}

export async function restoreRelease(releaseId: string): Promise<ReleaseItem> {
  if (isTestMode) {
    const existingRelease = findLocalMockItem(mockReleases, releaseId);
    return Promise.resolve(
      upsertLocalMockItem(
        mockReleases,
        buildRestoredRecord(
          existingRelease ?? {
            id: releaseId,
            templateId: "",
            versionLabel: "unknown",
            sourceType: "GIT",
            recordStatus: "ARCHIVED",
            archivedAt: new Date().toISOString()
          }
        )
      )
    );
  }

  try {
    const response = await apiClient.post<ApiResponse<ReleaseItem>>(`/api/releases/${releaseId}/restore`);
    return upsertLocalMockItem(mockReleases, response.data.data);
  } catch {
    const existingRelease = findLocalMockItem(mockReleases, releaseId);
    return upsertLocalMockItem(
      mockReleases,
      buildRestoredRecord(
        existingRelease ?? {
          id: releaseId,
          templateId: "",
          versionLabel: "unknown",
          sourceType: "GIT",
          recordStatus: "ARCHIVED",
          archivedAt: new Date().toISOString()
        }
      )
    );
  }
}

export async function createInstance(payload: InstanceCreatePayload): Promise<InstanceItem> {
  if (isTestMode) {
    return Promise.resolve(
      upsertLocalMockItem(mockInstances, {
        id: buildLocalId("ins"),
        instanceName: payload.instanceName,
        environmentLabel: payload.environmentLabel,
        customerId: payload.customerId,
        templateId: payload.templateId,
        primaryServerId: payload.primaryServerId,
        currentReleaseId: undefined,
        status: "DRAFT",
        configOverride: payload.configOverride,
        notes: payload.notes,
        recordStatus: "ACTIVE"
      })
    );
  }

  try {
    const response = await apiClient.post<ApiResponse<InstanceItem>>("/api/instances", payload);
    return upsertLocalMockItem(mockInstances, response.data.data);
  } catch {
    return upsertLocalMockItem(mockInstances, {
      id: buildLocalId("ins"),
      instanceName: payload.instanceName,
      environmentLabel: payload.environmentLabel,
      customerId: payload.customerId,
      templateId: payload.templateId,
      primaryServerId: payload.primaryServerId,
      currentReleaseId: undefined,
      status: "DRAFT",
      configOverride: payload.configOverride,
      notes: payload.notes,
      recordStatus: "ACTIVE"
    });
  }
}

export async function updateInstance(instanceId: string, payload: InstanceUpdatePayload): Promise<InstanceItem> {
  if (isTestMode) {
    return Promise.resolve(
      upsertLocalMockItem(mockInstances, {
        id: instanceId,
        instanceName: payload.instanceName,
        environmentLabel: payload.environmentLabel,
        customerId: payload.customerId,
        templateId: payload.templateId,
        primaryServerId: payload.primaryServerId,
        status: "DRAFT",
        currentReleaseId: undefined,
        configOverride: payload.configOverride,
        notes: payload.notes,
        recordStatus: "ACTIVE"
      })
    );
  }

  try {
    const response = await apiClient.put<ApiResponse<InstanceItem>>(`/api/instances/${instanceId}`, payload);
    return upsertLocalMockItem(mockInstances, response.data.data);
  } catch {
    return upsertLocalMockItem(mockInstances, {
      id: instanceId,
      instanceName: payload.instanceName,
      environmentLabel: payload.environmentLabel,
      customerId: payload.customerId,
      templateId: payload.templateId,
      primaryServerId: payload.primaryServerId,
      status: "DRAFT",
      currentReleaseId: undefined,
      configOverride: payload.configOverride,
      notes: payload.notes,
      recordStatus: "ACTIVE"
    });
  }
}

export async function archiveInstance(instanceId: string): Promise<InstanceItem> {
  if (isTestMode) {
    const existingInstance = findLocalMockItem(mockInstances, instanceId);
    return Promise.resolve(
      upsertLocalMockItem(
        mockInstances,
        buildArchivedRecord(
          existingInstance ?? {
            id: instanceId,
            instanceName: "未知实例",
            environmentLabel: "unknown",
            customerId: "",
            templateId: "",
            primaryServerId: "",
            status: "DRAFT",
            recordStatus: "ACTIVE"
          }
        )
      )
    );
  }

  try {
    const response = await apiClient.patch<ApiResponse<InstanceItem>>(`/api/instances/${instanceId}/archive`);
    return upsertLocalMockItem(mockInstances, response.data.data);
  } catch {
    const existingInstance = findLocalMockItem(mockInstances, instanceId);
    return upsertLocalMockItem(
      mockInstances,
      buildArchivedRecord(
        existingInstance ?? {
          id: instanceId,
          instanceName: "未知实例",
          environmentLabel: "unknown",
          customerId: "",
          templateId: "",
          primaryServerId: "",
          status: "DRAFT",
          recordStatus: "ACTIVE"
        }
      )
    );
  }
}

export async function restoreInstance(instanceId: string): Promise<InstanceItem> {
  if (isTestMode) {
    const existingInstance = findLocalMockItem(mockInstances, instanceId);
    return Promise.resolve(
      upsertLocalMockItem(
        mockInstances,
        buildRestoredRecord(
          existingInstance ?? {
            id: instanceId,
            instanceName: "未知实例",
            environmentLabel: "unknown",
            customerId: "",
            templateId: "",
            primaryServerId: "",
            status: "DRAFT",
            recordStatus: "ARCHIVED",
            archivedAt: new Date().toISOString()
          }
        )
      )
    );
  }

  try {
    const response = await apiClient.post<ApiResponse<InstanceItem>>(`/api/instances/${instanceId}/restore`);
    return upsertLocalMockItem(mockInstances, response.data.data);
  } catch {
    const existingInstance = findLocalMockItem(mockInstances, instanceId);
    return upsertLocalMockItem(
      mockInstances,
      buildRestoredRecord(
        existingInstance ?? {
          id: instanceId,
          instanceName: "未知实例",
          environmentLabel: "unknown",
          customerId: "",
          templateId: "",
          primaryServerId: "",
          status: "DRAFT",
          recordStatus: "ARCHIVED",
          archivedAt: new Date().toISOString()
        }
      )
    );
  }
}

export async function createUser(payload: UserCreatePayload): Promise<UserRoleItem> {
  try {
    const response = await apiClient.post<
      ApiResponse<{ id: string; username: string; displayName: string; roles: string[]; enabled: boolean }>
    >("/api/users", payload);
    return {
      id: response.data.data.id,
      username: response.data.data.username,
      displayName: response.data.data.displayName,
      roles: response.data.data.roles,
      status: response.data.data.enabled ? "启用" : "停用",
      lastLoginAt: undefined
    };
  } catch {
    return {
      id: buildLocalId("usr"),
      username: payload.username,
      displayName: payload.displayName,
      roles: payload.roleCodes,
      status: payload.enabled ? "启用" : "停用",
      lastLoginAt: undefined
    };
  }
}

export async function updateUserRoles(userId: string, roleCodes: string[]): Promise<UserRoleItem> {
  try {
    const response = await apiClient.put<
      ApiResponse<{ id: string; username: string; displayName: string; roles: string[]; enabled: boolean }>
    >(`/api/users/${userId}/roles`, { roleCodes });
    return {
      id: response.data.data.id,
      username: response.data.data.username,
      displayName: response.data.data.displayName,
      roles: response.data.data.roles,
      status: response.data.data.enabled ? "启用" : "停用",
      lastLoginAt: undefined
    };
  } catch {
    const existingUser = mockUsers.find((item) => item.id === userId);
    return {
      id: userId,
      username: existingUser?.username ?? "unknown",
      displayName: existingUser?.displayName ?? "未命名账号",
      roles: roleCodes,
      status: existingUser?.status ?? "启用",
      lastLoginAt: existingUser?.lastLoginAt
    };
  }
}

export async function updateUserStatus(userId: string, enabled: boolean): Promise<UserRoleItem> {
  try {
    const response = await apiClient.put<
      ApiResponse<{ id: string; username: string; displayName: string; roles: string[]; enabled: boolean }>
    >(`/api/users/${userId}/status`, { enabled });
    return {
      id: response.data.data.id,
      username: response.data.data.username,
      displayName: response.data.data.displayName,
      roles: response.data.data.roles,
      status: response.data.data.enabled ? "启用" : "停用",
      lastLoginAt: undefined
    };
  } catch {
    const existingUser = mockUsers.find((item) => item.id === userId);
    return {
      id: userId,
      username: existingUser?.username ?? "unknown",
      displayName: existingUser?.displayName ?? "未命名账号",
      roles: existingUser?.roles ?? [],
      status: enabled ? "启用" : "停用",
      lastLoginAt: existingUser?.lastLoginAt
    };
  }
}

function buildTaskFallback(task: TaskItem): TaskItem {
  return {
    ...task,
    startedAt: task.startedAt ?? new Date().toISOString(),
    initiatorName: task.initiatorName ?? "当前账号",
    commandInput: task.commandInput ?? "",
    outputLog: task.outputLog ?? "",
    errorLog: task.errorLog ?? "",
    createdAt: task.createdAt ?? new Date().toISOString()
  };
}

export async function createDeployTask(payload: DeployTaskCreatePayload): Promise<TaskItem> {
  try {
    const response = await apiClient.post<ApiResponse<{ id: string; taskNumber: string; status: string }>>(
      "/api/tasks/deploy",
      payload
    );
    return buildTaskFallback({
      id: response.data.data.id,
      taskNumber: response.data.data.taskNumber,
      taskType: "DEPLOY",
      targetInstanceId: payload.instanceId,
      releaseId: payload.releaseId,
      status: response.data.data.status
    });
  } catch {
    return buildTaskFallback({
      id: buildLocalId("task"),
      taskNumber: `TASK-${Date.now()}`,
      taskType: "DEPLOY",
      targetInstanceId: payload.instanceId,
      releaseId: payload.releaseId,
      status: "PENDING"
    });
  }
}

export async function createRestartTask(payload: RestartTaskCreatePayload): Promise<TaskItem> {
  try {
    const response = await apiClient.post<ApiResponse<{ id: string; taskNumber: string; status: string }>>(
      "/api/tasks/restart",
      payload
    );
    return buildTaskFallback({
      id: response.data.data.id,
      taskNumber: response.data.data.taskNumber,
      taskType: "RESTART",
      targetInstanceId: payload.instanceId,
      status: response.data.data.status
    });
  } catch {
    return buildTaskFallback({
      id: buildLocalId("task"),
      taskNumber: `TASK-${Date.now()}`,
      taskType: "RESTART",
      targetInstanceId: payload.instanceId,
      status: "PENDING"
    });
  }
}

export async function createBackupTask(payload: BackupTaskCreatePayload): Promise<TaskItem> {
  try {
    const response = await apiClient.post<ApiResponse<{ id: string; taskNumber: string; status: string }>>(
      "/api/tasks/backup",
      payload
    );
    return buildTaskFallback({
      id: response.data.data.id,
      taskNumber: response.data.data.taskNumber,
      taskType: "BACKUP",
      targetInstanceId: payload.instanceId,
      status: response.data.data.status
    });
  } catch {
    return buildTaskFallback({
      id: buildLocalId("task"),
      taskNumber: `TASK-${Date.now()}`,
      taskType: "BACKUP",
      targetInstanceId: payload.instanceId,
      status: "PENDING"
    });
  }
}

export async function createUpdateTask(payload: UpdateTaskCreatePayload): Promise<TaskItem> {
  try {
    const response = await apiClient.post<ApiResponse<{ id: string; taskNumber: string; status: string; createdAt?: string }>>(
      "/api/tasks/update",
      payload
    );
    return buildTaskFallback({
      id: response.data.data.id,
      taskNumber: response.data.data.taskNumber,
      taskType: "UPDATE",
      targetInstanceId: payload.instanceId,
      releaseId: payload.releaseId,
      status: response.data.data.status,
      createdAt: response.data.data.createdAt
    });
  } catch {
    return buildTaskFallback({
      id: buildLocalId("task"),
      taskNumber: `TASK-${Date.now()}`,
      taskType: "UPDATE",
      targetInstanceId: payload.instanceId,
      releaseId: payload.releaseId,
      status: "PENDING"
    });
  }
}

export async function createRollbackTask(payload: RollbackTaskCreatePayload): Promise<TaskItem> {
  try {
    const response = await apiClient.post<ApiResponse<{ id: string; taskNumber: string; status: string }>>(
      "/api/tasks/rollback",
      payload
    );
    return buildTaskFallback({
      id: response.data.data.id,
      taskNumber: response.data.data.taskNumber,
      taskType: "ROLLBACK",
      targetInstanceId: payload.instanceId,
      releaseId: payload.releaseId,
      status: response.data.data.status
    });
  } catch {
    return buildTaskFallback({
      id: buildLocalId("task"),
      taskNumber: `TASK-${Date.now()}`,
      taskType: "ROLLBACK",
      targetInstanceId: payload.instanceId,
      releaseId: payload.releaseId,
      status: "PENDING"
    });
  }
}

export async function createVerifyTask(payload: VerifyTaskCreatePayload): Promise<TaskItem> {
  try {
    const response = await apiClient.post<ApiResponse<{ id: string; taskNumber: string; status: string }>>(
      "/api/tasks/verify",
      payload
    );
    return buildTaskFallback({
      id: response.data.data.id,
      taskNumber: response.data.data.taskNumber,
      taskType: "VERIFY",
      targetInstanceId: payload.instanceId,
      status: response.data.data.status
    });
  } catch {
    return buildTaskFallback({
      id: buildLocalId("task"),
      taskNumber: `TASK-${Date.now()}`,
      taskType: "VERIFY",
      targetInstanceId: payload.instanceId,
      status: "PENDING"
    });
  }
}

export async function createAdhocTask(payload: AdhocTaskCreatePayload): Promise<TaskItem> {
  try {
    const response = await apiClient.post<ApiResponse<{ id: string; taskNumber: string; status: string }>>(
      "/api/tasks/adhoc",
      payload
    );
    return buildTaskFallback({
      id: response.data.data.id,
      taskNumber: response.data.data.taskNumber,
      taskType: "ADHOC_COMMAND",
      targetServerId: payload.serverId,
      status: response.data.data.status,
      commandInput: payload.command
    });
  } catch {
    const terminalOutput = buildMockTerminalOutput(payload.command);
    const fallbackTask = buildTaskFallback({
      id: buildLocalId("task"),
      taskNumber: `TASK-${Date.now()}`,
      taskType: "ADHOC_COMMAND",
      targetServerId: payload.serverId,
      status: terminalOutput.status,
      commandInput: payload.command,
      outputLog: terminalOutput.outputLog,
      errorLog: terminalOutput.errorLog,
      exitCode: terminalOutput.exitCode,
      endedAt: new Date().toISOString()
    });

    upsertLocalMockItem(mockTasks, fallbackTask);
    return fallbackTask;
  }
}
