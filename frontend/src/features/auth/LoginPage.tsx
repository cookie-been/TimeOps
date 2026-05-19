import { LockOutlined, PartitionOutlined, SafetyCertificateOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Checkbox, Form, Input, Space, Typography, message } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../shared/api/client";
import { useAuthStore } from "./authStore";

interface LoginFormValues {
  username: string;
  password: string;
  rememberMe: boolean;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      const session = await login(values.username, values.password);
      setSession({ accessToken: session.accessToken, username: values.username, rememberMe: values.rememberMe });
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
      <div className="timeops-login-center">
        <div className="timeops-login-intro">
          <div className="timeops-login-mark">
            <PartitionOutlined />
          </div>
          <Typography.Text className="timeops-login-eyebrow">TimeOps 企业运维平台</Typography.Text>
          <Typography.Title className="timeops-login-title">先登录，再把运维这摊事收拾利索</Typography.Title>
          <Typography.Paragraph className="timeops-login-subtitle">
            客户、服务器、模板、版本、实例和审计全部收进一个控制台，登录入口就放在正中间。
          </Typography.Paragraph>
        </div>
        <Card className="timeops-login-card" variant="borderless">
          <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 8 }}>
            登录 TimeOps
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
            请输入内部账号以进入运维控制台。
          </Typography.Paragraph>
          <Form<LoginFormValues> layout="vertical" onFinish={handleSubmit} initialValues={{ username: "admin", rememberMe: true }}>
            <Form.Item label="用户名" name="username" rules={[{ required: true, message: "请输入用户名" }]}>
              <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
            </Form.Item>
            <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
            </Form.Item>
            <Form.Item name="rememberMe" valuePropName="checked" style={{ marginBottom: 16 }}>
              <Checkbox>记住我</Checkbox>
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
              登录
            </Button>
          </Form>
          <Space size={8} className="timeops-login-footnote">
            <SafetyCertificateOutlined style={{ color: "#1677ff" }} />
            <Typography.Text type="secondary">建议使用具备审计授权的内部账号登录</Typography.Text>
          </Space>
        </Card>
      </div>
    </div>
  );
}
