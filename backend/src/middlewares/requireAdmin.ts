import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/AppError.js';
import { isUserAdmin } from '../services/adminUser.service.js';

import '../types/express.js';

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  try {
    if (!req.user) {
      throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    }
    if (!isUserAdmin(req.user.id)) {
      throw new AppError('FORBIDDEN', '需要管理员权限。', 403);
    }
    req.user.isAdmin = true;
    next();
  } catch (err) {
    next(err);
  }
}
