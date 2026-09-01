import { Buffer } from 'node:buffer';

import { and, desc, eq, inArray, lt, or } from 'drizzle-orm';

import { db } from '../db/drizzle.js';
import { imageRecords } from '../db/schema.js';
import { AppError } from '../errors/AppError.js';
import { logger } from '../logger.js';
import { removeOutputByFilename } from '../storage/localStorage.js';
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

export type PublicImageRecordDTO = Omit<ImageRecordDTO, 'referenceId' | 'referenceIds'>;

export interface PublicImageRecordPage {
  records: PublicImageRecordDTO[];
  nextCursor?: string;
}

export const DEFAULT_PUBLIC_HISTORY_PAGE_SIZE = 24;
export const MAX_PUBLIC_HISTORY_PAGE_SIZE = 50;

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

export interface ImageRecordAccess {
  userId: string;
  isPublic: boolean;
}

export function findImageRecordAccess(filename: string): ImageRecordAccess | null {
  return (
    db
      .select({ userId: imageRecords.userId, isPublic: imageRecords.isPublic })
      .from(imageRecords)
      .where(eq(imageRecords.filename, filename))
      .get() ?? null
  );
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

export async function deleteImageRecordsForUser(
  userId: string,
  ids: readonly string[],
): Promise<number> {
  if (ids.length === 0) return 0;
  const removed = db.transaction((tx) => {
    const rows = tx
      .delete(imageRecords)
      .where(and(eq(imageRecords.userId, userId), inArray(imageRecords.id, [...ids])))
      .returning({ filename: imageRecords.filename })
      .all();
    return rows;
  });
  await cleanupDeletedOutputs(removed.map((row) => row.filename));
  return removed.length;
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

export function listPublicImageRecords(input: {
  cursor?: string;
  limit: number;
}): PublicImageRecordPage {
  const cursor = input.cursor === undefined ? undefined : decodePublicCursor(input.cursor);
  const cursorCondition =
    cursor === undefined
      ? undefined
      : or(
          lt(imageRecords.createdAt, new Date(cursor.createdAt)),
          and(
            eq(imageRecords.createdAt, new Date(cursor.createdAt)),
            lt(imageRecords.id, cursor.id),
          ),
        );
  const rows = db
    .select()
    .from(imageRecords)
    .where(and(eq(imageRecords.isPublic, true), cursorCondition))
    .orderBy(desc(imageRecords.createdAt), desc(imageRecords.id))
    .limit(input.limit + 1)
    .all();
  const pageRows = rows.slice(0, input.limit);
  const records = pageRows.map(toPublicDTO);
  const last = pageRows.at(-1);
  return {
    records,
    ...(rows.length > input.limit && last !== undefined
      ? { nextCursor: encodePublicCursor(last.createdAt, last.id) }
      : {}),
  };
}

function toPublicDTO(row: typeof imageRecords.$inferSelect): PublicImageRecordDTO {
  const dto = toDTO(row);
  delete dto.referenceId;
  delete dto.referenceIds;
  return dto;
}

function encodePublicCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.getTime(), id }), 'utf8').toString(
    'base64url',
  );
}

function decodePublicCursor(cursor: string): { createdAt: number; id: string } {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown;
    if (typeof parsed !== 'object' || parsed === null) throw new Error('cursor is not an object');
    const fields = parsed as Record<string, unknown>;
    if (
      typeof fields['createdAt'] !== 'number' ||
      !Number.isSafeInteger(fields['createdAt']) ||
      fields['createdAt'] < 0 ||
      fields['createdAt'] > Date.now() + 86_400_000 ||
      typeof fields['id'] !== 'string' ||
      fields['id'].length === 0
    ) {
      throw new Error('cursor fields are invalid');
    }
    return { createdAt: fields['createdAt'], id: fields['id'] };
  } catch (err) {
    throw new AppError('BAD_REQUEST', 'Invalid public history cursor', 400, err);
  }
}

/** Deletes one record. Returns number of rows deleted (0 if not owned by user). */
export async function deleteImageRecordForUser(userId: string, id: string): Promise<number> {
  const removed = db
    .delete(imageRecords)
    .where(and(eq(imageRecords.userId, userId), eq(imageRecords.id, id)))
    .returning({ filename: imageRecords.filename })
    .all();
  await cleanupDeletedOutputs(removed.map((row) => row.filename));
  return removed.length;
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
export async function deleteImageRecordBatchForUser(
  userId: string,
  batchId: string,
): Promise<number> {
  const removed = db
    .delete(imageRecords)
    .where(and(eq(imageRecords.userId, userId), eq(imageRecords.batchId, batchId)))
    .returning({ filename: imageRecords.filename })
    .all();
  await cleanupDeletedOutputs(removed.map((row) => row.filename));
  return removed.length;
}

async function cleanupDeletedOutputs(filenames: readonly string[]): Promise<void> {
  const results = await Promise.allSettled(
    filenames.map((filename) => removeOutputByFilename(filename)),
  );
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.error(
        { filename: filenames[index], err: result.reason },
        'history.delete: failed to remove output after deleting its record',
      );
    }
  });
}
