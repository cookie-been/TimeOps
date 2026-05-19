import { Space, Tag, Typography } from "antd";
import { getTemplateActionLabel, getTemplateActionModeLabel } from "../template-actions";
import type { TemplateActionItem } from "../types";

interface TemplateActionTimelineProps {
  actions: TemplateActionItem[];
  emptyText?: string;
  showDetails?: boolean;
}

export function TemplateActionTimeline({
  actions,
  emptyText = "暂无动作",
  showDetails = false
}: TemplateActionTimelineProps) {
  if (actions.length === 0) {
    return <Typography.Text type="secondary">{emptyText}</Typography.Text>;
  }

  return (
    <div className="timeops-action-timeline">
      {actions.map((action, index) => (
        <div key={action.id ?? `${action.actionType}-${index}`} className="timeops-action-timeline-item">
          <Space wrap size={8}>
            <Tag bordered={false} color="blue">{`${index + 1}. ${getTemplateActionLabel(action.actionType)}`}</Tag>
            <Tag bordered={false}>{getTemplateActionModeLabel(action.mode)}</Tag>
          </Space>
          {showDetails ? (
            action.mode === "STEP" ? (
              <pre className="timeops-log-block">{JSON.stringify(action.stepDefinition ?? {}, null, 2)}</pre>
            ) : (
              <pre className="timeops-log-block">{action.scriptBody || "# 未配置脚本"}</pre>
            )
          ) : null}
        </div>
      ))}
    </div>
  );
}
