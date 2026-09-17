/* 跨时区会合倒计时规格测试（临时脚本，不进入构建产物） */
import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { wallTimeToInstant, instantToWallTime, timezoneOffsetMinutes, getSystemTimezone } from '../src/utils/timezone';
import { countdownUntil } from '../src/utils/countdown';
import {
  commitRendezvous,
  RendezvousConflictError,
  type RendezvousDraft,
} from '../src/utils/rendezvousEngine';
import { rendezvousApi } from '../src/api/rendezvousApi';
import { useRendezvousStore } from '../src/stores/rendezvousStore';

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log('  ✓', name);
}

/* ---------- 时区换算 ---------- */
const nyWinter = new Date('2026-01-15T12:00:00Z');
const nySummer = new Date('2026-07-15T12:00:00Z');
test('纽约冬令时 UTC-5、夏令时 UTC-4（DST 自动生效）', () => {
  assert.equal(timezoneOffsetMinutes('America/New_York', nyWinter), -300);
  assert.equal(timezoneOffsetMinutes('America/New_York', nySummer), -240);
  assert.equal(timezoneOffsetMinutes('Asia/Shanghai', nyWinter), 480);
});
test('墙钟时间与绝对时刻可往返转换（含 DST 切换日）', () => {
  for (const [wall, zone] of [
    ['2026-03-08 12:00', 'America/New_York'],
    ['2026-11-01 12:00', 'America/New_York'],
    ['2026-07-01 10:00', 'Asia/Shanghai'],
  ] as const) {
    const instant = wallTimeToInstant(wall, zone);
    assert.equal(instantToWallTime(instant, zone), wall);
  }
});

/* ---------- 引擎事务 ---------- */
const baseDraft: RendezvousDraft = {
  title: '京都站集合',
  meetingWallTime: '2026-07-01 10:00',
  meetingTimezone: 'Asia/Shanghai',
  participants: [
    { name: '甲', originTimezone: 'Asia/Shanghai', commuteMinutes: 60, locked: false },
    { name: '乙', originTimezone: 'America/New_York', commuteMinutes: 30, locked: false },
  ],
};

test('按集合时间倒推最晚出发时刻（02:00Z 集合 → 甲 01:00Z、乙 01:30Z）', () => {
  const r = commitRendezvous(null, baseDraft);
  assert.equal(r.meetingAt, '2026-07-01T02:00:00.000Z');
  assert.equal(r.participants[0].latestDepartureAt, '2026-07-01T01:00:00.000Z');
  assert.equal(r.participants[1].latestDepartureAt, '2026-07-01T01:30:00.000Z');
});

let saved = commitRendezvous(null, baseDraft);

test('集合时间延后：未锁定者重算；本次新加锁者按新值冻结', () => {
  const next = commitRendezvous(saved, {
    ...baseDraft,
    meetingWallTime: '2026-07-01 12:00',
    participants: [
      { id: saved.participants[0].id, name: '甲', originTimezone: 'Asia/Shanghai', commuteMinutes: 60, locked: false },
      { id: saved.participants[1].id, name: '乙', originTimezone: 'America/New_York', commuteMinutes: 30, locked: true },
    ],
  });
  assert.equal(next.meetingAt, '2026-07-01T04:00:00.000Z');
  assert.equal(next.participants[0].latestDepartureAt, '2026-07-01T03:00:00.000Z');
  assert.equal(next.participants[1].latestDepartureAt, '2026-07-01T03:30:00.000Z');
  assert.equal(next.participants[1].locked, true);
  saved = next;
});

test('集合时间提前到锁定者无法到达：整次失败，旧快照不被修改', () => {
  const snapshot = JSON.parse(JSON.stringify(saved));
  const badDraft: RendezvousDraft = {
    ...baseDraft,
    meetingWallTime: '2026-07-01 10:30',
    participants: [
      { id: saved.participants[0].id, name: '甲', originTimezone: 'Asia/Shanghai', commuteMinutes: 60, locked: false },
      { id: saved.participants[1].id, name: '乙', originTimezone: 'America/New_York', commuteMinutes: 30, locked: true },
    ],
  };
  assert.throws(
    () => commitRendezvous(saved, badDraft),
    (error: unknown) => error instanceof RendezvousConflictError && error.conflicts[0].participantName === '乙',
  );
  // prev 是只读输入：失败后旧集合时间、锁定状态、冻结值完全不变
  assert.deepEqual(saved, snapshot);
});

test('锁定者即使通勤分钟改大：冻结的出发时刻保留，冲突时整次失败', () => {
  const badDraft: RendezvousDraft = {
    ...baseDraft,
    meetingWallTime: '2026-07-01 12:00',
    participants: [
      { id: saved.participants[0].id, name: '甲', originTimezone: 'Asia/Shanghai', commuteMinutes: 60, locked: false },
      { id: saved.participants[1].id, name: '乙', originTimezone: 'America/New_York', commuteMinutes: 90, locked: true },
    ],
  };
  assert.throws(() => commitRendezvous(saved, badDraft), RendezvousConflictError);
});

test('解锁后随集合时间恢复重算，再次保存成功', () => {
  const ok = commitRendezvous(saved, {
    ...baseDraft,
    meetingWallTime: '2026-07-01 10:30',
    participants: [
      { id: saved.participants[0].id, name: '甲', originTimezone: 'Asia/Shanghai', commuteMinutes: 60, locked: false },
      { id: saved.participants[1].id, name: '乙', originTimezone: 'America/New_York', commuteMinutes: 30, locked: false },
    ],
  });
  assert.equal(ok.participants[1].latestDepartureAt, '2026-07-01T02:00:00.000Z');
});

test('非法输入（空主题 / 无参与者 / 负通勤）在入口被拒绝', () => {
  assert.throws(() => commitRendezvous(null, { ...baseDraft, title: '  ' }));
  assert.throws(() => commitRendezvous(null, { ...baseDraft, participants: [] }));
  assert.throws(() =>
    commitRendezvous(null, {
      ...baseDraft,
      participants: [{ name: '甲', originTimezone: 'Asia/Shanghai', commuteMinutes: -5, locked: false }],
    }),
  );
});

test('倒计时随当前时刻正确递减', () => {
  const target = '2026-07-01T02:00:00.000Z';
  const c = countdownUntil(target, Date.parse('2026-07-01T01:00:30Z'));
  assert.deepEqual([c.days, c.hours, c.minutes, c.seconds, c.overdue], [0, 0, 59, 30, false]);
  assert.equal(countdownUntil(target, Date.parse('2026-07-01T03:00:00Z')).overdue, true);
});

/* ---------- store 唯一入口 + 刷新回读（localStorage 内存桩） ---------- */
const memStore = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => (memStore.has(k) ? memStore.get(k)! : null),
  setItem: (k: string, v: string) => void memStore.set(k, v),
  removeItem: (k: string) => void memStore.delete(k),
};

test('唯一入口 commit 成功后落盘；刷新后 api 回读与内存一致', () => {
  setActivePinia(createPinia());
  const store = useRendezvousStore();
  assert.equal(store.commit(baseDraft), true);
  const readBack = rendezvousApi.get();
  assert.ok(readBack);
  assert.deepEqual(readBack, store.current);
  assert.equal(readBack!.meetingAt, '2026-07-01T02:00:00.000Z');
});

test('唯一入口 commit 冲突时返回 false：current 与 localStorage 均保持旧值', () => {
  const store = useRendezvousStore();
  // 先在原集合时间（上海 10:00）把乙锁定，冻结其最晚出发时刻 01:30Z
  assert.equal(store.commit({
    ...baseDraft,
    participants: baseDraft.participants.map((p) => ({ ...p, locked: p.name === '乙' })),
  }), true);
  const before = JSON.stringify(store.current);
  const storedBefore = memStoreValues()[0];
  const result = store.commit({
    ...baseDraft,
    // 集合时间提前到上海 05:00（前一日 21:00Z）：乙冻结的出发时间 01:30Z + 30 分 = 02:00Z 才到，必然迟到
    meetingWallTime: '2026-07-01 05:00',
    participants: [
      { id: store.current!.participants[0].id, name: '甲', originTimezone: 'Asia/Shanghai', commuteMinutes: 60, locked: false },
      { id: store.current!.participants[1].id, name: '乙', originTimezone: 'America/New_York', commuteMinutes: 30, locked: true },
    ],
  });
  assert.equal(result, false);
  assert.equal(store.lastFailure?.reason, 'conflict');
  assert.equal(JSON.stringify(store.current), before);
  assert.equal(memStoreValues()[0], storedBefore);
});

function memStoreValues(): string[] {
  return Array.from(memStore.values());
}

test('第二次冲突后再提交合法草稿可恢复成功（状态机不被失败污染）', () => {
  const store = useRendezvousStore();
  const okDraft: RendezvousDraft = {
    ...baseDraft,
    title: '大阪城集合',
    participants: store.current!.participants.map((p) => ({ id: p.id, name: p.name, originTimezone: p.originTimezone, commuteMinutes: p.commuteMinutes, locked: false })),
  };
  assert.equal(store.commit(okDraft), true);
  assert.equal(store.current?.title, '大阪城集合');
  assert.equal(store.lastFailure, null);
});

console.log(`\n${passed} 项规格测试全部通过（系统时区：${getSystemTimezone()}）`);
