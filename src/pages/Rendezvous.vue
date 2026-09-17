<template>
  <main class="page rendezvous-page">
    <h1>跨时区会合倒计时</h1>

    <RendezvousSummary v-if="rendezvousStore.current" :rendezvous="rendezvousStore.current" :now="now" />
    <EmptyState v-else title="还没有跨时区会合计划" :description="messages.rendezvousEmpty" />

    <el-alert
      v-if="rendezvousStore.lastFailure?.reason === 'conflict'"
      class="banner"
      type="error"
      :closable="false"
      show-icon
      :title="messages.rendezvousSaveBlocked"
    >
      <template #default>
        无法按时到达的锁定者：
        <strong>{{ rendezvousStore.lastFailure.conflicts.map((c) => c.participantName).join('、') }}</strong>
        。旧集合时间、锁定状态和全部倒计时均未改变。
      </template>
    </el-alert>

    <form class="editor" @submit.prevent="save">
      <h2>{{ rendezvousStore.current ? '调整会合计划' : '创建会合计划' }}</h2>
      <div class="form-grid">
        <label>会合主题
          <el-input v-model="draft.title" placeholder="例如：京都站集合" />
        </label>
        <label>集合时间（按所选时区填写）
          <el-date-picker
            v-model="draft.meetingWallTime"
            type="datetime"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm"
            placeholder="选择集合时间"
          />
        </label>
        <label>集合时间所在时区
          <el-select v-model="draft.meetingTimezone" filterable style="width: 100%">
            <el-option v-for="tz in timezones" :key="tz" :label="tz" :value="tz" />
          </el-select>
        </label>
      </div>

      <div class="participants-head">
        <h3>参与者登记（出发地时区 / 通勤分钟 / 锁定）</h3>
        <el-button size="small" @click="addParticipant">添加参与者</el-button>
      </div>

      <div v-for="(participant, index) in draft.participants" :key="index" class="participant-edit">
        <el-input v-model="participant.name" placeholder="姓名" style="width: 140px" />
        <el-select v-model="participant.originTimezone" filterable placeholder="出发地时区" style="width: 200px">
          <el-option v-for="tz in timezones" :key="tz" :label="tz" :value="tz" />
        </el-select>
        <el-input-number v-model="participant.commuteMinutes" :min="0" :step="10" controls-position="right" />
        <span class="unit">分钟通勤</span>
        <el-tooltip :content="participant.locked ? messages.rendezvousLockedLabel : messages.rendezvousUnlockedLabel" placement="top">
          <el-switch v-model="participant.locked" active-text="锁定" inline-prompt />
        </el-tooltip>
        <el-button link type="danger" @click="removeParticipant(index)">移除</el-button>
      </div>

      <div class="actions">
        <el-button type="primary" native-type="submit">保存并重算倒计时</el-button>
        <el-button v-if="rendezvousStore.current" @click="resetFromCurrent">放弃修改并回读</el-button>
      </div>
      <p class="muted tip">
        提示：未锁定者的最晚出发时刻随集合时间自动倒推；锁定者保留其冻结值。若新集合时间会让任一锁定者迟到，本次整次保存失败。
      </p>
    </form>
  </main>
</template>
<script setup lang="ts">
import dayjs from 'dayjs';
import { reactive } from 'vue';
import EmptyState from '../components/common/EmptyState.vue';
import RendezvousSummary from '../components/common/RendezvousSummary.vue';
import { useRendezvousStore } from '../stores/rendezvousStore';
import { useNow } from '../hooks/useNow';
import { COMMON_TIMEZONES, DEFAULT_COMMUTE_MINUTES, DEFAULT_MEETING_AHEAD_MS } from '../constants/rendezvous';
import { messages } from '../constants/messages';
import { getSystemTimezone, instantToWallTime } from '../utils/timezone';
import type { RendezvousDraft, RendezvousParticipantDraft } from '../utils/rendezvousEngine';

const rendezvousStore = useRendezvousStore();
const now = useNow();

const systemZone = getSystemTimezone();
const timezones = COMMON_TIMEZONES.includes(systemZone) ? COMMON_TIMEZONES : [systemZone, ...COMMON_TIMEZONES];

function createBlankDraft(): RendezvousDraft {
  return {
    title: '',
    meetingWallTime: dayjs(Date.now() + DEFAULT_MEETING_AHEAD_MS).format('YYYY-MM-DD HH:mm'),
    meetingTimezone: systemZone,
    participants: [
      { name: '', originTimezone: systemZone, commuteMinutes: DEFAULT_COMMUTE_MINUTES, locked: false },
    ],
  };
}

/** 从已保存快照生成草稿：集合时间先按系统时区展示墙钟时间，绝对时刻不变 */
function draftFromCurrent(): RendezvousDraft {
  const current = rendezvousStore.current!;
  return {
    title: current.title,
    meetingWallTime: instantToWallTime(new Date(current.meetingAt), systemZone),
    meetingTimezone: systemZone,
    participants: current.participants.map((p): RendezvousParticipantDraft => ({
      id: p.id,
      name: p.name,
      originTimezone: p.originTimezone,
      commuteMinutes: p.commuteMinutes,
      locked: p.locked,
    })),
  };
}

const draft = reactive<RendezvousDraft>(rendezvousStore.current ? draftFromCurrent() : createBlankDraft());

function addParticipant() {
  draft.participants.push({ name: '', originTimezone: systemZone, commuteMinutes: DEFAULT_COMMUTE_MINUTES, locked: false });
}
function removeParticipant(index: number) {
  draft.participants.splice(index, 1);
}
function resetFromCurrent() {
  Object.assign(draft, rendezvousStore.current ? draftFromCurrent() : createBlankDraft());
}
/** 页面所有写操作的唯一出口：新建、改集合时间、登记参与者、切换锁定都只调用这一次提交 */
function save() {
  if (rendezvousStore.commit({ ...draft, participants: draft.participants.map((p) => ({ ...p })) })) {
    resetFromCurrent();
  }
}
</script>
<style scoped>
.rendezvous-page { display: flex; flex-direction: column; gap: 18px; }
.banner { margin-top: 4px; }
.editor { background: #fff; border: 1px solid #dbe7cf; border-radius: 10px; padding: 20px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin: 12px 0 18px; }
.form-grid label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #42503f; }
.participants-head { display: flex; align-items: center; justify-content: space-between; }
.participant-edit { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 0; border-bottom: 1px dashed #e2ebd8; }
.unit { color: #6b7a68; font-size: 13px; }
.actions { margin-top: 18px; display: flex; gap: 10px; }
.tip { margin-top: 10px; }
</style>
