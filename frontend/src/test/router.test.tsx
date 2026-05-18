import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AppRouter } from "../app/router";

describe("protected route", () => {
  it("redirects anonymous user to login", async () => {
    render(
      <MemoryRouter
        initialEntries={["/customers"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AppRouter />
      </MemoryRouter>
    );

    expect(await screen.findByText("登录 TimeOps")).toBeInTheDocument();
  });
});
