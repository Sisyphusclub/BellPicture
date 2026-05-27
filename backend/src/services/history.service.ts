import { and, desc, eq } from 'drizzle-orm';

import { db } from '../db/drizzle.js';
import { imageRecords } from '../db/schema.js';
import type { AspectRatio } from '../types/image.js';

export interface ImageRecordDTO {
  id: string;
  batchId: string;
  prompt: string;
  model: string;
  referenceId?: string;
  aspectRatio?: AspectRatio;
  filename: string;
  mime: string;
  width: number;
  height: number;
  elapsedMs?: number;
  isPublic: boolean;
  createdAt: string; // ISO 8601
}

export interface NewImageRecord {
  id: string;
  batchId: string;
  userId: string;
  prompt: string;
  model: string;
  referenceId?: string;
  aspectRatio?: AspectRatio;
  filename: string;
  mime: string;
  width: number;
  height: number;
  elapsedMs?: number;
  isPublic: boolean;
  createdAt: Date;
}

function toDTO(row: typeof imageRecords.$inferSelect): ImageRecordDTO {
  const dto: ImageRecordDTO = {
    id: row.id,
    batchId: row.batchId,
    prompt: row.prompt,
    model: row.model,
    filename: row.filename,
    mime: row.mime,
    width: row.width,
    height: row.height,
    isPublic: row.isPublic,
    createdAt: row.createdAt.toISOString(),
  };
  if (row.referenceId !== null) dto.referenceId = row.referenceId;
  if (row.aspectRatio !== null) dto.aspectRatio = row.aspectRatio as AspectRatio;
  if (row.elapsedMs !== null) dto.elapsedMs = row.elapsedMs;
  return dto;
}

export function insertImageRecords(records: NewImageRecord[]): void {
  if (records.length === 0) return;
  db.insert(imageRecords)
    .values(
      records.map((r) => ({
        id: r.id,
        batchId: r.batchId,
        userId: r.userId,
        prompt: r.prompt,
        model: r.model,
        referenceId: r.referenceId ?? null,
        aspectRatio: r.aspectRatio ?? null,
        filename: r.filename,
        mime: r.mime,
        width: r.width,
        height: r.height,
        elapsedMs: r.elapsedMs ?? null,
        isPublic: r.isPublic,
        createdAt: r.createdAt,
      })),
    )
    .run();
}

export function listImageRecordsForUser(userId: string): ImageRecordDTO[] {
  const rows = db
    .select()
    .from(imageRecords)
    .where(eq(imageRecords.userId, userId))
    .orderBy(desc(imageRecords.createdAt))
    .all();
  return rows.map(toDTO);
}

export function listPublicImageRecords(): ImageRecordDTO[] {
  const rows = db
    .select()
    .from(imageRecords)
    .where(eq(imageRecords.isPublic, true))
    .orderBy(desc(imageRecords.createdAt))
    .all();
  return rows.map(toDTO);
}

/** Deletes one record. Returns number of rows deleted (0 if not owned by user). */
export function deleteImageRecordForUser(userId: string, id: string): number {
  const result = db
    .delete(imageRecords)
    .where(and(eq(imageRecords.userId, userId), eq(imageRecords.id, id)))
    .run();
  return result.changes;
}

/** Deletes every record in `batchId` owned by `userId`. */
export function deleteImageRecordBatchForUser(userId: string, batchId: string): number {
  const result = db
    .delete(imageRecords)
    .where(and(eq(imageRecords.userId, userId), eq(imageRecords.batchId, batchId)))
    .run();
  return result.changes;
}
