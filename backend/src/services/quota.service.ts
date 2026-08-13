export interface QuotaSnapshot {
  total: number;
  remaining: number;
  checkedInToday: boolean;
  dailyCheckInReward: number;
}

export interface DailyCheckInResult extends QuotaSnapshot {
  claimed: boolean;
}

export interface QuotaPool {
  snapshot: () => QuotaSnapshot;
  ensureAvailable: (count: number) => void;
  consume: (count: number) => QuotaSnapshot;
  checkIn: () => DailyCheckInResult;
}
