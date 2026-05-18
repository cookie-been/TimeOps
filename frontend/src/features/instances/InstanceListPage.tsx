import { EditOutlined, InboxOutlined, PlusOutlined, RollbackOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Input, Segmented, Select, Space, Table, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  archiveInstance,
  createInstance,
  fetchCustomers,
  fetchInstances,
  fetchServers,
  fetchTemplates,
  restoreInstance,
  updateInstance
} from "../../shared/api/client";
import { DataSection } from "../../shared/components/DataSection";
import { PageHeader } from "../../shared/components/PageHeader";
import { formatJsonObjectInput, parseJsonObjectInput } from "../../shared/json";
import { mergeRecordInFilter, recordStatusFilterOptions } from "../../shared/record-status";
import { renderInstanceStatus, renderNullable, renderRecordStatus } from "../../shared/presentation";
import type {
  CustomerItem,
  InstanceItem,
  InstanceUpdatePayload,
  RecordStatusFilter,
  ServerItem,
  TemplateItem
} from "../../shared/types";

interface InstanceFormValues {
  customerId: string;
  templateId: string;
  primaryServerId: string;
  instanceName: string;
  environmentLabel: string;
  configOverrideText?: string;
  notes?: string;
}

type DrawerMode = "create" | "edit";

export function InstanceListPage() {
  const [items, setItems] = useState<InstanceItem[]>([]);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("create");
  const [editingItem, setEditingItem] = useState<InstanceItem | null>(null);
  const [recordStatusFilter, setRecordStatusFilter] = useState<RecordStatusFilter>("ACTIVE");
  const [keyword, setKeyword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<InstanceFormValues>();

  useEffect(() => {
    void Promise.all([fetchCustomers(), fetchTemplates(), fetchServers()]).then(([customerData, templateData, serverData]) => {
      setCustomers(customerData);
      setTemplates(templateData);
      setServers(serverData);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    void fetchInstances(recordStatusFilter)
      .then((data) => setItems(data))
      .finally(() => setLoading(false));
  }, [recordStatusFilter]);

  const customerMap = useMemo(() => new Map(customers.map((item) => [item.id, item.name])), [customers]);
  const templateMap = useMemo(() => new Map(templates.map((item) => [item.id, item.name])), [templates]);
  const serverMap = useMemo(() => new Map(servers.map((item) => [item.id, item.host])), [servers]);

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return items;
    }

    return items.filter((item) =>
      [item.instanceName, item.environmentLabel, customerMap.get(item.customerId), templateMap.get(item.templateId)]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedKeyword))
    );
  }, [customerMap, items, keyword, templateMap]);

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setEditingItem(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: InstanceItem) => {
    setDrawerMode("edit");
    setEditingItem(item);
    form.setFieldsValue({
      customerId: item.customerId,
      templateId: item.templateId,
      primaryServerId: item.primaryServerId,
      instanceName: item.instanceName,
      environmentLabel: item.environmentLabel,
      configOverrideText: formatJsonObjectInput(item.configOverride),
      notes: item.notes
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerMode("create");
    setEditingItem(null);
    form.resetFields();
  };

  const handleSubmit = async (values: InstanceFormValues) => {
    const payload: InstanceUpdatePayload = {
      customerId: values.customerId,
      templateId: values.templateId,
      primaryServerId: values.primaryServerId,
      instanceName: values.instanceName,
      environmentLabel: values.environmentLabel,
      configOverride: parseJsonObjectInput(values.configOverrideText),
      notes: values.notes
    };

    setSubmitting(true);
    try {
      const nextItem =
        drawerMode === "edit" && editingItem
          ? await updateInstance(editingItem.id, payload)
          : await createInstance(payload);

      setItems((current) => mergeRecordInFilter(current, nextItem, recordStatusFilter));
      message.success(drawerMode === "edit" ? "实例已更新" : "实例已创建");
      closeDrawer();
    } catch {
      message.error(drawerMode === "edit" ? "实例更新失败，请检查 JSON 配置" : "实例创建失败，请检查 JSON 配置");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (item: InstanceItem) => {
    try {
      const archivedItem = await archiveInstance(item.id);
      setItems((current) => mergeRecordInFilter(current, archivedItem, recordStatusFilter));
      message.success("实例已归档");
    } catch {
      message.error("实例归档失败");
    }
  };

  const handleRestore = async (item: InstanceItem) => {
    try {
      const restoredItem = await restoreInstance(item.id);
      setItems((current) => mergeRecordInFilter(current, restoredItem, recordStatusFilter));
      message.success("实例已恢复");
    } catch {
      message.error("实例恢复失败");
    }
  };

  const archivedCount = items.filter((item) => item.recordStatus === "ARCHIVED").length;
  const runningCount = items.filter((item) => item.status === "RUNNING").length;

  return (
    <>
      <PageHeader
        title="部署实例"
        subtitle="围绕客户、模板、主机和当前版本形成标准化运维对象。"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
            创建实例
          </Button>
        }
        stats={[
          { label: "当前列表", value: String(filteredItems.length) },
          { label: "运行中", value: String(runningCount) },
          { label: "已归档", value: String(archivedCount) }
        ]}
      />
      <DataSection
        toolbar={
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索实例、环境或客户"
              style={{ width: 320 }}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <Segmented<RecordStatusFilter>
              value={recordStatusFilter}
              options={recordStatusFilterOptions}
              onChange={(value) => setRecordStatusFilter(value)}
            />
          </Space>
        }
      >
        <Table<InstanceItem>
          className="timeops-table"
          rowKey="id"
          loading={loading}
          rowClassName={(record) => (record.recordStatus === "ARCHIVED" ? "timeops-row-archived" : "")}
          dataSource={filteredItems}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: "实例名称", dataIndex: "instanceName", key: "instanceName" },
            { title: "环境标识", dataIndex: "environmentLabel", key: "environmentLabel" },
            {
              title: "客户",
              dataIndex: "customerId",
              key: "customerId",
              render: (customerId: string) => renderNullable(customerMap.get(customerId))
            },
            {
              title: "模板",
              dataIndex: "templateId",
              key: "templateId",
              render: (templateId: string) => renderNullable(templateMap.get(templateId))
            },
            {
              title: "服务器",
              dataIndex: "primaryServerId",
              key: "primaryServerId",
              render: (serverId: string) => renderNullable(serverMap.get(serverId))
            },
            { title: "当前版本", dataIndex: "currentReleaseId", key: "currentReleaseId", render: renderNullable },
            {
              title: "运行状态",
              dataIndex: "status",
              key: "status",
              render: renderInstanceStatus
            },
            {
              title: "记录状态",
              dataIndex: "recordStatus",
              key: "recordStatus",
              render: renderRecordStatus
            },
            {
              title: "操作",
              key: "actions",
              render: (_, record) =>
                record.recordStatus === "ARCHIVED" ? (
                  <Button type="link" size="small" icon={<RollbackOutlined />} onClick={() => void handleRestore(record)}>
                    恢复
                  </Button>
                ) : (
                  <Space size={4}>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditDrawer(record)}>
                      编辑
                    </Button>
                    <Button type="link" size="small" icon={<InboxOutlined />} onClick={() => void handleArchive(record)}>
                      归档
                    </Button>
                  </Space>
                )
            }
          ]}
        />
      </DataSection>
      <Drawer
        title={drawerMode === "edit" ? "编辑部署实例" : "创建部署实例"}
        width={560}
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={closeDrawer}>取消</Button>
            <Button type="primary" loading={submitting} onClick={() => form.submit()}>
              {drawerMode === "edit" ? "保存" : "提交"}
            </Button>
          </Space>
        }
      >
        <Form<InstanceFormValues> form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="所属客户" name="customerId" rules={[{ required: true, message: "请选择客户" }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={customers.map((customer) => ({ value: customer.id, label: customer.name }))}
            />
          </Form.Item>
          <Form.Item label="产品模板" name="templateId" rules={[{ required: true, message: "请选择模板" }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={templates.map((template) => ({ value: template.id, label: template.name }))}
            />
          </Form.Item>
          <Form.Item label="主服务器" name="primaryServerId" rules={[{ required: true, message: "请选择服务器" }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={servers.map((server) => ({ value: server.id, label: server.host }))}
            />
          </Form.Item>
          <Form.Item label="实例名称" name="instanceName" rules={[{ required: true, message: "请输入实例名称" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="环境标识" name="environmentLabel" rules={[{ required: true, message: "请输入环境标识" }]}>
            <Input placeholder="例如 prod / pre / test" />
          </Form.Item>
          <Form.Item label="配置覆盖(JSON)" name="configOverrideText">
            <Input.TextArea rows={4} placeholder='{"DOMAIN":"app.example.com"}' />
          </Form.Item>
          <Form.Item label="备注" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
