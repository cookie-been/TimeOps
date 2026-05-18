import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TemplateListPage } from "../features/templates/TemplateListPage";

const {
  fetchTemplatesMock,
  updateTemplateMock,
  archiveTemplateMock,
  restoreTemplateMock
} = vi.hoisted(() => ({
  fetchTemplatesMock: vi.fn(),
  updateTemplateMock: vi.fn(),
  archiveTemplateMock: vi.fn(),
  restoreTemplateMock: vi.fn()
}));

vi.mock("../shared/api/client", async () => {
  const actual = await vi.importActual<typeof import("../shared/api/client")>("../shared/api/client");
  return {
    ...actual,
    fetchTemplates: fetchTemplatesMock,
    updateTemplate: updateTemplateMock,
    archiveTemplate: archiveTemplateMock,
    restoreTemplate: restoreTemplateMock
  };
});

describe("TemplateListPage lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads active templates by default and supports edit plus archive", async () => {
    fetchTemplatesMock.mockResolvedValueOnce([
      {
        id: "tpl-001",
        name: "供应链后台",
        productCode: "supply-admin",
        supportedReleaseSources: ["GIT"],
        defaultWorkDir: "/opt/supply-admin",
        defaultConfig: { APP_PORT: "8080" },
        description: "标准管理后台交付模板",
        actions: [
          {
            id: "act-001",
            actionType: "DEPLOY",
            mode: "SCRIPT",
            scriptBody: "echo deploy"
          }
        ],
        recordStatus: "ACTIVE"
      }
    ]);
    updateTemplateMock.mockResolvedValueOnce({
      id: "tpl-001",
      name: "供应链后台标准版",
      productCode: "supply-admin",
      supportedReleaseSources: ["GIT"],
      defaultWorkDir: "/opt/supply-admin",
      defaultConfig: { APP_PORT: "8080" },
      description: "标准化脚本模板",
      actions: [
        {
          id: "act-001",
          actionType: "DEPLOY",
          mode: "SCRIPT",
          scriptBody: "echo release"
        }
      ],
      recordStatus: "ACTIVE"
    });
    archiveTemplateMock.mockResolvedValueOnce({
      id: "tpl-001",
      name: "供应链后台标准版",
      productCode: "supply-admin",
      supportedReleaseSources: ["GIT"],
      defaultWorkDir: "/opt/supply-admin",
      defaultConfig: { APP_PORT: "8080" },
      description: "标准化脚本模板",
      actions: [
        {
          id: "act-001",
          actionType: "DEPLOY",
          mode: "SCRIPT",
          scriptBody: "echo release"
        }
      ],
      recordStatus: "ARCHIVED",
      archivedAt: "2026-05-18T10:00:00Z"
    });

    render(<TemplateListPage />);

    expect(fetchTemplatesMock).toHaveBeenCalledWith("ACTIVE");
    expect(await screen.findByText("供应链后台")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /编辑/ }));
    expect(await screen.findByText("编辑产品模板")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("模板名称"), { target: { value: "供应链后台标准版" } });
    fireEvent.change(screen.getByLabelText("部署脚本"), { target: { value: "echo release" } });
    fireEvent.change(screen.getByLabelText("说明"), { target: { value: "标准化脚本模板" } });
    fireEvent.click(screen.getByRole("button", { name: /保\s*存/ }));

    await waitFor(() =>
      expect(updateTemplateMock).toHaveBeenCalledWith("tpl-001", {
        name: "供应链后台标准版",
        productCode: "supply-admin",
        supportedReleaseSources: ["GIT"],
        defaultWorkDir: "/opt/supply-admin",
        defaultConfig: { APP_PORT: "8080" },
        description: "标准化脚本模板",
        actions: [
          {
            actionType: "DEPLOY",
            mode: "SCRIPT",
            executionOrder: 1,
            scriptBody: "echo release"
          }
        ]
      })
    );

    expect(await screen.findByText("供应链后台标准版")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /归档/ }));

    await waitFor(() => expect(archiveTemplateMock).toHaveBeenCalledWith("tpl-001"));
    await waitFor(() => expect(screen.queryByText("供应链后台标准版")).not.toBeInTheDocument());
  });

  it("supports archived filter and restore", async () => {
    fetchTemplatesMock
      .mockResolvedValueOnce([
        {
          id: "tpl-001",
          name: "供应链后台",
          productCode: "supply-admin",
          supportedReleaseSources: ["GIT"],
          actions: [{ id: "act-001", actionType: "DEPLOY", mode: "SCRIPT" }],
          recordStatus: "ACTIVE"
        }
      ])
      .mockResolvedValueOnce([
        {
          id: "tpl-002",
          name: "历史模板",
          productCode: "legacy-portal",
          supportedReleaseSources: ["PACKAGE"],
          actions: [{ id: "act-002", actionType: "DEPLOY", mode: "SCRIPT" }],
          recordStatus: "ARCHIVED",
          archivedAt: "2026-05-17T08:30:00Z"
        }
      ]);
    restoreTemplateMock.mockResolvedValueOnce({
      id: "tpl-002",
      name: "历史模板",
      productCode: "legacy-portal",
      supportedReleaseSources: ["PACKAGE"],
      actions: [{ id: "act-002", actionType: "DEPLOY", mode: "SCRIPT" }],
      recordStatus: "ACTIVE"
    });

    render(<TemplateListPage />);

    expect(await screen.findByText("供应链后台")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "已归档" }));

    await waitFor(() => expect(fetchTemplatesMock).toHaveBeenLastCalledWith("ARCHIVED"));
    expect(await screen.findByText("历史模板")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /恢复/ }));

    await waitFor(() => expect(restoreTemplateMock).toHaveBeenCalledWith("tpl-002"));
    await waitFor(() => expect(screen.queryByText("历史模板")).not.toBeInTheDocument());
  });

  it("supports editing step action definitions", async () => {
    fetchTemplatesMock.mockResolvedValueOnce([
      {
        id: "tpl-step",
        name: "交付模板",
        productCode: "delivery-step",
        supportedReleaseSources: ["GIT"],
        defaultWorkDir: "/srv/delivery",
        defaultConfig: { APP_PORT: "8080" },
        description: "STEP 模板",
        actions: [
          {
            id: "act-step",
            actionType: "DEPLOY",
            mode: "STEP",
            stepDefinition: {
              script: "./ops/deploy.sh",
              useMergedConfigEnv: true
            }
          }
        ],
        recordStatus: "ACTIVE"
      }
    ]);
    updateTemplateMock.mockResolvedValueOnce({
      id: "tpl-step",
      name: "交付模板",
      productCode: "delivery-step",
      supportedReleaseSources: ["GIT"],
      defaultWorkDir: "/srv/delivery",
      defaultConfig: { APP_PORT: "8080" },
      description: "STEP 模板已更新",
      actions: [
        {
          id: "act-step",
          actionType: "DEPLOY",
          mode: "STEP",
          stepDefinition: {
            script: "./ops/verify.sh",
            useMergedConfigEnv: true,
            useInstanceEnvironment: true
          }
        }
      ],
      recordStatus: "ACTIVE"
    });

    render(<TemplateListPage />);

    expect(await screen.findByText("交付模板")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /编辑/ }));
    expect(await screen.findByText("编辑产品模板")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("部署步骤定义(JSON)"), {
      target: {
        value: JSON.stringify(
          {
            script: "./ops/verify.sh",
            useMergedConfigEnv: true,
            useInstanceEnvironment: true
          },
          null,
          2
        )
      }
    });
    fireEvent.change(screen.getByLabelText("说明"), { target: { value: "STEP 模板已更新" } });
    fireEvent.click(screen.getByRole("button", { name: /保\s*存/ }));

    await waitFor(() =>
      expect(updateTemplateMock).toHaveBeenCalledWith("tpl-step", {
        name: "交付模板",
        productCode: "delivery-step",
        supportedReleaseSources: ["GIT"],
        defaultWorkDir: "/srv/delivery",
        defaultConfig: { APP_PORT: "8080" },
        description: "STEP 模板已更新",
        actions: [
          {
            actionType: "DEPLOY",
            mode: "STEP",
            executionOrder: 1,
            stepDefinition: {
              script: "./ops/verify.sh",
              useMergedConfigEnv: true,
              useInstanceEnvironment: true
            }
          }
        ]
      })
    );
  });

  it("supports enabling additional delivery actions", async () => {
    fetchTemplatesMock.mockResolvedValueOnce([
      {
        id: "tpl-delivery",
        name: "交付模板",
        productCode: "delivery-platform",
        supportedReleaseSources: ["GIT"],
        defaultWorkDir: "/srv/delivery",
        defaultConfig: { APP_PORT: "8080" },
        description: "多动作模板",
        actions: [
          {
            id: "act-deploy",
            actionType: "DEPLOY",
            mode: "SCRIPT",
            scriptBody: "./ops/deploy.sh"
          }
        ],
        recordStatus: "ACTIVE"
      }
    ]);
    updateTemplateMock.mockResolvedValueOnce({
      id: "tpl-delivery",
      name: "交付模板",
      productCode: "delivery-platform",
      supportedReleaseSources: ["GIT"],
      defaultWorkDir: "/srv/delivery",
      defaultConfig: { APP_PORT: "8080" },
      description: "多动作模板",
      actions: [
        {
          id: "act-deploy",
          actionType: "DEPLOY",
          mode: "SCRIPT",
          scriptBody: "./ops/deploy.sh"
        },
        {
          id: "act-backup",
          actionType: "BACKUP",
          mode: "SCRIPT",
          scriptBody: "./ops/backup.sh"
        },
        {
          id: "act-verify",
          actionType: "VERIFY",
          mode: "STEP",
          stepDefinition: {
            script: "./ops/verify.sh",
            useMergedConfigEnv: true
          }
        }
      ],
      recordStatus: "ACTIVE"
    });

    render(<TemplateListPage />);

    expect(await screen.findByText("交付模板")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /编辑/ }));
    expect(await screen.findByText("编辑产品模板")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "启用备份动作" }));
    fireEvent.change(screen.getByLabelText("备份脚本"), { target: { value: "./ops/backup.sh" } });

    fireEvent.click(screen.getByRole("checkbox", { name: "启用验证动作" }));
    fireEvent.click(screen.getByLabelText("验证动作模式"));
    const verifyModeOptions = screen.getAllByRole("radio", { name: "步骤" });
    fireEvent.click(verifyModeOptions[verifyModeOptions.length - 1].closest("label")!);
    fireEvent.change(screen.getByLabelText("验证步骤定义(JSON)"), {
      target: {
        value: JSON.stringify(
          {
            script: "./ops/verify.sh",
            useMergedConfigEnv: true
          },
          null,
          2
        )
      }
    });

    fireEvent.click(screen.getByRole("button", { name: /保\s*存/ }));

    await waitFor(() =>
      expect(updateTemplateMock).toHaveBeenCalledWith("tpl-delivery", {
        name: "交付模板",
        productCode: "delivery-platform",
        supportedReleaseSources: ["GIT"],
        defaultWorkDir: "/srv/delivery",
        defaultConfig: { APP_PORT: "8080" },
        description: "多动作模板",
        actions: [
          {
            actionType: "DEPLOY",
            mode: "SCRIPT",
            executionOrder: 1,
            scriptBody: "./ops/deploy.sh"
          },
          {
            actionType: "BACKUP",
            mode: "SCRIPT",
            executionOrder: 2,
            scriptBody: "./ops/backup.sh"
          },
          {
            actionType: "VERIFY",
            mode: "STEP",
            executionOrder: 3,
            stepDefinition: {
              script: "./ops/verify.sh",
              useMergedConfigEnv: true
            }
          }
        ]
      })
    );
  });

  it("supports reordering enabled delivery actions before save", async () => {
    fetchTemplatesMock.mockResolvedValueOnce([
      {
        id: "tpl-order",
        name: "顺序模板",
        productCode: "delivery-order",
        supportedReleaseSources: ["GIT"],
        defaultWorkDir: "/srv/delivery",
        defaultConfig: { APP_PORT: "8080" },
        description: "动作顺序调整",
        actions: [
          {
            id: "act-deploy",
            actionType: "DEPLOY",
            mode: "SCRIPT",
            scriptBody: "./ops/deploy.sh"
          },
          {
            id: "act-backup",
            actionType: "BACKUP",
            mode: "SCRIPT",
            scriptBody: "./ops/backup.sh"
          },
          {
            id: "act-verify",
            actionType: "VERIFY",
            mode: "STEP",
            stepDefinition: {
              script: "./ops/verify.sh",
              useMergedConfigEnv: true
            }
          }
        ],
        recordStatus: "ACTIVE"
      }
    ]);
    updateTemplateMock.mockResolvedValueOnce({
      id: "tpl-order",
      name: "顺序模板",
      productCode: "delivery-order",
      supportedReleaseSources: ["GIT"],
      defaultWorkDir: "/srv/delivery",
      defaultConfig: { APP_PORT: "8080" },
      description: "动作顺序调整",
      actions: [
        {
          id: "act-verify",
          actionType: "VERIFY",
          mode: "STEP",
          stepDefinition: {
            script: "./ops/verify.sh",
            useMergedConfigEnv: true
          }
        },
        {
          id: "act-deploy",
          actionType: "DEPLOY",
          mode: "SCRIPT",
          scriptBody: "./ops/deploy.sh"
        },
        {
          id: "act-backup",
          actionType: "BACKUP",
          mode: "SCRIPT",
          scriptBody: "./ops/backup.sh"
        }
      ],
      recordStatus: "ACTIVE"
    });

    render(<TemplateListPage />);

    expect(await screen.findByText("顺序模板")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /编辑/ }));
    expect(await screen.findByText("编辑产品模板")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "上移验证动作" }));
    fireEvent.click(screen.getByRole("button", { name: "上移验证动作" }));
    fireEvent.click(screen.getByRole("button", { name: /保\s*存/ }));

    await waitFor(() =>
      expect(updateTemplateMock).toHaveBeenCalledWith("tpl-order", {
        name: "顺序模板",
        productCode: "delivery-order",
        supportedReleaseSources: ["GIT"],
        defaultWorkDir: "/srv/delivery",
        defaultConfig: { APP_PORT: "8080" },
        description: "动作顺序调整",
        actions: [
          {
            actionType: "VERIFY",
            mode: "STEP",
            executionOrder: 1,
            stepDefinition: {
              script: "./ops/verify.sh",
              useMergedConfigEnv: true
            }
          },
          {
            actionType: "DEPLOY",
            mode: "SCRIPT",
            executionOrder: 2,
            scriptBody: "./ops/deploy.sh"
          },
          {
            actionType: "BACKUP",
            mode: "SCRIPT",
            executionOrder: 3,
            scriptBody: "./ops/backup.sh"
          }
        ]
      })
    );
  });
});
