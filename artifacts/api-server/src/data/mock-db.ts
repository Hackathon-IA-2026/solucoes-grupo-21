import type {
  ChargingStation,
  GridStatus,
  HourlyForecast,
  Vehicle,
  CarOption,
  ActiveSession,
  WalletSummary,
} from '@workspace/shared-types';
import { REAL_HOURLY_LOAD_RJ } from './real-grid-data';

// Janela de pico observada na curva real do ONS para a área RJ (18h-21h:
// avgMw sobe de ~5.7 GW para o pico de 6.08 GW às 19h e só volta a cair
// depois das 21h). Não há dado real de geração solar neste datalake, então
// `solarGw` é sempre 0 e o status 'solar' nunca é emitido aqui.
const PEAK_HOURS_RJ = new Set([18, 19, 20, 21]);

// ==========================================
// IN-MEMORY DATABASE FOR RIO-FLEX PLATFORM
// ==========================================

export const initialStations: ChargingStation[] = [
  {
    id: 'coppe-ufrj-solar',
    name: 'COPPE / UFRJ Eletroposto Solar',
    operator: 'COPPE Sol & V2G Labs',
    address: 'Av. Horácio Macedo, 2030 - Cidade Universitária, Ilha do Fundão',
    latitude: -22.8625,
    longitude: -43.2241,
    distanceKm: 2.1,
    etaMinutes: 6,
    pricePerKwh: 1.15,
    availableConnectors: 4,
    totalConnectors: 6,
    renewableShare: 100,
    estimatedQueueMinutes: 0,
    score: 9.8,
    incentive: {
      label: 'Excedente Solar COPPE',
      value: 4.5,
    },
    connectors: [
      { type: 'CCS2', powerKw: 150, available: true },
      { type: 'CCS2', powerKw: 60, available: true },
      { type: 'CCS2', powerKw: 60, available: false },
      { type: 'Type2', powerKw: 22, available: true },
      { type: 'Type2', powerKw: 22, available: true },
      { type: 'CHAdeMO', powerKw: 50, available: false },
    ],
    specs: {
      maxPowerKw: 150,
      network: 'Rio-Flex Smart Grid Hub',
      parking: 'Gratuito para veículos em recarga',
      amenities: ['Café Universitário', 'Wi-Fi 6 Eduroam', 'Bancadas de Estudo', 'Banheiros'],
      description: 'Hub pioneiro de recarga inteligente com geração fotovoltaica local de 350 kWp e baterias BESS integradas para alívio da rede da Ilha do Fundão.',
    },
  },
  {
    id: 'marina-flex-station',
    name: 'Marina Flex Station',
    operator: 'Rio-Flex & Enel X',
    address: 'Av. Infante Dom Henrique, s/n - Glória, Rio de Janeiro - RJ',
    latitude: -22.9201,
    longitude: -43.1729,
    distanceKm: 4.8,
    etaMinutes: 12,
    pricePerKwh: 1.28,
    availableConnectors: 3,
    totalConnectors: 4,
    renewableShare: 92,
    estimatedQueueMinutes: 0,
    score: 9.4,
    incentive: {
      label: 'Bônus Janela Solar',
      value: 4.0,
    },
    connectors: [
      { type: 'CCS2', powerKw: 120, available: true },
      { type: 'CCS2', powerKw: 60, available: true },
      { type: 'CCS2', powerKw: 60, available: true },
      { type: 'Type2', powerKw: 22, available: false },
    ],
    specs: {
      maxPowerKw: 120,
      network: 'Rio-Flex Hub Orla',
      parking: 'Estacionamento conveniado Marina da Glória',
      amenities: ['Restaurantes', 'Vista Baía de Guanabara', 'Segurança 24h', 'Wi-Fi'],
      description: 'Eletroposto ultrarrápido na orla do Aterro do Flamengo com modulação inteligente para alívio do alimentador Glória-Flamengo.',
    },
  },
  {
    id: 'copacabana-atlantica',
    name: 'Copacabana Atlântica Hub',
    operator: 'Shell Recharge & Light',
    address: 'Av. Atlântica, 2600 - Copacabana, Rio de Janeiro - RJ',
    latitude: -22.9698,
    longitude: -43.1868,
    distanceKm: 8.5,
    etaMinutes: 20,
    pricePerKwh: 1.45,
    availableConnectors: 2,
    totalConnectors: 4,
    renewableShare: 78,
    estimatedQueueMinutes: 5,
    score: 8.9,
    incentive: {
      label: 'Flex Zona Sul',
      value: 3.0,
    },
    connectors: [
      { type: 'CCS2', powerKw: 100, available: true },
      { type: 'CCS2', powerKw: 50, available: false },
      { type: 'Type2', powerKw: 22, available: true },
      { type: 'CHAdeMO', powerKw: 50, available: false },
    ],
    specs: {
      maxPowerKw: 100,
      network: 'Shell Recharge',
      parking: 'Subsolo seguro com manobrista',
      amenities: ['Conveniência Shell Select', 'Caixa 24h', 'Farmácia'],
      description: 'Ponto estratégico na Zona Sul com tarifa reduzida fora dos horários de pico noturno da orla.',
    },
  },
  {
    id: 'marica-v2g-tarifa-zero',
    name: 'Hub Maricá Tarifa Zero V2G',
    operator: 'Prefeitura de Maricá & AURA',
    address: 'Rodovia Amaral Peixoto, km 28 - Centro, Maricá - RJ',
    latitude: -22.9194,
    longitude: -42.8186,
    distanceKm: 42.0,
    etaMinutes: 45,
    pricePerKwh: 0.95,
    availableConnectors: 8,
    totalConnectors: 12,
    renewableShare: 100,
    estimatedQueueMinutes: 0,
    score: 9.9,
    incentive: {
      label: 'Piloto V2G Ônibus & Vans',
      value: 6.0,
    },
    connectors: [
      { type: 'CCS2', powerKw: 180, available: true },
      { type: 'CCS2', powerKw: 180, available: true },
      { type: 'CCS2', powerKw: 90, available: true },
      { type: 'Type2', powerKw: 43, available: true },
    ],
    specs: {
      maxPowerKw: 180,
      network: 'AURA VPP & EPT Maricá',
      parking: 'Garagem Central Pública',
      amenities: ['Auditório de Treinamento', 'Vestiário', 'Sala de Operações'],
      description: 'Projeto piloto com 30 ônibus elétricos conectados em 13,8 kV, injetando 2,5 MW na rede durante o pico carioca das 18h às 21h.',
    },
  },
];

export const initialGridStatus: GridStatus = {
  status: 'estavel',
  headline: 'Rede RJ (ONS) — Curva de Carga Real Fora do Pico',
  subtext: 'Demanda da área RJ está abaixo da média diária. Bom momento para carregar antes do pico das 18h-21h.',
  isPeakHour: false,
  peakHourWindow: '18h às 21h',
  bestChargingWindow: '00h às 06h',
  solarSurplusGw: 0,
  thermalDispatchedMw: 0,
  temperatureC: 34.5,
  city: 'Rio de Janeiro, RJ',
  lastUpdated: new Date().toISOString(),
};

// Curva real de carga horária da área RJ (ONS), ver `./real-grid-data.ts`.
// `solarGw` fica em 0 e o status nunca é 'solar' porque este datalake não
// coleta geração solar — nunca inventar esse valor.
export const initialHourlyForecast: HourlyForecast[] = REAL_HOURLY_LOAD_RJ.map(({ hour, avgGw }) => ({
  hour,
  label: `${String(hour).padStart(2, '0')}:00`,
  demandGw: Number(avgGw.toFixed(2)),
  solarGw: 0,
  status: PEAK_HOURS_RJ.has(hour) ? 'pico' : 'normal',
}));

export const initialVehicle: Vehicle = {
  manufacturer: 'BYD',
  model: 'Dolphin GS 180 EV',
  batteryCapacityKwh: 44.9,
  currentSoc: 52,
  targetSoc: 80,
  connector: 'CCS2 / Type 2',
  maxDcPowerKw: 60,
  estimatedRangeKm: 210,
};

export const carCatalog: CarOption[] = [
  { model: 'Dolphin GS 180', mfg: 'BYD', battery: 44.9, dc: 60, range: 291 },
  { model: 'Dolphin Plus', mfg: 'BYD', battery: 60.5, dc: 80, range: 330 },
  { model: 'Yuan Plus', mfg: 'BYD', battery: 60.5, dc: 80, range: 294 },
  { model: 'Seal EV', mfg: 'BYD', battery: 82.5, dc: 150, range: 372 },
  { model: 'Kwid E-Tech', mfg: 'Renault', battery: 26.8, dc: 30, range: 185 },
  { model: 'Megane E-Tech', mfg: 'Renault', battery: 60.0, dc: 130, range: 337 },
  { model: 'Ora 03 Skin', mfg: 'GWM', battery: 48.0, dc: 64, range: 232 },
  { model: 'Ora 03 GT', mfg: 'GWM', battery: 63.0, dc: 64, range: 319 },
  { model: 'Volvo EX30', mfg: 'Volvo', battery: 51.0, dc: 134, range: 250 },
  { model: 'Volvo XC40 Recharge', mfg: 'Volvo', battery: 69.0, dc: 150, range: 320 },
];

export let activeSession: ActiveSession = {
  stationId: 'marina-flex-station',
  stationName: 'Marina Flex Station',
  connectorType: 'CCS2',
  chargingState: 'charging',
  currentSoc: 52,
  targetSoc: 80,
  currentPowerKw: 60,
  energyDeliveredKwh: 13.4,
  currentCostRs: 15.41,
  elapsedMinutes: 18,
  remainingMinutes: 14,
  hasVppChallenge: true,
  vppAccepted: false,
  vppBonusRs: 2.50,
  vppModulationKw: 35,
};

export const walletData: WalletSummary = {
  credits: 224,
  creditValueRs: 22.40,
  totalFlexEnergyKwh: 42.8,
  co2AvoidedKg: 17.4,
  smartSessionsCount: 6,
  activities: [
    {
      id: 1,
      date: 'Hoje, 14:32',
      station: 'Marina Flex Station',
      energyKwh: 21.7,
      cost: 24.92,
      bonusText: '+ R$ 4,00',
      event: 'Janela Solar Rio Flex (100% fora do pico)',
    },
    {
      id: 2,
      date: '12 set 2026',
      station: 'COPPE / UFRJ Eletroposto Solar',
      energyKwh: 18.2,
      cost: 17.83,
      bonusText: '+ R$ 4,50',
      event: 'Excedente Fotovoltaico Local COPPE',
    },
    {
      id: 3,
      date: '04 set 2026',
      station: 'Shopping RioSul',
      energyKwh: 16.8,
      cost: 20.50,
      bonusText: '+ R$ 2,50',
      event: 'Deslocamento de Pico Vespertino',
    },
    {
      id: 4,
      date: '28 ago 2026',
      station: 'Copacabana Atlântica',
      energyKwh: 14.1,
      cost: 16.63,
      bonusText: '+ R$ 3,00',
      event: 'Bônus Solar Fluminense',
    },
  ],
  ledger: [
    { id: 'm1', date: 'Hoje, 14:35', desc: 'Bônus de flexibilidade Marina Flex', amount: '+ R$ 4,00', type: 'credit' },
    { id: 'm2', date: '12 set 2026', desc: 'Bônus excedente solar COPPE/UFRJ', amount: '+ R$ 4,50', type: 'credit' },
    { id: 'm3', date: '08 set 2026', desc: 'Abatimento automático em recarga', amount: '- R$ 10,00', type: 'debit' },
    { id: 'm4', date: '04 set 2026', desc: 'Bônus evento de resposta de demanda', amount: '+ R$ 2,50', type: 'credit' },
    { id: 'm5', date: '28 ago 2026', desc: 'Bônus solar Copacabana', amount: '+ R$ 3,00', type: 'credit' },
  ],
};
