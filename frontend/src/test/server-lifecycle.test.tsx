import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServerListPage } from "../features/servers/ServerListPage";

const {
  fetchServersMock,
  fetchCustomersMock,
  updateServerMock,
  archiveServerMock,
  restoreServerMock
} = vi.hoisted(() => ({
  fetchServersMock: vi.fn(),
  fetchCustomersMock: vi.fn(),
  updateServerMock: vi.fn(),
  archiveServerMock: vi.fn(),
  restoreServerMock: vi.fn()
}));

vi.mock("../shared/api/client", async () => {
  const actual = await vi.importActual<typeof import("../shared/api/client")>("../shared/api/client");
  return {
    ...actual,
    fetchServers: fetchServersMock,
    fetchCustomers: fetchCustomersMock,
    updateServer: updateServerMock,
    archiveServer: archiveServerMock,
    restoreServer: restoreServerMock
  };
});

describe("ServerListPage lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchCustomersMock.mockResolvedValue([
      {
        id: "cust-001",
        name: "华东制造集团",
        recordStatus: "ACTIVE"
      }
    ]);
  });

  it("loads active servers by default and supports edit plus archive", async () => {
    fetchServersMock.mockResolvedValueOnce([
      {
        id: "srv-001",
        customerId: "cust-001",
        host: "10.23.11.8",
        sshPort: 22,
        sshUsername: "deploy",
        sshPasswordMasked: "********",
        osLabel: "Ubuntu 22.04",
        tags: ["prod"],
        connectivityStatus: "UNKNOWN",
        notes: "生产主机",
        recordStatus: "ACTIVE"
      }
    ]);
    updateServerMock.mockResolvedValueOnce({
      id: "srv-001",
      customerId: "cust-001",
      host: "10.23.11.18",
      sshPort: 22,
      sshUsername: "deploy",
      sshPasswordMasked: "********",
      osLabel: "Ubuntu 22.04",
      tags: ["prod", "blue"],
      connectivityStatus: "UNKNOWN",
      notes: "蓝绿发布节点",
      recordStatus: "ACTIVE"
    });
    archiveServerMock.mockResolvedValueOnce({
      id: "srv-001",
      customerId: "cust-001",
      host: "10.23.11.18",
      sshPort: 22,
      sshUsername: "deploy",
      sshPasswordMasked: "********",
      osLabel: "Ubuntu 22.04",
      tags: ["prod", "blue"],
      connectivityStatus: "UNKNOWN",
      notes: "蓝绿发布节点",
      recordStatus: "ARCHIVED",
      archivedAt: "2026-05-18T10:00:00Z"
    });

    render(<ServerListPage />);

    expect(fetchServersMock).toHaveBeenCalledWith("ACTIVE");
    expect(await screen.findByText("10.23.11.8")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /编辑/ }));
    expect(await screen.findByText("编辑服务器")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("主机地址"), { target: { value: "10.23.11.18" } });
    fireEvent.change(screen.getByLabelText("标签"), { target: { value: "prod, blue" } });
    fireEvent.change(screen.getByLabelText("备注"), { target: { value: "蓝绿发布节点" } });
    fireEvent.click(screen.getByRole("button", { name: /保\s*存/ }));

    await waitFor(() =>
      expect(updateServerMock).toHaveBeenCalledWith("srv-001", {
        customerId: "cust-001",
        host: "10.23.11.18",
        sshPort: 22,
        sshUsername: "deploy",
        sshPassword: undefined,
        osLabel: "Ubuntu 22.04",
        tags: ["prod", "blue"],
        notes: "蓝绿发布节点"
      })
    );

    expect(await screen.findByText("10.23.11.18")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /归档/ }));

    await waitFor(() => expect(archiveServerMock).toHaveBeenCalledWith("srv-001"));
    await waitFor(() => expect(screen.queryByText("10.23.11.18")).not.toBeInTheDocument());
  });

  it("supports archived filter and restore", async () => {
    fetchServersMock
      .mockResolvedValueOnce([
        {
          id: "srv-001",
          customerId: "cust-001",
          host: "10.23.11.8",
          sshPort: 22,
          sshUsername: "deploy",
          sshPasswordMasked: "********",
          connectivityStatus: "UNKNOWN",
          recordStatus: "ACTIVE"
        }
      ])
      .mockResolvedValueOnce([
        {
          id: "srv-002",
          customerId: "cust-001",
          host: "10.23.11.9",
          sshPort: 22,
          sshUsername: "deploy",
          sshPasswordMasked: "********",
          connectivityStatus: "UNKNOWN",
          recordStatus: "ARCHIVED",
          archivedAt: "2026-05-17T08:30:00Z"
        }
      ]);
    restoreServerMock.mockResolvedValueOnce({
      id: "srv-002",
      customerId: "cust-001",
      host: "10.23.11.9",
      sshPort: 22,
      sshUsername: "deploy",
      sshPasswordMasked: "********",
      connectivityStatus: "UNKNOWN",
      recordStatus: "ACTIVE"
    });

    render(<ServerListPage />);

    expect(await screen.findByText("10.23.11.8")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "已归档" }));

    await waitFor(() => expect(fetchServersMock).toHaveBeenLastCalledWith("ARCHIVED"));
    expect(await screen.findByText("10.23.11.9")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /恢复/ }));

    await waitFor(() => expect(restoreServerMock).toHaveBeenCalledWith("srv-002"));
    await waitFor(() => expect(screen.queryByText("10.23.11.9")).not.toBeInTheDocument());
  });
});
