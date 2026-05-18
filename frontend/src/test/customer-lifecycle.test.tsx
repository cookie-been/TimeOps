import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerListPage } from "../features/customers/CustomerListPage";

const {
  fetchCustomersMock,
  updateCustomerMock,
  archiveCustomerMock,
  restoreCustomerMock
} = vi.hoisted(() => ({
  fetchCustomersMock: vi.fn(),
  updateCustomerMock: vi.fn(),
  archiveCustomerMock: vi.fn(),
  restoreCustomerMock: vi.fn()
}));

vi.mock("../shared/api/client", async () => {
  const actual = await vi.importActual<typeof import("../shared/api/client")>("../shared/api/client");
  return {
    ...actual,
    fetchCustomers: fetchCustomersMock,
    updateCustomer: updateCustomerMock,
    archiveCustomer: archiveCustomerMock,
    restoreCustomer: restoreCustomerMock
  };
});

describe("CustomerListPage lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads active customers by default and supports edit plus archive", async () => {
    fetchCustomersMock.mockResolvedValueOnce([
      {
        id: "cust-001",
        name: "华东制造集团",
        contactName: "张敏",
        contactPhone: "13800001234",
        contactEmail: "zhangmin@example.com",
        notes: "年度维保客户",
        recordStatus: "ACTIVE"
      }
    ]);
    updateCustomerMock.mockResolvedValueOnce({
      id: "cust-001",
      name: "华东制造集团-升级",
      contactName: "张敏",
      contactPhone: "13800001234",
      contactEmail: "zhangmin@example.com",
      notes: "重点客户",
      recordStatus: "ACTIVE"
    });
    archiveCustomerMock.mockResolvedValueOnce({
      id: "cust-001",
      name: "华东制造集团-升级",
      contactName: "张敏",
      contactPhone: "13800001234",
      contactEmail: "zhangmin@example.com",
      notes: "重点客户",
      recordStatus: "ARCHIVED",
      archivedAt: "2026-05-18T10:00:00Z"
    });

    render(<CustomerListPage />);

    expect(fetchCustomersMock).toHaveBeenCalledWith("ACTIVE");
    expect(await screen.findByText("华东制造集团")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /编辑/ }));

    expect(await screen.findByText("编辑客户档案")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("客户名称"), { target: { value: "华东制造集团-升级" } });
    fireEvent.change(screen.getByLabelText("备注"), { target: { value: "重点客户" } });
    fireEvent.click(screen.getByRole("button", { name: /保\s*存/ }));

    await waitFor(() =>
      expect(updateCustomerMock).toHaveBeenCalledWith("cust-001", {
        name: "华东制造集团-升级",
        contactName: "张敏",
        contactPhone: "13800001234",
        contactEmail: "zhangmin@example.com",
        notes: "重点客户"
      })
    );

    expect(await screen.findByText("华东制造集团-升级")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /归档/ }));

    await waitFor(() => expect(archiveCustomerMock).toHaveBeenCalledWith("cust-001"));
    await waitFor(() => expect(screen.queryByText("华东制造集团-升级")).not.toBeInTheDocument());
  });

  it("supports archived filter and restore", async () => {
    fetchCustomersMock
      .mockResolvedValueOnce([
        {
          id: "cust-001",
          name: "华东制造集团",
          contactName: "张敏",
          contactPhone: "13800001234",
          contactEmail: "zhangmin@example.com",
          notes: "年度维保客户",
          recordStatus: "ACTIVE"
        }
      ])
      .mockResolvedValueOnce([
        {
          id: "cust-002",
          name: "历史客户",
          contactName: "李辉",
          contactPhone: "13900005678",
          contactEmail: "lihui@example.com",
          notes: "已归档",
          recordStatus: "ARCHIVED",
          archivedAt: "2026-05-17T08:30:00Z"
        }
      ]);
    restoreCustomerMock.mockResolvedValueOnce({
      id: "cust-002",
      name: "历史客户",
      contactName: "李辉",
      contactPhone: "13900005678",
      contactEmail: "lihui@example.com",
      notes: "已归档",
      recordStatus: "ACTIVE"
    });

    render(<CustomerListPage />);

    expect(await screen.findByText("华东制造集团")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "已归档" }));

    await waitFor(() => expect(fetchCustomersMock).toHaveBeenLastCalledWith("ARCHIVED"));
    expect(await screen.findByText("历史客户")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /恢复/ }));

    await waitFor(() => expect(restoreCustomerMock).toHaveBeenCalledWith("cust-002"));
    await waitFor(() => expect(screen.queryByText("历史客户")).not.toBeInTheDocument());
  });
});
