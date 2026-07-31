import { and, desc, eq, inArray } from 'drizzle-orm';

import { db } from '../db/drizzle.js';
import { imageRecords } from '../db/schema.js';
import type { AspectRatio, ImageResolution } from '../types/image.js';

export interface ImageRecordDTO {
  id: string;
  batchId: string;
  prompt: string;
  model: string;
  referenceId?: string;
  referenceIds?: string[];
  aspectRatio?: AspectRatio;
  filename: string;
  mime: string;
  width: number;
  height: number;
  count: number;
  resolution: ImageResolution;
  elapsedMs?: number;
  isPublic: boolean;
  isFavorite: boolean;
  collection?: string;
  createdAt: string; // ISO 8601
}

export interface NewImageRecord {
  id: string;
  batchId: string;
  userId: string;
  prompt: string;
  model: string;
  referenceId?: string;
  referenceIds?: string[];
  aspectRatio?: AspectRatio;
  filename: string;
  mime: string;
  width: number;
  height: number;
  count: number;
  resolution: ImageResolution;
  elapsedMs?: number;
  isPublic: boolean;
  createdAt: Date;
}

function parseReferenceIds(raw: string | null, fallback: string | null): string[] {
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return Array.from(
          new Set(parsed.filter((item): item is string => typeof item === 'string')),
        );
      }
    } catch {
      // Fall back to the legacy single reference id below.
    }
  }
  return fallback !== null ? [fallback] : [];
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
    count: row.count,
    resolution: row.resolution as ImageResolution,
    isPublic: row.isPublic,
    isFavorite: row.isFavorite,
    createdAt: row.createdAt.toISOString(),
  };
  const referenceIds = parseReferenceIds(row.referenceIds, row.referenceId);
  if (row.referenceId !== null) dto.referenceId = row.referenceId;
  if (referenceIds.length > 0) dto.referenceIds = referenceIds;
  if (row.aspectRatio !== null) dto.aspectRatio = row.aspectRatio as AspectRatio;
  if (row.elapsedMs !== null) dto.elapsedMs = row.elapsedMs;
  if (row.collection !== null) dto.collection = row.collection;
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
        referenceId: r.referenceId ?? r.referenceIds?.[0] ?? null,
        referenceIds:
          r.referenceIds && r.referenceIds.length > 0 ? JSON.stringify(r.referenceIds) : null,
        aspectRatio: r.aspectRatio ?? null,
        filename: r.filename,
        mime: r.mime,
        width: r.width,
        height: r.height,
        count: r.count,
        resolution: r.resolution,
        elapsedMs: r.elapsedMs ?? null,
        isPublic: r.isPublic,
        createdAt: r.createdAt,
      })),
    )
    .run();
}

export interface ImageMetadataUpdate {
  isFavorite?: boolean | undefined;
  isPublic?: boolean | undefined;
  collection?: string | null | undefined;
}

function metadataValues(updates: ImageMetadataUpdate) {
  return {
    ...(updates.isFavorite === undefined ? {} : { isFavorite: updates.isFavorite }),
    ...(updates.isPublic === undefined ? {} : { isPublic: updates.isPublic }),
    ...(updates.collection === undefined ? {} : { collection: updates.collection }),
  };
}

export function updateImageRecordForUser(
  userId: string,
  id: string,
  updates: ImageMetadataUpdate,
): ImageRecordDTO | null {
  const row = db
    .update(imageRecords)
    .set(metadataValues(updates))
    .where(and(eq(imageRecords.userId, userId), eq(imageRecords.id, id)))
    .returning()
    .get();
  return row ? toDTO(row) : null;
}

export function updateImageRecordsForUser(
  userId: string,
  ids: readonly string[],
  updates: ImageMetadataUpdate,
): ImageRecordDTO[] {
  if (ids.length === 0) return [];
  return db
    .update(imageRecords)
    .set(metadataValues(updates))
    .where(and(eq(imageRecords.userId, userId), inArray(imageRecords.id, [...ids])))
    .returning()
    .all()
    .map(toDTO);
}

export function deleteImageRecordsForUser(userId: string, ids: readonly string[]): number {
  if (ids.length === 0) return 0;
  return db
    .delete(imageRecords)
    .where(and(eq(imageRecords.userId, userId), inArray(imageRecords.id, [...ids])))
    .run().changes;
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

/** Removes one public gallery record regardless of owner. Intended for admin moderation. */
export function removePublicImageRecordFromGalleryAsAdmin(id: string): number {
  const candidateIds = imageRecordIdCandidates(id);
  const result = db
    .update(imageRecords)
    .set({ isPublic: false })
    .where(and(inArray(imageRecords.id, candidateIds), eq(imageRecords.isPublic, true)))
    .run();
  return result.changes;
}

function imageRecordIdCandidates(id: string): string[] {
  if (/\.(png|jpeg|webp)$/i.test(id)) return [id];
  return [id, `${id}.png`, `${id}.jpeg`, `${id}.webp`];
}

/** Deletes every record in `batchId` owned by `userId`. */
export function deleteImageRecordBatchForUser(userId: string, batchId: string): number {
  const result = db
    .delete(imageRecords)
    .where(and(eq(imageRecords.userId, userId), eq(imageRecords.batchId, batchId)))
    .run();
  return result.changes;
}
