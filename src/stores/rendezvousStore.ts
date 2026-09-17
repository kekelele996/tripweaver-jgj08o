import { defineStore } from 'pinia';
import type { Rendezvous } from '../models/rendezvous';
import { rendezvousApi } from '../api/rendezvousApi';
import { messages } from '../constants/messages';
import { toast } from '../utils/message';
import {
  commitRendezvous,
  type LockedConflict,
  type RendezvousDraft,
  RendezvousConflictError,
  RendezvousValidationError,
} from '../utils/rendezvousEngine';

export interface CommitFailure {
  reason: 'conflict' | 'validation';
  conflicts: LockedConflict[];
  message: string;
}

export const useRendezvousStore = defineStore('rendezvous', {
  state: () => ({
    /** 当前生效的会合计划（= localStorage 中最后一次成功保存的快照） */
    current: rendezvousApi.get() as Rendezvous | null,
    /** 最近一次保存失败信息；下次保存前保持，成功后清空 */
    lastFailure: null as CommitFailure | null,
  }),
  actions: {
    /**
     * 唯一执行入口：新建 / 修改集合时间 / 登记或编辑参与者 / 切换锁定，
     * 全部经由这里提交。事务在草稿上执行，校验或冲突失败时不触碰 current、
     * 不写入 localStorage，旧集合时间、锁定状态和全部倒计时保持不变。
     * 返回是否保存成功。
     */
    commit(draft: RendezvousDraft): boolean {
      try {
        const next = commitRendezvous(this.current, draft);
        rendezvousApi.save(next);
        this.current = next;
        this.lastFailure = null;
        toast.ok(messages.rendezvousSaved);
        return true;
      } catch (error) {
        if (error instanceof RendezvousConflictError) {
          this.lastFailure = {
            reason: 'conflict',
            conflicts: error.conflicts,
            message: messages.rendezvousSaveBlocked,
          };
          toast.fail(messages.rendezvousSaveBlocked);
          return false;
        }
        const message = error instanceof RendezvousValidationError
          ? error.message
          : messages.rendezvousInvalid;
        this.lastFailure = { reason: 'validation', conflicts: [], message };
        toast.fail(messages.rendezvousInvalid + '：' + message);
        return false;
      }
    },
  },
});
