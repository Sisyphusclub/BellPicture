export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const unit = units[unitIndex] ?? 'GB';
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${unit}`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatClockTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatFullDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(/\//g, '-');
}

export type DateBucket = 'today' | 'yesterday' | 'earlier';

export function dateBucket(iso: string, reference: Date = new Date()): DateBucket {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'earlier';
  const startOfDay = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const startOfYesterday = new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000);
  if (date.getTime() >= startOfDay.getTime()) return 'today';
  if (date.getTime() >= startOfYesterday.getTime()) return 'yesterday';
  return 'earlier';
}

export const DATE_BUCKET_LABELS: Record<DateBucket, string> = {
  today: '今天',
  yesterday: '昨天',
  earlier: '更早',
};

export function formatElapsed(ms: number | undefined): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = Math.round(seconds - minutes * 60);
  return `${minutes}m ${rem}s`;
}
