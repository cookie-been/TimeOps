import { EditOutlined, InboxOutlined, PlusOutlined, RollbackOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Checkbox, Drawer, Form, Input, Segmented, Select, Space, Table, message } from "antd";
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
  actions?: Record<string, TemplateActionFormValue>;
}

type DrawerMode = "create" | "edit";

interface TemplateActionFormValue {
  enabled?: boolean;
  mode?: string;
  scriptBody?: string;
  stepDefinitionText?: string;
}

const editableActionMetas = [
  { type: "DEPLOY", label: "部署" },
  { type: "UPDATE", label: "更新" },
  { type: "BACKUP", label: "备份" },
  { type: "ROLLBACK", label: "回滚" },
  { type: "VERIFY", label: "验证" },
  { type: "RESTART", label: "重启" }
] as const;

const editableActionTypeSet = new Set<string>(editableActionMetas.map((meta) => meta.type));

function buildActionFormValues(item?: TemplateItem | null): Record<string, TemplateActionFormValue> {
  const values = Object.fromEntries(
    editableActionMetas.map((meta) => [
      meta.type,
      {
        enabled: meta.type === "DEPLOY",
        mode: "SCRIPT",
        scriptBody: "",
        stepDefinitionText: ""
      }
    ])
  ) as Record<string, TemplateActionFormValue>;

  if (!item) {
    return values;
  }

  for (const action of item.actions) {
    if (!editableActionTypeSet.has(action.actionType)) {
      continue;
    }
    values[action.actionType] = {
      enabled: true,
      mode: action.mode,
      scriptBody: action.scriptBody ?? "",
      stepDefinitionText: formatJsonObjectInput(action.stepDefinition)
    };
  }

  return values;
}

function buildActionPayload(
  actionType: string,
  value: TemplateActionFormValue | undefined
): TemplateActionPayload | null {
  if (!value?.enabled) {
    return null;
  }

  const mode = value.mode === "STEP" ? "STEP" : "SCRIPT";
  return mode === "STEP"
    ? {
        actionType,
        mode,
        stepDefinition: parseJsonObjectInput(value.stepDefinitionText)
      }
    : {
        actionType,
        mode,
        scriptBody: value.scriptBody
      };
}

function buildTemplateActions(
  item: TemplateItem | null,
  actionValues: Record<string, TemplateActionFormValue> | undefined
): TemplateActionPayload[] {
  const builtEditableActions = new Map<string, TemplateActionPayload>();
  for (const meta of editableActionMetas) {
    const payload = buildActionPayload(meta.type, actionValues?.[meta.type]);
    if (payload) {
      builtEditableActions.set(meta.type, payload);
    }
  }

  if (!item || item.actions.length === 0) {
    return editableActionMetas.flatMap((meta) => {
      const payload = builtEditableActions.get(meta.type);
      return payload ? [payload] : [];
    });
  }

  const nextActions: TemplateActionPayload[] = [];
  const consumedActionTypes = new Set<string>();

  for (const action of item.actions) {
    if (!editableActionTypeSet.has(action.actionType)) {
      nextActions.push({
        actionType: action.actionType,
        mode: action.mode,
        scriptBody: action.scriptBody,
        stepDefinition: action.stepDefinition
      });
      continue;
    }

    consumedActionTypes.add(action.actionType);
    const payload = builtEditableActions.get(action.actionType);
    if (payload) {
      nextActions.push(payload);
    }
  }

  for (const meta of editableActionMetas) {
    const payload = builtEditableActions.get(meta.type);
    if (payload && !consumedActionTypes.has(meta.type)) {
      nextActions.push(payload);
    }
  }

  return nextActions;
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
    form.setFieldsValue({
      actions: buildActionFormValues()
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: TemplateItem) => {
    setDrawerMode("edit");
    setEditingItem(item);
    form.setFieldsValue({
      name: item.name,
      productCode: item.productCode,
      supportedReleaseSources: item.supportedReleaseSources,
      defaultWorkDir: item.defaultWorkDir,
      defaultConfigText: formatJsonObjectInput(item.defaultConfig),
      description: item.description,
      actions: buildActionFormValues(item)
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
    const payload: TemplateUpdatePayload = {
      name: values.name,
      productCode: values.productCode,
      supportedReleaseSources: values.supportedReleaseSources,
      defaultWorkDir: values.defaultWorkDir,
      defaultConfig: parseJsonObjectInput(values.defaultConfigText),
      description: values.description,
      actions: buildTemplateActions(editingItem, values.actions)
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
        subtitle="定义标准交付动作、默认目录与版本来源约束。"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
            新增模板
          </Button>
        }
        stats={[
          { label: "当前列表", value: String(filteredItems.length) },
          { label: "模板动作", value: String(actionCount) },
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
          {editableActionMetas.map((meta) => (
            <div key={meta.type}>
              <Form.Item name={["actions", meta.type, "enabled"]} valuePropName="checked">
                <Checkbox>{`启用${meta.label}动作`}</Checkbox>
              </Form.Item>
              <Form.Item shouldUpdate noStyle>
                {({ getFieldValue }) => {
                  const enabled = getFieldValue(["actions", meta.type, "enabled"]);
                  const mode = getFieldValue(["actions", meta.type, "mode"]) ?? "SCRIPT";

                  if (!enabled) {
                    return null;
                  }

                  return (
                    <>
                      <Form.Item label={`${meta.label}动作模式`} name={["actions", meta.type, "mode"]}>
                        <Segmented
                          aria-label={`${meta.label}动作模式`}
                          options={[
                            { label: "脚本", value: "SCRIPT" },
                            { label: "步骤", value: "STEP" }
                          ]}
                        />
                      </Form.Item>
                      {mode === "STEP" ? (
                        <Form.Item
                          label={`${meta.label}步骤定义(JSON)`}
                          name={["actions", meta.type, "stepDefinitionText"]}
                          rules={[{ required: true, message: `请输入${meta.label}步骤定义 JSON` }]}
                        >
                          <Input.TextArea
                            rows={6}
                            placeholder={`{"script":"./ops/${meta.type.toLowerCase()}.sh","useMergedConfigEnv":true}`}
                          />
                        </Form.Item>
                      ) : (
                        <Form.Item
                          label={`${meta.label}脚本`}
                          name={["actions", meta.type, "scriptBody"]}
                          rules={[{ required: true, message: `请输入${meta.label}脚本` }]}
                        >
                          <Input.TextArea rows={5} />
                        </Form.Item>
                      )}
                    </>
                  );
                }}
              </Form.Item>
            </div>
          ))}
          <Form.Item label="说明" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
