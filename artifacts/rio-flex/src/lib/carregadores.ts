import { useQuery } from '@tanstack/react-query';

/**
 * Base "Carregados RJ": 828 locais e 1.422 conectores do estado do Rio de Janeiro, coletados pelo
 * Cavuca em 22/09/2026 (scripts/build-carregadores-rj.py gera o JSON servido em /data).
 * Não é censo universal nem confirma operação real; preços são informados pela comunidade/operador.
 */
export type Conector = { t: string; c: 'AC' | 'DC' | '?'; k: number | null; n: number };

export type Carregador = {
  id: string;
  n: string;
  m: string;
  a: string;
  lat: number;
  lng: number;
  pub: boolean;
  tipo: 'AC' | 'DC' | '?';
  kw: number | null;
  p: number | null;
  taxa: number | null;
  gr: boolean;
  cf: boolean;
  man: boolean;
  rd: string[];
  tl: string;
  nc: number;
  cs: Conector[];
  hr: string | null;
  up: string | null;
  url: string;
};

export type CarregadoresDoc = { fonte: string; snapshot: string; aviso: string; total: number; locais: Carregador[] };

export function useCarregadoresRj() {
  return useQuery({
    queryKey: ['carregadores-rj'],
    staleTime: Infinity,
    queryFn: async (): Promise<CarregadoresDoc> => {
      const res = await fetch(`${import.meta.env.BASE_URL}data/carregadores-rj.json`);
      if (!res.ok) throw new Error(`Não foi possível carregar a base de carregadores (HTTP ${res.status}).`);
      return (await res.json()) as CarregadoresDoc;
    },
  });
}

/** Distância em km entre dois pontos (haversine). */
export function distKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const COLOR = {
  ac: '#4ae3a5',
  dc: '#b98cff',
  unknown: '#7b8794',
  partner: '#ffd166',
  cheap: '#4ae3a5',
  mid: '#f7c65c',
  dear: '#ff6b6b',
};

const mix = (a: string, b: string, t: number): string => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [ar, ag, ab] = p(a);
  const [br, bg, bb] = p(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(ar!, br!)}${c(ag!, bg!)}${c(ab!, bb!)}`;
};

export type PriceScale = { lo: number; mid: number; hi: number; color: (price: number) => string };

/** Escala verde → âmbar → vermelho pelos percentis 10/50/90 dos preços positivos (evita outliers). */
export function makePriceScale(items: Carregador[]): PriceScale {
  const v = items.map((i) => i.p).filter((p): p is number => p != null && p > 0).sort((a, b) => a - b);
  const q = (f: number) => v[Math.min(v.length - 1, Math.floor(v.length * f))] ?? 0;
  const lo = q(0.1), mid = q(0.5), hi = q(0.9);
  return {
    lo, mid, hi,
    color: (p) => (p <= mid ? mix(COLOR.cheap, COLOR.mid, Math.max(0, (p - lo) / ((mid - lo) || 1))) : mix(COLOR.mid, COLOR.dear, Math.min(1, (p - mid) / ((hi - mid) || 1)))),
  };
}

export const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

/** Potência resumida para exibição ("180 kW"). */
export const kwText = (kw: number | null) => (kw ? `${Number.isInteger(kw) ? kw : kw.toFixed(1).replace('.', ',')} kW` : '—');

export function priceText(c: Carregador): string {
  if (c.gr && (c.p == null || c.p === 0)) return 'Energia gratuita informada';
  if (c.p == null) return 'Preço não informado';
  if (c.p === 0) return 'Energia gratuita informada';
  return `${brl(c.p)}/kWh`;
}
