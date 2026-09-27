import { useState, useEffect, useCallback } from 'react';
import type {
  ChargingStation,
  GridStatus,
  HourlyForecast,
  Vehicle,
  CarOption,
  ActiveSession,
  WalletSummary,
} from '@workspace/shared-types';

import { stations as defaultStations } from '@/data/stations';
import { initialVehicle as defaultVehicle } from '@/data/vehicles';
import { hourlyForecast as defaultForecast } from '@/data/forecast';
import { authHeaders } from '@/lib/auth-token';

// Em produção (frontend estático no S3, sem proxy de servidor pra /api/*)
// as chamadas precisam ir direto pra Function URL do Lambda, injetada em
// build-time via VITE_API_BASE_URL. Em dev local (Vite com proxy) fica
// vazio e os caminhos continuam relativos, como antes.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

// Helper de fetch resiliente com fallback instantâneo
async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(apiUrl(url));
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch (_err) {
    return fallback;
  }
}

// ------------------------------------------
// 1. ESTAÇÕES (STATIONS)
// ------------------------------------------

export function useStations(query?: { search?: string; renewableMin?: number }) {
  const [data, setData] = useState<ChargingStation[]>(defaultStations);
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (query?.search) params.set('search', query.search);
    if (query?.renewableMin) params.set('renewableMin', String(query.renewableMin));

    const url = `/api/stations${params.toString() ? `?${params.toString()}` : ''}`;
    const result = await fetchJson<{ total: number; stations: ChargingStation[] }>(url, {
      total: defaultStations.length,
      stations: defaultStations,
    });
    if (result?.stations) {
      setData(result.stations);
    }
    setIsLoading(false);
  }, [query?.search, query?.renewableMin]);

  useEffect(() => {
    let mounted = true;
    fetchJson<{ total: number; stations: ChargingStation[] }>('/api/stations', {
      total: defaultStations.length,
      stations: defaultStations,
    }).then((res) => {
      if (mounted && res?.stations) {
        setData(res.stations);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return { data, isLoading, refetch };
}

export function useStation(id: string) {
  const defaultMatch = defaultStations.find((s) => s.id === id) || defaultStations[0];
  const [data, setData] = useState<ChargingStation>(defaultMatch);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    fetchJson<ChargingStation>(`/api/stations/${id}`, defaultMatch).then((st) => {
      if (mounted && st) setData(st);
    });
    return () => {
      mounted = false;
    };
  }, [id, defaultMatch]);

  return { data, isLoading };
}

// ------------------------------------------
// 2. REDE ELÉTRICA & PREVISÃO (GRID STATUS)
// ------------------------------------------

const defaultGridStatus: GridStatus = {
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

export function useGridStatus() {
  const [data, setData] = useState<GridStatus>(defaultGridStatus);
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    const updated = await fetchJson<GridStatus>('/api/grid/status', defaultGridStatus);
    setData(updated);
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchJson<GridStatus>('/api/grid/status', defaultGridStatus).then((res) => {
      if (mounted && res) setData(res);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { data, isLoading, refetch };
}

const defaultGridForecast = {
  date: new Date().toISOString().split('T')[0],
  region: 'Brasil (ONS, soma dos 4 subsistemas) — fallback offline',
  criticalPeakWindow: '18:00 às 21:00',
  hourly: defaultForecast,
};

export function useGridForecast() {
  const [data, setData] = useState(defaultGridForecast);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchJson(`/api/grid/forecast`, defaultGridForecast).then((res) => {
      if (mounted && res) setData(res);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { data, isLoading };
}

// ------------------------------------------
// 3. VEÍCULO (VEHICLE)
// ------------------------------------------

export function useVehicle() {
  const [data, setData] = useState<Vehicle>(defaultVehicle);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchJson<Vehicle>('/api/vehicle', defaultVehicle).then((v) => {
      if (mounted && v) setData(v);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const updateVehicle = useCallback(async (updated: Partial<Vehicle>) => {
    setData((prev) => ({ ...prev, ...updated }));
    try {
      await fetch(apiUrl('/api/vehicle'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (_err) {
      // Offline fallback
    }
  }, []);

  return { data, isLoading, updateVehicle };
}

export function useCarCatalog() {
  const [data] = useState<{ total: number; vehicles: CarOption[] }>({
    total: 10,
    vehicles: [
      { model: 'Dolphin GS 180', mfg: 'BYD', battery: 44.9, dc: 60, range: 291 },
      { model: 'Dolphin Plus', mfg: 'BYD', battery: 60.5, dc: 80, range: 330 },
      { model: 'Yuan Plus', mfg: 'BYD', battery: 60.5, dc: 80, range: 294 },
      { model: 'Seal EV', mfg: 'BYD', battery: 82.5, dc: 150, range: 372 },
    ],
  });

  return { data, isLoading: false };
}

// ------------------------------------------
// 4. SESSÃO DE RECARGA (SESSION & VPP)
// ------------------------------------------

const defaultActiveSession: ActiveSession = {
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
  vppBonusRs: 2.5,
  vppModulationKw: 35,
};

export function useActiveSession() {
  const [data, setData] = useState<ActiveSession>(defaultActiveSession);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchJson<ActiveSession>('/api/session/active', defaultActiveSession).then((s) => {
      if (mounted && s) setData(s);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const simulateStep = useCallback(async () => {
    setData((prev) => {
      const nextSoc = Math.min(prev.targetSoc, prev.currentSoc + 5);
      const nextEnergy = Number((prev.energyDeliveredKwh + 2.2).toFixed(1));
      const nextCost = Number((prev.currentCostRs + 2.53).toFixed(2));
      return {
        ...prev,
        currentSoc: nextSoc,
        energyDeliveredKwh: nextEnergy,
        currentCostRs: nextCost,
        remainingMinutes: Math.max(0, prev.remainingMinutes - 3),
      };
    });

    try {
      const res = await fetch(apiUrl('/api/session/simulate-step'), { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (_err) {
      // offline fallback
    }
  }, []);

  const modulateVpp = useCallback(async (accept: boolean) => {
    setData((prev) => ({
      ...prev,
      vppAccepted: accept,
      hasVppChallenge: false,
      currentPowerKw: accept ? prev.vppModulationKw : prev.currentPowerKw,
    }));

    try {
      const res = await fetch(apiUrl('/api/session/vpp-modulate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept }),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (_err) {
      // offline fallback
    }
  }, []);

  const stopSession = useCallback(async () => {
    setData((prev) => ({ ...prev, chargingState: 'completed' }));
    try {
      await fetch(apiUrl('/api/session/stop'), { method: 'POST' });
    } catch (_err) {
      // offline fallback
    }
  }, []);

  return {
    data,
    isLoading,
    simulateStep,
    modulateVpp,
    stopSession,
  };
}

// ------------------------------------------
// 5. CARTEIRA (WALLET)
// ------------------------------------------

const defaultWalletSummary: WalletSummary = {
  credits: 224,
  creditValueRs: 22.4,
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
      cost: 20.5,
      bonusText: '+ R$ 2,50',
      event: 'Deslocamento de Pico Vespertino',
    },
  ],
  ledger: [
    {
      id: 'm1',
      date: 'Hoje, 14:35',
      desc: 'Bônus de flexibilidade Marina Flex',
      amount: '+ R$ 4,00',
      type: 'credit',
    },
    {
      id: 'm2',
      date: '12 set 2026',
      desc: 'Bônus excedente solar COPPE/UFRJ',
      amount: '+ R$ 4,50',
      type: 'credit',
    },
    {
      id: 'm3',
      date: '08 set 2026',
      desc: 'Abatimento automático em recarga',
      amount: '- R$ 10,00',
      type: 'debit',
    },
  ],
};

export function useWallet() {
  const [data, setData] = useState<WalletSummary>(defaultWalletSummary);
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    const updated = await fetchJson<WalletSummary>('/api/wallet', defaultWalletSummary);
    setData(updated);
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchJson<WalletSummary>('/api/wallet', defaultWalletSummary).then((res) => {
      if (mounted && res) setData(res);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const redeemCredits = useCallback(async (payload: { amountCredits: number; purpose?: string }) => {
    setData((prev) => {
      const nextCredits = Math.max(0, prev.credits - payload.amountCredits);
      return {
        ...prev,
        credits: nextCredits,
        creditValueRs: Number((nextCredits * 0.1).toFixed(2)),
      };
    });

    try {
      await fetch(apiUrl('/api/wallet/redeem'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (_err) {
      // offline fallback
    }
  }, []);

  return {
    data,
    isLoading,
    redeemCredits,
    refetch,
  };
}

// ------------------------------------------
// 6. RIO-FLEX COPILOT (BEDROCK)
// ------------------------------------------

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: { text: string }[];
}

export interface CopilotResponse {
  answer: string;
  modelId?: string;
  error?: string;
}

// Exige uma sessão real do Cognito (login ou Google) — o Modo Demo não gera
// token, então o backend responde 401 e essa função repassa o erro.
export async function askCopilot(question: string, history: CopilotMessage[] = []): Promise<CopilotResponse> {
  try {
    const res = await fetch(apiUrl('/api/copilot/ask'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ question, history }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { answer: '', error: data?.error || 'Falha ao consultar o Rio-Flex Copilot.' };
    }
    return data;
  } catch (_err) {
    return { answer: '', error: 'Não foi possível conectar ao Rio-Flex Copilot.' };
  }
}
