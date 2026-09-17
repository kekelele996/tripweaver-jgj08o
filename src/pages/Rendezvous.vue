<template>
  <main class="page">
    <h1>跨时区会合倒计时</h1>

    <section class="band">
      <strong>集合时间（已保存）</strong>
      <p>{{ formatInZone(plan.meetAt, localZone) }}（本地） · 距集合 {{ formatCountdown(meetRemainMs) }}</p>
      <p class="muted">更新于 {{ formatInZone(plan.updatedAt, localZone) }}</p>
    </section>

    <section class="grid">
      <div v-for="row in board" :key="row.id" class="band">
        <strong>{{ row.name }}</strong>
        <el-tag v-if="row.locked" size="small" type="warning">已锁定</el-tag>
        <el-tag v-else size="small" type="success">跟随集合时间</el-tag>
        <p>出发地时区：{{ row.timezone }}</p>
        <p>集合时间（当地）：{{ formatInZone(plan.meetAt, row.timezone) }}</p>
        <p>最晚出发（当地）：{{ formatInZone(row.departAt, row.timezone) }}</p>
        <p>通勤 {{ row.commuteMinutes }} 分钟</p>
        <p :class="{ late: row.remainMs < 0 }">距最晚出发：{{ formatCountdown(row.remainMs) }}</p>
      </div>
    </section>

    <section class="band">
      <strong>编辑会合计划</strong>
      <p class="muted">修改仅在点击「保存并应用」后生效（唯一执行入口）。锁定参与者保留原最晚出发时刻；若新集合时间导致任一锁定者无法按时到达，整次保存失败，集合时间、锁定状态与全部倒计时保持不变。</p>
      <div class="toolbar">
        <span>新集合时间</span>
        <el-date-picker v-model="draft.meetAt" type="datetime" />
        <el-button @click="addParticipant">添加参与者</el-button>
        <el-button type="primary" @click="save">保存并应用</el-button>
      </div>
      <el-table :data="draft.participants">
        <el-table-column label="姓名" min-width="140">
          <template #default="{ row }"><el-input v-model="row.name" :disabled="row.locked" placeholder="参与者姓名" /></template>
        </el-table-column>
        <el-table-column label="出发地时区" min-width="200">
          <template #default="{ row }">
            <el-select v-model="row.timezone" :disabled="row.locked">
              <el-option v-for="tz in TIMEZONE_OPTIONS" :key="tz.value" :label="tz.label" :value="tz.value" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="通勤分钟" width="150">
          <template #default="{ row }"><el-input-number v-model="row.commuteMinutes" :min="0" :max="1440" :disabled="row.locked" /></template>
        </el-table-column>
        <el-table-column label="锁定" width="80">
          <template #default="{ row }"><el-switch v-model="row.locked" /></template>
        </el-table-column>
        <el-table-column label="" width="90">
          <template #default="{ row }"><el-button link type="danger" @click="removeParticipant(row.id)">移除</el-button></template>
        </el-table-column>
      </el-table>
    </section>
  </main>
</template>
<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useRendezvousStore } from '../stores/rendezvousStore';
import { useNow } from '../hooks/useNow';
import { formatCountdown, formatInZone, resolveDepartAt } from '../utils/rendezvous';
import { DEFAULT_COMMUTE_MINUTES, DEFAULT_TIMEZONE, TIMEZONE_OPTIONS } from '../constants/rendezvous';
import { messages } from '../constants/messages';
import { toast } from '../utils/message';
import type { RendezvousParticipantDraft } from '../models/rendezvous';

const store = useRendezvousStore();
const plan = computed(() => store.plan);
const now = useNow();
const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const draft = reactive<{ meetAt: Date; participants: RendezvousParticipantDraft[] }>({ meetAt: new Date(), participants: [] });
function syncDraft() {
  draft.meetAt = new Date(store.plan.meetAt);
  draft.participants = store.plan.participants.map((p) => ({ id: p.id, name: p.name, timezone: p.timezone, commuteMinutes: p.commuteMinutes, locked: p.locked }));
}
syncDraft();

const board = computed(() => plan.value.participants.map((p) => {
  const departAt = resolveDepartAt(plan.value, p);
  return { ...p, departAt, remainMs: new Date(departAt).getTime() - now.value };
}));
const meetRemainMs = computed(() => new Date(plan.value.meetAt).getTime() - now.value);

function addParticipant() {
  draft.participants.push({ id: crypto.randomUUID(), name: '', timezone: DEFAULT_TIMEZONE, commuteMinutes: DEFAULT_COMMUTE_MINUTES, locked: false });
}
function removeParticipant(id: string) {
  const index = draft.participants.findIndex((p) => p.id === id);
  if (index >= 0) draft.participants.splice(index, 1);
}
function save() {
  try {
    store.applyPlan({ meetAt: draft.meetAt.toISOString(), participants: draft.participants.map((p) => ({ ...p })) });
    syncDraft();
  } catch (err) {
    toast.fail(err instanceof Error ? err.message : messages.rendezvousBlocked);
  }
}
</script>
<style scoped>
.late { color: #c45656; font-weight: 600; }
</style>
