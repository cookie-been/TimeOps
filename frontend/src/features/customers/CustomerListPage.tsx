import { EditOutlined, InboxOutlined, PlusOutlined, RollbackOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Input, Segmented, Space, Table, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  archiveCustomer,
  createCustomer,
  fetchCustomers,
  restoreCustomer,
  updateCustomer
} from "../../shared/api/client";
import { DataSection } from "../../shared/components/DataSection";
import { PageHeader } from "../../shared/components/PageHeader";
import { mergeRecordInFilter, recordStatusFilterOptions } from "../../shared/record-status";
import { renderNullable, renderRecordStatus } from "../../shared/presentation";
import type { CustomerItem, CustomerUpdatePayload, RecordStatusFilter } from "../../shared/types";

interface CustomerFormValues {
  name: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
}

type DrawerMode = "create" | "edit";

export function CustomerListPage() {
  const [items, setItems] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("create");
  const [editingItem, setEditingItem] = useState<CustomerItem | null>(null);
  const [recordStatusFilter, setRecordStatusFilter] = useState<RecordStatusFilter>("ACTIVE");
  const [keyword, setKeyword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<CustomerFormValues>();

  useEffect(() => {
    setLoading(true);
    void fetchCustomers(recordStatusFilter)
      .then((data) => setItems(data))
      .finally(() => setLoading(false));
  }, [recordStatusFilter]);

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return items;
    }

    return items.filter((item) =>
      [item.name, item.contactName, item.contactPhone, item.contactEmail]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedKeyword))
    );
  }, [items, keyword]);

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setEditingItem(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: CustomerItem) => {
    setDrawerMode("edit");
    setEditingItem(item);
    form.setFieldsValue({
      name: item.name,
      contactName: item.contactName,
      contactPhone: item.contactPhone,
      contactEmail: item.contactEmail,
      notes: item.notes
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingItem(null);
    setDrawerMode("create");
    form.resetFields();
  };

  const handleSubmit = async (values: CustomerFormValues) => {
    const payload: CustomerUpdatePayload = {
      name: values.name,
      contactName: values.contactName,
      contactPhone: values.contactPhone,
      contactEmail: values.contactEmail,
      notes: values.notes
    };

    setSubmitting(true);
    try {
      const nextItem =
        drawerMode === "edit" && editingItem
          ? await updateCustomer(editingItem.id, payload)
          : await createCustomer(payload);

      setItems((current) => mergeRecordInFilter(current, nextItem, recordStatusFilter));
      message.success(drawerMode === "edit" ? "客户已更新" : "客户已创建");
      closeDrawer();
    } catch {
      message.error(drawerMode === "edit" ? "客户更新失败" : "客户创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (item: CustomerItem) => {
    try {
      const archivedItem = await archiveCustomer(item.id);
      setItems((current) => mergeRecordInFilter(current, archivedItem, recordStatusFilter));
      message.success("客户已归档");
    } catch {
      message.error("客户归档失败");
    }
  };

  const handleRestore = async (item: CustomerItem) => {
    try {
      const restoredItem = await restoreCustomer(item.id);
      setItems((current) => mergeRecordInFilter(current, restoredItem, recordStatusFilter));
      message.success("客户已恢复");
    } catch {
      message.error("客户恢复失败");
    }
  };

  const archivedCount = items.filter((item) => item.recordStatus === "ARCHIVED").length;
  const activeCount = items.filter((item) => item.recordStatus === "ACTIVE").length;

  return (
    <>
      <PageHeader
        title="客户管理"
        subtitle="统一维护客户档案、联系人信息与运维服务关系。"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
            新增客户
          </Button>
        }
        stats={[
          { label: "当前列表", value: String(filteredItems.length) },
          { label: "有效记录", value: String(activeCount) },
          { label: "已归档", value: String(archivedCount) }
        ]}
      />
      <DataSection
        toolbar={
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索客户名称、联系人或邮箱"
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
        <Table<CustomerItem>
          className="timeops-table"
          rowKey="id"
          loading={loading}
          rowClassName={(record) => (record.recordStatus === "ARCHIVED" ? "timeops-row-archived" : "")}
          dataSource={filteredItems}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: "客户名称", dataIndex: "name", key: "name" },
            { title: "联系人", dataIndex: "contactName", key: "contactName", render: renderNullable },
            { title: "联系电话", dataIndex: "contactPhone", key: "contactPhone", render: renderNullable },
            { title: "联系邮箱", dataIndex: "contactEmail", key: "contactEmail", render: renderNullable },
            {
              title: "记录状态",
              dataIndex: "recordStatus",
              key: "recordStatus",
              render: renderRecordStatus
            },
            {
              title: "归档时间",
              dataIndex: "archivedAt",
              key: "archivedAt",
              render: renderNullable
            },
            {
              title: "备注",
              dataIndex: "notes",
              key: "notes",
              render: (value?: string) => <Typography.Text type="secondary">{value ?? "-"}</Typography.Text>
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
        title={drawerMode === "edit" ? "编辑客户档案" : "新增客户档案"}
        width={480}
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
        <Form<CustomerFormValues> form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="客户名称" name="name" rules={[{ required: true, message: "请输入客户名称" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="联系人" name="contactName">
            <Input />
          </Form.Item>
          <Form.Item label="联系电话" name="contactPhone">
            <Input />
          </Form.Item>
          <Form.Item label="联系邮箱" name="contactEmail" rules={[{ type: "email", message: "请输入合法邮箱" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="备注" name="notes">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
