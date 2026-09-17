import type { Rendezvous } from '../models/rendezvous';
import { STORAGE_KEYS } from '../constants/storageVersion';
import { loadLocal, saveLocal } from '../utils/storage';

export const rendezvousApi = {
  /** 刷新后回读：直接读取上次成功保存的快照，读不到时返回 null */
  get: (): Rendezvous | null => loadLocal<Rendezvous | null>(STORAGE_KEYS.rendezvous, null),
  save: (rendezvous: Rendezvous) => saveLocal(STORAGE_KEYS.rendezvous, rendezvous),
};
