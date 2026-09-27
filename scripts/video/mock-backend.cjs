// Backend fictício completo, só para gravar o vídeo de demonstração da plataforma.
// Cobre visão geral, ciclo, rede/preço/clima, sinais, FlexIA (chat em streaming) e regulação.
const http = require('http');

const ORIGIN = process.env.MOCK_ORIGIN || 'http://localhost:5175';

const regions = [
  ['capital', 'Capital (Rio de Janeiro)', 'Light', 'SE/CO', -22.9, -43.2],
  ['niteroi', 'Niterói / Leste Fluminense', 'Enel Rio', 'SE/CO', -22.88, -43.1],
  ['baixada', 'Baixada Fluminense', 'Light', 'SE/CO', -22.7, -43.4],
  ['serrana', 'Região Serrana', 'Enel Rio', 'SE/CO', -22.5, -43.1],
  ['lagos', 'Região dos Lagos', 'Enel Rio', 'SE/CO', -22.8, -42.0],
  ['sul', 'Sul Fluminense', 'Light', 'SE/CO', -22.5, -44.1],
];

const meta = {
  chargeTypes: [
    { id: 'ac_lenta', label: 'AC lenta', description: 'Até 7 kW', marginKwh: 0.15, typicalKw: 7 },
    { id: 'dc_rapida', label: 'DC rápida', description: '50-150 kW', marginKwh: 0.22, typicalKw: 90 },
  ],
  signalLevels: [
    { id: 'verde', label: 'Janela verde', multiplier: 0.85, creditBonusKwh: 0.05 },
    { id: 'amarelo', label: 'Janela amarela', multiplier: 1, creditBonusKwh: 0 },
    { id: 'vermelho', label: 'Janela vermelha', multiplier: 1.25, creditBonusKwh: 0 },
  ],
  regions: regions.map((r) => ({ id: r[0], name: r[1], distributor: r[2], submarket: r[3], lat: r[4], lng: r[5] })),
  dataset: { snapshot: '2026-09-27', source: 'ANEEL/ANP · base de eletropostos (amostra de demonstração)', stats: {} },
};

const levels = ['vermelho', 'amarelo', 'verde', 'amarelo', 'verde', 'vermelho'];
const overview = () => ({
  generatedAt: new Date(Date.now() - 4 * 60000).toISOString(),
  totals: {
    stations: 812, publicStations: 640, maintenance: 37, inactiveOrConstruction: 12, connectors: 1930,
    connectorsByChargeType: {}, dcStations: 196, publishedPrices: { count: 410, min: 0.79, median: 1.86, max: 3.9 },
    priceConflicts: 6, consumers: 1284, activeAlerts: 3, activeSessions: 42, sessions7d: 964, energy7dKwh: 18420.5, flexEvents7d: 231,
  },
  regions: regions.map((r, i) => ({
    regionId: r[0], regionName: r[1], level: levels[i], signalSource: i === 0 ? 'gestor' : 'automatico',
    energyCostKwh: [0.92, 0.71, 0.44, 0.66, 0.41, 0.95][i], dcPriceKwh: [2.4, 2.1, 1.6, 2.0, 1.5, 2.5][i],
    demandMw: [5120, 1830, 2210, 640, 510, 880][i], loadFactorPct: [91, 78, 64, 73, 58, 88][i],
    evLoadMw: [12.4, 3.1, 4.6, 0.9, 0.7, 1.8][i], busyConnectors: [88, 24, 31, 9, 6, 17][i],
    totalConnectors: [420, 190, 260, 80, 70, 120][i], stations: [210, 96, 130, 40, 34, 60][i], maintenance: [14, 12, 4, 3, 0, 4][i],
  })),
  signals: [
    { id: 'sg1', regionId: 'capital', level: 'vermelho', startsAt: new Date(Date.now() + 3600e3).toISOString(), endsAt: new Date(Date.now() + 3 * 3600e3).toISOString(), status: 'agendado', multiplier: 1.25, creditBonusKwh: 0, title: 'Pico da noite', message: 'Demanda alta prevista entre 18h e 21h na Capital.', createdAt: new Date().toISOString(), origin: 'manual', approvedBy: 'gestora@rioflex.dev' },
  ],
});

const grid = () => ({
  grid: Array.from({ length: 24 }, (_, h) => ({
    localTime: '', localHour: h,
    regionalDemandMw: 4200 + Math.sin(h / 3) * 900 + (h >= 18 && h <= 21 ? 700 : 0),
    regionalCapacityMw: 6200,
    loadFactorPct: Math.round(60 + Math.sin(h / 3) * 15 + (h >= 18 && h <= 21 ? 12 : 0)),
    submarket: {
      demandGw: 62 + Math.sin(h / 4) * 6,
      generationGw: { hidraulica: 28, solar: h >= 6 && h <= 17 ? 8 * Math.sin(((h - 6) / 11) * Math.PI) : 0, eolica: 6 + Math.cos(h / 5) * 3, termica: 9, nuclear: 2 },
      renewableSharePct: 68 + Math.sin(h / 6) * 8,
    },
  })),
  weather: Array.from({ length: 24 }, (_, h) => ({
    localTime: '', localHour: h, temperatureC: 22 + Math.sin((h - 9) / 6) * 6, cloudCoverPct: 30 + (h % 5) * 8,
    irradianceWm2: h >= 6 && h <= 18 ? Math.round(700 * Math.sin(((h - 6) / 12) * Math.PI)) : 0,
    rainProbabilityPct: 10 + (h % 7) * 5, windKmh: 12 + (h % 4) * 3, condition: h >= 6 && h <= 18 ? 'ensolarado' : 'limpo',
  })),
  evLoad: { mw: 12.4, busyConnectors: 88, totalConnectors: 420 },
});

const forecast = () => ({
  points: Array.from({ length: 24 }, (_, h) => ({
    localTime: '', localHour: h, pldMwh: 180 + Math.sin(h / 4) * 60, tariffPost: h >= 18 && h <= 21 ? 'ponta' : 'fora_ponta',
    energyCostKwh: 0.5 + Math.sin(h / 4) * 0.2, supplier: 'Light',
    level: h >= 18 && h <= 21 ? 'vermelho' : h >= 11 && h <= 14 ? 'verde' : 'amarelo', signalSource: h === 19 ? 'gestor' : 'automatico',
    consumerPrices: { ac_lenta: 1.1 + Math.sin(h / 4) * 0.3, ac_semirrapida: 1.6 + Math.sin(h / 4) * 0.35, dc_rapida: 2.1 + Math.sin(h / 4) * 0.5, dc_ultrarrapida: 2.6 + Math.sin(h / 4) * 0.5 },
  })),
});

const guardrails = { multiplierMin: 0.7, multiplierMax: 1.4, creditBonusMaxKwh: 0.1, maxDurationHours: 6, loadAlertPct: 85, alertCooldownSeconds: 900 };

const knowledge = [
  { id: 'k1', category: 'regulacao', title: 'Resolução Normativa ANEEL nº 1.000/2021', authority: 'ANEEL', summary: 'Consolida as regras de prestação do serviço de distribuição, incluindo postos de recarga como unidades consumidoras especiais.', relevance: 'Base para o cadastro de eletropostos como UC e para a cobrança de tarifa de uso do sistema.', tags: ['tarifa', 'distribuição'], reference: 'https://www.gov.br/aneel' },
  { id: 'k2', category: 'protocolo', title: 'OCPP 2.0.1 — Open Charge Point Protocol', authority: 'OCA', summary: 'Protocolo aberto de comunicação entre carregadores e sistemas de gestão (smart charging, reserva, modulação remota de potência).', relevance: 'Usado pelo Rio Flex para enviar o comando de modulação do orquestrador ao carregador.', tags: ['OCPP', 'smart charging'], reference: 'https://openchargealliance.org' },
  { id: 'k3', category: 'mercado', title: 'PLD — Preço de Liquidação das Diferenças', authority: 'CCEE', summary: 'Preço horário do mercado de curto prazo, referência para o custo real da energia em cada submercado.', relevance: 'Insumo do sinal de preço que a FlexIA propõe para os consumidores.', tags: ['PLD', 'CCEE'], reference: 'https://www.ccee.org.br' },
  { id: 'k4', category: 'norma_tecnica', title: 'ABNT NBR IEC 61851-1', authority: 'ABNT', summary: 'Requisitos gerais para sistemas de recarga condutiva de veículos elétricos.', relevance: 'Referência de segurança elétrica para os conectores e modos de carga do cadastro.', tags: ['segurança', 'conector'], reference: 'https://www.abnt.org.br' },
];

let signalSeq = 2;
const flexiaConversations = new Map();

function sseFlexiaAnswer(question) {
  const answer = /pre[cç]o|tarifa/i.test(question)
    ? 'A capital está em janela vermelha agora, com o custo em R$ 0,95/kWh — cerca de 30% acima da mediana do dia. A Região dos Lagos está em verde, R$ 0,41/kWh. Recomendo orientar os consumidores da capital a adiar a recarga não urgente para depois das 21h.'
    : 'A carga da rede está em 91% na capital, a maior do estado, com 5.120 MW de demanda. As demais regiões seguem estáveis. Não há risco imediato de desligamento, mas a janela vermelha já está ativa e vale publicar um aviso.';
  return { conversationId: 'c-' + Date.now(), answer };
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const u = req.url.split('?')[0].replace('/api/v1', '');
  const qs = new URLSearchParams(req.url.split('?')[1] || '');
  const json = (o, c = 200) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };

  if (req.method === 'POST' && u === '/auth/login') return json({ user: { id: 'u1', email: 'gestora@rioflex.dev', name: 'Gestora Demo', role: 'manager', regionId: null } });
  if (u === '/auth/me') return json({ user: { id: 'u1', email: 'gestora@rioflex.dev', name: 'Gestora Demo', role: 'manager', regionId: null } });
  if (u === '/meta') return json(meta);
  if (u === '/manager/overview') return json(overview());
  if (u === '/notifications') return json({ unread: 0, items: [] });
  if (/^\/prices\/.+\/forecast/.test(u)) return json(forecast());
  if (u.startsWith('/manager/grid')) return json(grid());
  if (u === '/manager/guardrails') return json(guardrails);
  if (req.method === 'GET' && u === '/manager/knowledge') {
    const q = (qs.get('q') || '').toLowerCase();
    return json(q ? knowledge.filter((k) => (k.title + k.summary + k.tags.join(' ')).toLowerCase().includes(q)) : knowledge);
  }
  if (req.method === 'POST' && u === '/manager/signals') {
    signalSeq += 1;
    return json({ signal: { id: 'sg' + signalSeq, ...req.body }, notifiedConsumers: 812 });
  }
  if (u === '/manager/signals') return json(overview().signals);
  if (u === '/manager/flexia/status') return json({ engine: 'agentcore', model: 'Claude Sonnet 5', runtime: 'Bedrock AgentCore', routing: 'operacional', tools: ['consulta_sql', 'busca_documentos', 'previsao_clima'] });
  if (u === '/manager/flexia/conversations') return json([...flexiaConversations.values()].map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt })));
  if (u.startsWith('/manager/flexia/conversations/')) {
    const c = flexiaConversations.get(u.split('/').pop());
    return c ? json(c) : json({ error: { message: 'não encontrada' } }, 404);
  }

  if (req.method === 'POST' && u === '/manager/flexia/chat/stream') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const { message } = JSON.parse(body || '{}');
      const { conversationId, answer } = sseFlexiaAnswer(message || '');
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      const send = (o) => res.write(`data: ${JSON.stringify(o)}\n\n`);
      send({ type: 'meta', conversationId, engine: 'agentcore', route: 'operacional' });
      setTimeout(() => send({ type: 'tool', name: 'consulta_sql' }), 220);
      const words = answer.split(' ');
      let i = 0;
      const step = () => {
        const chunk = words.slice(i, i + 3).join(' ') + ' ';
        send({ type: 'delta', text: chunk });
        i += 3;
        if (i < words.length) setTimeout(step, 55);
        else {
          setTimeout(() => {
            send({ type: 'done', meta: { engine: 'agentcore', route: 'operacional', toolsUsed: ['consulta_sql'], ms: 900 } });
            flexiaConversations.set(conversationId, {
              id: conversationId, title: (message || 'Conversa').slice(0, 40), updatedAt: new Date().toISOString(),
              messages: [{ role: 'user', content: message }, { role: 'assistant', content: answer, meta: { engine: 'agentcore', route: 'operacional', toolsUsed: ['consulta_sql'] } }],
            });
            res.end();
          }, 120);
        }
      };
      setTimeout(step, 500);
    });
    return;
  }

  json({ error: { message: 'mock: ' + u } }, 404);
});

// Corpo do POST já parseado (o handler acima usa req.body no caso simples de /manager/signals).
const origHandler = server.listeners('request')[0];
server.removeAllListeners('request');
server.on('request', (req, res) => {
  if (req.method === 'POST' && req.url.includes('/manager/signals') && !req.url.includes('stream')) {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => { try { req.body = JSON.parse(body || '{}'); } catch { req.body = {}; } origHandler(req, res); });
    return;
  }
  origHandler(req, res);
});

const port = Number(process.env.MOCK_PORT || 8788);
server.listen(port, () => console.log(`[mock-backend] ouvindo em :${port}, origem liberada: ${ORIGIN}`));
