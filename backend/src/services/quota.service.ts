export interface QuotaSnapshot {
  total: number;
  remaining: number;
}

export interface QuotaPool {
  snapshot: () => QuotaSnapshot;
  ensureAvailable: (count: number) => void;
  consume: (count: number) => QuotaSnapshot;
}
