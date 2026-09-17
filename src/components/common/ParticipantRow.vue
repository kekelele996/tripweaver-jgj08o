<template>
  <article class="participant-row" :class="{ locked: participant.locked }">
    <div class="head">
      <strong>{{ participant.name }}</strong>
      <el-tag :type="participant.locked ? 'warning' : 'success'" size="small">
        {{ participant.locked ? messages.rendezvousLockedLabel : messages.rendezvousUnlockedLabel }}
      </el-tag>
    </div>
    <p class="muted">出发地时区 {{ participant.originTimezone }} · 通勤 {{ formatCommute(participant.commuteMinutes) }}</p>
    <p>最晚出发：{{ formatZonedWallTime(participant.latestDepartureAt, participant.originTimezone) }}</p>
    <p class="countdown" :class="{ overdue: countdown.overdue }">距最晚出发 {{ formatCountdown(countdown) }}</p>
  </article>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { RendezvousParticipant } from '../../models/rendezvous';
import { messages } from '../../constants/messages';
import { countdownUntil, formatCommute, formatCountdown } from '../../utils/countdown';
import { formatZonedWallTime } from '../../utils/formatters';

const props = defineProps<{ participant: RendezvousParticipant; now: number }>();
const countdown = computed(() => countdownUntil(props.participant.latestDepartureAt, props.now));
</script>
<style scoped>
.participant-row { background: #fff; border: 1px solid #dbe7cf; border-left: 4px solid #67a363; border-radius: 8px; padding: 14px 16px; }
.participant-row.locked { border-left-color: #d9a441; background: #fffaf0; }
.head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.muted { color: #6b7a68; font-size: 13px; margin: 6px 0; }
.countdown { font-variant-numeric: tabular-nums; font-weight: 600; color: #1f3d2b; }
.countdown.overdue { color: #c4563e; }
</style>
