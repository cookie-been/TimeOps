export function parseJsonObjectInput(raw: string | undefined): Record<string, unknown> | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("JSON must be an object");
  }
  return parsed as Record<string, unknown>;
}

export function formatJsonObjectInput(value: Record<string, unknown> | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return JSON.stringify(value, null, 2);
}
