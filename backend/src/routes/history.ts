import { Router, type RequestHandler } from 'express';

import { buildHistoryController } from '../controllers/history.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';

export interface HistoryRouterDeps {
  /** Optional override for the auth middleware; defaults to `requireAuth`. */
  authMiddleware?: RequestHandler;
}

export function buildHistoryRouter(deps: HistoryRouterDeps = {}): Router {
  const router = Router();
  const controller = buildHistoryController();

  // GET /api/history/public → list public image records from every account, newest first.
  router.get('/public', (_req, res, next) => {
    controller.listPublic(_req, res, next);
  });

  router.use(deps.authMiddleware ?? requireAuth);

  // GET /api/history → list current user's image records, newest first.
  router.get('/', (req, res, next) => {
    controller.list(req, res, next);
  });

  // DELETE /api/history/batch/:batchId → delete all records in a batch owned by the user.
  router.delete('/batch/:batchId', (req, res, next) => {
    controller.removeBatch(req, res, next);
  });

  // DELETE /api/history/:id → delete one record owned by the user.
  router.delete('/:id', (req, res, next) => {
    controller.removeOne(req, res, next);
  });

  return router;
}
