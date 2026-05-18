import { EditOutlined, InboxOutlined, PlusOutlined, RollbackOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Input, Segmented, Select, Space, Table, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  archiveTemplate,
  createTemplate,
  fetchTemplates,
  restoreTemplate,
  updateTemplate
} from "../../shared/api/client";
import { DataSection } from "../../shared/components/DataSection";
import { PageHeader } from "../../shared/components/PageHeader";
import { formatJsonObjectInput, parseJsonObjectInput } from "../../shared/json";
import { mergeRecordInFilter, recordStatusFilterOptions } from "../../shared/record-status";
import { renderCode, renderNullable, renderRecordStatus, renderReleaseSource } from "../../shared/presentation";
import type {
  RecordStatusFilter,
  TemplateActionPayload,
  TemplateItem,
  TemplateUpdatePayload
} from "../../shared/types";

interface TemplateFormValues {
  name: string;
  productCode: string;
  supportedReleaseSources: string[];
  defaultWorkDir?: string;
  defaultConfigText?: string;
  description?: string;
  deployActionMode: string;
  deployScript?: string;
  deployStepDefinitionText?: string;
}

type DrawerMode = "create" | "edit";

function buildTemplateActions(
  item: TemplateItem | null,
  deployActionMode: string,
  deployScript: string | undefined,
  deployStepDefinition: Record<string, unknown> | undefined
): TemplateActionPayload[] {
  if (!item || item.actions.length === 0) {
    return [
      deployActionMode === "STEP"
        ? {
            actionType: "DEPLOY",
            mode: "STEP",
            stepDefinition: deployStepDefinition
          }
        : {
            actionType: "DEPLOY",
            mode: "SCRIPT",
            scriptBody: deployScript
          }
    ];
  }

  return item.actions.map((action) => ({
    actionType: action.actionType,
    mode: action.actionType === "DEPLOY" ? deployActionMode : action.mode,
    scriptBody:
      action.actionType === "DEPLOY"
        ? deployActionMode === "SCRIPT"
          ? deployScript
          : undefined
        : action.scriptBody,
    stepDefinition:
      action.actionType === "DEPLOY"
        ? deployActionMode === "STEP"
          ? deployStepDefinition
          : undefined
        : action.stepDefinition
  }));
}

export function TemplateListPage() {
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("create");
  const [editingItem, setEditingItem] = useState<TemplateItem | null>(null);
  const [recordStatusFilter, setRecordStatusFilter] = useState<RecordStatusFilter>("ACTIVE");
  const [keyword, setKeyword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<TemplateFormValues>();

  useEffect(() => {
    setLoading(true);
    void fetchTemplates(recordStatusFilter)
      .then((data) => setItems(data))
      .finally(() => setLoading(false));
  }, [recordStatusFilter]);

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return items;
    }

    return items.filter((item) =>
      [item.name, item.productCode, item.description]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedKeyword))
    );
  }, [items, keyword]);

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setEditingItem(null);
    form.resetFields();
    form.setFieldValue("deployActionMode", "SCRIPT");
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: TemplateItem) => {
    const deployAction = item.actions.find((action) => action.actionType === "DEPLOY");

    setDrawerMode("edit");
    setEditingItem(item);
    form.setFieldsValue({
      name: item.name,
      productCode: item.productCode,
      supportedReleaseSources: item.supportedReleaseSources,
      defaultWorkDir: item.defaultWorkDir,
      defaultConfigText: formatJsonObjectInput(item.defaultConfig),
      description: item.description,
      deployActionMode: deployAction?.mode ?? "SCRIPT",
      deployScript: deployAction?.scriptBody ?? "",
      deployStepDefinitionText: formatJsonObjectInput(deployAction?.stepDefinition)
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerMode("create");
    setEditingItem(null);
    form.resetFields();
  };

  const handleSubmit = async (values: TemplateFormValues) => {
    const deployStepDefinition = parseJsonObjectInput(values.deployStepDefinitionText);
    const payload: TemplateUpdatePayload = {
      name: values.name,
      productCode: values.productCode,
      supportedReleaseSources: values.supportedReleaseSources,
      defaultWorkDir: values.defaultWorkDir,
      defaultConfig: parseJsonObjectInput(values.defaultConfigText),
      description: values.description,
      actions: buildTemplateActions(
        editingItem,
        values.deployActionMode,
        values.deployScript,
        deployStepDefinition
      )
    };

    setSubmitting(true);
    try {
      const nextItem =
        drawerMode === "edit" && editingItem
          ? await updateTemplate(editingItem.id, payload)
          : await createTemplate(payload);

      setItems((current) => mergeRecordInFilter(current, nextItem, recordStatusFilter));
      message.success(drawerMode === "edit" ? "模板已更新" : "模板已创建");
      closeDrawer();
    } catch {
      message.error(drawerMode === "edit" ? "模板更新失败，请检查 JSON 配置" : "模板创建失败，请检查 JSON 配置");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (item: TemplateItem) => {
    try {
      const archivedItem = await archiveTemplate(item.id);
      setItems((current) => mergeRecordInFilter(current, archivedItem, recordStatusFilter));
      message.success("模板已归档");
    } catch {
      message.error("模板归档失败");
    }
  };

  const handleRestore = async (item: TemplateItem) => {
    try {
      const restoredItem = await restoreTemplate(item.id);
      setItems((current) => mergeRecordInFilter(current, restoredItem, recordStatusFilter));
      message.success("模板已恢复");
    } catch {
      message.error("模板恢复失败");
    }
  };

  const archivedCount = items.filter((item) => item.recordStatus === "ARCHIVED").length;
  const actionCount = items.reduce((total, item) => total + item.actions.length, 0);

  return (
    <>
      <PageHeader
        title="产品模板"
        subtitle="定义标准部署动作、默认目录与版本来源约束。"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
            新增模板
          </Button>
        }
        stats={[
          { label: "当前列表", value: String(filteredItems.length) },
          { label: "脚本动作", value: String(actionCount) },
          { label: "已归档", value: String(archivedCount) }
        ]}
      />
      <DataSection
        toolbar={
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索模板名称、产品编码"
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
        <Table<TemplateItem>
          className="timeops-table"
          rowKey="id"
          loading={loading}
          rowClassName={(record) => (record.recordStatus === "ARCHIVED" ? "timeops-row-archived" : "")}
          dataSource={filteredItems}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: "模板名称", dataIndex: "name", key: "name" },
            { title: "产品编码", dataIndex: "productCode", key: "productCode", render: renderCode },
            {
              title: "发布来源",
              dataIndex: "supportedReleaseSources",
              key: "supportedReleaseSources",
              render: (sources: string[]) => (
                <Space wrap>{sources.map((source) => <span key={source}>{renderReleaseSource(source)}</span>)}</Space>
              )
            },
            { title: "默认目录", dataIndex: "defaultWorkDir", key: "defaultWorkDir", render: renderNullable },
            {
              title: "动作数量",
              key: "actions",
              render: (_, record) => record.actions.length
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
        title={drawerMode === "edit" ? "编辑产品模板" : "新增产品模板"}
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
        <Form<TemplateFormValues> form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="模板名称" name="name" rules={[{ required: true, message: "请输入模板名称" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="产品编码" name="productCode" rules={[{ required: true, message: "请输入产品编码" }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label="发布来源"
            name="supportedReleaseSources"
            rules={[{ required: true, message: "请选择发布来源" }]}
          >
            <Select
              mode="multiple"
              options={[
                { value: "GIT", label: "Git" },
                { value: "PACKAGE", label: "发布包" }
              ]}
            />
          </Form.Item>
          <Form.Item label="默认目录" name="defaultWorkDir">
            <Input />
          </Form.Item>
          <Form.Item label="默认配置(JSON)" name="defaultConfigText">
            <Input.TextArea rows={4} placeholder='{"APP_PORT":"8080"}' />
          </Form.Item>
          <Form.Item label="部署动作模式" name="deployActionMode" initialValue="SCRIPT">
            <Segmented
              options={[
                { label: "脚本", value: "SCRIPT" },
                { label: "步骤", value: "STEP" }
              ]}
            />
          </Form.Item>
          <Form.Item shouldUpdate={(prev, next) => prev.deployActionMode !== next.deployActionMode} noStyle>
            {({ getFieldValue }) =>
              getFieldValue("deployActionMode") === "STEP" ? (
                <Form.Item
                  label="步骤定义(JSON)"
                  name="deployStepDefinitionText"
                  rules={[{ required: true, message: "请输入步骤定义 JSON" }]}
                >
                  <Input.TextArea
                    rows={6}
                    placeholder='{"script":"./ops/deploy.sh","useMergedConfigEnv":true}'
                  />
                </Form.Item>
              ) : (
                <Form.Item
                  label="部署脚本"
                  name="deployScript"
                  rules={[{ required: true, message: "请输入部署脚本" }]}
                >
                  <Input.TextArea rows={5} />
                </Form.Item>
              )
            }
          </Form.Item>
          <Form.Item label="说明" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
