import type { NextFunction, Request, Response } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Config real do User Pool (mesma usada pelo frontend em
// src/lib/cognito.ts). Sobrescrita via env em produção pela CDK stack
// (ver infra/lib/infra-stack.ts).
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-west-2_zFB3yOWNY';
const CLIENT_ID = process.env.COGNITO_CLIENT_ID || '6obne00nmbkntlfl28umu31lnj';

const verifier = CognitoJwtVerifier.create({
  userPoolId: USER_POOL_ID,
  tokenUse: 'access',
  clientId: CLIENT_ID,
});

export interface AuthenticatedRequest extends Request {
  auth?: { sub: string; username?: string };
}

/**
 * Middleware de verificação de JWT do Cognito. Usado apenas em rotas NOVAS
 * (ex: /api/copilot) — nunca retroaplicado às rotas de demo existentes
 * (session/vehicle/wallet/stations), que dependem do fluxo demoLogin() sem
 * token real.
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  if (!token) {
    res.status(401).json({
      error: 'Token de autenticação ausente. Faça login com uma conta Cognito real — o Modo Demo não gera token.',
    });
    return;
  }

  try {
    const payload = await verifier.verify(token);
    req.auth = { sub: payload.sub, username: payload.username };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}
