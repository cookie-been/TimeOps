import { Spin } from "antd";
import { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { useAuthStore } from "../features/auth/authStore";

const LoginPage = lazy(async () => {
  const module = await import("../features/auth/LoginPage");
  return { default: module.LoginPage };
});

const CustomerListPage = lazy(async () => {
  const module = await import("../features/customers/CustomerListPage");
  return { default: module.CustomerListPage };
});

const ServerListPage = lazy(async () => {
  const module = await import("../features/servers/ServerListPage");
  return { default: module.ServerListPage };
});

const TemplateListPage = lazy(async () => {
  const module = await import("../features/templates/TemplateListPage");
  return { default: module.TemplateListPage };
});

const ReleaseListPage = lazy(async () => {
  const module = await import("../features/releases/ReleaseListPage");
  return { default: module.ReleaseListPage };
});

const InstanceListPage = lazy(async () => {
  const module = await import("../features/instances/InstanceListPage");
  return { default: module.InstanceListPage };
});

const TaskCenterPage = lazy(async () => {
  const module = await import("../features/tasks/TaskCenterPage");
  return { default: module.TaskCenterPage };
});

const AuditLogPage = lazy(async () => {
  const module = await import("../features/audit/AuditLogPage");
  return { default: module.AuditLogPage };
});

const UserRolePage = lazy(async () => {
  const module = await import("../features/users/UserRolePage");
  return { default: module.UserRolePage };
});

function RouteLoadingFallback() {
  return (
    <div
      style={{
        minHeight: "40vh",
        display: "grid",
        placeItems: "center"
      }}
    >
      <Spin size="large" />
    </div>
  );
}

function ProtectedShell() {
  const accessToken = useAuthStore((state) => state.accessToken);

  if (accessToken === undefined) {
    return <Spin fullscreen />;
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Outlet />
      </Suspense>
    </AppLayout>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Suspense fallback={<Spin fullscreen />}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route element={<ProtectedShell />}>
        <Route path="/" element={<Navigate to="/customers" replace />} />
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/servers" element={<ServerListPage />} />
        <Route path="/templates" element={<TemplateListPage />} />
        <Route path="/releases" element={<ReleaseListPage />} />
        <Route path="/instances" element={<InstanceListPage />} />
        <Route path="/tasks" element={<TaskCenterPage />} />
        <Route path="/audit-logs" element={<AuditLogPage />} />
        <Route path="/users" element={<UserRolePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
