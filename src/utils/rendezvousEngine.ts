import type { Rendezvous, RendezvousParticipant } from '../models/rendezvous';
import { wallTimeToInstant } from './timezone';
import { nonNegativeMinutes, required } from './validators';

/** 提交到唯一入口的草稿：表单层使用出发地时区下的墙钟时间表达集合时间 */
export interface RendezvousParticipantDraft {
  id?: string;
  name: string;
  originTimezone: string;
  commuteMinutes: number;
  locked: boolean;
}

export interface RendezvousDraft {
  title: string;
  /** 集合时间（meetingTimezone 时区下的墙钟时间 'YYYY-MM-DD HH:mm'） */
  meetingWallTime: string;
  meetingTimezone: string;
  participants: RendezvousParticipantDraft[];
}

export class RendezvousValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RendezvousValidationError';
  }
}

export interface LockedConflict {
  participantId: string;
  participantName: string;
}

export class RendezvousConflictError extends Error {
  conflicts: LockedConflict[];
  constructor(conflicts: LockedConflict[]) {
    super('rendezvous-locked-conflict');
    this.name = 'RendezvousConflictError';
    this.conflicts = conflicts;
  }
}

const MINUTE_MS = 60000;

/** 按集合时间倒推最晚出发时刻（返回 UTC ISO 绝对时刻） */
function deriveLatestDeparture(meetingAt: Date, commuteMinutes: number): string {
  return new Date(meetingAt.getTime() - commuteMinutes * MINUTE_MS).toISOString();
}

/**
 * 跨时区会合倒计时的唯一业务入口（纯函数，不触碰状态与存储）。
 *
 * 规则：
 * - 集合时间以 UTC 绝对时刻为准，倒推 = 集合时刻 - 通勤分钟；
 * - 本次与上次都处于锁定状态的参与者，保留上次冻结的最晚出发时刻，不随集合时间重算；
 * - 其余参与者（未锁定 / 本次新加锁 / 新增）一律按新集合时间重新倒推；
 * - 若任一锁定者冻结的出发时刻 + 其通勤分钟晚于新集合时间，抛出 RendezvousConflictError，
 *   调用方必须整次放弃：旧集合时间、锁定状态和全部倒计时不变。
 */
export function commitRendezvous(prev: Rendezvous | null, draft: RendezvousDraft): Rendezvous {
  required(draft.title, '会合主题');
  if (!draft.meetingWallTime?.trim()) throw new RendezvousValidationError('集合时间不能为空');

  let meetingAt: Date;
  try {
    meetingAt = wallTimeToInstant(draft.meetingWallTime, draft.meetingTimezone);
  } catch (error) {
    throw new RendezvousValidationError((error as Error).message);
  }

  if (!draft.participants.length) throw new RendezvousValidationError('至少需要登记一位参与者');

  const prevById = new Map<string, RendezvousParticipant>();
  prev?.participants.forEach((p) => prevById.set(p.id, p));

  const nextParticipants: RendezvousParticipant[] = draft.participants.map((p) => {
    const name = required(p.name, '参与者姓名');
    const commuteMinutes = nonNegativeMinutes(p.commuteMinutes, '通勤分钟');
    if (!p.originTimezone?.trim()) throw new RendezvousValidationError(`${name} 的出发地时区不能为空`);
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: p.originTimezone });
    } catch {
      throw new RendezvousValidationError(`${name} 的时区无效：${p.originTimezone}`);
    }

    const previous = p.id ? prevById.get(p.id) : undefined;
    const staysLocked = p.locked && previous?.locked;
    return {
      id: previous?.id ?? p.id ?? crypto.randomUUID(),
      name,
      originTimezone: p.originTimezone,
      commuteMinutes,
      locked: p.locked,
      // 锁定者保留原值；其余（含本次新加锁者，此刻冻结）随集合时间重算
      latestDepartureAt: staysLocked
        ? previous!.latestDepartureAt
        : deriveLatestDeparture(meetingAt, commuteMinutes),
    };
  });

  // 冲突检测放在所有构建之后：任一锁定者无法按时到达 => 整次保存失败
  const conflicts: LockedConflict[] = [];
  for (const participant of nextParticipants) {
    if (!participant.locked) continue;
    const earliestArrival = new Date(participant.latestDepartureAt).getTime() + participant.commuteMinutes * MINUTE_MS;
    if (earliestArrival > meetingAt.getTime()) {
      conflicts.push({ participantId: participant.id, participantName: participant.name });
    }
  }
  if (conflicts.length) throw new RendezvousConflictError(conflicts);

  const now = new Date().toISOString();
  return {
    id: prev?.id ?? crypto.randomUUID(),
    title: draft.title.trim(),
    meetingAt: meetingAt.toISOString(),
    participants: nextParticipants,
    created_at: prev?.created_at ?? now,
    updated_at: now,
  };
}
