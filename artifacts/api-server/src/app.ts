import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { stationsRouter } from './routes/stations';
import { gridRouter } from './routes/grid';
import { sessionRouter } from './routes/session';
import { walletRouter } from './routes/wallet';
import { vehicleRouter } from './routes/vehicle';
import { agentRouter } from './routes/agent';
import { copilotRouter } from './routes/copilot';

export const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logger for local dev & AWS CloudWatch logs
app.use((req: Request, _res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api', healthRouter);
app.use('/api/stations', stationsRouter);
app.use('/api/grid', gridRouter);
app.use('/api/session', sessionRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/vehicle', vehicleRouter);
app.use('/api/agent', agentRouter);
app.use('/api/copilot', copilotRouter);

// 404 handler for undefined API routes
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]:', err);
  res.status(500).json({
    error: 'Erro interno no servidor Rio-Flex',
    message: err.message,
  });
});
