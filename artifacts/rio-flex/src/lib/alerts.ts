import type { ManagerOverview } from '@/types/manager';

/**
 * Central de alertas do gestor. As regras são avaliadas no navegador sobre o /manager/overview
 * (dado real do backend); o gestor liga/desliga cada regra e ajusta o limiar sem código.
 * Nível 1 = informativo · 2 = atenção · 3 = crítico (mesma escala de 1–3 do SolisCloud).
 */
export type AlertLevel = 1 | 2 | 3;
export type RuleId = 'load' | 'price' | 'maintenance' | 'conflicts' | 'stale';
export type RuleConfig = { enabled: boolean; threshold: number };
export type Rules = Record<RuleId, RuleConfig>;

export type RuleMeta = {
  id: RuleId;
  label: string;
  description: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  /** false = regra sem limiar numérico (só liga/desliga). */
  hasThreshold: boolean;
};

export const RULE_META: RuleMeta[] = [
  {
    id: 'load',
    label: 'Carga regional alta',
    description: 'Carga da região acima do limiar (crítico) ou a 10 pontos dele (atenção).',
    unit: '%', min: 50, max: 100, step: 1, hasThreshold: true,
  },
  {
    id: 'price',
    label: 'Preço crítico sem sinal do operador',
    description: 'Região em janela vermelha calculada automaticamente, sem sinal publicado por gestor.',
    unit: '', min: 0, max: 0, step: 1, hasThreshold: false,
  },
  {
    id: 'maintenance',
    label: 'Estações em manutenção',
    description: 'Parcela das estações da região em manutenção acima do limiar.',
    unit: '%', min: 1, max: 60, step: 1, hasThreshold: true,
  },
  {
    id: 'conflicts',
    label: 'Preços cadastrados em conflito',
    description: 'Quantidade de cadastros de preço com conflito acima do limiar.',
    unit: 'cadastros', min: 1, max: 200, step: 1, hasThreshold: true,
  },
  {
    id: 'stale',
    label: 'Dado desatualizado',
    description: 'A visão geral não é atualizada há mais minutos que o limiar.',
    unit: 'min', min: 5, max: 180, step: 5, hasThreshold: true,
  },
];

export const DEFAULT_RULES: Rules = {
  load: { enabled: true, threshold: 85 },
  price: { enabled: true, threshold: 0 },
  maintenance: { enabled: true, threshold: 15 },
  conflicts: { enabled: true, threshold: 1 },
  stale: { enabled: true, threshold: 15 },
};

export type Alert = {
  id: string;
  rule: RuleId;
  level: AlertLevel;
  regionId?: string;
  regionName?: string;
  title: string;
  detail: string;
};

export const LEVEL_NAME: Record<AlertLevel, string> = { 1: 'Informativo', 2: 'Atenção', 3: 'Crítico' };
export const ALERT_COLOR: Record<AlertLevel, string> = { 1: '#5cc8ff', 2: '#f7c65c', 3: '#ff6b6b' };

export function evaluateAlerts(data: ManagerOverview, rules: Rules, now = Date.now()): Alert[] {
  const out: Alert[] = [];

  for (const r of data.regions) {
    if (rules.load.enabled) {
      const t = rules.load.threshold;
      if (r.loadFactorPct >= t) {
        out.push({
          id: `load:${r.regionId}`, rule: 'load', level: 3, regionId: r.regionId, regionName: r.regionName,
          title: `Carga crítica em ${r.regionName}`,
          detail: `${r.loadFactorPct}% de carga (limiar ${t}%). Demanda de ${r.demandMw.toLocaleString('pt-BR')} MW.`,
        });
      } else if (r.loadFactorPct >= t - 10) {
        out.push({
          id: `load:${r.regionId}`, rule: 'load', level: 2, regionId: r.regionId, regionName: r.regionName,
          title: `Carga próxima do limite em ${r.regionName}`,
          detail: `${r.loadFactorPct}% de carga, a ${t - r.loadFactorPct} ponto(s) do limiar de ${t}%.`,
        });
      }
    }
    if (rules.price.enabled && r.level === 'vermelho' && r.signalSource !== 'gestor') {
      out.push({
        id: `price:${r.regionId}`, rule: 'price', level: 2, regionId: r.regionId, regionName: r.regionName,
        title: `Janela vermelha sem sinal em ${r.regionName}`,
        detail: 'O preço está crítico pelo cálculo automático e nenhum gestor publicou um sinal para orientar os consumidores.',
      });
    }
    if (rules.maintenance.enabled && r.stations > 0) {
      const pct = (r.maintenance / r.stations) * 100;
      if (pct >= rules.maintenance.threshold) {
        out.push({
          id: `maintenance:${r.regionId}`, rule: 'maintenance', level: pct >= rules.maintenance.threshold * 2 ? 2 : 1,
          regionId: r.regionId, regionName: r.regionName,
          title: `Manutenção elevada em ${r.regionName}`,
          detail: `${r.maintenance} de ${r.stations} estações em manutenção (${pct.toFixed(0)}%, limiar ${rules.maintenance.threshold}%).`,
        });
      }
    }
  }

  if (rules.conflicts.enabled && data.totals.priceConflicts >= rules.conflicts.threshold) {
    out.push({
      id: 'conflicts:all', rule: 'conflicts', level: 1,
      title: 'Preços cadastrados em conflito',
      detail: `${data.totals.priceConflicts} cadastro(s) de preço com conflito (limiar ${rules.conflicts.threshold}).`,
    });
  }

  if (rules.stale.enabled) {
    const minutes = Math.floor((now - new Date(data.generatedAt).getTime()) / 60_000);
    if (minutes >= rules.stale.threshold) {
      out.push({
        id: 'stale:all', rule: 'stale', level: 2,
        title: 'Dados desatualizados',
        detail: `A visão geral foi gerada há ${minutes} min (limiar ${rules.stale.threshold} min).`,
      });
    }
  }

  return out.sort((a, b) => b.level - a.level || a.title.localeCompare(b.title));
}

export type AlertAck = { at: string; by: string };
export type AlertLogEntry = { at: string; by: string; action: string; alertId: string; title: string };
