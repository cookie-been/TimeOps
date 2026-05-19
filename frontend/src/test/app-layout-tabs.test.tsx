import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AppRouter } from "../app/router";
import { useAuthStore } from "../features/auth/authStore";

describe("AppLayout tabs", () => {
  it("opens menu pages as top tabs", async () => {
    useAuthStore.setState({ accessToken: "demo-access-token", username: "admin" });

    render(
      <MemoryRouter
        initialEntries={["/customers"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AppRouter />
      </MemoryRouter>
    );

    expect(await screen.findByRole("tab", { name: "客户管理" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "服务器" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "服务器" })).toBeInTheDocument();
    });

    expect(screen.getByRole("tab", { name: "客户管理" })).toBeInTheDocument();
  });
});
