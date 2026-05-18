import {
  DownOutlined,
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  RollbackOutlined,
  SearchOutlined,
  UpOutlined
} from "@ant-design/icons";
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

type EditableActionType = (typeof editableActionMetas)[number]["type"];

const editableActionTypeSet = new Set<EditableActionType>(editableActionMetas.map((meta) => meta.type));
const editableActionLabelMap = new Map<string, string>(editableActionMetas.map((meta) => [meta.type, meta.label]));

function getActionLabel(actionType: string): string {
  return editableActionLabelMap.get(actionType) ?? actionType;
}

function isEditableActionType(actionType: string): actionType is EditableActionType {
  return editableActionTypeSet.has(actionType as EditableActionType);
}

function buildInitialEnabledActionOrder(item?: TemplateItem | null): EditableActionType[] {
  if (!item) {
    return ["DEPLOY"];
  }

  const orderedActionTypes = item.actions
    .filter((action): action is TemplateItem["actions"][number] & { actionType: EditableActionType } => isEditableActionType(action.actionType))
    .map((action) => action.actionType);

  return Array.from(new Set(orderedActionTypes));
}

function syncEnabledActionOrder(
  currentOrder: EditableActionType[],
  actionValues: Record<string, TemplateActionFormValue> | undefined
): EditableActionType[] {
  const enabledTypes = editableActionMetas
    .filter((meta) => actionValues?.[meta.type]?.enabled)
    .map((meta) => meta.type);
  const enabledTypeSet = new Set(enabledTypes);
  const nextOrder = currentOrder.filter((type) => enabledTypeSet.has(type));

  for (const type of enabledTypes) {
    if (!nextOrder.includes(type)) {
      nextOrder.push(type);
    }
  }

  return nextOrder;
}

function moveActionType(
  order: EditableActionType[],
  actionType: EditableActionType,
  direction: "up" | "down"
): EditableActionType[] {
  const index = order.indexOf(actionType);
  if (index < 0) {
    return order;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= order.length) {
    return order;
  }

  const nextOrder = [...order];
  [nextOrder[index], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[index]];
  return nextOrder;
}

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
    if (!isEditableActionType(action.actionType)) {
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
  actionValues: Record<string, TemplateActionFormValue> | undefined,
  enabledActionOrder: EditableActionType[]
): TemplateActionPayload[] {
  const builtEditableActions = new Map<string, TemplateActionPayload>();
  for (const meta of editableActionMetas) {
    const payload = buildActionPayload(meta.type, actionValues?.[meta.type]);
    if (payload) {
      builtEditableActions.set(meta.type, payload);
    }
  }

  const orderedEditableActions = enabledActionOrder.flatMap((type) => {
    const payload = builtEditableActions.get(type);
    return payload ? [payload] : [];
  });

  if (!item || item.actions.length === 0) {
    return orderedEditableActions.map((action, index) => ({
      ...action,
      executionOrder: index + 1
    }));
  }

  const nextActions: TemplateActionPayload[] = [];
  let orderedEditableActionIndex = 0;

  for (const action of item.actions) {
    if (!isEditableActionType(action.actionType)) {
      nextActions.push({
        actionType: action.actionType,
        mode: action.mode,
        scriptBody: action.scriptBody,
        stepDefinition: action.stepDefinition
      });
      continue;
    }

    const payload = orderedEditableActions[orderedEditableActionIndex];
    if (payload) {
      nextActions.push(payload);
      orderedEditableActionIndex += 1;
    }
  }

  while (orderedEditableActionIndex < orderedEditableActions.length) {
    nextActions.push(orderedEditableActions[orderedEditableActionIndex]);
    orderedEditableActionIndex += 1;
  }

  return nextActions.map((action, index) => ({
    ...action,
    executionOrder: index + 1
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
  const [enabledActionOrder, setEnabledActionOrder] = useState<EditableActionType[]>([]);
  const [form] = Form.useForm<TemplateFormValues>();
  const watchedActions = Form.useWatch("actions", form);

  useEffect(() => {
    setLoading(true);
    void fetchTemplates(recordStatusFilter)
      .then((data) => setItems(data))
      .finally(() => setLoading(false));
  }, [recordStatusFilter]);

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }

    setEnabledActionOrder((currentOrder) => syncEnabledActionOrder(currentOrder, watchedActions));
  }, [drawerOpen, watchedActions]);

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
    const nextActionValues = buildActionFormValues();
    form.setFieldsValue({
      actions: nextActionValues
    });
    setEnabledActionOrder(buildInitialEnabledActionOrder());
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: TemplateItem) => {
    setDrawerMode("edit");
    setEditingItem(item);
    const nextActionValues = buildActionFormValues(item);
    form.setFieldsValue({
      name: item.name,
      productCode: item.productCode,
      supportedReleaseSources: item.supportedReleaseSources,
      defaultWorkDir: item.defaultWorkDir,
      defaultConfigText: formatJsonObjectInput(item.defaultConfig),
      description: item.description,
      actions: nextActionValues
    });
    setEnabledActionOrder(buildInitialEnabledActionOrder(item));
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerMode("create");
    setEditingItem(null);
    setEnabledActionOrder([]);
    form.resetFields();
  };

  const handleSubmit = async (values: TemplateFormValues) => {
    const nextEnabledActionOrder = syncEnabledActionOrder(enabledActionOrder, values.actions);
    const payload: TemplateUpdatePayload = {
      name: values.name,
      productCode: values.productCode,
      supportedReleaseSources: values.supportedReleaseSources,
      defaultWorkDir: values.defaultWorkDir,
      defaultConfig: parseJsonObjectInput(values.defaultConfigText),
      description: values.description,
      actions: buildTemplateActions(editingItem, values.actions, nextEnabledActionOrder)
    };

    setSubmitting(true);
    try {
      setEnabledActionOrder(nextEnabledActionOrder);
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
  const enabledActionTypes = enabledActionOrder.filter((type) => watchedActions?.[type]?.enabled);

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
              title: "动作顺序",
              key: "actions",
              render: (_, record) =>
                record.actions.length === 0 ? (
                  renderNullable(undefined)
                ) : (
                  <Space size={4} wrap>
                    {record.actions.map((action, index) => (
                      <span key={action.id ?? `${action.actionType}-${index}`}>{`${index + 1}.${getActionLabel(action.actionType)}`}</span>
                    ))}
                  </Space>
                )
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
          <Form.Item label="启用动作">
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              {editableActionMetas.map((meta) => (
                <Form.Item key={meta.type} name={["actions", meta.type, "enabled"]} valuePropName="checked" noStyle>
                  <Checkbox>{`启用${meta.label}动作`}</Checkbox>
                </Form.Item>
              ))}
            </Space>
          </Form.Item>
          {enabledActionTypes.length > 0 ? (
            <Form.Item label="动作执行顺序">
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                {enabledActionTypes.map((actionType, index) => {
                  const meta = editableActionMetas.find((currentMeta) => currentMeta.type === actionType);
                  if (!meta) {
                    return null;
                  }

                  return (
                    <div
                      key={meta.type}
                      style={{
                        border: "1px solid #d9d9d9",
                        borderRadius: 8,
                        padding: 16
                      }}
                    >
                      <Space direction="vertical" size={12} style={{ width: "100%" }}>
                        <Space style={{ justifyContent: "space-between", width: "100%" }} align="start">
                          <strong>{`${index + 1}. ${meta.label}`}</strong>
                          <Space size={8}>
                            <Button
                              aria-label={`上移${meta.label}动作`}
                              title={`上移${meta.label}动作`}
                              icon={<UpOutlined />}
                              size="small"
                              disabled={index === 0}
                              onClick={() => setEnabledActionOrder((currentOrder) => moveActionType(currentOrder, meta.type, "up"))}
                            />
                            <Button
                              aria-label={`下移${meta.label}动作`}
                              title={`下移${meta.label}动作`}
                              icon={<DownOutlined />}
                              size="small"
                              disabled={index === enabledActionTypes.length - 1}
                              onClick={() =>
                                setEnabledActionOrder((currentOrder) => moveActionType(currentOrder, meta.type, "down"))
                              }
                            />
                          </Space>
                        </Space>
                        <Form.Item label={`${meta.label}动作模式`} name={["actions", meta.type, "mode"]}>
                          <Segmented
                            aria-label={`${meta.label}动作模式`}
                            options={[
                              { label: "脚本", value: "SCRIPT" },
                              { label: "步骤", value: "STEP" }
                            ]}
                          />
                        </Form.Item>
                        <Form.Item shouldUpdate noStyle>
                          {({ getFieldValue }) => {
                            const mode = getFieldValue(["actions", meta.type, "mode"]) ?? "SCRIPT";

                            return mode === "STEP" ? (
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
                            );
                          }}
                        </Form.Item>
                      </Space>
                    </div>
                  );
                })}
              </Space>
            </Form.Item>
          ) : null}
          <Form.Item label="说明" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
