import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskCenterPage } from "../features/tasks/TaskCenterPage";

const { createDeployTaskMock, createUpdateTaskMock, createBackupTaskMock, createRollbackTaskMock, createVerifyTaskMock } = vi.hoisted(() => ({
  createDeployTaskMock: vi.fn(),
  createUpdateTaskMock: vi.fn(),
  createBackupTaskMock: vi.fn(),
  createRollbackTaskMock: vi.fn(),
  createVerifyTaskMock: vi.fn()
}));

vi.mock("../shared/api/client", async () => {
  const actual = await vi.importActual<typeof import("../shared/api/client")>("../shared/api/client");
  return {
    ...actual,
    createDeployTask: createDeployTaskMock,
    createUpdateTask: createUpdateTaskMock,
    createBackupTask: createBackupTaskMock,
    createRollbackTask: createRollbackTaskMock,
    createVerifyTask: createVerifyTaskMock
  };
});

describe("TaskCenterPage create flow", () => {
  it("creates deploy task from drawer form", async () => {
    createDeployTaskMock.mockResolvedValueOnce({
      id: "task-new",
      taskNumber: "TASK-NEW-001",
      taskType: "DEPLOY",
      targetInstanceId: "ins-001",
      releaseId: "rel-001",
      status: "PENDING",
      initiatorName: "当前账号",
      startedAt: "2026-05-18T10:00:00+08:00"
    });

    render(<TaskCenterPage />);

    fireEvent.click(screen.getByRole("button", { name: /创建任务/ }));

    expect(await screen.findByText("创建运维任务")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByLabelText("实例").parentElement!.querySelector(".ant-select-selector")!);
    fireEvent.click(await screen.findByText("供应链后台-生产"));

    fireEvent.mouseDown(screen.getByLabelText("发布版本").parentElement!.querySelector(".ant-select-selector")!);
    fireEvent.click(await screen.findByText("v2.1.0"));

    fireEvent.click(screen.getByRole("button", { name: /提\s*交/ }));

    await waitFor(() =>
      expect(createDeployTaskMock).toHaveBeenCalledWith({
        instanceId: "ins-001",
        releaseId: "rel-001"
      })
    );

    expect(await screen.findByText("TASK-NEW-001")).toBeInTheDocument();
  });

  it("creates update task from drawer form", async () => {
    createUpdateTaskMock.mockResolvedValueOnce({
      id: "task-update",
      taskNumber: "TASK-UPD-001",
      taskType: "UPDATE",
      targetInstanceId: "ins-001",
      releaseId: "rel-001",
      status: "PENDING",
      initiatorName: "当前账号",
      startedAt: "2026-05-18T10:05:00+08:00"
    });

    render(<TaskCenterPage />);

    fireEvent.click(screen.getByRole("button", { name: /创建任务/ }));

    expect(await screen.findByText("创建运维任务")).toBeInTheDocument();

    fireEvent.click(screen.getByText("更新"));

    fireEvent.mouseDown(screen.getByLabelText("实例").parentElement!.querySelector(".ant-select-selector")!);
    fireEvent.click(await screen.findByText("供应链后台-生产"));

    fireEvent.mouseDown(screen.getByLabelText("发布版本").parentElement!.querySelector(".ant-select-selector")!);
    fireEvent.click(await screen.findByText("v2.1.0"));

    fireEvent.click(screen.getByRole("button", { name: /提\s*交/ }));

    await waitFor(() =>
      expect(createUpdateTaskMock).toHaveBeenCalledWith({
        instanceId: "ins-001",
        releaseId: "rel-001"
      })
    );

    expect(await screen.findByText("TASK-UPD-001")).toBeInTheDocument();
  });

  it("creates backup task from drawer form", async () => {
    createBackupTaskMock.mockResolvedValueOnce({
      id: "task-backup",
      taskNumber: "TASK-BKP-001",
      taskType: "BACKUP",
      targetInstanceId: "ins-001",
      status: "PENDING",
      initiatorName: "当前账号",
      startedAt: "2026-05-18T10:10:00+08:00"
    });

    render(<TaskCenterPage />);

    fireEvent.click(screen.getByRole("button", { name: /创建任务/ }));
    expect(await screen.findByText("创建运维任务")).toBeInTheDocument();

    fireEvent.click(screen.getByText("备份"));
    fireEvent.mouseDown(screen.getByLabelText("实例").parentElement!.querySelector(".ant-select-selector")!);
    fireEvent.click(await screen.findByText("供应链后台-生产"));
    fireEvent.click(screen.getByRole("button", { name: /提\s*交/ }));

    await waitFor(() =>
      expect(createBackupTaskMock).toHaveBeenCalledWith({
        instanceId: "ins-001"
      })
    );

    expect(await screen.findByText("TASK-BKP-001")).toBeInTheDocument();
  });

  it("creates rollback task from drawer form", async () => {
    createRollbackTaskMock.mockResolvedValueOnce({
      id: "task-rollback",
      taskNumber: "TASK-RBK-001",
      taskType: "ROLLBACK",
      targetInstanceId: "ins-001",
      releaseId: "rel-001",
      status: "PENDING",
      initiatorName: "当前账号",
      startedAt: "2026-05-18T10:12:00+08:00"
    });

    render(<TaskCenterPage />);

    fireEvent.click(screen.getByRole("button", { name: /创建任务/ }));
    expect(await screen.findByText("创建运维任务")).toBeInTheDocument();

    fireEvent.click(screen.getByText("回滚"));
    fireEvent.mouseDown(screen.getByLabelText("实例").parentElement!.querySelector(".ant-select-selector")!);
    fireEvent.click(await screen.findByText("供应链后台-生产"));
    fireEvent.mouseDown(screen.getByLabelText("回滚版本").parentElement!.querySelector(".ant-select-selector")!);
    fireEvent.click(await screen.findByText("v2.1.0"));
    fireEvent.click(screen.getByRole("button", { name: /提\s*交/ }));

    await waitFor(() =>
      expect(createRollbackTaskMock).toHaveBeenCalledWith({
        instanceId: "ins-001",
        releaseId: "rel-001"
      })
    );

    expect(await screen.findByText("TASK-RBK-001")).toBeInTheDocument();
  });

  it("creates verify task from drawer form", async () => {
    createVerifyTaskMock.mockResolvedValueOnce({
      id: "task-verify",
      taskNumber: "TASK-VFY-001",
      taskType: "VERIFY",
      targetInstanceId: "ins-001",
      status: "PENDING",
      initiatorName: "当前账号",
      startedAt: "2026-05-18T10:15:00+08:00"
    });

    render(<TaskCenterPage />);

    fireEvent.click(screen.getByRole("button", { name: /创建任务/ }));
    expect(await screen.findByText("创建运维任务")).toBeInTheDocument();

    fireEvent.click(screen.getByText("验证"));
    fireEvent.mouseDown(screen.getByLabelText("实例").parentElement!.querySelector(".ant-select-selector")!);
    fireEvent.click(await screen.findByText("供应链后台-生产"));
    fireEvent.click(screen.getByRole("button", { name: /提\s*交/ }));

    await waitFor(() =>
      expect(createVerifyTaskMock).toHaveBeenCalledWith({
        instanceId: "ins-001"
      })
    );

    expect(await screen.findByText("TASK-VFY-001")).toBeInTheDocument();
  });
});
