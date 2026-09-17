import { defineStore } from 'pinia';
import type { RendezvousDraft, RendezvousPlan } from '../models/rendezvous';
import { rendezvousApi } from '../api/rendezvousApi';
import { buildNextPlan } from '../utils/rendezvous';
import { messages } from '../constants/messages';
import { toast } from '../utils/message';

export const useRendezvousStore = defineStore('rendezvous', {
  state: () => ({ plan: rendezvousApi.load() as RendezvousPlan }),
  actions: {
    // 唯一执行入口：先整体校验，全部通过才落库并替换状态；
    // 任一锁定者无法按时到达则抛错，集合时间、锁定状态与全部倒计时保持不变。
    applyPlan(draft: RendezvousDraft) {
      const next = buildNextPlan(this.plan, draft);
      rendezvousApi.save(next);
      this.plan = next;
      toast.ok(messages.rendezvousSaved);
    },
  },
});
