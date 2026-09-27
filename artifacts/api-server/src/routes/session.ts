import { Router, Request, Response } from 'express';
import { activeSession, walletData } from '../data/mock-db';

export const sessionRouter = Router();

// GET /api/session/active
sessionRouter.get('/active', (_req: Request, res: Response) => {
  res.json(activeSession);
});

// POST /api/session/simulate-step
sessionRouter.post('/simulate-step', (_req: Request, res: Response) => {
  if (activeSession.currentSoc < activeSession.targetSoc) {
    activeSession.currentSoc = Math.min(activeSession.targetSoc, activeSession.currentSoc + 5);
    activeSession.energyDeliveredKwh = Number((activeSession.energyDeliveredKwh + 2.25).toFixed(1));
    activeSession.currentCostRs = Number((activeSession.currentCostRs + 2.58).toFixed(2));
    activeSession.elapsedMinutes += 3;
    activeSession.remainingMinutes = Math.max(0, activeSession.remainingMinutes - 3);

    if (activeSession.currentSoc >= activeSession.targetSoc) {
      activeSession.chargingState = 'completed';
    }
  }

  res.json(activeSession);
});

// POST /api/session/vpp-modulate or /api/session/modulate
const handleModulate = (req: Request, res: Response) => {
  const accept = req.body?.accept ?? req.body?.accepted ?? false;

  if (accept) {
    activeSession.vppAccepted = true;
    activeSession.hasVppChallenge = false;
    activeSession.currentPowerKw = activeSession.vppModulationKw; // 35 kW
  } else {
    activeSession.hasVppChallenge = false;
  }

  res.json(activeSession);
};

sessionRouter.post('/vpp-modulate', handleModulate);
sessionRouter.post('/modulate', handleModulate);

// POST /api/session/stop
sessionRouter.post('/stop', (_req: Request, res: Response) => {
  activeSession.chargingState = 'completed';

  // Se tiver bônus de modulação aceito, creditar na carteira
  const bonusEarned = activeSession.vppAccepted ? activeSession.vppBonusRs : 0;
  const totalCreditsEarned = Math.round((bonusEarned + 4.0) * 10); // 1 crédito = R$ 0,10

  walletData.credits += totalCreditsEarned;
  walletData.creditValueRs = Number((walletData.credits * 0.1).toFixed(2));
  walletData.totalFlexEnergyKwh = Number((walletData.totalFlexEnergyKwh + activeSession.energyDeliveredKwh).toFixed(1));
  walletData.smartSessionsCount += 1;

  walletData.activities.unshift({
    id: Date.now(),
    date: 'Hoje, recém-concluída',
    station: activeSession.stationName,
    energyKwh: activeSession.energyDeliveredKwh,
    cost: activeSession.currentCostRs,
    bonusText: `+ R$ ${(bonusEarned + 4.0).toFixed(2).replace('.', ',')}`,
    event: activeSession.vppAccepted
      ? 'Sessão Otimizada com Modulação VPP Rio-Flex'
      : 'Janela Solar Rio Flex',
  });

  walletData.ledger.unshift({
    id: `m-${Date.now()}`,
    date: 'Hoje, agora',
    desc: `Bônus flexibilidade ${activeSession.stationName}`,
    amount: `+ R$ ${(bonusEarned + 4.0).toFixed(2).replace('.', ',')}`,
    type: 'credit',
  });

  res.json({
    message: 'Sessão encerrada com sucesso',
    session: activeSession,
    receipt: {
      station: activeSession.stationName,
      energyKwh: activeSession.energyDeliveredKwh,
      totalPaidRs: activeSession.currentCostRs,
      bonusCreditsEarned: totalCreditsEarned,
      bonusRsEarned: bonusEarned + 4.0,
      vppModulationAccepted: activeSession.vppAccepted,
    },
  });
});

// POST /api/session/reset (útil para reiniciar a demo do Hackathon)
sessionRouter.post('/reset', (_req: Request, res: Response) => {
  activeSession.chargingState = 'charging';
  activeSession.currentSoc = 52;
  activeSession.targetSoc = 80;
  activeSession.currentPowerKw = 60;
  activeSession.energyDeliveredKwh = 13.4;
  activeSession.currentCostRs = 15.41;
  activeSession.elapsedMinutes = 18;
  activeSession.remainingMinutes = 14;
  activeSession.hasVppChallenge = true;
  activeSession.vppAccepted = false;

  res.json({ message: 'Sessão reiniciada para estado de demonstração', session: activeSession });
});
