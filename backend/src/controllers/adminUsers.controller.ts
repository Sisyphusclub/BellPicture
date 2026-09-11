import type { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';

import { AppError } from '../errors/AppError.js';
import {
  createAdminManagedUser,
  deleteAdminManagedUser,
  listAdminUsers,
  setUserPermanentQuota,
  type AdminUserDTO,
} from '../services/adminUser.service.js';

import '../types/express.js';

const createUserBodySchema = z.object({
  username: z.string(),
  password: z.string().min(1),
  dailyTotal: z.number().int().min(0).max(10_000).optional(),
  permanentTotal: z.number().int().min(0).max(10_000).optional(),
});

const updateQuotaBodySchema = z
  .object({
    dailyTotal: z.number().int().min(0).max(10_000).optional(),
    permanentTotal: z.number().int().min(0).max(10_000).optional(),
  })
  .refine((value) => value.permanentTotal !== undefined || value.dailyTotal !== undefined, {
    message: '需要提供永久额度。',
  });

export interface AdminUsersListResponse {
  users: AdminUserDTO[];
}

export interface AdminUserResponse {
  user: AdminUserDTO;
}

function requireCurrentUser(req: Request): { id: string } {
  if (!req.user) {
    throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
  }
  return req.user;
}

function parseBody<T>(schema: z.ZodType<T>, body: unknown, message: string): T {
  try {
    return schema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new AppError('BAD_REQUEST', message, 400, err, { issues: err.issues });
    }
    throw err;
  }
}

export function buildAdminUsersController(): {
  list: (req: Request, res: Response, next: NextFunction) => void;
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  updateQuota: (req: Request, res: Response, next: NextFunction) => void;
  remove: (req: Request, res: Response, next: NextFunction) => Promise<void>;
} {
  return {
    list(_req, res, next) {
      try {
        const body: AdminUsersListResponse = { users: listAdminUsers() };
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    },

    async create(req, res, next) {
      try {
        const parsed = parseBody(createUserBodySchema, req.body, '创建用户请求无效。');
        const input =
          parsed.dailyTotal === undefined
            ? { username: parsed.username, password: parsed.password }
            : {
                username: parsed.username,
                password: parsed.password,
                ...(parsed.permanentTotal !== undefined
                  ? { permanentTotal: parsed.permanentTotal }
                  : { dailyTotal: parsed.dailyTotal }),
              };
        const created = await createAdminManagedUser(input);
        const body: AdminUserResponse = { user: created };
        res.status(201).json(body);
      } catch (err) {
        next(err);
      }
    },

    updateQuota(req, res, next) {
      try {
        const targetUserId = req.params.id;
        if (typeof targetUserId !== 'string' || targetUserId.length === 0) {
          throw new AppError('BAD_REQUEST', '用户 ID 无效。', 400, undefined, { field: 'id' });
        }
        const parsed = parseBody(updateQuotaBodySchema, req.body, '额度请求无效。');
        const permanentTotal = parsed.permanentTotal ?? parsed.dailyTotal;
        if (permanentTotal === undefined) {
          throw new AppError('BAD_REQUEST', '需要提供永久额度。', 400);
        }
        const updated = setUserPermanentQuota(targetUserId, permanentTotal);
        const body: AdminUserResponse = { user: updated };
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    },

    async remove(req, res, next) {
      try {
        const currentUser = requireCurrentUser(req);
        const targetUserId = req.params.id;
        if (typeof targetUserId !== 'string' || targetUserId.length === 0) {
          throw new AppError('BAD_REQUEST', '用户 ID 无效。', 400, undefined, { field: 'id' });
        }
        await deleteAdminManagedUser(targetUserId, currentUser.id);
        res.status(204).end();
      } catch (err) {
        next(err);
      }
    },
  };
}
