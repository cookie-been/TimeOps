import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage";

describe("LoginPage", () => {
  it("stores session in localStorage when remember me is checked", async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "Admin@123" } });
    fireEvent.click(screen.getByRole("button", { name: /登\s*录/ }));

    await waitFor(() => {
      expect(window.localStorage.getItem("timeops-access-token")).toBe("demo-access-token");
      expect(window.localStorage.getItem("timeops-username")).toBe("admin");
    });

    expect(window.sessionStorage.getItem("timeops-access-token")).toBeNull();
  });

  it("stores session in sessionStorage when remember me is unchecked", async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const rememberMeCheckbox = screen.getByRole("checkbox", { name: "记住我" });
    fireEvent.click(rememberMeCheckbox);
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "Admin@123" } });
    fireEvent.click(screen.getByRole("button", { name: /登\s*录/ }));

    await waitFor(() => {
      expect(window.sessionStorage.getItem("timeops-access-token")).toBe("demo-access-token");
      expect(window.sessionStorage.getItem("timeops-username")).toBe("admin");
    });

    expect(window.localStorage.getItem("timeops-access-token")).toBeNull();
  });
});
