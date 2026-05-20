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
import type { InputRef } from "antd";
import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  archiveServer,
  createAdhocTask,
  createServer,
  fetchCustomers,
  fetchServers,
  fetchTask,
  subscribeTask,
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

interface TerminalEntry {
  id: string;
  taskId: string;
  taskNumber: string;
  command: string;
  status: string;
  stdout: string;
  stderr: string;
  exitCode?: number;
  issuedAt?: string;
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

function isRunningStatus(status?: string): boolean {
  return status === "PENDING" || status === "RUNNING";
}

function buildTerminalEntry(task: TaskItem): TerminalEntry {
  return {
    id: task.id,
    taskId: task.id,
    taskNumber: task.taskNumber,
    command: task.commandInput ?? "",
    status: task.status,
    stdout: task.outputLog ?? "",
    stderr: task.errorLog ?? "",
    exitCode: task.exitCode,
    issuedAt: task.startedAt ?? task.createdAt
  };
}

function buildLocalTerminalEntry(command: string, stdout: string, stderr = "", exitCode = 0): TerminalEntry {
  const issuedAt = new Date().toISOString();
  return {
    id: `local-${issuedAt}-${Math.random().toString(36).slice(2, 8)}`,
    taskId: `local-${issuedAt}`,
    taskNumber: "LOCAL",
    command,
    status: exitCode === 0 ? "SUCCESS" : "FAILED",
    stdout,
    stderr,
    exitCode,
    issuedAt
  };
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
  const [terminalEntries, setTerminalEntries] = useState<TerminalEntry[]>([]);
  const [terminalCommand, setTerminalCommand] = useState("");
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [terminalHistoryIndex, setTerminalHistoryIndex] = useState<number | null>(null);
  const [terminalHistoryDraft, setTerminalHistoryDraft] = useState("");
  const [terminalSubmitting, setTerminalSubmitting] = useState(false);
  const [terminalPollFallbackTaskId, setTerminalPollFallbackTaskId] = useState<string | null>(null);
  const [form] = Form.useForm<ServerFormValues>();
  const terminalViewportRef = useRef<HTMLDivElement | null>(null);
  const terminalInputRef = useRef<InputRef>(null);

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
  const terminalPrompt = terminalServer ? `${terminalServer.sshUsername}@${terminalServer.host}:~$` : "shell$";
  const terminalBusy = isTerminalTaskRunning(terminalTask);

  const recordTerminalHistory = (command: string) => {
    setTerminalHistory((current) => [...current, command]);
    setTerminalHistoryIndex(null);
    setTerminalHistoryDraft("");
  };

  const syncTerminalTask = useCallback((task: TaskItem) => {
    setTerminalTask(task);
    setTerminalEntries((current) => {
      const nextEntry = buildTerminalEntry(task);
      const existingIndex = current.findIndex((item) => item.taskId === nextEntry.taskId);

      if (existingIndex === -1) {
        return [...current, nextEntry];
      }

      const nextEntries = [...current];
      nextEntries.splice(existingIndex, 1, nextEntry);
      return nextEntries;
    });
  }, []);

  useEffect(() => {
    if (
      !terminalOpen ||
      !terminalTask ||
      !isTerminalTaskRunning(terminalTask) ||
      terminalPollFallbackTaskId === terminalTask.id
    ) {
      return;
    }

    let active = true;
    const subscription = subscribeTask(terminalTask.id, {
      onTask: (nextTask) => {
        if (active) {
          syncTerminalTask(nextTask);
        }
      },
      onError: () => {
        if (active) {
          setTerminalPollFallbackTaskId(terminalTask.id);
        }
      }
    });

    return () => {
      active = false;
      subscription.close();
    };
  }, [terminalOpen, terminalTask, terminalPollFallbackTaskId, syncTerminalTask]);

  useEffect(() => {
    if (
      !terminalOpen ||
      !terminalTask ||
      !isTerminalTaskRunning(terminalTask) ||
      terminalPollFallbackTaskId !== terminalTask.id
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchTask(terminalTask.id)
        .then((nextTask) => {
          if (nextTask) {
            syncTerminalTask(nextTask);
          }
        })
        .catch(() => undefined);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [terminalOpen, terminalTask, terminalPollFallbackTaskId, syncTerminalTask]);

  useEffect(() => {
    if (!terminalOpen) {
      return;
    }

    const viewport = terminalViewportRef.current;
    if (!viewport) {
      return;
    }

    if (typeof viewport.scrollTo === "function") {
      viewport.scrollTo({
        top: viewport.scrollHeight
      });
      return;
    }

    viewport.scrollTop = viewport.scrollHeight;
  }, [terminalEntries, terminalOpen, terminalBusy]);

  useEffect(() => {
    if (!terminalOpen || terminalBusy) {
      return;
    }

    const timer = window.setTimeout(() => {
      terminalInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [terminalBusy, terminalOpen]);

  const openTerminalDrawer = (item: ServerItem) => {
    setTerminalServer(item);
    setTerminalTask(null);
    setTerminalEntries([]);
    setTerminalCommand("");
    setTerminalHistory([]);
    setTerminalHistoryIndex(null);
    setTerminalHistoryDraft("");
    setTerminalPollFallbackTaskId(null);
    setTerminalOpen(true);
  };

  const closeTerminalDrawer = () => {
    setTerminalOpen(false);
    setTerminalServer(null);
    setTerminalTask(null);
    setTerminalEntries([]);
    setTerminalCommand("");
    setTerminalHistory([]);
    setTerminalHistoryIndex(null);
    setTerminalHistoryDraft("");
    setTerminalPollFallbackTaskId(null);
  };

  const runTerminalCommand = async () => {
    const command = terminalCommand.trim();

    if (!terminalServer || !command || terminalBusy) {
      return;
    }

    if (command === "clear") {
      recordTerminalHistory(command);
      clearTerminalScreen();
      setTerminalCommand("");
      return;
    }

    if (command === "history") {
      const historyLines = [...terminalHistory, command]
        .map((item, index) => `${index + 1}  ${item}`)
        .join("\n");
      setTerminalEntries((current) => [...current, buildLocalTerminalEntry(command, historyLines || "No commands yet.")]);
      recordTerminalHistory(command);
      setTerminalCommand("");
      return;
    }

    if (command === "help") {
      setTerminalEntries((current) => [
        ...current,
        buildLocalTerminalEntry(
          command,
          [
            "Built-in commands:",
            "  clear    clear terminal output",
            "  history  show command history",
            "  help     show this message"
          ].join("\n")
        )
      ]);
      recordTerminalHistory(command);
      setTerminalCommand("");
      return;
    }

    setTerminalSubmitting(true);
    try {
      const createdTask = await createAdhocTask({
        serverId: terminalServer.id,
        command,
        riskConfirmed: true
      });
      setTerminalPollFallbackTaskId(null);
      syncTerminalTask(createdTask);
      recordTerminalHistory(command);
      setTerminalCommand("");
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
      const nextTask = await fetchTask(terminalTask.id);
      if (nextTask) {
        syncTerminalTask(nextTask);
      }
    } catch {
      message.error("终端输出刷新失败");
    }
  };

  const clearTerminalScreen = () => {
    setTerminalEntries([]);
    setTerminalTask(null);
    setTerminalPollFallbackTaskId(null);
  };

  const applyHistoryCommand = (direction: "prev" | "next") => {
    if (terminalHistory.length === 0) {
      return;
    }

    if (direction === "prev") {
      const nextIndex = terminalHistoryIndex === null ? terminalHistory.length - 1 : Math.max(terminalHistoryIndex - 1, 0);
      if (terminalHistoryIndex === null) {
        setTerminalHistoryDraft(terminalCommand);
      }
      setTerminalHistoryIndex(nextIndex);
      setTerminalCommand(terminalHistory[nextIndex]);
      return;
    }

    if (terminalHistoryIndex === null) {
      return;
    }

    const nextIndex = terminalHistoryIndex + 1;
    if (nextIndex >= terminalHistory.length) {
      setTerminalHistoryIndex(null);
      setTerminalCommand(terminalHistoryDraft);
      return;
    }

    setTerminalHistoryIndex(nextIndex);
    setTerminalCommand(terminalHistory[nextIndex]);
  };

  const handleTerminalInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void runTerminalCommand();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      applyHistoryCommand("prev");
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      applyHistoryCommand("next");
    }
  };

  const terminalSyncStatusLabel =
    terminalTask && isTerminalTaskRunning(terminalTask)
      ? terminalPollFallbackTaskId === terminalTask.id
        ? "轮询同步"
        : "实时推送"
      : "会话就绪";

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
            <Button onClick={clearTerminalScreen} disabled={!terminalEntries.length && !terminalTask}>
              清屏
            </Button>
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
                <Button key={preset.label} onClick={() => setTerminalCommand(preset.command)}>
                  {preset.label}
                </Button>
              ))}
            </Space>
          </div>
          <div className="timeops-terminal-window">
            <div className="timeops-terminal-toolbar">
              <div className="timeops-terminal-toolbar-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <Typography.Text className="timeops-terminal-toolbar-label">
                {terminalServer ? `ssh ${terminalServer.sshUsername}@${terminalServer.host} -p ${terminalServer.sshPort}` : "SSH 会话"}
              </Typography.Text>
              <Typography.Text type="secondary">{terminalSyncStatusLabel}</Typography.Text>
            </div>
            <div className="timeops-terminal-body" ref={terminalViewportRef}>
              <div className="timeops-terminal-banner">
                <div>{terminalServer ? `Connected to ${terminalServer.host}` : "Terminal disconnected"}</div>
                <div>{terminalServer?.osLabel ?? "Linux host"}</div>
              </div>
              {terminalEntries.length === 0 ? (
                <div className="timeops-terminal-empty">SSH 会话已就绪。</div>
              ) : null}
              {terminalEntries.map((entry) => (
                <div key={entry.id} className="timeops-terminal-entry">
                  <div className="timeops-terminal-line">
                    <span className="timeops-terminal-prompt">{terminalPrompt}</span>
                    <span className="timeops-terminal-command">{entry.command}</span>
                  </div>
                  {entry.stdout ? <pre className="timeops-terminal-stream">{entry.stdout}</pre> : null}
                  {entry.stderr ? <pre className="timeops-terminal-stream timeops-terminal-stream-error">{entry.stderr}</pre> : null}
                  {!entry.stdout && !entry.stderr && isRunningStatus(entry.status) ? (
                    <div className="timeops-terminal-stream-muted">正在建立 SSH 会话...</div>
                  ) : null}
                  <div className="timeops-terminal-meta">
                    <span>{entry.taskNumber}</span>
                    {renderTaskStatus(entry.status)}
                    {entry.exitCode !== undefined ? <span>{`exit ${entry.exitCode}`}</span> : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="timeops-terminal-input-row">
              <span className="timeops-terminal-prompt">{terminalPrompt}</span>
              <Input
                ref={terminalInputRef}
                aria-label="终端命令输入"
                autoComplete="off"
                className="timeops-terminal-input"
                disabled={!terminalServer || terminalBusy || terminalSubmitting}
                placeholder={terminalBusy ? "当前命令执行中..." : "输入 Linux 命令，回车立即执行"}
                variant="borderless"
                value={terminalCommand}
                onChange={(event) => {
                  setTerminalCommand(event.target.value);
                  setTerminalHistoryIndex(null);
                }}
                onKeyDown={handleTerminalInputKeyDown}
              />
            </div>
          </div>
        </Space>
      </Drawer>
    </>
  );
}
