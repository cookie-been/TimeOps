import { Button, Drawer, Form, Input, Select, Space, Switch, Table, Tag, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  createUser,
  fetchRoleOptions,
  fetchUsers,
  updateUserRoles,
  updateUserStatus
} from "../../shared/api/client";
import { DataSection } from "../../shared/components/DataSection";
import { PageHeader } from "../../shared/components/PageHeader";
import { mockRoleOptions, mockUsers } from "../../shared/mock-data";
import { renderNullable, renderUserStatus } from "../../shared/presentation";
import type { RoleOptionItem, UserRoleItem } from "../../shared/types";

interface UserCreateFormValues {
  username: string;
  displayName: string;
  password: string;
  roleCodes: string[];
  enabled: boolean;
}

interface UserRoleFormValues {
  roleCodes: string[];
}

export function UserRolePage() {
  const [items, setItems] = useState<UserRoleItem[]>(mockUsers);
  const [roleOptions, setRoleOptions] = useState<RoleOptionItem[]>(mockRoleOptions);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [roleDrawerUser, setRoleDrawerUser] = useState<UserRoleItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [createForm] = Form.useForm<UserCreateFormValues>();
  const [roleForm] = Form.useForm<UserRoleFormValues>();

  useEffect(() => {
    void Promise.all([fetchUsers(), fetchRoleOptions()]).then(([userData, roleData]) => {
      setItems(userData);
      setRoleOptions(roleData);
    });
  }, []);

  const roleLabelMap = useMemo(
    () => new Map(roleOptions.map((item) => [item.roleCode, item.roleName])),
    [roleOptions]
  );

  const handleCreate = async (values: UserCreateFormValues) => {
    setSubmitting(true);
    try {
      const created = await createUser(values);
      setItems((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      message.success("账号已创建");
      setCreateDrawerOpen(false);
      createForm.resetFields();
    } catch {
      message.error("账号创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRoleDrawer = (user: UserRoleItem) => {
    setRoleDrawerUser(user);
    roleForm.setFieldsValue({ roleCodes: user.roles });
  };

  const handleUpdateRoles = async (values: UserRoleFormValues) => {
    if (!roleDrawerUser) {
      return;
    }
    setRoleSubmitting(true);
    try {
      const updated = await updateUserRoles(roleDrawerUser.id, values.roleCodes);
      setItems((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      message.success("角色已更新");
      setRoleDrawerUser(null);
      roleForm.resetFields();
    } catch {
      message.error("角色更新失败");
    } finally {
      setRoleSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserRoleItem) => {
    try {
      const updated = await updateUserStatus(user.id, user.status !== "启用");
      setItems((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      message.success(user.status === "启用" ? "账号已停用" : "账号已启用");
    } catch {
      message.error("状态更新失败");
    }
  };

  return (
    <>
      <PageHeader
        title="用户与角色"
        subtitle="维护内部账号、角色映射与权限分配策略。"
        extra={
          <Button type="primary" onClick={() => setCreateDrawerOpen(true)}>
            新增账号
          </Button>
        }
        stats={[
          { label: "账号数量", value: String(items.length || 0) },
          { label: "启用账号", value: String(items.filter((item) => item.status === "启用").length || 0) }
        ]}
      />
      <DataSection toolbar={<Button>查看授权矩阵</Button>}>
        <Table<UserRoleItem>
          className="timeops-table"
          rowKey="id"
          dataSource={items}
          scroll={{ x: "max-content" }}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: "用户名", dataIndex: "username", key: "username" },
            { title: "显示名", dataIndex: "displayName", key: "displayName", render: renderNullable },
            {
              title: "角色",
              dataIndex: "roles",
              key: "roles",
              render: (roles: string[]) => (
                <Space wrap>
                  {roles.map((role) => (
                    <Tag key={role} title={roleLabelMap.get(role) ?? role}>
                      {role}
                    </Tag>
                  ))}
                </Space>
              )
            },
            { title: "状态", dataIndex: "status", key: "status", render: renderUserStatus },
            { title: "最近登录", dataIndex: "lastLoginAt", key: "lastLoginAt", render: renderNullable },
            {
              title: "操作",
              key: "actions",
              render: (_, record) => (
                <Space>
                  <Button size="small" onClick={() => handleOpenRoleDrawer(record)}>
                    授权
                  </Button>
                  <Button size="small" onClick={() => void handleToggleStatus(record)}>
                    {record.status === "启用" ? "停用" : "启用"}
                  </Button>
                </Space>
              )
            }
          ]}
        />
      </DataSection>
      <Drawer
        title="新增运维账号"
        width="min(520px, 100vw)"
        open={createDrawerOpen}
        destroyOnClose
        onClose={() => setCreateDrawerOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setCreateDrawerOpen(false)}>取消</Button>
            <Button type="primary" loading={submitting} onClick={() => createForm.submit()}>
              提交
            </Button>
          </Space>
        }
      >
        <Form<UserCreateFormValues>
          form={createForm}
          layout="vertical"
          initialValues={{ enabled: true }}
          onFinish={handleCreate}
        >
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="显示名" name="displayName" rules={[{ required: true, message: "请输入显示名" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="初始密码" name="password" rules={[{ required: true, message: "请输入初始密码" }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item label="角色" required>
            <div aria-label="角色">
              <Form.Item name="roleCodes" noStyle rules={[{ required: true, message: "请选择角色" }]}>
                <Select
                  mode="multiple"
                  optionFilterProp="label"
                  options={roleOptions.map((item) => ({
                    value: item.roleCode,
                    label: item.roleName
                  }))}
                />
              </Form.Item>
            </div>
          </Form.Item>
          <Form.Item label="启用状态" name="enabled" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Drawer>
      <Drawer
        title={roleDrawerUser ? `角色授权 ${roleDrawerUser.username}` : "角色授权"}
        width="min(520px, 100vw)"
        open={Boolean(roleDrawerUser)}
        destroyOnClose
        onClose={() => {
          setRoleDrawerUser(null);
          roleForm.resetFields();
        }}
        extra={
          <Space>
            <Button
              onClick={() => {
                setRoleDrawerUser(null);
                roleForm.resetFields();
              }}
            >
              取消
            </Button>
            <Button type="primary" loading={roleSubmitting} onClick={() => roleForm.submit()}>
              提交
            </Button>
          </Space>
        }
      >
        <Form<UserRoleFormValues> form={roleForm} layout="vertical" onFinish={handleUpdateRoles}>
          <Form.Item label="角色" required>
            <div aria-label="角色">
              <Form.Item name="roleCodes" noStyle rules={[{ required: true, message: "请选择角色" }]}>
                <Select
                  mode="multiple"
                  optionFilterProp="label"
                  options={roleOptions.map((item) => ({
                    value: item.roleCode,
                    label: item.roleName
                  }))}
                />
              </Form.Item>
            </div>
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
