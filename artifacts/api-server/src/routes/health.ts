import { Router, Request, Response } from 'express';

export const healthRouter = Router();

healthRouter.get('/healthz', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Rio-Flex Smart Grid API',
    version: '1.0.0',
    region: process.env.AWS_REGION || 'local',
  });
});
