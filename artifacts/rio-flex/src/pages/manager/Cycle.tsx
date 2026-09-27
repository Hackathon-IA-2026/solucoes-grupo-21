import { useMemo } from 'react';
import { ManagerShell } from '@/components/layout/ManagerShell';
import { LevelBadge } from '@/components/manager/ui';
import { ErrorPanel, Skeleton, SourceNote } from '@/components/manager/kit';
import { EnergyFlow, type FlowTone } from '@/components/viz/EnergyFlow';
import { useManagerAlerts } from '@/hooks/manager-alerts';
import { useManagerMeta } from '@/hooks/manager-queries';
import { num } from '@/lib/format';
import { Freshness } from './PriceAlertsPanel';

const STEPS = [
  { k: 'fleet', t: 'Frota', d: 'Veículos em recarga agora, somados de todas as regiões.' },
  { k: 'charger', t: 'Carregador', d: 'Conectores ocupados sobre o total instalado.' },
  { k: 'meter', t: 'Medidor inteligente', d: 'Energia entregue nos últimos 7 dias; o mesmo ponto que mede também informa o comando de modulação ao carregador.' },
  { k: 'grid', t: 'Distribuidora', d: 'Carga média da rede, calculada sobre todas as regiões monitoradas.' },
  { k: 'orchestrator', t: 'Orquestrador', d: 'Cruza o sinal da distribuidora com o estado dos carregadores e decide o que recomendar.' },
  { k: 'flexia', t: 'FlexIA', d: 'Traduz a decisão do orquestrador em linguagem natural para consumidor e gestor.' },
  { k: 'consumer', t: 'Consumidor', d: 'Recebe preço e crédito; decide se e quando carrega.' },
  { k: 'manager', t: 'Gestor', d: 'Recebe alertas e aprova (ou não) os sinais propostos.' },
] as const;

export default function ManagerCyclePage() {
  const { overview, open } = useManagerAlerts();
  const { data, isLoading, error, refetch } = overview;
  const { data: meta } = useManagerMeta();

  const flow = useMemo(() => {
    if (!data) return { metrics: {}, tone: 'verde' as FlowTone };
    const busy = data.regions.reduce((s, r) => s + r.busyConnectors, 0);
    const total = data.regions.reduce((s, r) => s + r.totalConnectors, 0);
    const avgLoad = data.regions.length ? Math.round(data.regions.reduce((s, r) => s + r.loadFactorPct, 0) / data.regions.length) : 0;
    const reds = data.regions.filter((r) => r.level === 'vermelho').length;
    const yellows = data.regions.filter((r) => r.level === 'amarelo').length;
    const tone: FlowTone = reds ? 'vermelho' : yellows ? 'amarelo' : 'verde';
    return {
      tone,
      metrics: {
        fleet: `${num(data.totals.activeSessions)} em recarga`,
        charger: `${num(busy)}/${num(total)} conectores`,
        meter: `${num(data.totals.energy7dKwh)} kWh · 7 d`,
        grid: `carga média ${avgLoad}%`,
        orchestrator: reds ? `${reds} em vermelho` : yellows ? `${yellows} em amarelo` : 'rede em verde',
        flexia: `${num(data.totals.flexEvents7d)} modulações · 7 d`,
        consumer: `${num(data.totals.consumers)} ${data.totals.consumers === 1 ? 'consumidor' : 'consumidores'}`,
        manager: open.length ? `${open.length} alerta(s)` : 'sem alertas',
      } as Record<string, string>,
    };
  }, [data, open.length]);

  return (
    <ManagerShell>
      <div className="rf-page">
        <div className="rf-page-head">
          <div>
            <span className="rf-eyebrow">Ciclo</span>
            <h1 className="rf-title">Do carro ao gestor, em tempo real</h1>
            <p className="rf-subtitle">Energia, medição e decisão em um só fluxo. Os números sob cada etapa vêm dos dados desta conta — nada é simulado.</p>
            {data && <Freshness iso={data.generatedAt} />}
          </div>
          {data && <LevelBadge level={flow.tone} label={`rede em ${flow.tone}`} />}
        </div>

        <ErrorPanel error={error} onRetry={() => void refetch()} what="o ciclo" />
        {isLoading && <div className="rf-card"><Skeleton h={340} r={18} /></div>}

        {data && (
          <>
            <div className="rf-card mk-flow-card">
              <EnergyFlow metrics={flow.metrics} tone={flow.tone} />
            </div>

            <div className="rf-card">
              <h3>O que cada etapa mostra</h3>
              <ul className="mk-cycle-steps">
                {STEPS.map((s) => (
                  <li key={s.k}>
                    <div className="rf-between"><b>{s.t}</b><span className="mk-num">{flow.metrics[s.k] ?? '—'}</span></div>
                    <p>{s.d}</p>
                  </li>
                ))}
              </ul>
            </div>

            <SourceNote source={meta?.dataset.source} iso={data.generatedAt} />
          </>
        )}
      </div>
    </ManagerShell>
  );
}
