import { Router, Request, Response } from 'express';
import { NotificationAgent } from '@workspace/notification-agent';
import { initialStations, initialVehicle, initialGridStatus } from '../data/mock-db';

export const agentRouter = Router();

// GET or POST /api/agent/preview: Gera prévia da mensagem inteligente
const handlePreview = (req: Request, res: Response) => {
  const stationId = (req.query.stationId as string) || req.body?.stationId || 'coppe-ufrj-solar';
  const station = initialStations.find((s) => s.id === stationId) || initialStations[0];
  const baseUrl = (req.query.origin as string) || req.body?.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null) || 'http://localhost:3000';

  const preview = NotificationAgent.generateMessage({
    recipientName: (req.query.name as string) || req.body?.recipientName || 'Marcos',
    recipientPhone: (req.query.phone as string) || req.body?.recipientPhone || '+55 (21) 99876-5432',
    station,
    vehicle: initialVehicle,
    gridStatus: initialGridStatus,
    baseUrl,
  });

  res.json({
    station,
    ...preview,
  });
};

agentRouter.get('/preview', handlePreview);
agentRouter.post('/preview', handlePreview);

// POST /api/agent/dispatch: Dispara o alerta inteligente de recarga
agentRouter.post('/dispatch', (req: Request, res: Response) => {
  const { stationId, recipientName, recipientPhone } = req.body;
  const station = initialStations.find((s) => s.id === stationId) || initialStations[0];
  const baseUrl = (req.body?.origin as string) || (req.headers.referer ? new URL(req.headers.referer).origin : null) || 'http://localhost:3000';

  const alert = NotificationAgent.dispatchAlert({
    recipientName: recipientName || 'Marcos',
    recipientPhone: recipientPhone || '+55 (21) 99876-5432',
    station,
    vehicle: initialVehicle,
    gridStatus: initialGridStatus,
    baseUrl,
  });

  res.json({
    success: true,
    message: 'Alerta disparado com sucesso pelo Agente Rio-Flex!',
    alert,
  });
});

// GET /api/agent/history: Histórico de alertas disparados
agentRouter.get('/history', (_req: Request, res: Response) => {
  res.json({
    total: NotificationAgent.getHistory().length,
    alerts: NotificationAgent.getHistory(),
  });
});
