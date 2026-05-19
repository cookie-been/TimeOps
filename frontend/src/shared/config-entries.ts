export interface ConfigEntry {
  key?: string;
  value?: string;
}

function stringifyConfigValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function configObjectToEntries(value?: Record<string, unknown>): ConfigEntry[] {
  if (!value) {
    return [];
  }

  return Object.entries(value).map(([key, currentValue]) => ({
    key,
    value: stringifyConfigValue(currentValue)
  }));
}

export function configEntriesToObject(entries?: ConfigEntry[]): Record<string, string> | undefined {
  const normalizedEntries = (entries ?? [])
    .map((entry) => ({
      key: entry.key?.trim() ?? "",
      value: entry.value ?? ""
    }))
    .filter((entry) => entry.key);

  if (normalizedEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(normalizedEntries.map((entry) => [entry.key, entry.value]));
}

export function countConfigEntries(value?: Record<string, unknown>): number {
  return Object.keys(value ?? {}).length;
}

export function mergeConfigObjects(
  base?: Record<string, unknown>,
  override?: Record<string, unknown>
): Record<string, unknown> | undefined {
  const merged = {
    ...(base ?? {}),
    ...(override ?? {})
  };

  return Object.keys(merged).length === 0 ? undefined : merged;
}
