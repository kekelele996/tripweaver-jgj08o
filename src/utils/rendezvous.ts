import dayjs from 'dayjs';
import type { RendezvousDraft, RendezvousParticipant, RendezvousPlan } from '../models/rendezvous';
import { DEFAULT_COMMUTE_MINUTES, DEFAULT_TIMEZONE } from '../constants/rendezvous';
import { messages } from '../constants/messages';
import { required } from './validators';

const MINUTE_MS = 60000;

export function latestDepartAt(meetAt: string, commuteMinutes: number): string {
  return new Date(new Date(meetAt).getTime() - commuteMinutes * MINUTE_MS).toISOString();
}

export function arrivalAt(departAt: string, commuteMinutes: number): string {
  return new Date(new Date(departAt).getTime() + commuteMinutes * MINUTE_MS).toISOString();
}

export function resolveDepartAt(plan: RendezvousPlan, participant: RendezvousParticipant): string {
  if (participant.locked && participant.lockedDepartAt) return participant.lockedDepartAt;
  return latestDepartAt(plan.meetAt, participant.commuteMinutes);
}

export function buildNextPlan(current: RendezvousPlan, draft: RendezvousDraft): RendezvousPlan {
  const meetAtDate = new Date(draft.meetAt);
  if (Number.isNaN(meetAtDate.getTime())) throw new Error(messages.rendezvousInvalid);
  const meetAt = meetAtDate.toISOString();
  const participants: RendezvousParticipant[] = draft.participants.map((item) => {
    const prev = current.participants.find((p) => p.id === item.id);
    if (prev && prev.locked && item.locked) return { ...prev };
    const next: RendezvousParticipant = {
      id: item.id,
      name: required(item.name, '参与者姓名'),
      timezone: item.timezone,
      commuteMinutes: Math.max(0, Math.round(item.commuteMinutes)),
      locked: item.locked,
      lockedDepartAt: null,
    };
    if (next.locked) next.lockedDepartAt = latestDepartAt(meetAt, next.commuteMinutes);
    return next;
  });
  const blocked = participants.find((p) => p.locked && p.lockedDepartAt !== null && arrivalAt(p.lockedDepartAt, p.commuteMinutes) > meetAt);
  if (blocked) throw new Error(blocked.name + messages.rendezvousBlocked);
  return { meetAt, participants, updatedAt: new Date().toISOString() };
}

export function createDefaultPlan(): RendezvousPlan {
  return {
    meetAt: new Date(Date.now() + 2 * 3600000).toISOString(),
    participants: [
      { id: crypto.randomUUID(), name: '阿黎', timezone: DEFAULT_TIMEZONE, commuteMinutes: 45, locked: false, lockedDepartAt: null },
      { id: crypto.randomUUID(), name: 'Ben', timezone: 'America/New_York', commuteMinutes: DEFAULT_COMMUTE_MINUTES, locked: false, lockedDepartAt: null },
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function formatInZone(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('zh-CN', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(iso));
  } catch {
    return dayjs(iso).format('YYYY-MM-DD HH:mm:ss');
  }
}

export function formatCountdown(remainMs: number): string {
  const total = Math.floor(Math.abs(remainMs) / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const clock = (days ? days + ' 天 ' : '') + pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
  return remainMs < 0 ? '已超时 ' + clock : clock;
}
