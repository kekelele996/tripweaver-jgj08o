import type { RendezvousPlan } from '../models/rendezvous';
import { STORAGE_KEYS } from '../constants/storageVersion';
import { loadLocal, saveLocal } from '../utils/storage';
import { createDefaultPlan } from '../utils/rendezvous';

export const rendezvousApi = {
  load(): RendezvousPlan {
    const existing = loadLocal<RendezvousPlan | null>(STORAGE_KEYS.rendezvous, null);
    if (existing) return existing;
    const seed = createDefaultPlan();
    saveLocal(STORAGE_KEYS.rendezvous, seed);
    return seed;
  },
  save: (plan: RendezvousPlan) => saveLocal(STORAGE_KEYS.rendezvous, plan),
};
