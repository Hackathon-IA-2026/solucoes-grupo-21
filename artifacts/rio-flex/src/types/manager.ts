/** Tipos dos contratos da API de gestão (espelham os DTOs do backend flexrioTest/FlexRioApiServer). */

export type ChargeType = 'ac_lenta' | 'ac_semirrapida' | 'dc_rapida' | 'dc_ultrarrapida';
export type SignalLevel = 'verde' | 'amarelo' | 'vermelho';

export type ManagerUser = {
  id: string;
  email: string;
  name: string;
  role: 'manager';
  regionId: string | null;
};

export type RegionMeta = { id: string; name: string; distributor: string; submarket: string; lat: number; lng: number };

export type StationsStats = {
  stations: number;
  publicStations: number;
  maintenance: number;
  inactiveOrConstruction: number;
  connectors: number;
  connectorsByChargeType: Record<ChargeType, number>;
  dcStations: number;
  publishedPrices: { count: number; min: number | null; median: number | null; max: number | null };
  priceConflicts: number;
};

export type ManagerMeta = {
  chargeTypes: { id: ChargeType; label: string; description: string; marginKwh: number; typicalKw: number }[];
  signalLevels: { id: SignalLevel; label: string; multiplier: number; creditBonusKwh: number }[];
  regions: RegionMeta[];
  dataset: { snapshot: string; source: string; stats: StationsStats };
};

export type Signal = {
  level: SignalLevel;
  source: 'automatico' | 'gestor';
  signalId?: string;
  title?: string;
  multiplier: number;
  creditBonusKwh: number;
};

export type SignalDto = {
  id: string;
  regionId: string;
  level: SignalLevel;
  startsAt: string;
  endsAt: string;
  status: 'agendado' | 'ativo' | 'encerrado';
  multiplier: number;
  creditBonusKwh: number;
  title: string;
  message: string;
  createdAt: string;
  origin: 'manual' | 'flexia';
  approvedBy: string;
};

export type Guardrails = {
  multiplierMin: number;
  multiplierMax: number;
  creditBonusMaxKwh: number;
  maxDurationHours: number;
  loadAlertPct: number;
  alertCooldownSeconds: number;
};

export type ForecastPoint = {
  localTime: string;
  localHour: number;
  pldMwh: number;
  tariffPost: string;
  energyCostKwh: number;
  supplier: string;
  level: SignalLevel;
  signalSource: string;
  consumerPrices: Record<ChargeType, number>;
};

export type Notification = { id: string; kind: string; title: string; body: string; data: Record<string, unknown> | null; createdAt: string; read: boolean };

export type ManagerOverview = {
  generatedAt: string;
  totals: StationsStats & { consumers: number; activeAlerts: number; activeSessions: number; sessions7d: number; energy7dKwh: number; flexEvents7d: number };
  regions: {
    regionId: string;
    regionName: string;
    level: SignalLevel;
    signalSource: string;
    energyCostKwh: number;
    dcPriceKwh: number;
    demandMw: number;
    loadFactorPct: number;
    evLoadMw: number;
    busyConnectors: number;
    totalConnectors: number;
    stations: number;
    maintenance: number;
  }[];
  signals: SignalDto[];
};

export type GridPoint = {
  localTime: string;
  localHour: number;
  regionalDemandMw: number;
  regionalCapacityMw: number;
  loadFactorPct: number;
  submarket: {
    demandGw: number;
    generationGw: { hidraulica: number; solar: number; eolica: number; termica: number; nuclear: number };
    renewableSharePct: number;
  };
};

export type WeatherPoint = {
  localTime: string;
  localHour: number;
  temperatureC: number;
  cloudCoverPct: number;
  irradianceWm2: number;
  rainProbabilityPct: number;
  windKmh: number;
  condition: string;
};

export type SignalProposal = {
  regionId: string;
  regionName: string;
  level: SignalLevel;
  startsAt: string;
  endsAt: string;
  title: string;
  message: string;
};

export type FlexiaMessage = {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  meta?: { engine: 'agentcore' | 'claude' | 'local'; route?: 'operacional' | 'setor' | 'misto'; toolsUsed: string[]; proposal?: SignalProposal; note?: string; ms?: number } | null;
  createdAt?: string;
};

export type KnowledgeEntry = { id: string; category: string; title: string; authority: string; summary: string; relevance: string; tags: string[]; reference: string };
