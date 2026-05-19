import {
  AuditOutlined,
  ClusterOutlined,
  CloudServerOutlined,
  DeploymentUnitOutlined,
  SafetyCertificateOutlined,
  TagsOutlined,
  TeamOutlined,
  UnorderedListOutlined
} from "@ant-design/icons";
import type { ItemType } from "antd/es/menu/interface";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export interface NavigationItem {
  key: string;
  title: string;
  icon: ReactNode;
}

export interface NavigationGroup {
  key: string;
  label: string;
  items: NavigationItem[];
}

export const navigationGroups: NavigationGroup[] = [
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

export const flatNavigationItems = navigationGroups.flatMap((group) => group.items);

export const menuItems: ItemType[] = navigationGroups.map((group) => ({
  key: group.key,
  type: "group" as const,
  label: group.label,
  children: group.items.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: <Link to={item.key}>{item.title}</Link>
  }))
}));
