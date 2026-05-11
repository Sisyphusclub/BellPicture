import { Router } from 'express';

import { getOutput } from '../controllers/outputs.controller.js';

export const outputsRouter = Router();

outputsRouter.get('/:filename', (req, res, next) => {
  void getOutput(req, res, next);
});
