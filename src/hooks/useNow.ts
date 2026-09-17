import { onUnmounted, ref } from 'vue';
import { COUNTDOWN_INTERVAL_MS } from '../constants/rendezvous';

/** 以固定间隔返回当前时间戳（毫秒），用于驱动倒计时；组件卸载时自动停止 */
export function useNow(intervalMs: number = COUNTDOWN_INTERVAL_MS) {
  const now = ref(Date.now());
  const timer = window.setInterval(() => { now.value = Date.now(); }, intervalMs);
  onUnmounted(() => window.clearInterval(timer));
  return now;
}
