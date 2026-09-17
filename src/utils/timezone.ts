import dayjs from 'dayjs';

/** 浏览器系统 IANA 时区，取不到时退回 UTC */
export function getSystemTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function isValidTimezone(zone: string): boolean {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * 返回某 IANA 时区在指定绝对时刻相对 UTC 的偏移分钟数（东八区为 +480）。
 * 夏令时会随 instant 变化，必须按时刻分别计算。
 */
export function timezoneOffsetMinutes(zone: string, instant: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = dtf.formatToParts(instant);
  const map: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour % 24, map.minute, map.second);
  return Math.round((asUtc - instant.getTime()) / 60000);
}

/** 将某时区下的墙钟时间（'YYYY-MM-DD HH:mm'）换算成 UTC 绝对时刻（Date） */
export function wallTimeToInstant(wallTime: string, zone: string): Date {
  const m = dayjs(wallTime);
  if (!m.isValid()) throw new Error('集合时间格式应为 YYYY-MM-DD HH:mm');
  if (!isValidTimezone(zone)) throw new Error('时区无效：' + zone);
  const guessedUtc = Date.UTC(m.year(), m.month(), m.date(), m.hour(), m.minute());
  // 两遍校正：先按初步时刻取偏移，再用校正后时刻的偏移复核（处理夏令时跳变）
  const firstPass = new Date(guessedUtc - timezoneOffsetMinutes(zone, new Date(guessedUtc)) * 60000);
  const secondPass = new Date(guessedUtc - timezoneOffsetMinutes(zone, firstPass) * 60000);
  return secondPass;
}

/** 将 UTC 绝对时刻格式化为某时区下的墙钟时间 'YYYY-MM-DD HH:mm' */
export function instantToWallTime(instant: Date, zone: string): string {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
  const parts = dtf.formatToParts(instant);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour') === '24' ? '00' : pick('hour')}:${pick('minute')}`;
}

/** GMT 标签，例如 +08:00、-04:00（按指定时刻的实际偏移，自动体现夏令时） */
export function offsetLabel(zone: string, instant: Date): string {
  const total = timezoneOffsetMinutes(zone, instant);
  const sign = total >= 0 ? '+' : '-';
  const abs = Math.abs(total);
  return `GMT${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}
