<template>
  <section class="summary">
    <header class="summary-head">
      <div>
        <h2>{{ rendezvous.title }}</h2>
        <p class="muted">最近保存于 {{ formatDate(rendezvous.updated_at) }}</p>
      </div>
      <div class="meeting" :class="{ overdue: meetingCountdown.overdue }">
        <p class="label">距集合时间</p>
        <p class="value">{{ formatCountdown(meetingCountdown) }}</p>
      </div>
    </header>
    <p>
      集合时刻（UTC）{{ rendezvous.meetingAt }}
      · 北京时间 {{ formatZonedWallTime(rendezvous.meetingAt, 'Asia/Shanghai') }}
    </p>
    <div class="rows">
      <ParticipantRow v-for="participant in rendezvous.participants" :key="participant.id" :participant="participant" :now="now" />
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { Rendezvous } from '../../models/rendezvous';
import ParticipantRow from './ParticipantRow.vue';
import { countdownUntil, formatCountdown } from '../../utils/countdown';
import { formatDate, formatZonedWallTime } from '../../utils/formatters';

const props = defineProps<{ rendezvous: Rendezvous; now: number }>();
const meetingCountdown = computed(() => countdownUntil(props.rendezvous.meetingAt, props.now));
</script>
<style scoped>
.summary { background: #fffdf6; border: 1px solid #dbe7cf; border-radius: 10px; padding: 20px; }
.summary-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.muted { color: #6b7a68; font-size: 13px; margin: 4px 0; }
.meeting { text-align: right; font-variant-numeric: tabular-nums; }
.meeting .label { color: #6b7a68; font-size: 13px; margin: 0; }
.meeting .value { font-size: 22px; font-weight: 700; color: #1f3d2b; margin: 4px 0 0; }
.meeting.overdue .value { color: #c4563e; }
.rows { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin-top: 16px; }
</style>
