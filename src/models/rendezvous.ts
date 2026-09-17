export interface RendezvousParticipant {
  id: string;
  name: string;
  timezone: string;
  commuteMinutes: number;
  locked: boolean;
  lockedDepartAt: string | null;
}

export interface RendezvousPlan {
  meetAt: string;
  participants: RendezvousParticipant[];
  updatedAt: string;
}

export interface RendezvousParticipantDraft {
  id: string;
  name: string;
  timezone: string;
  commuteMinutes: number;
  locked: boolean;
}

export interface RendezvousDraft {
  meetAt: string;
  participants: RendezvousParticipantDraft[];
}
