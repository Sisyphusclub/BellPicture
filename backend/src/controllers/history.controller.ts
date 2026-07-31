import type { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';

import { AppError } from '../errors/AppError.js';
import {
  deleteImageRecordBatchForUser,
  deleteImageRecordForUser,
  deleteImageRecordsForUser,
  listImageRecordsForUser,
  listPublicImageRecords,
  removePublicImageRecordFromGalleryAsAdmin,
  type ImageRecordDTO,
  updateImageRecordForUser,
  updateImageRecordsForUser,
} from '../services/history.service.js';

import '../types/express.js';

export interface HistoryListResponse {
  records: ImageRecordDTO[];
}

const imageMetadataUpdateSchema = z
  .object({
    isFavorite: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    collection: z.string().trim().max(64).nullable().optional(),
  })
  .refine(
    (value) =>
      value.isFavorite !== undefined ||
      value.isPublic !== undefined ||
      value.collection !== undefined,
    'At least one metadata field is required',
  );

const bulkMetadataUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  updates: imageMetadataUpdateSchema,
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
});

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) {
    throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
  }
  return req.user;
}

function isUuidLike(value: string): boolean {
  return /^[a-zA-Z0-9._-]{1,128}$/.test(value);
}

function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError('BAD_REQUEST', 'Invalid history request body', 400, error, {
        issues: error.issues,
      });
    }
    throw error;
  }
}

function validateIds(ids: readonly string[]): void {
  if (!ids.every(isUuidLike)) throw new AppError('BAD_REQUEST', 'Invalid history id', 400);
}

export function buildHistoryController(): {
  list: (req: Request, res: Response, next: NextFunction) => void;
  listPublic: (_req: Request, res: Response, next: NextFunction) => void;
  removeOne: (req: Request, res: Response, next: NextFunction) => void;
  removePublicAsAdmin: (req: Request, res: Response, next: NextFunction) => void;
  removeBatch: (req: Request, res: Response, next: NextFunction) => void;
  updateOne: (req: Request, res: Response, next: NextFunction) => void;
  updateMany: (req: Request, res: Response, next: NextFunction) => void;
  removeMany: (req: Request, res: Response, next: NextFunction) => void;
} {
  return {
    list(req, res, next) {
      try {
        const user = requireUser(req);
        const records = listImageRecordsForUser(user.id);
        const body: HistoryListResponse = { records };
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    },

    listPublic(_req, res, next) {
      try {
        const records = listPublicImageRecords();
        const body: HistoryListResponse = { records };
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    },

    removeOne(req, res, next) {
      try {
        const user = requireUser(req);
        const id = req.params.id;
        if (typeof id !== 'string' || !isUuidLike(id)) {
          throw new AppError('BAD_REQUEST', 'Invalid history id', 400);
        }
        const removed = deleteImageRecordForUser(user.id, id);
        if (removed === 0) {
          throw new AppError('NOT_FOUND', 'History record not found', 404);
        }
        res.status(204).end();
      } catch (err) {
        next(err);
      }
    },

    removePublicAsAdmin(req, res, next) {
      try {
        const user = requireUser(req);
        if (user.isAdmin !== true) {
          throw new AppError('FORBIDDEN', '需要管理员权限。', 403);
        }
        const id = req.params.id;
        if (typeof id !== 'string' || !isUuidLike(id)) {
          throw new AppError('BAD_REQUEST', 'Invalid history id', 400);
        }
        const removed = removePublicImageRecordFromGalleryAsAdmin(id);
        if (removed === 0) {
          throw new AppError('NOT_FOUND', 'Gallery image not found', 404);
        }
        res.status(204).end();
      } catch (err) {
        next(err);
      }
    },

    removeBatch(req, res, next) {
      try {
        const user = requireUser(req);
        const batchId = req.params.batchId;
        if (typeof batchId !== 'string' || !isUuidLike(batchId)) {
          throw new AppError('BAD_REQUEST', 'Invalid batch id', 400);
        }
        const removed = deleteImageRecordBatchForUser(user.id, batchId);
        if (removed === 0) {
          throw new AppError('NOT_FOUND', 'History batch not found', 404);
        }
        res.status(204).end();
      } catch (err) {
        next(err);
      }
    },

    updateOne(req, res, next) {
      try {
        const user = requireUser(req);
        const id = req.params.id;
        if (typeof id !== 'string' || !isUuidLike(id)) {
          throw new AppError('BAD_REQUEST', 'Invalid history id', 400);
        }
        const updates = parseBody(imageMetadataUpdateSchema, req.body);
        const record = updateImageRecordForUser(user.id, id, updates);
        if (!record) throw new AppError('NOT_FOUND', 'History record not found', 404);
        res.status(200).json({ record });
      } catch (err) {
        next(err);
      }
    },

    updateMany(req, res, next) {
      try {
        const user = requireUser(req);
        const parsed = parseBody(bulkMetadataUpdateSchema, req.body);
        validateIds(parsed.ids);
        const records = updateImageRecordsForUser(user.id, parsed.ids, parsed.updates);
        res.status(200).json({ records });
      } catch (err) {
        next(err);
      }
    },

    removeMany(req, res, next) {
      try {
        const user = requireUser(req);
        const parsed = parseBody(bulkDeleteSchema, req.body);
        validateIds(parsed.ids);
        const removed = deleteImageRecordsForUser(user.id, parsed.ids);
        res.status(200).json({ removed });
      } catch (err) {
        next(err);
      }
    },
  };
}
