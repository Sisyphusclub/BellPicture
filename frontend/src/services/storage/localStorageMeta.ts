import type { ImageRecord } from '@/types/image';
import { isRecord, isString, readNumber, readString } from '@/utils/narrowing';

const STORAGE_KEY = 'ref2image:history';
const SCHEMA_VERSION = 1;

interface HistoryPayload {
  schemaVersion: 1;
  records: ImageRecord[];
}

export function listAll(): ImageRecord[] {
  const payload = readPayload();
  return [...payload.records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function put(record: ImageRecord): void {
  const payload = readPayload();
  const nextRecords = [record, ...payload.records.filter((item) => item.id !== record.id)];
  writePayload({ schemaVersion: SCHEMA_VERSION, records: nextRecords });
}

export function remove(id: string): void {
  const payload = readPayload();
  writePayload({
    schemaVersion: SCHEMA_VERSION,
    records: payload.records.filter((item) => item.id !== id),
  });
}

export function clear(): void {
  writePayload({ schemaVersion: SCHEMA_VERSION, records: [] });
}

function readPayload(): HistoryPayload {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { schemaVersion: SCHEMA_VERSION, records: [] };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isHistoryPayload(parsed)) return { schemaVersion: SCHEMA_VERSION, records: [] };
    return parsed;
  } catch {
    return { schemaVersion: SCHEMA_VERSION, records: [] };
  }
}

function writePayload(payload: HistoryPayload): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function isHistoryPayload(value: unknown): value is HistoryPayload {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === SCHEMA_VERSION &&
    Array.isArray(value.records) &&
    value.records.every(isImageRecord)
  );
}

export function isImageRecord(value: unknown): value is ImageRecord {
  if (!isRecord(value)) return false;
  const id = readString(value, 'id');
  const createdAt = readString(value, 'createdAt');
  const prompt = readString(value, 'prompt');
  const model = readString(value, 'model');
  const width = readNumber(value, 'width');
  const height = readNumber(value, 'height');
  const referenceId = value.referenceId;

  return (
    isString(id) &&
    isString(createdAt) &&
    isString(prompt) &&
    isString(model) &&
    typeof width === 'number' &&
    typeof height === 'number' &&
    (referenceId === undefined || isString(referenceId))
  );
}
