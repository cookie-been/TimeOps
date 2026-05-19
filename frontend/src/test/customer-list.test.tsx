import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CustomerListPage } from "../features/customers/CustomerListPage";

describe("CustomerListPage", () => {
  it("renders customer table columns", async () => {
    render(<CustomerListPage />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole("columnheader", { name: "客户名称" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "联系人" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "联系邮箱" })).toBeInTheDocument();
  });
});
