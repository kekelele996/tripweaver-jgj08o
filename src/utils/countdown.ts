export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  overdue: boolean;
}

/** 将剩余毫秒拆成天/时/分/秒；目标时刻已过则 overdue=true，各部分为 0 */
export function countdownUntil(targetAt: string, now: number = Date.now()): CountdownParts {
  const target = new Date(targetAt).getTime();
  const diff = target - now;
  if (!Number.isFinite(target) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: Math.max(0, Number.isFinite(target) ? diff : 0), overdue: true };
  }
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    totalMs: diff,
    overdue: false,
  };
}

export function formatCountdown(parts: CountdownParts): string {
  if (parts.overdue) return '已到集合时间';
  return `还有 ${parts.days} 天 ${String(parts.hours).padStart(2, '0')} : ${String(parts.minutes).padStart(2, '0')} : ${String(parts.seconds).padStart(2, '0')}`;
}

/** 通勤分钟展示，例如 75 -> '1 小时 15 分钟' */
export function formatCommute(minutes: number): string {
  if (minutes <= 0) return '无需通勤';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} 分钟`;
  if (m === 0) return `${h} 小时`;
  return `${h} 小时 ${m} 分钟`;
}
