/**
 * Cenários de demanda elétrica por eletrificação veicular 2026-2035 — Brasil e
 * RJ. Fonte: `projections/ev_demand_2035/` no repositório
 * `rj-energy-datalake` (https://github.com/EstevezCodando/EstevezCodando-rj-energy-datalake),
 * ancorado em números publicados pela EPE (Nota Técnica "Veículos Leves
 * 2026-2035" e PDE 2035). Ver o README daquele módulo para metodologia
 * completa, fontes e limitações — nunca tratar estes números como uma fonte
 * oficial em si; são uma projeção deste projeto, com premissas explícitas.
 *
 * Usado como contexto para o agente Bedrock (Rio-Flex Copilot) responder
 * perguntas sobre a curva de carga real e o impacto da frota elétrica.
 */

export interface EvScenario2035 {
  scenario: 'conservador' | 'intermediario' | 'acelerado';
  demandTwh: number;
  impliedFleetUnits: number;
}

export interface GridImpact2035 {
  region: 'brasil' | 'rj';
  case: 'central' | 'upper_bound';
  scenario: string;
  strategy: 'uncontrolled' | 'smart' | 'offpeak_shifted';
  nVehicles: number;
  dailyEnergyAddedMwh: number;
  baselinePeakMw: number;
  baselinePeakHour: number;
  newPeakMw: number;
  newPeakHour: number;
  peakIncreasePct: number;
}

export const EV_SCENARIOS_NATIONAL_2035: EvScenario2035[] = [
  { scenario: 'acelerado', demandTwh: 5.6782, impliedFleetUnits: 2839104 },
  { scenario: 'conservador', demandTwh: 3.4, impliedFleetUnits: 1700000 },
  { scenario: 'intermediario', demandTwh: 4.3938, impliedFleetUnits: 2196924 },
];

export const EV_SCENARIOS_RJ_2035: EvScenario2035[] = [
  { scenario: 'acelerado', demandTwh: 0.35502, impliedFleetUnits: 177509 },
  { scenario: 'conservador', demandTwh: 0.21258, impliedFleetUnits: 106289 },
  { scenario: 'intermediario', demandTwh: 0.27471, impliedFleetUnits: 137358 },
];

// Contexto (NÃO comparável diretamente aos cenários acima — escopo mais
// amplo: leves + ônibus + caminhões, PDE 2035 da EPE).
export const PDE2035_ALL_MODES_DEMAND_TWH_2035 = 7.8;

export const GRID_IMPACT_2035: GridImpact2035[] = [
  { region: 'brasil', case: 'central', scenario: 'intermediario', strategy: 'uncontrolled', nVehicles: 2196924, dailyEnergyAddedMwh: 12037.94, baselinePeakMw: 93814.2, baselinePeakHour: 19, newPeakMw: 95319.0, newPeakHour: 19, peakIncreasePct: 1.60 },
  { region: 'brasil', case: 'central', scenario: 'intermediario', strategy: 'smart', nVehicles: 2196924, dailyEnergyAddedMwh: 12037.94, baselinePeakMw: 93814.2, baselinePeakHour: 19, newPeakMw: 94747.2, newPeakHour: 19, peakIncreasePct: 0.99 },
  { region: 'brasil', case: 'central', scenario: 'intermediario', strategy: 'offpeak_shifted', nVehicles: 2196924, dailyEnergyAddedMwh: 12037.94, baselinePeakMw: 93814.2, baselinePeakHour: 19, newPeakMw: 93814.2, newPeakHour: 19, peakIncreasePct: 0.00 },
  { region: 'rj', case: 'central', scenario: 'intermediario', strategy: 'uncontrolled', nVehicles: 137358, dailyEnergyAddedMwh: 752.65, baselinePeakMw: 6077.1, baselinePeakHour: 19, newPeakMw: 6171.2, newPeakHour: 19, peakIncreasePct: 1.55 },
  { region: 'rj', case: 'central', scenario: 'intermediario', strategy: 'smart', nVehicles: 137358, dailyEnergyAddedMwh: 752.65, baselinePeakMw: 6077.1, baselinePeakHour: 19, newPeakMw: 6135.4, newPeakHour: 19, peakIncreasePct: 0.96 },
  { region: 'rj', case: 'central', scenario: 'intermediario', strategy: 'offpeak_shifted', nVehicles: 137358, dailyEnergyAddedMwh: 752.65, baselinePeakMw: 6077.1, baselinePeakHour: 19, newPeakMw: 6077.1, newPeakHour: 19, peakIncreasePct: 0.00 },
  { region: 'brasil', case: 'upper_bound', scenario: 'acelerado', strategy: 'uncontrolled', nVehicles: 2839104, dailyEnergyAddedMwh: 15556.73, baselinePeakMw: 93814.2, baselinePeakHour: 19, newPeakMw: 95758.8, newPeakHour: 19, peakIncreasePct: 2.07 },
  { region: 'brasil', case: 'upper_bound', scenario: 'acelerado', strategy: 'smart', nVehicles: 2839104, dailyEnergyAddedMwh: 15556.73, baselinePeakMw: 93814.2, baselinePeakHour: 19, newPeakMw: 95019.9, newPeakHour: 19, peakIncreasePct: 1.29 },
  { region: 'brasil', case: 'upper_bound', scenario: 'acelerado', strategy: 'offpeak_shifted', nVehicles: 2839104, dailyEnergyAddedMwh: 15556.73, baselinePeakMw: 93814.2, baselinePeakHour: 19, newPeakMw: 93814.2, newPeakHour: 19, peakIncreasePct: 0.00 },
  { region: 'rj', case: 'upper_bound', scenario: 'acelerado', strategy: 'uncontrolled', nVehicles: 282437, dailyEnergyAddedMwh: 1547.60, baselinePeakMw: 6077.1, baselinePeakHour: 19, newPeakMw: 6270.6, newPeakHour: 19, peakIncreasePct: 3.18 },
  { region: 'rj', case: 'upper_bound', scenario: 'acelerado', strategy: 'smart', nVehicles: 282437, dailyEnergyAddedMwh: 1547.60, baselinePeakMw: 6077.1, baselinePeakHour: 19, newPeakMw: 6197.0, newPeakHour: 19, peakIncreasePct: 1.97 },
  { region: 'rj', case: 'upper_bound', scenario: 'acelerado', strategy: 'offpeak_shifted', nVehicles: 282437, dailyEnergyAddedMwh: 1547.60, baselinePeakMw: 6077.1, baselinePeakHour: 19, newPeakMw: 6077.1, newPeakHour: 19, peakIncreasePct: 0.00 },
];
