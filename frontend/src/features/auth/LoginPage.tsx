import { LockOutlined, SafetyCertificateOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Space, Typography, message } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../shared/api/client";
import { useAuthStore } from "./authStore";

interface LoginFormValues {
  username: string;
  password: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      const session = await login(values.username, values.password);
      setSession({ accessToken: session.accessToken, username: values.username });
      message.success("登录成功");
      navigate("/customers", { replace: true });
    } catch {
      message.error("登录失败，请检查用户名或密码");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="timeops-login-shell">
      <div className="timeops-login-brand">
        <div>
          <Typography.Text className="timeops-login-eyebrow">TimeOps 企业运维平台</Typography.Text>
          <Typography.Title style={{ marginTop: 12, marginBottom: 12 }}>
            面向交付团队的统一运维工作台
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ maxWidth: 520, fontSize: 16 }}>
            统一管理客户接入、服务器授权、模板发布、实例部署、变更执行与全链路审计，适合长期维护的企业后台场景。
          </Typography.Paragraph>
        </div>
        <div className="timeops-login-points">
          <div className="timeops-login-point">
            <Typography.Text strong>权限与职责</Typography.Text>
            <Typography.Paragraph type="secondary">
              支持内部账号、角色授权、操作责任归属与可审计留痕。
            </Typography.Paragraph>
          </div>
          <div className="timeops-login-point">
            <Typography.Text strong>交付与版本</Typography.Text>
            <Typography.Paragraph type="secondary">
              模板、版本、实例、任务四层对象拆分清晰，适合持续迭代。
            </Typography.Paragraph>
          </div>
          <div className="timeops-login-point">
            <Typography.Text strong>凭据安全</Typography.Text>
            <Typography.Paragraph type="secondary">
              SSH 密码加密保存，前台只展示脱敏信息，避免泄露原文。
            </Typography.Paragraph>
          </div>
        </div>
      </div>
      <div className="timeops-login-side">
        <Card className="timeops-login-card" variant="borderless">
          <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 8 }}>
            登录 TimeOps
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
            请输入内部账号以进入运维控制台。
          </Typography.Paragraph>
          <Form<LoginFormValues> layout="vertical" onFinish={handleSubmit} initialValues={{ username: "admin" }}>
            <Form.Item label="用户名" name="username" rules={[{ required: true, message: "请输入用户名" }]}>
              <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
            </Form.Item>
            <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
              登录
            </Button>
          </Form>
          <Space size={8} style={{ marginTop: 18 }}>
            <SafetyCertificateOutlined style={{ color: "#1677ff" }} />
            <Typography.Text type="secondary">建议使用具备审计授权的内部账号登录</Typography.Text>
          </Space>
        </Card>
      </div>
    </div>
  );
}
