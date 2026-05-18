import type {
  AuditLogItem,
  CustomerItem,
  InstanceItem,
  ReleaseItem,
  RoleOptionItem,
  ServerItem,
  TaskItem,
  TemplateItem,
  UserRoleItem
} from "./types";

export const mockCustomers: CustomerItem[] = [
  {
    id: "cust-001",
    name: "华东制造集团",
    contactName: "张敏",
    contactPhone: "13800001234",
    contactEmail: "zhangmin@example.com",
    notes: "年度维保客户",
    recordStatus: "ACTIVE"
  },
  {
    id: "cust-002",
    name: "深蓝科技有限公司",
    contactName: "李辉",
    contactPhone: "13900005678",
    contactEmail: "lihui@example.com",
    notes: "正在筹备二期上线",
    recordStatus: "ACTIVE"
  },
  {
    id: "cust-003",
    name: "北方零售股份",
    contactName: "王晨",
    contactPhone: "13700001111",
    contactEmail: "wangchen@example.com",
    notes: "历史归档客户",
    recordStatus: "ARCHIVED",
    archivedAt: "2026-05-15T10:20:00Z"
  }
];

export const mockServers: ServerItem[] = [
  {
    id: "srv-001",
    customerId: "cust-001",
    host: "10.23.11.8",
    sshPort: 22,
    sshUsername: "deploy",
    sshPasswordMasked: "********",
    osLabel: "Ubuntu 22.04",
    connectivityStatus: "UNKNOWN",
    recentTask: "TASK-202605180930-1A2B3C4D",
    notes: "生产业务主机",
    recordStatus: "ACTIVE",
    tags: ["prod", "web"]
  },
  {
    id: "srv-002",
    customerId: "cust-002",
    host: "172.16.9.21",
    sshPort: 22,
    sshUsername: "ops",
    sshPasswordMasked: "********",
    osLabel: "Rocky Linux 9",
    connectivityStatus: "UNKNOWN",
    recentTask: "TASK-202605180945-5E6F7A8B",
    notes: "灾备环境",
    recordStatus: "ACTIVE",
    tags: ["dr"]
  },
  {
    id: "srv-003",
    customerId: "cust-001",
    host: "10.23.11.19",
    sshPort: 22,
    sshUsername: "deploy",
    sshPasswordMasked: "********",
    osLabel: "Ubuntu 20.04",
    connectivityStatus: "FAILED",
    notes: "历史备用机",
    recordStatus: "ARCHIVED",
    archivedAt: "2026-05-14T09:00:00Z",
    tags: ["legacy"]
  }
];

export const mockTemplates: TemplateItem[] = [
  {
    id: "tpl-001",
    name: "供应链后台",
    productCode: "supply-admin",
    supportedReleaseSources: ["GIT", "PACKAGE"],
    defaultWorkDir: "/opt/supply-admin",
    description: "标准管理后台交付模板",
    defaultConfig: {},
    actions: [
      { id: "act-001", actionType: "DEPLOY", mode: "SCRIPT", scriptBody: "echo deploy", executionOrder: 1 },
      { id: "act-002", actionType: "UPDATE", mode: "SCRIPT", scriptBody: "echo update", executionOrder: 2 }
    ],
    recordStatus: "ACTIVE"
  },
  {
    id: "tpl-002",
    name: "官网门户",
    productCode: "portal-web",
    supportedReleaseSources: ["GIT"],
    defaultWorkDir: "/opt/portal-web",
    description: "静态前台站点模板",
    defaultConfig: {},
    actions: [{ id: "act-003", actionType: "DEPLOY", mode: "SCRIPT", scriptBody: "echo deploy", executionOrder: 1 }],
    recordStatus: "ACTIVE"
  },
  {
    id: "tpl-003",
    name: "历史模板",
    productCode: "legacy-portal",
    supportedReleaseSources: ["PACKAGE"],
    defaultWorkDir: "/opt/legacy-portal",
    description: "保留历史站点模板",
    defaultConfig: {},
    actions: [{ id: "act-004", actionType: "DEPLOY", mode: "SCRIPT", scriptBody: "echo legacy", executionOrder: 1 }],
    recordStatus: "ARCHIVED",
    archivedAt: "2026-05-14T11:10:00Z"
  }
];

export const mockReleases: ReleaseItem[] = [
  {
    id: "rel-001",
    templateId: "tpl-001",
    versionLabel: "v2.1.0",
    sourceType: "GIT",
    repositoryUrl: "https://example.com/supply-admin.git",
    gitRef: "refs/tags/v2.1.0",
    changelog: "修复库存同步与权限菜单",
    createdBy: "系统管理员",
    createdAt: "2026-05-18 09:30",
    recordStatus: "ACTIVE"
  },
  {
    id: "rel-002",
    templateId: "tpl-002",
    versionLabel: "v1.4.3",
    sourceType: "PACKAGE",
    packageUri: "https://example.com/portal-web-v1.4.3.tar.gz",
    changelog: "官网静态资源更新",
    createdBy: "运维专员",
    createdAt: "2026-05-17 16:20",
    recordStatus: "ACTIVE"
  },
  {
    id: "rel-003",
    templateId: "tpl-003",
    versionLabel: "v0.9.0",
    sourceType: "PACKAGE",
    packageUri: "https://example.com/legacy-portal-v0.9.0.tar.gz",
    changelog: "历史归档版本",
    createdBy: "系统管理员",
    createdAt: "2026-05-14 13:40",
    recordStatus: "ARCHIVED",
    archivedAt: "2026-05-15T09:30:00Z"
  }
];

export const mockInstances: InstanceItem[] = [
  {
    id: "ins-001",
    instanceName: "供应链后台-生产",
    environmentLabel: "prod",
    customerId: "cust-001",
    templateId: "tpl-001",
    primaryServerId: "srv-001",
    currentReleaseId: "rel-001",
    status: "RUNNING",
    notes: "主站实例",
    recordStatus: "ACTIVE"
  },
  {
    id: "ins-002",
    instanceName: "官网门户-预发",
    environmentLabel: "pre",
    customerId: "cust-002",
    templateId: "tpl-002",
    primaryServerId: "srv-002",
    currentReleaseId: "rel-002",
    status: "DRAFT",
    notes: "预发布验证",
    recordStatus: "ACTIVE"
  },
  {
    id: "ins-003",
    instanceName: "历史门户-生产",
    environmentLabel: "legacy",
    customerId: "cust-001",
    templateId: "tpl-003",
    primaryServerId: "srv-003",
    currentReleaseId: "rel-003",
    status: "STOPPED",
    notes: "历史归档实例",
    recordStatus: "ARCHIVED",
    archivedAt: "2026-05-15T14:00:00Z"
  }
];

export const mockTasks: TaskItem[] = [
  {
    id: "task-001",
    taskNumber: "TASK-202605180930-1A2B3C4D",
    taskType: "DEPLOY",
    targetInstanceId: "ins-001",
    releaseId: "rel-001",
    status: "SUCCESS",
    commandInput: "docker compose up -d",
    outputLog: "服务已启动，健康检查通过",
    errorLog: "",
    exitCode: 0,
    initiatorName: "系统管理员",
    startedAt: "2026-05-18 09:30",
    endedAt: "2026-05-18 09:32"
  },
  {
    id: "task-002",
    taskNumber: "TASK-202605180945-5E6F7A8B",
    taskType: "ADHOC_COMMAND",
    targetServerId: "srv-002",
    status: "RUNNING",
    commandInput: "docker ps",
    outputLog: "正在采集容器清单...",
    errorLog: "",
    exitCode: undefined,
    initiatorName: "运维专员",
    startedAt: "2026-05-18 09:45"
  }
];

export const mockAuditLogs: AuditLogItem[] = [
  {
    id: "audit-001",
    actorUserId: "00000000-0000-0000-0000-000000000001",
    actorName: "系统管理员",
    actionType: "DEPLOY",
    targetType: "INSTANCE",
    targetId: "ins-001",
    taskId: "task-001",
    detail: { releaseId: "rel-001" },
    createdAt: "2026-05-18 09:30"
  },
  {
    id: "audit-002",
    actorUserId: "00000000-0000-0000-0000-000000000001",
    actorName: "运维专员",
    actionType: "ADHOC_COMMAND",
    targetType: "SERVER",
    targetId: "srv-002",
    taskId: "task-002",
    detail: { command: "docker ps" },
    createdAt: "2026-05-18 09:45"
  }
];

export const mockUsers: UserRoleItem[] = [
  {
    id: "usr-001",
    username: "admin",
    displayName: "系统管理员",
    roles: ["SUPER_ADMIN"],
    status: "启用",
    lastLoginAt: "2026-05-18 09:12"
  },
  {
    id: "usr-002",
    username: "ops.lead",
    displayName: "运维负责人",
    roles: ["OPS_ADMIN"],
    status: "启用",
    lastLoginAt: "2026-05-18 08:48"
  }
];

export const mockRoleOptions: RoleOptionItem[] = [
  {
    roleCode: "SUPER_ADMIN",
    roleName: "超级管理员"
  },
  {
    roleCode: "OPS_ADMIN",
    roleName: "运维管理员"
  },
  {
    roleCode: "AUDITOR",
    roleName: "审计员"
  }
];
