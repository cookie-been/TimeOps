import {
  CodeOutlined,
  EditOutlined,
  InboxOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SearchOutlined
} from "@ant-design/icons";
import { Button, Drawer, Form, Input, InputNumber, Segmented, Select, Space, Table, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  archiveServer,
  createAdhocTask,
  createServer,
  fetchCustomers,
  fetchServers,
  fetchTasks,
  restoreServer,
  updateServer
} from "../../shared/api/client";
import { DataSection } from "../../shared/components/DataSection";
import { PageHeader } from "../../shared/components/PageHeader";
import { mergeRecordInFilter, recordStatusFilterOptions } from "../../shared/record-status";
import {
  renderCode,
  renderConnectivityStatus,
  renderNullable,
  renderRecordStatus,
  renderTaskStatus
} from "../../shared/presentation";
import type { CustomerItem, RecordStatusFilter, ServerItem, ServerUpdatePayload, TaskItem } from "../../shared/types";

interface ServerFormValues {
  customerId: string;
  host: string;
  sshPort: number;
  sshUsername: string;
  sshPassword?: string;
  osLabel?: string;
  tagsText?: string;
  notes?: string;
}

type DrawerMode = "create" | "edit";

interface TerminalFormValues {
  command: string;
}

const terminalPresets = [
  {
    label: "环境概览",
    command: "whoami && hostname && pwd && uptime"
  },
  {
    label: "Docker",
    command: "docker ps -a"
  },
  {
    label: "磁盘",
    command: "df -h"
  },
  {
    label: "网络",
    command: "ss -lntp"
  },
  {
    label: "内存",
    command: "free -h"
  }
] as const;

function isTerminalTaskRunning(task?: TaskItem | null): boolean {
  return task?.status === "PENDING" || task?.status === "RUNNING";
}

export function ServerListPage() {
  const [items, setItems] = useState<ServerItem[]>([]);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("create");
  const [editingItem, setEditingItem] = useState<ServerItem | null>(null);
  const [recordStatusFilter, setRecordStatusFilter] = useState<RecordStatusFilter>("ACTIVE");
  const [keyword, setKeyword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalServer, setTerminalServer] = useState<ServerItem | null>(null);
  const [terminalTask, setTerminalTask] = useState<TaskItem | null>(null);
  const [terminalSubmitting, setTerminalSubmitting] = useState(false);
  const [form] = Form.useForm<ServerFormValues>();
  const [terminalForm] = Form.useForm<TerminalFormValues>();

  useEffect(() => {
    void fetchCustomers().then((data) => setCustomers(data));
  }, []);

  useEffect(() => {
    setLoading(true);
    void fetchServers(recordStatusFilter)
      .then((data) => setItems(data))
      .finally(() => setLoading(false));
  }, [recordStatusFilter]);

  const customerMap = useMemo(() => new Map(customers.map((item) => [item.id, item.name])), [customers]);

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return items;
    }

    return items.filter((item) =>
      [item.host, item.sshUsername, item.osLabel, customerMap.get(item.customerId)]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedKeyword))
    );
  }, [customerMap, items, keyword]);

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setEditingItem(null);
    form.setFieldsValue({ sshPort: 22 });
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: ServerItem) => {
    setDrawerMode("edit");
    setEditingItem(item);
    form.setFieldsValue({
      customerId: item.customerId,
      host: item.host,
      sshPort: item.sshPort,
      sshUsername: item.sshUsername,
      sshPassword: undefined,
      osLabel: item.osLabel,
      tagsText: item.tags?.join(", "),
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

  const handleSubmit = async (values: ServerFormValues) => {
    const payload: ServerUpdatePayload = {
      customerId: values.customerId,
      host: values.host,
      sshPort: values.sshPort,
      sshUsername: values.sshUsername,
      sshPassword: values.sshPassword?.trim() ? values.sshPassword.trim() : undefined,
      osLabel: values.osLabel,
      tags: values.tagsText
        ?.split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      notes: values.notes
    };

    setSubmitting(true);
    try {
      const nextItem =
        drawerMode === "edit" && editingItem
          ? await updateServer(editingItem.id, payload)
          : await createServer({
              customerId: payload.customerId,
              host: payload.host,
              sshPort: payload.sshPort,
              sshUsername: payload.sshUsername,
              sshPassword: payload.sshPassword ?? "",
              osLabel: payload.osLabel,
              tags: payload.tags,
              notes: payload.notes
            });

      setItems((current) => mergeRecordInFilter(current, nextItem, recordStatusFilter));
      message.success(drawerMode === "edit" ? "服务器已更新" : "服务器已接入");
      closeDrawer();
    } catch {
      message.error(drawerMode === "edit" ? "服务器更新失败" : "服务器接入失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (item: ServerItem) => {
    try {
      const archivedItem = await archiveServer(item.id);
      setItems((current) => mergeRecordInFilter(current, archivedItem, recordStatusFilter));
      message.success("服务器已归档");
    } catch {
      message.error("服务器归档失败");
    }
  };

  const handleRestore = async (item: ServerItem) => {
    try {
      const restoredItem = await restoreServer(item.id);
      setItems((current) => mergeRecordInFilter(current, restoredItem, recordStatusFilter));
      message.success("服务器已恢复");
    } catch {
      message.error("服务器恢复失败");
    }
  };

  const archivedCount = items.filter((item) => item.recordStatus === "ARCHIVED").length;
  const connectedCount = items.filter((item) => item.connectivityStatus === "SUCCESS").length;

  useEffect(() => {
    if (!terminalOpen || !terminalTask || !isTerminalTaskRunning(terminalTask)) {
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchTasks()
        .then((taskItems) => {
          const nextTask = taskItems.find((item) => item.id === terminalTask.id);
          if (nextTask) {
            setTerminalTask(nextTask);
          }
        })
        .catch(() => undefined);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [terminalOpen, terminalTask]);

  const openTerminalDrawer = (item: ServerItem) => {
    setTerminalServer(item);
    setTerminalTask(null);
    terminalForm.setFieldsValue({ command: terminalPresets[0].command });
    setTerminalOpen(true);
  };

  const closeTerminalDrawer = () => {
    setTerminalOpen(false);
    setTerminalServer(null);
    setTerminalTask(null);
    terminalForm.resetFields();
  };

  const runTerminalCommand = async () => {
    if (!terminalServer) {
      return;
    }

    const values = await terminalForm.validateFields();
    setTerminalSubmitting(true);
    try {
      const createdTask = await createAdhocTask({
        serverId: terminalServer.id,
        command: values.command,
        riskConfirmed: true
      });
      setTerminalTask(createdTask);
      message.success("SSH 命令已发送");
    } catch {
      message.error("SSH 命令发送失败");
    } finally {
      setTerminalSubmitting(false);
    }
  };

  const refreshTerminalTask = async () => {
    if (!terminalTask) {
      return;
    }
    try {
      const taskItems = await fetchTasks();
      const nextTask = taskItems.find((item) => item.id === terminalTask.id);
      if (nextTask) {
        setTerminalTask(nextTask);
      }
    } catch {
      message.error("终端输出刷新失败");
    }
  };

  return (
    <>
      <PageHeader
        title="服务器"
        subtitle="管理客户提供的 Linux 主机、SSH 接入信息与连通状态。"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
            接入服务器
          </Button>
        }
        stats={[
          { label: "当前列表", value: String(filteredItems.length) },
          { label: "连通成功", value: String(connectedCount) },
          { label: "已归档", value: String(archivedCount) }
        ]}
      />
      <DataSection
        toolbar={
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索主机地址、用户或客户"
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
        <Table<ServerItem>
          className="timeops-table"
          rowKey="id"
          loading={loading}
          rowClassName={(record) => (record.recordStatus === "ARCHIVED" ? "timeops-row-archived" : "")}
          dataSource={filteredItems}
          scroll={{ x: "max-content" }}
          pagination={{ pageSize: 8 }}
          columns={[
            {
              title: "所属客户",
              dataIndex: "customerId",
              key: "customerId",
              render: (customerId: string) => renderNullable(customerMap.get(customerId))
            },
            { title: "主机地址", dataIndex: "host", key: "host", render: renderCode },
            { title: "SSH 端口", dataIndex: "sshPort", key: "sshPort" },
            { title: "SSH 用户", dataIndex: "sshUsername", key: "sshUsername", render: renderNullable },
            { title: "操作系统", dataIndex: "osLabel", key: "osLabel", render: renderNullable },
            {
              title: "连通状态",
              dataIndex: "connectivityStatus",
              key: "connectivityStatus",
              render: renderConnectivityStatus
            },
            {
              title: "记录状态",
              dataIndex: "recordStatus",
              key: "recordStatus",
              render: renderRecordStatus
            },
            {
              title: "备注",
              dataIndex: "notes",
              key: "notes",
              render: renderNullable
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
                    <Button type="link" size="small" icon={<CodeOutlined />} onClick={() => openTerminalDrawer(record)}>
                      远程终端
                    </Button>
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
        title={drawerMode === "edit" ? "编辑服务器" : "接入服务器"}
        width="min(520px, 100vw)"
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
        <Form<ServerFormValues> form={form} layout="vertical" initialValues={{ sshPort: 22 }} onFinish={handleSubmit}>
          <Form.Item label="所属客户" name="customerId" rules={[{ required: true, message: "请选择客户" }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={customers.map((customer) => ({ value: customer.id, label: customer.name }))}
            />
          </Form.Item>
          <Form.Item label="主机地址" name="host" rules={[{ required: true, message: "请输入主机地址" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="SSH 端口" name="sshPort" rules={[{ required: true, message: "请输入 SSH 端口" }]}>
            <InputNumber min={1} max={65535} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="SSH 用户" name="sshUsername" rules={[{ required: true, message: "请输入 SSH 用户" }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label="SSH 密码"
            name="sshPassword"
            rules={drawerMode === "create" ? [{ required: true, message: "请输入 SSH 密码" }] : undefined}
          >
            <Input.Password placeholder={drawerMode === "edit" ? "留空表示保持不变" : undefined} />
          </Form.Item>
          <Form.Item label="操作系统" name="osLabel">
            <Input />
          </Form.Item>
          <Form.Item label="标签" name="tagsText">
            <Input placeholder="多个标签用英文逗号分隔" />
          </Form.Item>
          <Form.Item label="备注" name="notes">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Drawer>
      <Drawer
        title={terminalServer ? `远程终端 · ${terminalServer.host}` : "远程终端"}
        width="min(820px, 100vw)"
        open={terminalOpen}
        onClose={closeTerminalDrawer}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={closeTerminalDrawer}>关闭</Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void refreshTerminalTask()}
              disabled={!terminalTask}
            >
              刷新输出
            </Button>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              loading={terminalSubmitting}
              onClick={() => void runTerminalCommand()}
            >
              执行命令
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {terminalServer ? (
            <div className="timeops-inline-panel">
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Typography.Text strong>连接信息</Typography.Text>
                <Space wrap>
                  <span className="timeops-code-pill">{terminalServer.host}</span>
                  <span className="timeops-code-pill">{`ssh ${terminalServer.sshUsername}@${terminalServer.host} -p ${terminalServer.sshPort}`}</span>
                  {renderConnectivityStatus(terminalServer.connectivityStatus)}
                </Space>
              </Space>
            </div>
          ) : null}
          <div className="timeops-inline-panel">
            <Typography.Text strong>常用命令</Typography.Text>
            <Space wrap style={{ marginTop: 12 }}>
              {terminalPresets.map((preset) => (
                <Button key={preset.label} onClick={() => terminalForm.setFieldsValue({ command: preset.command })}>
                  {preset.label}
                </Button>
              ))}
            </Space>
          </div>
          <Form<TerminalFormValues> form={terminalForm} layout="vertical">
            <Form.Item
              label="命令内容"
              name="command"
              rules={[{ required: true, whitespace: true, message: "请输入命令内容" }]}
            >
              <Input.TextArea rows={6} placeholder="例如 docker ps -a" />
            </Form.Item>
          </Form>
          {terminalTask ? (
            <div className="timeops-inline-panel">
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Space wrap align="center">
                  <Typography.Text strong>{terminalTask.taskNumber}</Typography.Text>
                  {renderTaskStatus(terminalTask.status)}
                </Space>
                <Typography.Text type="secondary">
                  命令会通过服务器管理中保存的 SSH 凭据直接下发到目标主机。
                </Typography.Text>
                <div>
                  <Typography.Text strong>标准输出</Typography.Text>
                  <pre className="timeops-log-block">{terminalTask.outputLog || "等待输出..."}</pre>
                </div>
                <div>
                  <Typography.Text strong>错误输出</Typography.Text>
                  <pre className="timeops-log-block">{terminalTask.errorLog || "暂无错误输出"}</pre>
                </div>
              </Space>
            </div>
          ) : null}
        </Space>
      </Drawer>
    </>
  );
}
