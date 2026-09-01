import type { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';

import { auth } from '../config/auth.js';
import { logger } from '../logger.js';
import { isUserAdmin } from '../services/adminUser.service.js';

import '../types/express.js';

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (session) {
      req.user = {
        id: session.user.id,
        email: session.user.email,
        isAdmin: isUserAdmin(session.user.id),
        ...(session.user.username !== undefined ? { username: session.user.username } : {}),
        ...(session.user.name !== undefined ? { name: session.user.name } : {}),
        ...(session.user.image !== undefined ? { image: session.user.image } : {}),
      };
    }
  } catch (err) {
    logger.warn({ requestId: req.requestId, err }, 'optionalAuth: session lookup failed');
  }
  next();
}
