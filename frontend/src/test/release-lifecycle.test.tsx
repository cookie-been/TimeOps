import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReleaseListPage } from "../features/releases/ReleaseListPage";

const {
  fetchReleasesMock,
  fetchTemplatesMock,
  updateReleaseMock,
  archiveReleaseMock,
  restoreReleaseMock
} = vi.hoisted(() => ({
  fetchReleasesMock: vi.fn(),
  fetchTemplatesMock: vi.fn(),
  updateReleaseMock: vi.fn(),
  archiveReleaseMock: vi.fn(),
  restoreReleaseMock: vi.fn()
}));

vi.mock("../shared/api/client", async () => {
  const actual = await vi.importActual<typeof import("../shared/api/client")>("../shared/api/client");
  return {
    ...actual,
    fetchReleases: fetchReleasesMock,
    fetchTemplates: fetchTemplatesMock,
    updateRelease: updateReleaseMock,
    archiveRelease: archiveReleaseMock,
    restoreRelease: restoreReleaseMock
  };
});

describe("ReleaseListPage lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchTemplatesMock.mockResolvedValue([
      {
        id: "tpl-001",
        name: "供应链后台",
        productCode: "supply-admin",
        supportedReleaseSources: ["GIT"],
        actions: [{ id: "act-001", actionType: "DEPLOY", mode: "SCRIPT" }],
        recordStatus: "ACTIVE"
      }
    ]);
  });

  it("loads active releases by default and supports edit plus archive", async () => {
    fetchReleasesMock.mockResolvedValueOnce([
      {
        id: "rel-001",
        templateId: "tpl-001",
        versionLabel: "v2.1.0",
        sourceType: "GIT",
        repositoryUrl: "https://example.com/supply-admin.git",
        gitRef: "refs/tags/v2.1.0",
        changelog: "修复库存同步",
        createdBy: "admin",
        createdAt: "2026-05-18T09:30:00Z",
        recordStatus: "ACTIVE"
      }
    ]);
    updateReleaseMock.mockResolvedValueOnce({
      id: "rel-001",
      templateId: "tpl-001",
      versionLabel: "v2.1.1",
      sourceType: "GIT",
      repositoryUrl: "https://example.com/supply-admin.git",
      gitRef: "refs/tags/v2.1.1",
      changelog: "补充灰度脚本",
      createdBy: "admin",
      createdAt: "2026-05-18T09:30:00Z",
      recordStatus: "ACTIVE"
    });
    archiveReleaseMock.mockResolvedValueOnce({
      id: "rel-001",
      templateId: "tpl-001",
      versionLabel: "v2.1.1",
      sourceType: "GIT",
      repositoryUrl: "https://example.com/supply-admin.git",
      gitRef: "refs/tags/v2.1.1",
      changelog: "补充灰度脚本",
      createdBy: "admin",
      createdAt: "2026-05-18T09:30:00Z",
      recordStatus: "ARCHIVED",
      archivedAt: "2026-05-18T10:00:00Z"
    });

    render(<ReleaseListPage />);

    expect(fetchReleasesMock).toHaveBeenCalledWith("ACTIVE");
    expect(await screen.findByText("v2.1.0")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /编辑/ }));
    expect(await screen.findByText("编辑发布版本")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("版本号"), { target: { value: "v2.1.1" } });
    fireEvent.change(screen.getByLabelText("Git 引用"), { target: { value: "refs/tags/v2.1.1" } });
    fireEvent.change(screen.getByLabelText("变更说明"), { target: { value: "补充灰度脚本" } });
    fireEvent.click(screen.getByRole("button", { name: /保\s*存/ }));

    await waitFor(() =>
      expect(updateReleaseMock).toHaveBeenCalledWith("rel-001", {
        templateId: "tpl-001",
        versionLabel: "v2.1.1",
        sourceType: "GIT",
        repositoryUrl: "https://example.com/supply-admin.git",
        gitRef: "refs/tags/v2.1.1",
        packageUri: undefined,
        changelog: "补充灰度脚本"
      })
    );

    expect(await screen.findByText("v2.1.1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /归档/ }));

    await waitFor(() => expect(archiveReleaseMock).toHaveBeenCalledWith("rel-001"));
    await waitFor(() => expect(screen.queryByText("v2.1.1")).not.toBeInTheDocument());
  });

  it("supports archived filter and restore", async () => {
    fetchReleasesMock
      .mockResolvedValueOnce([
        {
          id: "rel-001",
          templateId: "tpl-001",
          versionLabel: "v2.1.0",
          sourceType: "GIT",
          recordStatus: "ACTIVE"
        }
      ])
      .mockResolvedValueOnce([
        {
          id: "rel-002",
          templateId: "tpl-001",
          versionLabel: "v1.0.0",
          sourceType: "PACKAGE",
          packageUri: "https://example.com/legacy.tar.gz",
          recordStatus: "ARCHIVED",
          archivedAt: "2026-05-17T08:30:00Z"
        }
      ]);
    restoreReleaseMock.mockResolvedValueOnce({
      id: "rel-002",
      templateId: "tpl-001",
      versionLabel: "v1.0.0",
      sourceType: "PACKAGE",
      packageUri: "https://example.com/legacy.tar.gz",
      recordStatus: "ACTIVE"
    });

    render(<ReleaseListPage />);

    expect(await screen.findByText("v2.1.0")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "已归档" }));

    await waitFor(() => expect(fetchReleasesMock).toHaveBeenLastCalledWith("ARCHIVED"));
    expect(await screen.findByText("v1.0.0")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /恢复/ }));

    await waitFor(() => expect(restoreReleaseMock).toHaveBeenCalledWith("rel-002"));
    await waitFor(() => expect(screen.queryByText("v1.0.0")).not.toBeInTheDocument());
  });
});
