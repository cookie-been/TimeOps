import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServerListPage } from "../features/servers/ServerListPage";

const { fetchServersMock, fetchCustomersMock, createAdhocTaskMock, fetchTaskMock, subscribeTaskMock } = vi.hoisted(() => ({
  fetchServersMock: vi.fn(),
  fetchCustomersMock: vi.fn(),
  createAdhocTaskMock: vi.fn(),
  fetchTaskMock: vi.fn(),
  subscribeTaskMock: vi.fn()
}));

vi.mock("../shared/api/client", async () => {
  const actual = await vi.importActual<typeof import("../shared/api/client")>("../shared/api/client");
  return {
    ...actual,
    fetchServers: fetchServersMock,
    fetchCustomers: fetchCustomersMock,
    createAdhocTask: createAdhocTaskMock,
    fetchTask: fetchTaskMock,
    subscribeTask: subscribeTaskMock
  };
});

describe("ServerListPage terminal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscribeTaskMock.mockReturnValue({
      close: vi.fn()
    });
    fetchCustomersMock.mockResolvedValue([
      {
        id: "cust-001",
        name: "华东制造集团",
        recordStatus: "ACTIVE"
      }
    ]);
  });

  it("runs terminal commands in an interactive shell-like drawer", async () => {
    fetchServersMock.mockResolvedValueOnce([
      {
        id: "srv-001",
        customerId: "cust-001",
        host: "10.23.11.8",
        sshPort: 22,
        sshUsername: "deploy",
        sshPasswordMasked: "********",
        osLabel: "Ubuntu 22.04",
        connectivityStatus: "SUCCESS",
        notes: "生产主机",
        recordStatus: "ACTIVE"
      }
    ]);

    createAdhocTaskMock.mockResolvedValueOnce({
      id: "task-ssh-001",
      taskNumber: "TASK-SSH-001",
      taskType: "ADHOC_COMMAND",
      targetServerId: "srv-001",
      status: "RUNNING",
      commandInput: "docker ps -a",
      outputLog: "正在建立 SSH 会话...",
      errorLog: "",
      startedAt: "2026-05-19T15:00:00+08:00"
    });

    render(<ServerListPage />);

    expect(await screen.findByText("10.23.11.8")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /远程终端/ }));

    expect(await screen.findByText("Connected to 10.23.11.8")).toBeInTheDocument();
    expect(screen.getAllByText("ssh deploy@10.23.11.8 -p 22")).toHaveLength(2);

    const terminalInput = screen.getByLabelText("终端命令输入");
    fireEvent.change(terminalInput, { target: { value: "docker ps -a" } });
    fireEvent.keyDown(terminalInput, { key: "Enter" });

    await waitFor(() =>
      expect(createAdhocTaskMock).toHaveBeenCalledWith({
        serverId: "srv-001",
        command: "docker ps -a",
        riskConfirmed: true
      })
    );

    expect(await screen.findByText("TASK-SSH-001")).toBeInTheDocument();
    expect(screen.getByText("docker ps -a")).toBeInTheDocument();
    expect(screen.getByText("正在建立 SSH 会话...")).toBeInTheDocument();

    await waitFor(() => expect(subscribeTaskMock).toHaveBeenCalledWith("task-ssh-001", expect.any(Object)));
    const handlers = subscribeTaskMock.mock.calls[0][1] as {
      onTask: (task: Record<string, unknown>) => void;
    };
    act(() => {
      handlers.onTask({
        id: "task-ssh-001",
        taskNumber: "TASK-SSH-001",
        taskType: "ADHOC_COMMAND",
        targetServerId: "srv-001",
        status: "SUCCESS",
        commandInput: "docker ps -a",
        outputLog: "CONTAINER ID   IMAGE\n4f2a91f0a8c1   floral-web",
        errorLog: "",
        exitCode: 0,
        startedAt: "2026-05-19T15:00:00+08:00",
        endedAt: "2026-05-19T15:00:04+08:00"
      });
    });

    expect(await screen.findByText(/floral-web/)).toBeInTheDocument();
    expect(screen.getByText("exit 0")).toBeInTheDocument();
    expect(screen.getByText("会话就绪")).toBeInTheDocument();
  });

  it("supports local built-in commands", async () => {
    fetchServersMock.mockResolvedValueOnce([
      {
        id: "srv-001",
        customerId: "cust-001",
        host: "10.23.11.8",
        sshPort: 22,
        sshUsername: "deploy",
        sshPasswordMasked: "********",
        osLabel: "Ubuntu 22.04",
        connectivityStatus: "SUCCESS",
        notes: "生产主机",
        recordStatus: "ACTIVE"
      }
    ]);

    render(<ServerListPage />);

    fireEvent.click(await screen.findByRole("button", { name: /远程终端/ }));

    const terminalInput = await screen.findByLabelText("终端命令输入");

    fireEvent.change(terminalInput, { target: { value: "help" } });
    fireEvent.keyDown(terminalInput, { key: "Enter" });
    expect(await screen.findByText(/Built-in commands:/)).toBeInTheDocument();

    fireEvent.change(terminalInput, { target: { value: "history" } });
    fireEvent.keyDown(terminalInput, { key: "Enter" });
    expect(
      await screen.findByText((_, node) => node?.tagName === "PRE" && node.textContent?.includes("1  help") === true)
    ).toBeInTheDocument();

    fireEvent.change(terminalInput, { target: { value: "clear" } });
    fireEvent.keyDown(terminalInput, { key: "Enter" });
    await waitFor(() => expect(screen.queryByText(/Built-in commands:/)).not.toBeInTheDocument());
  });
});
