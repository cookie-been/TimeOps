import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TaskCenterPage } from "../features/tasks/TaskCenterPage";

describe("TaskCenterPage", () => {
  it("renders task filters and log drawer trigger", async () => {
    render(<TaskCenterPage />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("任务中心")).toBeInTheDocument();
    expect(screen.getByText("任务类型")).toBeInTheDocument();
    expect(screen.getByText("退出码")).toBeInTheDocument();
    expect(screen.getByText("查看日志")).toBeInTheDocument();
  });

  it("opens drawer when clicking log action", async () => {
    render(<TaskCenterPage />);

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByText("查看日志"));

    expect(await screen.findByText(/任务日志/)).toBeInTheDocument();
    expect(screen.getByText("输出日志")).toBeInTheDocument();
  });

  it("shows delivery task modes in create drawer", async () => {
    render(<TaskCenterPage />);

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: /创建任务/ }));

    expect(await screen.findByText("备份")).toBeInTheDocument();
    expect(screen.getByText("回滚")).toBeInTheDocument();
    expect(screen.getByText("验证")).toBeInTheDocument();
  });
});
