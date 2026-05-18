import { Tag, Typography } from "antd";
import type { ReactNode } from "react";

type Tone = "blue" | "cyan" | "green" | "gold" | "lime" | "orange" | "purple" | "red" | "default" | "volcano";

interface TagMeta {
  label: string;
  color: Tone;
}

const connectivityMeta: Record<string, TagMeta> = {
  SUCCESS: { label: "已连通", color: "green" },
  FAILED: { label: "异常", color: "red" },
  UNKNOWN: { label: "待检测", color: "default" }
};

const sourceMeta: Record<string, TagMeta> = {
  GIT: { label: "Git", color: "blue" },
  PACKAGE: { label: "发布包", color: "gold" }
};

const instanceStatusMeta: Record<string, TagMeta> = {
  RUNNING: { label: "运行中", color: "green" },
  DRAFT: { label: "草稿", color: "default" },
  STOPPED: { label: "已停止", color: "orange" },
  FAILED: { label: "失败", color: "red" }
};

const recordStatusMeta: Record<string, TagMeta> = {
  ACTIVE: { label: "有效", color: "green" },
  ARCHIVED: { label: "已归档", color: "default" }
};

const taskTypeMeta: Record<string, TagMeta> = {
  DEPLOY: { label: "部署", color: "blue" },
  UPDATE: { label: "更新", color: "cyan" },
  BACKUP: { label: "备份", color: "gold" },
  ROLLBACK: { label: "回滚", color: "orange" },
  VERIFY: { label: "验证", color: "green" },
  RESTART: { label: "重启", color: "purple" },
  ADHOC_COMMAND: { label: "临时命令", color: "volcano" }
};

const taskStatusMeta: Record<string, TagMeta> = {
  PENDING: { label: "待执行", color: "default" },
  RUNNING: { label: "执行中", color: "blue" },
  SUCCESS: { label: "成功", color: "green" },
  FAILED: { label: "失败", color: "red" }
};

const auditActionMeta: Record<string, TagMeta> = {
  DEPLOY: { label: "部署", color: "blue" },
  UPDATE: { label: "更新", color: "cyan" },
  BACKUP: { label: "备份", color: "gold" },
  ROLLBACK: { label: "回滚", color: "orange" },
  VERIFY: { label: "验证", color: "green" },
  RESTART: { label: "重启", color: "purple" },
  ADHOC_COMMAND: { label: "高风险命令", color: "volcano" },
  USER_CREATED: { label: "新增账号", color: "green" },
  USER_ROLE_UPDATED: { label: "角色变更", color: "purple" },
  USER_STATUS_UPDATED: { label: "状态变更", color: "gold" }
};

const userStatusMeta: Record<string, TagMeta> = {
  启用: { label: "启用", color: "green" },
  停用: { label: "停用", color: "default" }
};

function renderTag(metaMap: Record<string, TagMeta>, value?: string): ReactNode {
  const meta = value ? metaMap[value] : undefined;
  return (
    <Tag className="timeops-status-tag" color={meta?.color ?? "default"}>
      {meta?.label ?? value ?? "-"}
    </Tag>
  );
}

export function renderNullable(value?: string): ReactNode {
  return <Typography.Text type={value ? undefined : "secondary"}>{value ?? "-"}</Typography.Text>;
}

export function renderCode(value?: string): ReactNode {
  return <span className="timeops-code-pill">{value ?? "-"}</span>;
}

export function renderConnectivityStatus(value?: string): ReactNode {
  return renderTag(connectivityMeta, value);
}

export function renderReleaseSource(value?: string): ReactNode {
  return renderTag(sourceMeta, value);
}

export function renderInstanceStatus(value?: string): ReactNode {
  return renderTag(instanceStatusMeta, value);
}

export function renderRecordStatus(value?: string): ReactNode {
  return renderTag(recordStatusMeta, value);
}

export function renderTaskType(value?: string): ReactNode {
  return renderTag(taskTypeMeta, value);
}

export function renderTaskStatus(value?: string): ReactNode {
  return renderTag(taskStatusMeta, value);
}

export function renderAuditAction(value?: string): ReactNode {
  return renderTag(auditActionMeta, value);
}

export function renderUserStatus(value?: string): ReactNode {
  return renderTag(userStatusMeta, value);
}
