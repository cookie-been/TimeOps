export const editableActionMetas = [
  { type: "DEPLOY", label: "部署" },
  { type: "UPDATE", label: "更新" },
  { type: "BACKUP", label: "备份" },
  { type: "ROLLBACK", label: "回滚" },
  { type: "VERIFY", label: "验证" },
  { type: "RESTART", label: "重启" }
] as const;

export type EditableActionType = (typeof editableActionMetas)[number]["type"];

const editableActionTypeSet = new Set<EditableActionType>(editableActionMetas.map((meta) => meta.type));
const editableActionLabelMap = new Map<string, string>(editableActionMetas.map((meta) => [meta.type, meta.label]));

export function getTemplateActionLabel(actionType: string): string {
  return editableActionLabelMap.get(actionType) ?? actionType;
}

export function getTemplateActionModeLabel(mode: string): string {
  return mode === "STEP" ? "步骤" : "脚本";
}

export function isEditableActionType(actionType: string): actionType is EditableActionType {
  return editableActionTypeSet.has(actionType as EditableActionType);
}
