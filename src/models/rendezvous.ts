export interface RendezvousParticipant {
  id: string;
  name: string;
  /** 出发地 IANA 时区，例如 Asia/Shanghai */
  originTimezone: string;
  /** 通勤分钟数：从出发到抵达集合点所需时间 */
  commuteMinutes: number;
  /** 锁定状态：true 时 latestDepartureAt 冻结，不随集合时间重算 */
  locked: boolean;
  /** 最晚出发时刻（UTC ISO 绝对时刻）；未锁定者由集合时间倒推，锁定者保留锁定时的原值 */
  latestDepartureAt: string;
}

export interface Rendezvous {
  id: string;
  title: string;
  /** 集合时间（UTC ISO 绝对时刻，跨时区以此为唯一基准） */
  meetingAt: string;
  participants: RendezvousParticipant[];
  created_at: string;
  updated_at: string;
}
