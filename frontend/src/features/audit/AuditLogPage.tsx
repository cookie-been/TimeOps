import { Button, Drawer, Input, Select, Space, Table, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { exportAuditLogs, fetchAuditLogs } from "../../shared/api/client";
import { DataSection } from "../../shared/components/DataSection";
import { PageHeader } from "../../shared/components/PageHeader";
import { mockAuditLogs } from "../../shared/mock-data";
import { renderCode, renderNullable } from "../../shared/presentation";
import type { AuditLogItem } from "../../shared/types";

const actionTypeOptions = [
  { value: "DEPLOY", label: "部署" },
  { value: "RESTART", label: "重启" },
  { value: "ADHOC_COMMAND", label: "高风险命令" },
  { value: "USER_CREATED", label: "新增账号" },
  { value: "USER_ROLE_UPDATED", label: "角色变更" },
  { value: "USER_STATUS_UPDATED", label: "状态变更" }
];

export function AuditLogPage() {
  const [items, setItems] = useState<AuditLogItem[]>(mockAuditLogs);
  const [detailItem, setDetailItem] = useState<AuditLogItem | null>(null);
  const [filters, setFilters] = useState<{ actionType?: string; keyword: string }>({ keyword: "" });

  useEffect(() => {
    void fetchAuditLogs().then(setItems);
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    return items.filter((item) => {
      if (filters.actionType && item.actionType !== filters.actionType) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      const detailText = JSON.stringify(item.detail).toLowerCase();
      return (
        item.targetId.toLowerCase().includes(keyword) ||
        item.actionType.toLowerCase().includes(keyword) ||
        (item.actorName ?? "").toLowerCase().includes(keyword) ||
        detailText.includes(keyword)
      );
    });
  }, [filters.actionType, filters.keyword, items]);

  const handleExport = async () => {
    try {
      await exportAuditLogs(filteredItems);
      message.success(`已导出 ${filteredItems.length} 条审计记录`);
    } catch {
      message.error("审计导出失败");
    }
  };

  return (
    <>
      <PageHeader
        title="审计日志"
        subtitle="记录部署、更新、重启与高风险命令的完整审计链路。"
        extra={
          <Space>
            <Button aria-label="导出" onClick={() => void handleExport()}>
              导出
            </Button>
            <Button type="primary">高级检索</Button>
          </Space>
        }
        stats={[
          { label: "审计记录", value: String(items.length || 0) },
          { label: "高风险动作", value: String(items.filter((item) => item.actionType === "ADHOC_COMMAND").length || 0) }
        ]}
      />
      <DataSection
        toolbar={
          <Space wrap>
            <div aria-label="动作类型">
              <Select
                allowClear
                placeholder="动作类型"
                style={{ width: 180 }}
                value={filters.actionType}
                onChange={(value) => setFilters((current) => ({ ...current, actionType: value }))}
                options={actionTypeOptions}
              />
            </div>
            <Input.Search
              placeholder="搜索目标标识、操作人或审计明细"
              style={{ width: 320 }}
              value={filters.keyword}
              onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
            />
          </Space>
        }
      >
        <Table<AuditLogItem>
          className="timeops-table"
          rowKey="id"
          dataSource={filteredItems}
          scroll={{ x: "max-content" }}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: "时间", dataIndex: "createdAt", key: "createdAt", render: renderNullable },
            { title: "操作人", dataIndex: "actorName", key: "actorName", render: renderNullable },
            {
              title: "动作类型",
              dataIndex: "actionType",
              key: "actionType",
              render: renderCode
            },
            { title: "目标类型", dataIndex: "targetType", key: "targetType", render: renderNullable },
            { title: "目标标识", dataIndex: "targetId", key: "targetId", render: renderCode },
            { title: "关联任务", dataIndex: "taskId", key: "taskId", render: renderNullable },
            {
              title: "操作",
              key: "actions",
              render: (_, record) => (
                <Button size="small" onClick={() => setDetailItem(record)}>
                  查看详情
                </Button>
              )
            }
          ]}
        />
      </DataSection>
      <Drawer
        title={detailItem ? `审计详情 ${detailItem.id}` : "审计详情"}
        open={Boolean(detailItem)}
        width="min(560px, 100vw)"
        onClose={() => setDetailItem(null)}
      >
        <Typography.Paragraph type="secondary">基础信息</Typography.Paragraph>
        <pre className="timeops-log-block">
          {JSON.stringify(
            {
              actorName: detailItem?.actorName,
              actionType: detailItem?.actionType,
              targetType: detailItem?.targetType,
              targetId: detailItem?.targetId,
              taskId: detailItem?.taskId,
              createdAt: detailItem?.createdAt
            },
            null,
            2
          )}
        </pre>
        <Typography.Paragraph type="secondary">审计明细</Typography.Paragraph>
        <div className="timeops-log-block">
          {Object.entries(detailItem?.detail ?? {}).length > 0 ? (
            Object.entries(detailItem?.detail ?? {}).map(([key, value]) => (
              <div key={key} style={{ marginBottom: 8 }}>
                <Typography.Text strong>{key}</Typography.Text>
                <div>{String(value)}</div>
              </div>
            ))
          ) : (
            <Typography.Text type="secondary">-</Typography.Text>
          )}
        </div>
      </Drawer>
    </>
  );
}
