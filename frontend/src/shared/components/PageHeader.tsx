import { Space, Typography } from "antd";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  extra?: ReactNode;
  stats?: Array<{ label: string; value: string }>;
}

export function PageHeader({ title, subtitle, extra, stats }: PageHeaderProps) {
  return (
    <div className="timeops-page-header">
      <div className="timeops-page-header-main">
        <Typography.Text className="timeops-page-header-eyebrow">运营控制台</Typography.Text>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ margin: "10px 0 0" }}>
          {subtitle}
        </Typography.Paragraph>
      </div>
      <Space className="timeops-page-header-side" direction="vertical" size={12} align="end">
        {extra}
        {stats && stats.length > 0 ? (
          <div className="timeops-page-header-meta">
            {stats.map((stat) => (
              <div className="timeops-page-header-stat" key={stat.label}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {stat.label}
                </Typography.Text>
                <Typography.Title level={4} style={{ margin: "4px 0 0" }}>
                  {stat.value}
                </Typography.Title>
              </div>
            ))}
          </div>
        ) : null}
      </Space>
    </div>
  );
}
