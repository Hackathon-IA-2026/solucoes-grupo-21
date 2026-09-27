import express, { Request, Response } from 'express';
import cors from 'cors';
import { NotificationAgent } from './index';
import type { ChargingStation, Vehicle, GridStatus } from '@workspace/shared-types';

const app = express();
const PORT = Number(process.env.AGENT_PORT) || 5001;

app.use(cors());
app.use(express.json());

// Healthcheck do Microserviço
app.get('/healthz', (_req: Request, res: Response) => {
  res.json({
    service: 'Rio-Flex WhatsApp Agent Microservice',
    status: 'online',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// POST /dispatch: Dispara alerta inteligente
app.post('/dispatch', (req: Request, res: Response) => {
  const { recipientName, recipientPhone, station, vehicle, gridStatus, baseUrl } = req.body;

  if (!station || !vehicle || !gridStatus) {
    res.status(400).json({ error: 'Parâmetros incompletos (station, vehicle e gridStatus são obrigatórios)' });
    return;
  }

  const alert = NotificationAgent.dispatchAlert({
    recipientName: recipientName || 'Marcos',
    recipientPhone,
    station: station as ChargingStation,
    vehicle: vehicle as Vehicle,
    gridStatus: gridStatus as GridStatus,
    baseUrl,
  });

  res.json({
    success: true,
    message: 'Alerta de oportunidade solar enviado com sucesso via Agente WhatsApp!',
    alert,
  });
});

// GET /history: Histórico de despachos
app.get('/history', (_req: Request, res: Response) => {
  res.json({
    total: NotificationAgent.getHistory().length,
    alerts: NotificationAgent.getHistory(),
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🤖 Agente Notificador WhatsApp rodando na porta ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}/healthz`);
});
