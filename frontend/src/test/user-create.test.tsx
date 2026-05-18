import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserRolePage } from "../features/users/UserRolePage";

const { createUserMock, fetchRolesMock } = vi.hoisted(() => ({
  createUserMock: vi.fn(),
  fetchRolesMock: vi.fn()
}));

vi.mock("../shared/api/client", async () => {
  const actual = await vi.importActual<typeof import("../shared/api/client")>("../shared/api/client");
  return {
    ...actual,
    createUser: createUserMock,
    fetchRoleOptions: fetchRolesMock
  };
});

describe("UserRolePage create flow", () => {
  it("opens create drawer and appends created user", async () => {
    fetchRolesMock.mockResolvedValueOnce([
      { roleCode: "OPS_ADMIN", roleName: "运维管理员" },
      { roleCode: "AUDITOR", roleName: "审计员" }
    ]);
    createUserMock.mockResolvedValueOnce({
      id: "usr-new",
      username: "ops.manager",
      displayName: "运维经理",
      roles: ["OPS_ADMIN", "AUDITOR"],
      status: "启用",
      lastLoginAt: undefined
    });

    render(<UserRolePage />);

    fireEvent.click(screen.getByRole("button", { name: /新增账号/ }));

    expect(await screen.findByText("新增运维账号")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "ops.manager" } });
    fireEvent.change(screen.getByLabelText("显示名"), { target: { value: "运维经理" } });
    fireEvent.change(screen.getByLabelText("初始密码"), { target: { value: "OpsManager@123" } });

    fireEvent.mouseDown(screen.getByLabelText("角色").parentElement!.querySelector(".ant-select-selector")!);
    fireEvent.click(await screen.findByText("运维管理员"));
    fireEvent.click(await screen.findByText("审计员"));

    fireEvent.click(screen.getByRole("button", { name: /提\s*交/ }));

    await waitFor(() =>
      expect(createUserMock).toHaveBeenCalledWith({
        username: "ops.manager",
        displayName: "运维经理",
        password: "OpsManager@123",
        roleCodes: ["OPS_ADMIN", "AUDITOR"],
        enabled: true
      })
    );

    expect(await screen.findByText("ops.manager")).toBeInTheDocument();
  });
});
