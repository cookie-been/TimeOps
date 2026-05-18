import {
  AuditOutlined,
  CheckCircleOutlined,
  ClusterOutlined,
  CloudServerOutlined,
  DeploymentUnitOutlined,
  LogoutOutlined,
  PartitionOutlined,
  SafetyCertificateOutlined,
  TagsOutlined,
  TeamOutlined,
  UnorderedListOutlined
} from "@ant-design/icons";
import { Avatar, Breadcrumb, Button, Layout, Menu, Space, Tag, Typography } from "antd";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/authStore";

const { Header, Sider, Content } = Layout;

const navigationGroups = [
  {
    key: "delivery",
    label: "交付资源",
    items: [
      { key: "/customers", title: "客户管理", icon: <TeamOutlined /> },
      { key: "/servers", title: "服务器", icon: <CloudServerOutlined /> },
      { key: "/templates", title: "产品模板", icon: <TagsOutlined /> },
      { key: "/releases", title: "发布版本", icon: <ClusterOutlined /> },
      { key: "/instances", title: "部署实例", icon: <DeploymentUnitOutlined /> }
    ]
  },
  {
    key: "governance",
    label: "运行治理",
    items: [
      { key: "/tasks", title: "任务中心", icon: <UnorderedListOutlined /> },
      { key: "/audit-logs", title: "审计日志", icon: <AuditOutlined /> },
      { key: "/users", title: "用户与角色", icon: <SafetyCertificateOutlined /> }
    ]
  }
];

const flatNavigationItems = navigationGroups.flatMap((group) => group.items);

const menuItems = navigationGroups.map((group) => ({
  key: group.key,
  type: "group" as const,
  label: group.label,
  children: group.items.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: <Link to={item.key}>{item.title}</Link>
  }))
}));

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { username, clearSession } = useAuthStore();

  const breadcrumbItems = useMemo(() => {
    const matched = flatNavigationItems.find((item) => location.pathname.startsWith(item.key));
    const title = matched?.title ?? "控制台";
    return [{ title: "TimeOps" }, { title }];
  }, [location.pathname]);

  return (
    <Layout className="timeops-shell">
      <Sider width={248} theme="dark" className="timeops-sider">
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
        />
        <div className="timeops-sider-footer">
          <Typography.Text className="timeops-sider-footer-label">权限基线</Typography.Text>
          <Tag color="blue" bordered={false}>
            SUPER_ADMIN
          </Tag>
        </div>
      </Sider>
      <Layout>
        <Header className="timeops-header">
          <div className="timeops-header-main">
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
          <div className="timeops-page">{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
