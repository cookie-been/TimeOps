import { EditOutlined, InboxOutlined, PlusOutlined, RollbackOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Input, Segmented, Select, Space, Table, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  archiveRelease,
  createRelease,
  fetchReleases,
  fetchTemplates,
  restoreRelease,
  updateRelease
} from "../../shared/api/client";
import { DataSection } from "../../shared/components/DataSection";
import { PageHeader } from "../../shared/components/PageHeader";
import { mergeRecordInFilter, recordStatusFilterOptions } from "../../shared/record-status";
import { renderNullable, renderRecordStatus, renderReleaseSource } from "../../shared/presentation";
import type { RecordStatusFilter, ReleaseItem, ReleaseUpdatePayload, TemplateItem } from "../../shared/types";

interface ReleaseFormValues {
  templateId: string;
  versionLabel: string;
  sourceType: string;
  repositoryUrl?: string;
  gitRef?: string;
  packageUri?: string;
  changelog?: string;
}

type DrawerMode = "create" | "edit";

export function ReleaseListPage() {
  const [items, setItems] = useState<ReleaseItem[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("create");
  const [editingItem, setEditingItem] = useState<ReleaseItem | null>(null);
  const [recordStatusFilter, setRecordStatusFilter] = useState<RecordStatusFilter>("ACTIVE");
  const [keyword, setKeyword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<ReleaseFormValues>();
  const sourceType = Form.useWatch("sourceType", form);

  useEffect(() => {
    void fetchTemplates().then((data) => setTemplates(data));
  }, []);

  useEffect(() => {
    setLoading(true);
    void fetchReleases(recordStatusFilter)
      .then((data) => setItems(data))
      .finally(() => setLoading(false));
  }, [recordStatusFilter]);

  const templateMap = useMemo(() => new Map(templates.map((item) => [item.id, item.name])), [templates]);

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return items;
    }

    return items.filter((item) =>
      [item.versionLabel, item.sourceType, templateMap.get(item.templateId), item.changelog]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedKeyword))
    );
  }, [items, keyword, templateMap]);

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setEditingItem(null);
    form.setFieldsValue({ sourceType: "GIT" });
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: ReleaseItem) => {
    setDrawerMode("edit");
    setEditingItem(item);
    form.setFieldsValue({
      templateId: item.templateId,
      versionLabel: item.versionLabel,
      sourceType: item.sourceType,
      repositoryUrl: item.repositoryUrl,
      gitRef: item.gitRef,
      packageUri: item.packageUri,
      changelog: item.changelog
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerMode("create");
    setEditingItem(null);
    form.resetFields();
  };

  const handleSubmit = async (values: ReleaseFormValues) => {
    const payload: ReleaseUpdatePayload = {
      templateId: values.templateId,
      versionLabel: values.versionLabel,
      sourceType: values.sourceType,
      repositoryUrl: values.sourceType === "GIT" ? values.repositoryUrl : undefined,
      gitRef: values.sourceType === "GIT" ? values.gitRef : undefined,
      packageUri: values.sourceType === "PACKAGE" ? values.packageUri : undefined,
      changelog: values.changelog
    };

    setSubmitting(true);
    try {
      const nextItem =
        drawerMode === "edit" && editingItem
          ? await updateRelease(editingItem.id, payload)
          : await createRelease(payload);

      setItems((current) => mergeRecordInFilter(current, nextItem, recordStatusFilter));
      message.success(drawerMode === "edit" ? "版本已更新" : "版本已登记");
      closeDrawer();
    } catch {
      message.error(drawerMode === "edit" ? "版本更新失败" : "版本登记失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (item: ReleaseItem) => {
    try {
      const archivedItem = await archiveRelease(item.id);
      setItems((current) => mergeRecordInFilter(current, archivedItem, recordStatusFilter));
      message.success("版本已归档");
    } catch {
      message.error("版本归档失败");
    }
  };

  const handleRestore = async (item: ReleaseItem) => {
    try {
      const restoredItem = await restoreRelease(item.id);
      setItems((current) => mergeRecordInFilter(current, restoredItem, recordStatusFilter));
      message.success("版本已恢复");
    } catch {
      message.error("版本恢复失败");
    }
  };

  const archivedCount = items.filter((item) => item.recordStatus === "ARCHIVED").length;
  const gitCount = items.filter((item) => item.sourceType === "GIT").length;

  return (
    <>
      <PageHeader
        title="发布版本"
        subtitle="管理 Git 与发布包来源的可交付版本记录。"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
            登记版本
          </Button>
        }
        stats={[
          { label: "当前列表", value: String(filteredItems.length) },
          { label: "Git 来源", value: String(gitCount) },
          { label: "已归档", value: String(archivedCount) }
        ]}
      />
      <DataSection
        toolbar={
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索版本号、模板或来源"
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
        <Table<ReleaseItem>
          className="timeops-table"
          rowKey="id"
          loading={loading}
          rowClassName={(record) => (record.recordStatus === "ARCHIVED" ? "timeops-row-archived" : "")}
          dataSource={filteredItems}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: "版本号", dataIndex: "versionLabel", key: "versionLabel" },
            {
              title: "来源类型",
              dataIndex: "sourceType",
              key: "sourceType",
              render: renderReleaseSource
            },
            {
              title: "模板",
              dataIndex: "templateId",
              key: "templateId",
              render: (templateId: string) => renderNullable(templateMap.get(templateId))
            },
            { title: "创建人", dataIndex: "createdBy", key: "createdBy", render: renderNullable },
            { title: "创建时间", dataIndex: "createdAt", key: "createdAt", render: renderNullable },
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
        title={drawerMode === "edit" ? "编辑发布版本" : "登记发布版本"}
        width={520}
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
        <Form<ReleaseFormValues> form={form} layout="vertical" initialValues={{ sourceType: "GIT" }} onFinish={handleSubmit}>
          <Form.Item label="所属模板" name="templateId" rules={[{ required: true, message: "请选择模板" }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={templates.map((template) => ({ value: template.id, label: template.name }))}
            />
          </Form.Item>
          <Form.Item label="版本号" name="versionLabel" rules={[{ required: true, message: "请输入版本号" }]}>
            <Input placeholder="例如 v1.0.0" />
          </Form.Item>
          <Form.Item label="来源类型" name="sourceType" rules={[{ required: true, message: "请选择来源类型" }]}>
            <Select options={[{ value: "GIT", label: "Git" }, { value: "PACKAGE", label: "发布包" }]} />
          </Form.Item>
          {sourceType === "PACKAGE" ? (
            <Form.Item label="发布包地址" name="packageUri" rules={[{ required: true, message: "请输入发布包地址" }]}>
              <Input />
            </Form.Item>
          ) : (
            <>
              <Form.Item label="仓库地址" name="repositoryUrl" rules={[{ required: true, message: "请输入仓库地址" }]}>
                <Input />
              </Form.Item>
              <Form.Item label="Git 引用" name="gitRef" rules={[{ required: true, message: "请输入 Git 引用" }]}>
                <Input placeholder="例如 refs/tags/v1.0.0" />
              </Form.Item>
            </>
          )}
          <Form.Item label="变更说明" name="changelog">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
