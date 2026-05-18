import { SearchOutlined } from "@ant-design/icons";
import { Button, Checkbox, DatePicker, Drawer, Form, Input, Segmented, Select, Space, Table, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  createAdhocTask,
  createBackupTask,
  createDeployTask,
  createRestartTask,
  createRollbackTask,
  createUpdateTask,
  createVerifyTask,
  fetchCustomers,
  fetchInstances,
  fetchReleases,
  fetchServers,
  fetchTasks
} from "../../shared/api/client";
import { DataSection } from "../../shared/components/DataSection";
import { PageHeader } from "../../shared/components/PageHeader";
import { mockCustomers, mockInstances, mockReleases, mockServers, mockTasks } from "../../shared/mock-data";
import { renderCode, renderNullable, renderTaskStatus, renderTaskType } from "../../shared/presentation";
import type { CustomerItem, InstanceItem, ReleaseItem, ServerItem, TaskItem } from "../../shared/types";

type TaskMode = "DEPLOY" | "UPDATE" | "BACKUP" | "ROLLBACK" | "VERIFY" | "RESTART" | "ADHOC_COMMAND";

interface TaskCreateFormValues {
  deployInstanceId?: string;
  deployReleaseId?: string;
  updateInstanceId?: string;
  updateReleaseId?: string;
  backupInstanceId?: string;
  rollbackInstanceId?: string;
  rollbackReleaseId?: string;
  verifyInstanceId?: string;
  restartInstanceId?: string;
  adhocServerId?: string;
  adhocCommand?: string;
  riskConfirmed?: boolean;
}

export function TaskCenterPage() {
  const [items, setItems] = useState<TaskItem[]>(mockTasks);
  const [instances, setInstances] = useState<InstanceItem[]>(mockInstances);
  const [releases, setReleases] = useState<ReleaseItem[]>(mockReleases);
  const [servers, setServers] = useState<ServerItem[]>(mockServers);
  const [customers, setCustomers] = useState<CustomerItem[]>(mockCustomers);
  const [drawerTask, setDrawerTask] = useState<TaskItem | null>(null);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [taskMode, setTaskMode] = useState<TaskMode>("DEPLOY");
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState<{ taskType?: string; status?: string; customerId?: string }>({});
  const [form] = Form.useForm<TaskCreateFormValues>();
  const selectedDeployInstanceId = Form.useWatch("deployInstanceId", form);
  const selectedUpdateInstanceId = Form.useWatch("updateInstanceId", form);
  const selectedRollbackInstanceId = Form.useWatch("rollbackInstanceId", form);

  const loadPageData = async () => {
    const [taskData, instanceData, releaseData, serverData, customerData] = await Promise.all([
      fetchTasks(),
      fetchInstances(),
      fetchReleases(),
      fetchServers(),
      fetchCustomers()
    ]);

    setItems(taskData);
    setInstances(instanceData);
    setReleases(releaseData);
    setServers(serverData);
    setCustomers(customerData);
  };

  useEffect(() => {
    void loadPageData();
  }, []);

  const instanceMap = useMemo(() => new Map(instances.map((item) => [item.id, item])), [instances]);
  const serverMap = useMemo(() => new Map(servers.map((item) => [item.id, item])), [servers]);
  const customerMap = useMemo(() => new Map(customers.map((item) => [item.id, item.name])), [customers]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filters.taskType && item.taskType !== filters.taskType) {
        return false;
      }
      if (filters.status && item.status !== filters.status) {
        return false;
      }
      if (!filters.customerId) {
        return true;
      }
      if (item.targetInstanceId) {
        return instanceMap.get(item.targetInstanceId)?.customerId === filters.customerId;
      }
      if (item.targetServerId) {
        return serverMap.get(item.targetServerId)?.customerId === filters.customerId;
      }
      return false;
    });
  }, [filters.customerId, filters.status, filters.taskType, instanceMap, items, serverMap]);

  const runningCount = useMemo(() => items.filter((item) => item.status === "RUNNING").length, [items]);

  const deployReleaseOptions = useMemo(() => {
    const instance = selectedDeployInstanceId ? instanceMap.get(selectedDeployInstanceId) : undefined;
    const targetTemplateId = instance?.templateId;
    return releases
      .filter((release) => (targetTemplateId ? release.templateId === targetTemplateId : true))
      .map((release) => ({
        value: release.id,
        label: release.versionLabel
      }));
  }, [instanceMap, releases, selectedDeployInstanceId]);

  const updateReleaseOptions = useMemo(() => {
    const instance = selectedUpdateInstanceId ? instanceMap.get(selectedUpdateInstanceId) : undefined;
    const targetTemplateId = instance?.templateId;
    return releases
      .filter((release) => (targetTemplateId ? release.templateId === targetTemplateId : true))
      .map((release) => ({
        value: release.id,
        label: release.versionLabel
      }));
  }, [instanceMap, releases, selectedUpdateInstanceId]);

  const rollbackReleaseOptions = useMemo(() => {
    const instance = selectedRollbackInstanceId ? instanceMap.get(selectedRollbackInstanceId) : undefined;
    const targetTemplateId = instance?.templateId;
    return releases
      .filter((release) => (targetTemplateId ? release.templateId === targetTemplateId : true))
      .map((release) => ({
        value: release.id,
        label: release.versionLabel
      }));
  }, [instanceMap, releases, selectedRollbackInstanceId]);

  const openCreateDrawer = () => {
    setTaskMode("DEPLOY");
    setCreateDrawerOpen(true);
  };

  const closeCreateDrawer = () => {
    setCreateDrawerOpen(false);
    setTaskMode("DEPLOY");
    form.resetFields();
  };

  const handleCreate = async (values: TaskCreateFormValues) => {
    setSubmitting(true);
    try {
      let created: TaskItem;

      if (taskMode === "DEPLOY") {
        created = await createDeployTask({
          instanceId: values.deployInstanceId!,
          releaseId: values.deployReleaseId!
        });
      } else if (taskMode === "UPDATE") {
        created = await createUpdateTask({
          instanceId: values.updateInstanceId!,
          releaseId: values.updateReleaseId!
        });
      } else if (taskMode === "BACKUP") {
        created = await createBackupTask({
          instanceId: values.backupInstanceId!
        });
      } else if (taskMode === "ROLLBACK") {
        created = await createRollbackTask({
          instanceId: values.rollbackInstanceId!,
          releaseId: values.rollbackReleaseId!
        });
      } else if (taskMode === "VERIFY") {
        created = await createVerifyTask({
          instanceId: values.verifyInstanceId!
        });
      } else if (taskMode === "RESTART") {
        created = await createRestartTask({
          instanceId: values.restartInstanceId!
        });
      } else {
        created = await createAdhocTask({
          serverId: values.adhocServerId!,
          command: values.adhocCommand!,
          riskConfirmed: Boolean(values.riskConfirmed)
        });
      }

      setItems((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      message.success("运维任务已创建");
      closeCreateDrawer();
    } catch {
      message.error("任务创建失败，请检查输入项");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await loadPageData();
      message.success("任务数据已刷新");
    } catch {
      message.error("任务数据刷新失败");
    }
  };

  return (
    <>
      <PageHeader
        title="任务中心"
        subtitle="集中查看部署、更新、备份、回滚、验证、重启与临时命令执行记录。"
        extra={
          <Space>
            <Button onClick={() => void handleRefresh()}>刷新</Button>
            <Button type="primary" icon={<SearchOutlined />} onClick={openCreateDrawer}>
              创建任务
            </Button>
          </Space>
        }
        stats={[
          { label: "任务总数", value: String(items.length || 0) },
          { label: "执行中", value: String(runningCount || 0) }
        ]}
      />
      <DataSection
        toolbar={
          <Space wrap>
            <Select
              allowClear
              placeholder="任务类型"
              style={{ width: 160 }}
              value={filters.taskType}
              onChange={(value) => setFilters((current) => ({ ...current, taskType: value }))}
              options={[
                { value: "DEPLOY", label: "部署" },
                { value: "UPDATE", label: "更新" },
                { value: "BACKUP", label: "备份" },
                { value: "ROLLBACK", label: "回滚" },
                { value: "VERIFY", label: "验证" },
                { value: "RESTART", label: "重启" },
                { value: "ADHOC_COMMAND", label: "临时命令" }
              ]}
            />
            <Select
              allowClear
              placeholder="状态"
              style={{ width: 140 }}
              value={filters.status}
              onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
              options={[
                { value: "PENDING", label: "待执行" },
                { value: "RUNNING", label: "执行中" },
                { value: "SUCCESS", label: "成功" },
                { value: "FAILED", label: "失败" }
              ]}
            />
            <Select
              allowClear
              placeholder="客户"
              style={{ width: 180 }}
              value={filters.customerId}
              onChange={(value) => setFilters((current) => ({ ...current, customerId: value }))}
              options={customers.map((customer) => ({ value: customer.id, label: customer.name }))}
            />
            <DatePicker.RangePicker placeholder={["开始时间", "结束时间"]} />
          </Space>
        }
      >
        <Table<TaskItem>
          className="timeops-table"
          rowKey="id"
          dataSource={filteredItems}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: "任务编号", dataIndex: "taskNumber", key: "taskNumber", render: renderCode },
            { title: "类型", dataIndex: "taskType", key: "taskType", render: renderTaskType },
            {
              title: "目标对象",
              key: "target",
              render: (_, record) => renderCode(record.targetInstanceId ?? record.targetServerId)
            },
            {
              title: "所属客户",
              key: "customerName",
              render: (_, record) => {
                const customerId = record.targetInstanceId
                  ? instanceMap.get(record.targetInstanceId)?.customerId
                  : record.targetServerId
                    ? serverMap.get(record.targetServerId)?.customerId
                    : undefined;
                return renderNullable(customerId ? customerMap.get(customerId) : undefined);
              }
            },
            {
              title: "版本",
              key: "release",
              render: (_, record) => renderNullable(record.releaseId)
            },
            { title: "发起人", dataIndex: "initiatorName", key: "initiatorName", render: renderNullable },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              render: renderTaskStatus
            },
            {
              title: "退出码",
              key: "exitCode",
              render: (_, record) => renderNullable(record.exitCode == null ? undefined : String(record.exitCode))
            },
            { title: "开始时间", dataIndex: "startedAt", key: "startedAt", render: renderNullable },
            { title: "结束时间", dataIndex: "endedAt", key: "endedAt", render: renderNullable },
            {
              title: "操作",
              key: "actions",
              render: (_, record) => (
                <Button size="small" onClick={() => setDrawerTask(record)}>
                  {record.taskType === "ADHOC_COMMAND" ? "查看详情" : "查看日志"}
                </Button>
              )
            }
          ]}
        />
      </DataSection>
      <Drawer
        title="创建运维任务"
        open={createDrawerOpen}
        width={560}
        destroyOnClose
        onClose={closeCreateDrawer}
        extra={
          <Space>
            <Button onClick={closeCreateDrawer}>取消</Button>
            <Button type="primary" loading={submitting} onClick={() => form.submit()}>
              提交
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size={20} style={{ width: "100%" }}>
          <Segmented<TaskMode>
            block
            value={taskMode}
            onChange={(value) => {
              setTaskMode(value);
              form.resetFields();
            }}
            options={[
              { label: "部署", value: "DEPLOY" },
              { label: "更新", value: "UPDATE" },
              { label: "备份", value: "BACKUP" },
              { label: "回滚", value: "ROLLBACK" },
              { label: "验证", value: "VERIFY" },
              { label: "重启", value: "RESTART" },
              { label: "临时命令", value: "ADHOC_COMMAND" }
            ]}
          />
          <Form<TaskCreateFormValues> form={form} layout="vertical" onFinish={handleCreate}>
            {taskMode === "DEPLOY" ? (
              <>
                <Form.Item label="实例" required>
                  <div aria-label="实例">
                    <Form.Item name="deployInstanceId" noStyle rules={[{ required: true, message: "请选择实例" }]}>
                      <Select
                        showSearch
                        optionFilterProp="label"
                        options={instances.map((item) => ({
                          value: item.id,
                          label: item.instanceName
                        }))}
                      />
                    </Form.Item>
                  </div>
                </Form.Item>
                <Form.Item label="发布版本" required>
                  <div aria-label="发布版本">
                    <Form.Item name="deployReleaseId" noStyle rules={[{ required: true, message: "请选择发布版本" }]}>
                      <Select
                        showSearch
                        optionFilterProp="label"
                        options={deployReleaseOptions}
                        placeholder={selectedDeployInstanceId ? "选择与实例模板匹配的版本" : "请先选择实例"}
                      />
                    </Form.Item>
                  </div>
                </Form.Item>
              </>
            ) : null}
            {taskMode === "UPDATE" ? (
              <>
                <Form.Item label="实例" required>
                  <div aria-label="实例">
                    <Form.Item name="updateInstanceId" noStyle rules={[{ required: true, message: "请选择实例" }]}>
                      <Select
                        showSearch
                        optionFilterProp="label"
                        options={instances.map((item) => ({
                          value: item.id,
                          label: item.instanceName
                        }))}
                      />
                    </Form.Item>
                  </div>
                </Form.Item>
                <Form.Item label="目标版本" required>
                  <div aria-label="发布版本">
                    <Form.Item name="updateReleaseId" noStyle rules={[{ required: true, message: "请选择目标版本" }]}>
                      <Select
                        showSearch
                        optionFilterProp="label"
                        options={updateReleaseOptions}
                        placeholder={selectedUpdateInstanceId ? "选择与实例模板匹配的版本" : "请先选择实例"}
                      />
                    </Form.Item>
                  </div>
                </Form.Item>
              </>
            ) : null}
            {taskMode === "BACKUP" ? (
              <Form.Item label="实例" required>
                <div aria-label="实例">
                  <Form.Item name="backupInstanceId" noStyle rules={[{ required: true, message: "请选择实例" }]}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      options={instances.map((item) => ({
                        value: item.id,
                        label: item.instanceName
                      }))}
                    />
                  </Form.Item>
                </div>
              </Form.Item>
            ) : null}
            {taskMode === "ROLLBACK" ? (
              <>
                <Form.Item label="实例" required>
                  <div aria-label="实例">
                    <Form.Item name="rollbackInstanceId" noStyle rules={[{ required: true, message: "请选择实例" }]}>
                      <Select
                        showSearch
                        optionFilterProp="label"
                        options={instances.map((item) => ({
                          value: item.id,
                          label: item.instanceName
                        }))}
                      />
                    </Form.Item>
                  </div>
                </Form.Item>
                <Form.Item label="回滚版本" required>
                  <div aria-label="回滚版本">
                    <Form.Item name="rollbackReleaseId" noStyle rules={[{ required: true, message: "请选择回滚版本" }]}>
                      <Select
                        showSearch
                        optionFilterProp="label"
                        options={rollbackReleaseOptions}
                        placeholder={selectedRollbackInstanceId ? "选择与实例模板匹配的版本" : "请先选择实例"}
                      />
                    </Form.Item>
                  </div>
                </Form.Item>
              </>
            ) : null}
            {taskMode === "VERIFY" ? (
              <Form.Item label="实例" required>
                <div aria-label="实例">
                  <Form.Item name="verifyInstanceId" noStyle rules={[{ required: true, message: "请选择实例" }]}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      options={instances.map((item) => ({
                        value: item.id,
                        label: item.instanceName
                      }))}
                    />
                  </Form.Item>
                </div>
              </Form.Item>
            ) : null}
            {taskMode === "RESTART" ? (
              <Form.Item label="实例" required>
                <div aria-label="实例">
                  <Form.Item name="restartInstanceId" noStyle rules={[{ required: true, message: "请选择实例" }]}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      options={instances.map((item) => ({
                        value: item.id,
                        label: item.instanceName
                      }))}
                    />
                  </Form.Item>
                </div>
              </Form.Item>
            ) : null}
            {taskMode === "ADHOC_COMMAND" ? (
              <>
                <Form.Item label="服务器" required>
                  <div aria-label="服务器">
                    <Form.Item name="adhocServerId" noStyle rules={[{ required: true, message: "请选择服务器" }]}>
                      <Select
                        showSearch
                        optionFilterProp="label"
                        options={servers.map((item) => ({
                          value: item.id,
                          label: `${item.host} / ${item.sshUsername}`
                        }))}
                      />
                    </Form.Item>
                  </div>
                </Form.Item>
                <Form.Item label="命令内容" name="adhocCommand" rules={[{ required: true, message: "请输入命令内容" }]}>
                  <Input.TextArea aria-label="命令内容" rows={5} placeholder="例如 systemctl restart app-service" />
                </Form.Item>
                <Form.Item
                  name="riskConfirmed"
                  valuePropName="checked"
                  rules={[
                    {
                      validator: (_, value) => {
                        if (value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error("请确认已评估临时命令风险"));
                      }
                    }
                  ]}
                >
                  <Checkbox>我已确认该命令已完成风险评估，并接受全量审计留痕</Checkbox>
                </Form.Item>
              </>
            ) : null}
          </Form>
        </Space>
      </Drawer>
      <Drawer
        title={drawerTask ? `任务日志 ${drawerTask.taskNumber}` : "任务日志"}
        open={Boolean(drawerTask)}
        width={560}
        onClose={() => setDrawerTask(null)}
      >
        <Typography.Paragraph type="secondary">执行状态</Typography.Paragraph>
        <pre className="timeops-log-block">{drawerTask?.status ?? "-"}</pre>
        <Typography.Paragraph type="secondary">退出码</Typography.Paragraph>
        <pre className="timeops-log-block">{drawerTask?.exitCode == null ? "-" : String(drawerTask.exitCode)}</pre>
        <Typography.Paragraph type="secondary">命令输入</Typography.Paragraph>
        <pre className="timeops-log-block">{drawerTask?.commandInput ?? "-"}</pre>
        <Typography.Paragraph type="secondary">输出日志</Typography.Paragraph>
        <pre className="timeops-log-block">{drawerTask?.outputLog ?? "-"}</pre>
        <Typography.Paragraph type="secondary">错误日志</Typography.Paragraph>
        <pre className="timeops-log-block">{drawerTask?.errorLog ?? "-"}</pre>
      </Drawer>
    </>
  );
}
