import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/AppError.js';
import {
  deleteImageRecordBatchForUser,
  deleteImageRecordForUser,
  listImageRecordsForUser,
  listPublicImageRecords,
  removePublicImageRecordFromGalleryAsAdmin,
  type ImageRecordDTO,
} from '../services/history.service.js';

import '../types/express.js';

export interface HistoryListResponse {
  records: ImageRecordDTO[];
}

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) {
    throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
  }
  return req.user;
}

function isUuidLike(value: string): boolean {
  return /^[a-zA-Z0-9._-]{1,128}$/.test(value);
}

export function buildHistoryController(): {
  list: (req: Request, res: Response, next: NextFunction) => void;
  listPublic: (_req: Request, res: Response, next: NextFunction) => void;
  removeOne: (req: Request, res: Response, next: NextFunction) => void;
  removePublicAsAdmin: (req: Request, res: Response, next: NextFunction) => void;
  removeBatch: (req: Request, res: Response, next: NextFunction) => void;
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
  };
}
