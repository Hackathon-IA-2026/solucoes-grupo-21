import { Router, Response } from 'express';
import { BedrockRuntimeClient, ConverseCommand, type Message } from '@aws-sdk/client-bedrock-runtime';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';
import { REAL_HOURLY_LOAD_RJ, REAL_HOURLY_LOAD_BRASIL } from '../data/real-grid-data';
import {
  EV_SCENARIOS_NATIONAL_2035,
  EV_SCENARIOS_RJ_2035,
  GRID_IMPACT_2035,
  PDE2035_ALL_MODES_DEMAND_TWH_2035,
} from '../data/real-ev-scenarios';

export const copilotRouter = Router();

const REGION = process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-west-2';
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'amazon.nova-lite-v1:0';
const MAX_HISTORY_MESSAGES = 12;

const client = new BedrockRuntimeClient({ region: REGION });

function buildSystemPrompt(): string {
  return [
    'Você é o Rio-Flex Copilot: um assistente que responde perguntas sobre a rede elétrica do',
    'Rio de Janeiro e do Brasil, e sobre o impacto da eletrificação da frota de veículos leves',
    'até 2035. Use SOMENTE os dados reais fornecidos abaixo — nunca invente números.',
    'Se a pergunta pedir algo que esses dados não cobrem (ex: geração solar, que não é',
    'coletada neste datalake), diga isso claramente em vez de estimar.',
    '',
    'DADOS REAIS — curva de carga horária (ONS, média jun-set/2026, MW):',
    `RJ: ${JSON.stringify(REAL_HOURLY_LOAD_RJ)}`,
    `Brasil (soma S+NE+N+SECO): ${JSON.stringify(REAL_HOURLY_LOAD_BRASIL)}`,
    '',
    'DADOS REAIS — cenários de demanda de VEs leves em 2035 (projeção derivada de âncoras EPE):',
    `Nacional: ${JSON.stringify(EV_SCENARIOS_NATIONAL_2035)}`,
    `RJ: ${JSON.stringify(EV_SCENARIOS_RJ_2035)}`,
    `Contexto PDE2035 (todos os modos — leves+ônibus+caminhões, EPE, não comparável diretamente): ${PDE2035_ALL_MODES_DEMAND_TWH_2035} TWh/ano em 2035.`,
    '',
    'DADOS REAIS — impacto no pico de demanda por estratégia de carregamento (uncontrolled/smart/offpeak_shifted):',
    JSON.stringify(GRID_IMPACT_2035),
    '',
    'Responda em português do Brasil, de forma direta e técnica, citando os números relevantes.',
  ].join('\n');
}

copilotRouter.post('/ask', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { question, history } = req.body ?? {};

  if (!question || typeof question !== 'string') {
    res.status(400).json({ error: 'Campo "question" (string) é obrigatório.' });
    return;
  }

  const priorMessages: Message[] = Array.isArray(history)
    ? history
        .filter((m: unknown): m is Message => {
          const msg = m as Message;
          return !!msg && (msg.role === 'user' || msg.role === 'assistant') && Array.isArray(msg.content);
        })
        .slice(-MAX_HISTORY_MESSAGES)
    : [];

  try {
    const command = new ConverseCommand({
      modelId: MODEL_ID,
      system: [{ text: buildSystemPrompt() }],
      messages: [...priorMessages, { role: 'user', content: [{ text: question }] }],
      inferenceConfig: { maxTokens: 800, temperature: 0.2 },
    });

    const response = await client.send(command);
    const answer = response.output?.message?.content?.find((c) => 'text' in c)?.text
      ?? 'O modelo não retornou uma resposta em texto.';

    res.json({ answer, modelId: MODEL_ID, requestedBy: req.auth?.sub });
  } catch (err: any) {
    console.error('[Copilot] Erro ao consultar Bedrock:', err);
    res.status(502).json({
      error: 'Falha ao consultar o modelo Bedrock. Verifique credenciais AWS e acesso ao modelo na região configurada.',
      detail: err?.message,
    });
  }
});
