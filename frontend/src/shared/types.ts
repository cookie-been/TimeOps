export interface ApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T;
}

export type RecordStatus = "ACTIVE" | "ARCHIVED";
export type RecordStatusFilter = RecordStatus | "ALL";

export interface TemplateActionItem {
  id: string;
  actionType: string;
  mode: string;
  scriptBody?: string;
  stepDefinition?: Record<string, unknown>;
  executionOrder?: number;
}

export interface CustomerItem {
  id: string;
  name: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  recordStatus: RecordStatus;
  archivedAt?: string;
}

export interface CustomerCreatePayload {
  name: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
}

export interface CustomerUpdatePayload extends CustomerCreatePayload {}

export interface ServerItem {
  id: string;
  customerId: string;
  host: string;
  sshPort: number;
  sshUsername: string;
  sshPasswordMasked: string;
  osLabel?: string;
  tags?: string[];
  connectivityStatus: string;
  notes?: string;
  recentTask?: string;
  recordStatus: RecordStatus;
  archivedAt?: string;
}

export interface ServerCreatePayload {
  customerId: string;
  host: string;
  sshPort: number;
  sshUsername: string;
  sshPassword: string;
  osLabel?: string;
  tags?: string[];
  notes?: string;
}

export interface ServerUpdatePayload extends Omit<ServerCreatePayload, "sshPassword"> {
  sshPassword?: string;
}

export interface TemplateItem {
  id: string;
  name: string;
  productCode: string;
  supportedReleaseSources: string[];
  defaultWorkDir?: string;
  defaultConfig?: Record<string, unknown>;
  description?: string;
  actions: TemplateActionItem[];
  recordStatus: RecordStatus;
  archivedAt?: string;
}

export interface TemplateActionPayload {
  actionType: string;
  mode: string;
  scriptBody?: string;
  stepDefinition?: Record<string, unknown>;
  executionOrder?: number;
}

export interface TemplateCreatePayload {
  name: string;
  productCode: string;
  supportedReleaseSources: string[];
  defaultWorkDir?: string;
  defaultConfig?: Record<string, unknown>;
  description?: string;
  actions: TemplateActionPayload[];
}

export interface TemplateUpdatePayload extends TemplateCreatePayload {}

export interface ReleaseItem {
  id: string;
  templateId: string;
  versionLabel: string;
  sourceType: string;
  repositoryUrl?: string;
  gitRef?: string;
  packageUri?: string;
  changelog?: string;
  createdBy?: string;
  createdAt?: string;
  recordStatus: RecordStatus;
  archivedAt?: string;
}

export interface ReleaseCreatePayload {
  templateId: string;
  versionLabel: string;
  sourceType: string;
  repositoryUrl?: string;
  gitRef?: string;
  packageUri?: string;
  changelog?: string;
}

export interface ReleaseUpdatePayload extends ReleaseCreatePayload {}

export interface InstanceItem {
  id: string;
  instanceName: string;
  environmentLabel: string;
  customerId: string;
  templateId: string;
  primaryServerId: string;
  currentReleaseId?: string;
  status: string;
  configOverride?: Record<string, unknown>;
  mergedConfig?: Record<string, unknown>;
  notes?: string;
  recordStatus: RecordStatus;
  archivedAt?: string;
}

export interface InstanceCreatePayload {
  customerId: string;
  templateId: string;
  primaryServerId: string;
  instanceName: string;
  environmentLabel: string;
  configOverride?: Record<string, unknown>;
  notes?: string;
}

export interface InstanceUpdatePayload extends InstanceCreatePayload {}

export interface TaskItem {
  id: string;
  taskNumber: string;
  taskType: string;
  targetServerId?: string;
  targetInstanceId?: string;
  releaseId?: string;
  status: string;
  commandInput?: string;
  outputLog?: string;
  errorLog?: string;
  exitCode?: number;
  initiatorName?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt?: string;
}

export interface DeployTaskCreatePayload {
  instanceId: string;
  releaseId: string;
}

export interface UpdateTaskCreatePayload {
  instanceId: string;
  releaseId: string;
}

export interface RestartTaskCreatePayload {
  instanceId: string;
}

export interface BackupTaskCreatePayload {
  instanceId: string;
}

export interface RollbackTaskCreatePayload {
  instanceId: string;
  releaseId: string;
}

export interface VerifyTaskCreatePayload {
  instanceId: string;
}

export interface AdhocTaskCreatePayload {
  serverId: string;
  command: string;
  riskConfirmed: boolean;
}

export interface AuditLogItem {
  id: string;
  actorUserId: string;
  actionType: string;
  targetType: string;
  targetId: string;
  taskId?: string;
  detail: Record<string, unknown>;
  actorName?: string;
  createdAt?: string;
}

export interface RoleOptionItem {
  roleCode: string;
  roleName: string;
}

export interface UserRoleItem {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
  status: string;
  lastLoginAt?: string;
}

export interface UserCreatePayload {
  username: string;
  displayName: string;
  password: string;
  roleCodes: string[];
  enabled: boolean;
}

export interface UserRoleUpdatePayload {
  roleCodes: string[];
}

export interface UserStatusUpdatePayload {
  enabled: boolean;
}
