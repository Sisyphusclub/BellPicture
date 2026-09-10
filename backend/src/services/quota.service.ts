export interface QuotaSnapshot {
  total: number;
  remaining: number;
  checkedInToday: boolean;
  dailyCheckInReward: number;
  permanentTotal?: number;
  permanentUsed?: number;
  permanentRemaining?: number;
  bonusRemaining?: number;
  bonusExpiresAt?: string | null;
}

export interface DailyCheckInResult extends QuotaSnapshot {
  claimed: boolean;
}

export interface QuotaReservation {
  commit: (actualCount: number) => QuotaSnapshot;
  release: () => QuotaSnapshot;
}

export type QuotaReservationScope = 'all' | 'permanent';

export interface QuotaReservationOptions {
  scope?: QuotaReservationScope;
}

export interface QuotaPool {
  snapshot: () => QuotaSnapshot;
  reserve: (count: number, options?: QuotaReservationOptions) => QuotaReservation;
  checkIn: () => DailyCheckInResult;
}
