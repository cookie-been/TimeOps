import { Typography } from "antd";

interface ConfigPreviewProps {
  value?: Record<string, unknown>;
  emptyText?: string;
}

function renderConfigValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function ConfigPreview({ value, emptyText = "暂无配置" }: ConfigPreviewProps) {
  const entries = Object.entries(value ?? {});
  if (entries.length === 0) {
    return <Typography.Text type="secondary">{emptyText}</Typography.Text>;
  }

  return (
    <div className="timeops-config-preview">
      {entries.map(([key, currentValue]) => (
        <div key={key} className="timeops-config-preview-row">
          <span className="timeops-config-preview-key">{key}</span>
          <span className="timeops-code-pill">{renderConfigValue(currentValue)}</span>
        </div>
      ))}
    </div>
  );
}
