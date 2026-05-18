import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomerListPage } from "../features/customers/CustomerListPage";

const { createCustomerMock } = vi.hoisted(() => ({
  createCustomerMock: vi.fn()
}));

vi.mock("../shared/api/client", async () => {
  const actual = await vi.importActual<typeof import("../shared/api/client")>("../shared/api/client");
  return {
    ...actual,
    createCustomer: createCustomerMock
  };
});

describe("CustomerListPage create flow", () => {
  it("opens create drawer and appends created customer", async () => {
    createCustomerMock.mockResolvedValueOnce({
      id: "cust-new",
      name: "华北能源集团",
      contactName: "赵磊",
      contactPhone: "13600000000",
      contactEmail: "zhaolei@example.com",
      notes: "新增客户",
      recordStatus: "ACTIVE"
    });

    render(<CustomerListPage />);

    fireEvent.click(screen.getByRole("button", { name: /新增客户/ }));

    expect(await screen.findByText("新增客户档案")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("客户名称"), { target: { value: "华北能源集团" } });
    fireEvent.change(screen.getByLabelText("联系人"), { target: { value: "赵磊" } });
    fireEvent.change(screen.getByLabelText("联系电话"), { target: { value: "13600000000" } });
    fireEvent.change(screen.getByLabelText("联系邮箱"), { target: { value: "zhaolei@example.com" } });
    fireEvent.change(screen.getByLabelText("备注"), { target: { value: "新增客户" } });

    fireEvent.click(screen.getByRole("button", { name: /提\s*交/ }));

    await waitFor(() =>
      expect(createCustomerMock).toHaveBeenCalledWith({
        name: "华北能源集团",
        contactName: "赵磊",
        contactPhone: "13600000000",
        contactEmail: "zhaolei@example.com",
        notes: "新增客户"
      })
    );

    expect(await screen.findByText("华北能源集团")).toBeInTheDocument();
  });
});
