export function required(value: string, field: string) {
  if (!value.trim()) throw new Error(field + '不能为空');
  return value.trim();
}

/** 通勤分钟必须是非负有限数字，允许 0（就在集合点附近） */
export function nonNegativeMinutes(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(field + '必须是不小于 0 的数字');
  return Math.round(value);
}
