import { Router, Request, Response } from 'express';
import { walletData } from '../data/mock-db';

export const walletRouter = Router();

// GET /api/wallet
walletRouter.get('/', (_req: Request, res: Response) => {
  res.json(walletData);
});

// POST /api/wallet/redeem
walletRouter.post('/redeem', (req: Request, res: Response) => {
  const { amountCredits, purpose } = req.body;

  const creditsToRedeem = Number(amountCredits);
  if (isNaN(creditsToRedeem) || creditsToRedeem <= 0) {
    res.status(400).json({ error: 'Quantidade de créditos inválida' });
    return;
  }

  if (creditsToRedeem > walletData.credits) {
    res.status(400).json({ error: 'Saldo de créditos insuficiente' });
    return;
  }

  const redeemedValueRs = Number((creditsToRedeem * 0.1).toFixed(2));
  walletData.credits -= creditsToRedeem;
  walletData.creditValueRs = Number((walletData.credits * 0.1).toFixed(2));

  const entryDesc = purpose || 'Abatimento automático em recarga';
  walletData.ledger.unshift({
    id: `m-redeem-${Date.now()}`,
    date: 'Hoje, agora',
    desc: entryDesc,
    amount: `- R$ ${redeemedValueRs.toFixed(2).replace('.', ',')}`,
    type: 'debit',
  });

  res.json({
    success: true,
    message: `Resgate de ${creditsToRedeem} créditos (R$ ${redeemedValueRs.toFixed(2)}) realizado com sucesso!`,
    redeemedValueRs,
    remainingCredits: walletData.credits,
    remainingValueRs: walletData.creditValueRs,
  });
});
