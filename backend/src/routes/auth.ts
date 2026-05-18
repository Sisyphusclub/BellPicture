import { eq } from 'drizzle-orm';
import express, { type NextFunction, type Request, type Response, type Router } from 'express';
import { z } from 'zod';

import { auth } from '../config/auth.js';
import { env } from '../config/env.js';
import { db } from '../db/drizzle.js';
import { user } from '../db/schema.js';
import { AppError } from '../errors/AppError.js';
import { internalEmailForUsername, isValidUsername, normalizeUsername } from '../utils/username.js';

const USERNAME_REQUIREMENTS_MESSAGE = '用户名需为 3-32 位小写字母、数字或下划线。';
const PASSWORD_REQUIREMENTS_MESSAGE = '密码至少需要 8 个字符。';
const EMAIL_AUTH_REPLACED_MESSAGE = '请使用用户名和密码登录或注册。';

const signUpUsernameSchema = z.object({
  username: z.string(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

function headersFromRequest(req: Request): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined || key.toLowerCase() === 'content-length') continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }
  headers.set('content-type', 'application/json');
  return headers;
}

function appendResponseHeaders(res: Response, headers: Headers): void {
  const setCookies = headers.getSetCookie();
  const setCookieHeaderNames = new Set(['set-cookie']);

  for (const setCookie of setCookies) {
    res.append('set-cookie', setCookie);
  }

  headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (setCookieHeaderNames.has(lowerKey) && setCookies.length > 0) return;
    if (lowerKey === 'content-length' || lowerKey === 'transfer-encoding') return;
    if (lowerKey === 'set-cookie') {
      res.append('set-cookie', value);
      return;
    }
    res.setHeader(key, value);
  });
}

function betterAuthSignUpUrl(): string {
  return new URL('/api/auth/sign-up/email', env.BETTER_AUTH_URL).toString();
}

function rejectEmailPasswordAuth(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('BAD_REQUEST', EMAIL_AUTH_REPLACED_MESSAGE, 400));
}

async function handleSignUpUsername(req: Request, res: Response): Promise<void> {
  const parsed = signUpUsernameSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('BAD_REQUEST', '请填写用户名和密码。', 400, parsed.error, {
      issues: parsed.error.issues,
    });
  }

  const username = normalizeUsername(parsed.data.username);
  if (!isValidUsername(username)) {
    throw new AppError('BAD_REQUEST', USERNAME_REQUIREMENTS_MESSAGE, 400, undefined, {
      field: 'username',
    });
  }
  if (parsed.data.password.length < 8) {
    throw new AppError('BAD_REQUEST', PASSWORD_REQUIREMENTS_MESSAGE, 400, undefined, {
      field: 'password',
    });
  }

  const existingUser = db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, username))
    .get();
  if (existingUser) {
    throw new AppError('BAD_REQUEST', '该用户名已被占用，请换一个。', 400, undefined, {
      field: 'username',
    });
  }

  const response = await auth.handler(
    new Request(betterAuthSignUpUrl(), {
      method: 'POST',
      headers: headersFromRequest(req),
      body: JSON.stringify({
        email: internalEmailForUsername(username),
        password: parsed.data.password,
        name: username,
        username,
        displayUsername: username,
        ...(parsed.data.rememberMe !== undefined ? { rememberMe: parsed.data.rememberMe } : {}),
      }),
    }),
  );

  appendResponseHeaders(res, response.headers);
  res.status(response.status).send(Buffer.from(await response.arrayBuffer()));
}

export function buildUsernameAuthRouter(): Router {
  const router = express.Router();

  router.post('/sign-up/email', rejectEmailPasswordAuth);
  router.post('/sign-in/email', rejectEmailPasswordAuth);
  router.post(
    '/sign-up/username',
    express.json({ limit: '1mb' }),
    (req, res, next: NextFunction) => {
      void handleSignUpUsername(req, res).catch(next);
    },
  );

  return router;
}
