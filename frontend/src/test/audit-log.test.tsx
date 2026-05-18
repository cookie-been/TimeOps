import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuditLogPage } from "../features/audit/AuditLogPage";

const { exportAuditLogsMock } = vi.hoisted(() => ({
  exportAuditLogsMock: vi.fn()
}));

vi.mock("../shared/api/client", async () => {
  const actual = await vi.importActual<typeof import("../shared/api/client")>("../shared/api/client");
  return {
    ...actual,
    exportAuditLogs: exportAuditLogsMock
  };
});

describe("AuditLogPage", () => {
  it("filters audit logs, opens detail drawer and exports current result", async () => {
    exportAuditLogsMock.mockResolvedValueOnce("审计ID,动作类型\n" + "audit-002,ADHOC_COMMAND");

    render(<AuditLogPage />);

    expect(await screen.findByText("系统管理员")).toBeInTheDocument();
    expect(screen.getByText("运维专员")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByLabelText("动作类型").parentElement!.querySelector(".ant-select-selector")!);
    fireEvent.click(await screen.findByText("高风险命令"));

    await waitFor(() => {
      expect(screen.queryByText("系统管理员")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /查看详情/ }));

    expect(await screen.findByText("审计详情 audit-002")).toBeInTheDocument();
    expect(screen.getByText("docker ps")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /导出/ }));

    await waitFor(() =>
      expect(exportAuditLogsMock).toHaveBeenCalledWith([
        expect.objectContaining({
          id: "audit-002",
          actionType: "ADHOC_COMMAND"
        })
      ])
    );
  });
});
