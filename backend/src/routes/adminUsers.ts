import { Router, type RequestHandler } from 'express';

import { buildAdminUsersController } from '../controllers/adminUsers.controller.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import { requireAuth } from '../middlewares/requireAuth.js';

export interface AdminUsersRouterDeps {
  /** Optional override for tests; defaults to Better Auth session middleware. */
  authMiddleware?: RequestHandler;
  /** Optional override for tests; defaults to persistent admin authorization. */
  adminMiddleware?: RequestHandler;
}

export function buildAdminUsersRouter(deps: AdminUsersRouterDeps = {}): Router {
  const router = Router();
  const controller = buildAdminUsersController();

  router.use(deps.authMiddleware ?? requireAuth);
  router.use(deps.adminMiddleware ?? requireAdmin);

  // GET /api/admin/users → list users with admin flag and effective daily quota.
  router.get('/users', (req, res, next) => {
    controller.list(req, res, next);
  });

  // POST /api/admin/users → create a username/password user.
  router.post('/users', (req, res, next) => {
    void controller.create(req, res, next);
  });

  // PATCH /api/admin/users/:id/quota → set per-user daily total quota.
  router.patch('/users/:id/quota', (req, res, next) => {
    controller.updateQuota(req, res, next);
  });

  // DELETE /api/admin/users/:id → delete a non-current, non-protected user.
  router.delete('/users/:id', (req, res, next) => {
    void controller.remove(req, res, next);
  });

  return router;
}
