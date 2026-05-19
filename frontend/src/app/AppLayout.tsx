import {
  CheckCircleOutlined,
  LogoutOutlined,
  MenuOutlined,
  PartitionOutlined,
} from "@ant-design/icons";
import { Avatar, Breadcrumb, Button, Drawer, Layout, Menu, Space, Tabs, Tag, Typography } from "antd";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/authStore";
import { flatNavigationItems, menuItems } from "./navigation";

const { Header, Sider, Content } = Layout;
const mobileNavigationBreakpoint = 992;
const openTabStorageKey = "timeops-open-tabs";

function findNavigationItem(pathname: string) {
  return flatNavigationItems.find((item) => pathname.startsWith(item.key));
}

function readStoredOpenTabKeys(): string[] {
  try {
    const raw = window.localStorage.getItem(openTabStorageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((key) => flatNavigationItems.some((item) => item.key === key));
  } catch {
    return [];
  }
}

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { username, clearSession } = useAuthStore();
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < mobileNavigationBreakpoint : false
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openTabKeys, setOpenTabKeys] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }
    return readStoredOpenTabKeys();
  });
  const currentNavigationItem = useMemo(() => findNavigationItem(location.pathname), [location.pathname]);

  const breadcrumbItems = useMemo(() => {
    const title = currentNavigationItem?.title ?? "控制台";
    return [{ title: "TimeOps" }, { title }];
  }, [currentNavigationItem]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleResize = () => {
      setIsMobileLayout(window.innerWidth < mobileNavigationBreakpoint);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, isMobileLayout]);

  useEffect(() => {
    if (!currentNavigationItem) {
      return;
    }

    setOpenTabKeys((current) => {
      const nextKeys = current.includes(currentNavigationItem.key)
        ? current
        : [...current, currentNavigationItem.key];
      window.localStorage.setItem(openTabStorageKey, JSON.stringify(nextKeys));
      return nextKeys;
    });
  }, [currentNavigationItem]);

  const visibleTabKeys = useMemo(() => {
    if (!currentNavigationItem) {
      return openTabKeys;
    }

    return openTabKeys.includes(currentNavigationItem.key)
      ? openTabKeys
      : [...openTabKeys, currentNavigationItem.key];
  }, [currentNavigationItem, openTabKeys]);

  const tabItems = useMemo(
    () =>
      visibleTabKeys
        .map((key) => flatNavigationItems.find((item) => item.key === key))
        .filter(Boolean)
        .map((item) => ({
          key: item!.key,
          label: item!.title,
          closable: visibleTabKeys.length > 1
        })),
    [visibleTabKeys]
  );

  const handleRemoveTab = (targetKey: string) => {
    const nextKeys = visibleTabKeys.filter((key) => key !== targetKey);
    const fallbackKeys = nextKeys.length > 0 ? nextKeys : ["/customers"];

    setOpenTabKeys(fallbackKeys);
    window.localStorage.setItem(openTabStorageKey, JSON.stringify(fallbackKeys));

    if (currentNavigationItem?.key === targetKey) {
      const targetIndex = visibleTabKeys.indexOf(targetKey);
      const nextActiveKey = nextKeys[targetIndex - 1] ?? nextKeys[targetIndex] ?? "/customers";
      navigate(nextActiveKey);
    }
  };

  const renderNavigationContent = (isMobile = false) => (
    <>
      <div className="timeops-brand">
        <div className="timeops-brand-mark">
          <PartitionOutlined />
        </div>
        <div>
          <Typography.Title level={4} style={{ margin: 0, color: "#f8fbff" }}>
            TimeOps
          </Typography.Title>
          <Typography.Text className="timeops-brand-subtitle">企业运维控制台</Typography.Text>
        </div>
      </div>
      <div className="timeops-env-banner">
        <span className="timeops-env-dot" />
        <span>当前环境：总部运维域</span>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[
          flatNavigationItems.find((item) => location.pathname.startsWith(item.key))?.key ?? "/customers"
        ]}
        items={menuItems}
        className="timeops-nav-menu"
        onClick={isMobile ? () => setMobileNavOpen(false) : undefined}
      />
      <div className="timeops-sider-footer">
        <Typography.Text className="timeops-sider-footer-label">权限基线</Typography.Text>
        <Tag color="blue" bordered={false}>
          SUPER_ADMIN
        </Tag>
      </div>
    </>
  );

  return (
    <Layout className={`timeops-shell${isMobileLayout ? " timeops-shell-mobile" : ""}`}>
      {isMobileLayout ? null : (
        <Sider width={248} theme="dark" className="timeops-sider">
          {renderNavigationContent()}
        </Sider>
      )}
      <Layout>
        <Header className="timeops-header">
          <div className="timeops-header-main">
            {isMobileLayout ? (
              <Button
                type="text"
                icon={<MenuOutlined />}
                className="timeops-mobile-nav-trigger"
                onClick={() => setMobileNavOpen(true)}
              >
                菜单
              </Button>
            ) : null}
            <div>
              <Typography.Text className="timeops-header-label">导航路径</Typography.Text>
              <Breadcrumb items={breadcrumbItems} />
            </div>
            <Space size={12}>
              <Tag icon={<CheckCircleOutlined />} color="success" bordered={false}>
                审计已启用
              </Tag>
              <Tag color="processing" bordered={false}>
                任务通道在线
              </Tag>
            </Space>
          </div>
          <div className="timeops-header-user">
            <Avatar className="timeops-user-avatar">{username?.slice(0, 1).toUpperCase() ?? "T"}</Avatar>
            <div>
              <Typography.Text strong>{username ?? "未登录"}</Typography.Text>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  内部运维账号
                </Typography.Text>
              </div>
            </div>
            <Button
              icon={<LogoutOutlined />}
              onClick={() => {
                clearSession();
                navigate("/login", { replace: true });
              }}
            >
              退出
            </Button>
          </div>
        </Header>
        <Content className="timeops-content">
          <div className="timeops-content-tabs">
            <Tabs
              type="editable-card"
              hideAdd
              activeKey={currentNavigationItem?.key}
              items={tabItems}
              onChange={(key) => navigate(key)}
              onEdit={(targetKey, action) => {
                if (action === "remove" && typeof targetKey === "string") {
                  handleRemoveTab(targetKey);
                }
              }}
            />
          </div>
          <div className="timeops-page">{children}</div>
        </Content>
      </Layout>
      <Drawer
        placement="left"
        width={280}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        closable={false}
        className="timeops-mobile-nav-drawer"
        styles={{ body: { padding: 0, background: "#0f1728" } }}
      >
        <div className="timeops-sider timeops-mobile-nav">{renderNavigationContent(true)}</div>
      </Drawer>
    </Layout>
  );
}
