export interface QuotaSnapshot {
  total: number;
  remaining: number;
  checkedInToday: boolean;
  dailyCheckInReward: number;
}

export interface DailyCheckInResult extends QuotaSnapshot {
  claimed: boolean;
}

export interface QuotaReservation {
  commit: (actualCount: number) => QuotaSnapshot;
  release: () => QuotaSnapshot;
}

export interface QuotaPool {
  snapshot: () => QuotaSnapshot;
  reserve: (count: number) => QuotaReservation;
  checkIn: () => DailyCheckInResult;
}
