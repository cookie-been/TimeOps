import type { RecordStatus, RecordStatusFilter } from "./types";

export const recordStatusFilterOptions: Array<{ label: string; value: RecordStatusFilter }> = [
  { label: "有效", value: "ACTIVE" },
  { label: "已归档", value: "ARCHIVED" },
  { label: "全部", value: "ALL" }
];

export function matchesRecordStatusFilter(recordStatus: RecordStatus, recordStatusFilter: RecordStatusFilter): boolean {
  return recordStatusFilter === "ALL" || recordStatus === recordStatusFilter;
}

export function mergeRecordInFilter<T extends { id: string; recordStatus: RecordStatus }>(
  currentItems: T[],
  nextItem: T,
  recordStatusFilter: RecordStatusFilter
): T[] {
  const remainingItems = currentItems.filter((item) => item.id !== nextItem.id);

  if (!matchesRecordStatusFilter(nextItem.recordStatus, recordStatusFilter)) {
    return remainingItems;
  }

  return [nextItem, ...remainingItems];
}

export function isArchivedRecord(recordStatus: RecordStatus): boolean {
  return recordStatus === "ARCHIVED";
}
