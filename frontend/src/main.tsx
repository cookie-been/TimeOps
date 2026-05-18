import React from "react";
import ReactDOM from "react-dom/client";
import { App as AntApp, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./app/router";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#2468f2",
          borderRadius: 6,
          colorBgLayout: "#f3f6fb",
          colorBgContainer: "#ffffff",
          colorBorderSecondary: "#e7edf5",
          colorText: "#172033",
          colorTextSecondary: "#667085",
          fontSize: 14,
          fontSizeHeading3: 24,
          fontSizeHeading4: 18,
          controlHeight: 36
        },
        components: {
          Layout: {
            headerBg: "#ffffff",
            siderBg: "#0f1728",
            bodyBg: "#f3f6fb"
          },
          Menu: {
            darkItemBg: "#0f1728",
            darkItemColor: "#90a0ba",
            darkItemHoverBg: "#16233a",
            darkItemSelectedBg: "#1f3354",
            darkItemSelectedColor: "#f8fbff",
            itemBorderRadius: 8,
            itemHeight: 42
          },
          Button: {
            primaryShadow: "none",
            defaultShadow: "none"
          },
          Table: {
            headerBg: "#f7f9fc",
            headerColor: "#475467",
            borderColor: "#e7edf5",
            rowHoverBg: "#f8fbff"
          },
          Input: {
            activeBorderColor: "#2468f2",
            hoverBorderColor: "#9db6f8"
          },
          Select: {
            activeBorderColor: "#2468f2",
            hoverBorderColor: "#9db6f8"
          },
          Card: {
            borderRadiusLG: 10
          }
        }
      }}
    >
      <AntApp>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRouter />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
);
