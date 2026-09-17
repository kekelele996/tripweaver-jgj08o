export const DEFAULT_COMMUTE_MINUTES = 60;

/** 新建会合计划时，默认把集合时间定在当前时刻 24 小时之后 */
export const DEFAULT_MEETING_AHEAD_MS = 24 * 60 * 60 * 1000;

/** 倒计时刷新间隔（毫秒） */
export const COUNTDOWN_INTERVAL_MS = 1000;

/** 页面常用出发地时区候选，均为 IANA 名称；也允许手动使用浏览器系统时区 */
export const COMMON_TIMEZONES = [
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Singapore',
  'Asia/Bangkok',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Australia/Sydney',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'UTC',
];

export const MEETING_WALL_FORMAT = 'YYYY-MM-DD HH:mm';
