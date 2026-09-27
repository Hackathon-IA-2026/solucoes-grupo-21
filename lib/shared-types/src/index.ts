// ==========================================
// RIO-FLEX SHARED TYPES & CONTRACTS
// Shared between @workspace/api-server and @workspace/rio-flex
// ==========================================

export type ConnectorType = 'CCS2' | 'Type2' | 'CHAdeMO';

export interface StationSpecs {
  maxPowerKw: number;
  network: string;
  parking: string;
  amenities: string[];
  description: string;
}

export interface StationConnector {
  type: ConnectorType;
  powerKw: number;
  available: boolean;
}

export interface StationIncentive {
  label: string;
  value: number;
}

export interface ChargingStation {
  id: string;
  name: string;
  operator: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  etaMinutes: number;
  pricePerKwh: number;
  availableConnectors: number;
  totalConnectors: number;
  connectors: StationConnector[];
  renewableShare: number;
  estimatedQueueMinutes: number;
  incentive?: StationIncentive;
  score: number;
  specs: StationSpecs;
}

// ------------------------------------------
// VEHICLE TYPES
// ------------------------------------------

export interface Vehicle {
  manufacturer: string;
  model: string;
  batteryCapacityKwh: number;
  currentSoc: number;
  targetSoc: number;
  connector: string;
  maxDcPowerKw: number;
  estimatedRangeKm: number;
}

export interface CarOption {
  model: string;
  mfg: string;
  battery: number;
  dc: number;
  range: number;
}

// ------------------------------------------
// GRID TELEMETRY & FORECAST (ONS / SIN / COPPE)
// ------------------------------------------

export type ForecastStatus = 'solar' | 'pico' | 'normal';

export interface HourlyForecast {
  hour: number;
  label: string;
  demandGw: number;
  solarGw: number;
  status: ForecastStatus;
}

export interface GridStatus {
  status: 'estavel' | 'atencao' | 'critico';
  headline: string;
  subtext: string;
  isPeakHour: boolean;
  peakHourWindow: string;
  bestChargingWindow: string;
  solarSurplusGw: number;
  thermalDispatchedMw: number;
  temperatureC: number;
  city: string;
  lastUpdated: string;
}

// ------------------------------------------
// ACTIVE CHARGING SESSION
// ------------------------------------------

export interface ActiveSession {
  stationId: string;
  stationName: string;
  connectorType: ConnectorType;
  chargingState: 'charging' | 'paused' | 'completed';
  currentSoc: number;
  targetSoc: number;
  currentPowerKw: number;
  energyDeliveredKwh: number;
  currentCostRs: number;
  elapsedMinutes: number;
  remainingMinutes: number;
  hasVppChallenge: boolean;
  vppAccepted: boolean;
  vppBonusRs: number;
  vppModulationKw: number;
}

// ------------------------------------------
// WALLET & CREDITS
// ------------------------------------------

export interface WalletActivity {
  id: number;
  date: string;
  station: string;
  energyKwh: number;
  cost: number;
  bonusText: string;
  event: string;
}

export interface WalletLedgerEntry {
  id: string;
  date: string;
  desc: string;
  amount: string;
  type: 'credit' | 'debit';
}

export interface WalletSummary {
  credits: number;
  creditValueRs: number;
  totalFlexEnergyKwh: number;
  co2AvoidedKg: number;
  smartSessionsCount: number;
  activities: WalletActivity[];
  ledger: WalletLedgerEntry[];
}
