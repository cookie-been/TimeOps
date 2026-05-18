import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InstanceListPage } from "../features/instances/InstanceListPage";

const {
  fetchInstancesMock,
  fetchCustomersMock,
  fetchTemplatesMock,
  fetchServersMock,
  updateInstanceMock,
  archiveInstanceMock,
  restoreInstanceMock
} = vi.hoisted(() => ({
  fetchInstancesMock: vi.fn(),
  fetchCustomersMock: vi.fn(),
  fetchTemplatesMock: vi.fn(),
  fetchServersMock: vi.fn(),
  updateInstanceMock: vi.fn(),
  archiveInstanceMock: vi.fn(),
  restoreInstanceMock: vi.fn()
}));

vi.mock("../shared/api/client", async () => {
  const actual = await vi.importActual<typeof import("../shared/api/client")>("../shared/api/client");
  return {
    ...actual,
    fetchInstances: fetchInstancesMock,
    fetchCustomers: fetchCustomersMock,
    fetchTemplates: fetchTemplatesMock,
    fetchServers: fetchServersMock,
    updateInstance: updateInstanceMock,
    archiveInstance: archiveInstanceMock,
    restoreInstance: restoreInstanceMock
  };
});

describe("InstanceListPage lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchCustomersMock.mockResolvedValue([{ id: "cust-001", name: "华东制造集团", recordStatus: "ACTIVE" }]);
    fetchTemplatesMock.mockResolvedValue([
      {
        id: "tpl-001",
        name: "供应链后台",
        productCode: "supply-admin",
        supportedReleaseSources: ["GIT"],
        actions: [{ id: "act-001", actionType: "DEPLOY", mode: "SCRIPT" }],
        recordStatus: "ACTIVE"
      }
    ]);
    fetchServersMock.mockResolvedValue([
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
    ]);
  });

  it("loads active instances by default and supports edit plus archive", async () => {
    fetchInstancesMock.mockResolvedValueOnce([
      {
        id: "ins-001",
        instanceName: "供应链后台-生产",
        environmentLabel: "prod",
        customerId: "cust-001",
        templateId: "tpl-001",
        primaryServerId: "srv-001",
        currentReleaseId: "rel-001",
        status: "RUNNING",
        notes: "主站实例",
        configOverride: { APP_PORT: "8080" },
        recordStatus: "ACTIVE"
      }
    ]);
    updateInstanceMock.mockResolvedValueOnce({
      id: "ins-001",
      instanceName: "供应链后台-生产",
      environmentLabel: "prod-blue",
      customerId: "cust-001",
      templateId: "tpl-001",
      primaryServerId: "srv-001",
      currentReleaseId: "rel-001",
      status: "RUNNING",
      notes: "蓝绿发布实例",
      configOverride: { APP_PORT: "8081" },
      recordStatus: "ACTIVE"
    });
    archiveInstanceMock.mockResolvedValueOnce({
      id: "ins-001",
      instanceName: "供应链后台-生产",
      environmentLabel: "prod-blue",
      customerId: "cust-001",
      templateId: "tpl-001",
      primaryServerId: "srv-001",
      currentReleaseId: "rel-001",
      status: "RUNNING",
      notes: "蓝绿发布实例",
      configOverride: { APP_PORT: "8081" },
      recordStatus: "ARCHIVED",
      archivedAt: "2026-05-18T10:00:00Z"
    });

    render(<InstanceListPage />);

    expect(fetchInstancesMock).toHaveBeenCalledWith("ACTIVE");
    expect(await screen.findByText("供应链后台-生产")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /编辑/ }));
    expect(await screen.findByText("编辑部署实例")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("环境标识"), { target: { value: "prod-blue" } });
    fireEvent.change(screen.getByLabelText("配置覆盖(JSON)"), { target: { value: '{"APP_PORT":"8081"}' } });
    fireEvent.change(screen.getByLabelText("备注"), { target: { value: "蓝绿发布实例" } });
    fireEvent.click(screen.getByRole("button", { name: /保\s*存/ }));

    await waitFor(() =>
      expect(updateInstanceMock).toHaveBeenCalledWith("ins-001", {
        customerId: "cust-001",
        templateId: "tpl-001",
        primaryServerId: "srv-001",
        instanceName: "供应链后台-生产",
        environmentLabel: "prod-blue",
        configOverride: { APP_PORT: "8081" },
        notes: "蓝绿发布实例"
      })
    );

    expect(await screen.findByText("prod-blue")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /归档/ }));

    await waitFor(() => expect(archiveInstanceMock).toHaveBeenCalledWith("ins-001"));
    await waitFor(() => expect(screen.queryByText("prod-blue")).not.toBeInTheDocument());
  });

  it("supports archived filter and restore", async () => {
    fetchInstancesMock
      .mockResolvedValueOnce([
        {
          id: "ins-001",
          instanceName: "供应链后台-生产",
          environmentLabel: "prod",
          customerId: "cust-001",
          templateId: "tpl-001",
          primaryServerId: "srv-001",
          status: "RUNNING",
          recordStatus: "ACTIVE"
        }
      ])
      .mockResolvedValueOnce([
        {
          id: "ins-002",
          instanceName: "历史实例",
          environmentLabel: "legacy",
          customerId: "cust-001",
          templateId: "tpl-001",
          primaryServerId: "srv-001",
          status: "STOPPED",
          recordStatus: "ARCHIVED",
          archivedAt: "2026-05-17T08:30:00Z"
        }
      ]);
    restoreInstanceMock.mockResolvedValueOnce({
      id: "ins-002",
      instanceName: "历史实例",
      environmentLabel: "legacy",
      customerId: "cust-001",
      templateId: "tpl-001",
      primaryServerId: "srv-001",
      status: "STOPPED",
      recordStatus: "ACTIVE"
    });

    render(<InstanceListPage />);

    expect(await screen.findByText("供应链后台-生产")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "已归档" }));

    await waitFor(() => expect(fetchInstancesMock).toHaveBeenLastCalledWith("ARCHIVED"));
    expect(await screen.findByText("历史实例")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /恢复/ }));

    await waitFor(() => expect(restoreInstanceMock).toHaveBeenCalledWith("ins-002"));
    await waitFor(() => expect(screen.queryByText("历史实例")).not.toBeInTheDocument());
  });
});
