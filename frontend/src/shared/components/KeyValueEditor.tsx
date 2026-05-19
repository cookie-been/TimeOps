import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Form, Input, Typography } from "antd";

interface KeyValueEditorProps {
  name: string | number | Array<string | number>;
  addLabel: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  emptyHint?: string;
}

export function KeyValueEditor({
  name,
  addLabel,
  keyPlaceholder = "变量名",
  valuePlaceholder = "变量值",
  emptyHint = "暂无配置项"
}: KeyValueEditorProps) {
  return (
    <Form.List name={name}>
      {(fields, { add, remove }) => (
        <div className="timeops-kv-editor">
          {fields.length === 0 ? <Typography.Text type="secondary">{emptyHint}</Typography.Text> : null}
          {fields.map((field) => (
            <div key={field.key} className="timeops-kv-row">
              <Form.Item className="timeops-kv-item" name={[field.name, "key"]} rules={[{ required: true, whitespace: true, message: "请输入变量名" }]}>
                <Input placeholder={keyPlaceholder} />
              </Form.Item>
              <Form.Item className="timeops-kv-item" name={[field.name, "value"]}>
                <Input placeholder={valuePlaceholder} />
              </Form.Item>
              <Button
                aria-label="删除配置项"
                title="删除配置项"
                icon={<DeleteOutlined />}
                onClick={() => remove(field.name)}
              />
            </div>
          ))}
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ key: "", value: "" })}>
            {addLabel}
          </Button>
        </div>
      )}
    </Form.List>
  );
}
