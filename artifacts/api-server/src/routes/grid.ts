import { Router, Request, Response } from 'express';
import { initialGridStatus, initialHourlyForecast } from '../data/mock-db';

export const gridRouter = Router();

// GET /api/grid/status
gridRouter.get('/status', (_req: Request, res: Response) => {
  const currentHour = new Date().getHours();
  const isPeak = currentHour >= 18 && currentHour < 21;

  const currentStatus = {
    ...initialGridStatus,
    isPeakHour: isPeak,
    status: isPeak ? ('critico' as const) : ('estavel' as const),
    headline: isPeak
      ? 'Atenção: Horário de Pico na área RJ do ONS (18h às 21h)'
      : 'Rede RJ (ONS) — Curva de Carga Real Fora do Pico',
    subtext: isPeak
      ? 'Evite recargas de alta potência agora. Veículos V2G estão sendo remunerados para aliviar o alimentador.'
      : 'Demanda da área RJ está abaixo da média diária. Bom momento para carregar antes do pico das 18h-21h.',
    lastUpdated: new Date().toISOString(),
  };

  res.json(currentStatus);
});

// GET /api/grid/forecast
gridRouter.get('/forecast', (_req: Request, res: Response) => {
  res.json({
    date: new Date().toISOString().split('T')[0],
    region: 'Área RJ (ONS) — média horária observada, jun-set/2026',
    criticalPeakWindow: '18:00 às 21:00',
    hourly: initialHourlyForecast,
  });
});
