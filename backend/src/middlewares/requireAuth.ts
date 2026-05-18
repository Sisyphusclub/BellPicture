import type { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';

import { auth } from '../config/auth.js';
import { AppError } from '../errors/AppError.js';
import { logger } from '../logger.js';

import '../types/express.js';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) {
      throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    }
    req.user = {
      id: session.user.id,
      email: session.user.email,
      ...(session.user.username !== undefined ? { username: session.user.username } : {}),
      ...(session.user.name !== undefined ? { name: session.user.name } : {}),
      ...(session.user.image !== undefined ? { image: session.user.image } : {}),
    };
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    logger.error({ requestId: req.requestId, err }, 'requireAuth: unexpected error');
    next(new AppError('UNAUTHORIZED', 'Authentication required', 401, err));
  }
}
