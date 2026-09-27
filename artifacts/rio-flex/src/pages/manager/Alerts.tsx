import { useState } from 'react';
import { Link } from 'wouter';
import { Bell, Check, CheckCheck, History, RotateCcw, SlidersHorizontal, Undo2 } from 'lucide-react';
import { ManagerShell } from '@/components/layout/ManagerShell';
import { EmptyState, ErrorPanel, KpiSkeletonRow, Kpi, SourceNote } from '@/components/manager/kit';
import { useManagerAlerts } from '@/hooks/manager-alerts';
import { useManagerMeta } from '@/hooks/manager-queries';
import { ALERT_COLOR, LEVEL_NAME, RULE_META, type Alert, type AlertLevel } from '@/lib/alerts';
import { dateTimeOf } from '@/lib/format';
import { Freshness } from './PriceAlertsPanel';

const LEVEL_ICON: Record<AlertLevel, string> = { 1: 'i', 2: '!', 3: '!!' };

function AlertRow({ a, acked, onAck, onReopen }: { a: Alert; acked?: { at: string; by: string }; onAck: () => void; onReopen: () => void }) {
  return (
    <li className={`mk-alert ${acked ? 'acked' : ''}`}>
      <span className="mk-lvl" style={{ color: ALERT_COLOR[a.level], borderColor: ALERT_COLOR[a.level] }} title={`Nível ${a.level}`}>
        <b aria-hidden="true">{LEVEL_ICON[a.level]}</b> {LEVEL_NAME[a.level]}
      </span>
      <div className="mk-alert-body">
        <b>{a.title}</b>
        <small>{a.detail}</small>
        {acked && <small className="mk-acked">Reconhecido por {acked.by} em {dateTimeOf(acked.at)}</small>}
      </div>
      <div className="mk-alert-actions">
        {a.regionId && <Link href={`/gestor/rede?region=${a.regionId}`} className="rf-btn secondary small">Ver região</Link>}
        {acked ? (
          <button type="button" className="rf-btn secondary small" onClick={onReopen}><Undo2 size={13} /> Reabrir</button>
        ) : (
          <button type="button" className="rf-btn purple small" onClick={onAck}><Check size={13} /> Reconhecer</button>
        )}
      </div>
    </li>
  );
}

export default function ManagerAlertsPage() {
  const { overview, alerts, open, acknowledged, acks, log, rules, acknowledge, reopen, updateRule, resetRules } = useManagerAlerts();
  const { data: meta } = useManagerMeta();
  const [tab, setTab] = useState<'abertos' | 'reconhecidos' | 'regras' | 'historico'>('abertos');
  const [min, setMin] = useState<AlertLevel | 0>(0);

  const shown = (tab === 'abertos' ? open : acknowledged).filter((a) => a.level >= min);
  const count = (l: AlertLevel) => open.filter((a) => a.level === l).length;

  return (
    <ManagerShell>
      <div className="rf-page">
        <div className="rf-page-head">
          <div>
            <span className="rf-eyebrow">Alertas e diagnóstico</span>
            <h1 className="rf-title">O que precisa da minha atenção?</h1>
            <p className="rf-subtitle">Regras avaliadas sobre os dados reais da rede, em três níveis. Ajuste os limiares sem código; reconheça o que já está sob controle.</p>
            {overview.data && <Freshness iso={overview.data.generatedAt} />}
          </div>
        </div>

        <ErrorPanel error={overview.error} onRetry={() => void overview.refetch()} what="os alertas" />
        {overview.isLoading && <KpiSkeletonRow count={4} />}

        {overview.data && (
          <>
            <div className="mk-kpis">
              <Kpi label="Críticos" value={count(3)} tone={count(3) ? 'crit' : 'ok'} hint="nível 3" />
              <Kpi label="Atenção" value={count(2)} tone={count(2) ? 'warn' : 'ok'} hint="nível 2" />
              <Kpi label="Informativos" value={count(1)} hint="nível 1" />
              <Kpi label="Reconhecidos" value={acknowledged.length} hint="ainda ativos, sob controle" />
            </div>

            <div className="mk-tabs" role="tablist">
              {([
                ['abertos', `Abertos (${open.length})`, <Bell key="i" size={13} />],
                ['reconhecidos', `Reconhecidos (${acknowledged.length})`, <CheckCheck key="i" size={13} />],
                ['regras', 'Regras', <SlidersHorizontal key="i" size={13} />],
                ['historico', 'Histórico', <History key="i" size={13} />],
              ] as const).map(([id, label, icon]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{icon}{label}</button>
              ))}
            </div>

            {(tab === 'abertos' || tab === 'reconhecidos') && (
              <div className="rf-card">
                <div className="rf-between" style={{ marginBottom: 10 }}>
                  <div className="mk-chips" role="group" aria-label="Nível mínimo">
                    {([[0, 'Todos'], [2, 'Atenção e crítico'], [3, 'Só críticos']] as const).map(([v, l]) => (
                      <button key={v} type="button" className={`mk-chip ${min === v ? 'on' : ''}`} aria-pressed={min === v} onClick={() => setMin(v)}>{l}</button>
                    ))}
                  </div>
                  {tab === 'abertos' && shown.length > 1 && (
                    <button type="button" className="rf-btn secondary small" onClick={() => acknowledge(shown)}><CheckCheck size={13} /> Reconhecer {shown.length} alertas</button>
                  )}
                </div>
                {shown.length === 0 ? (
                  <EmptyState
                    icon={<Bell size={20} />}
                    title={tab === 'abertos' ? (alerts.length ? 'Nenhum alerta aberto neste filtro' : 'Tudo tranquilo por aqui') : 'Nada reconhecido'}
                    text={tab === 'abertos' ? 'Quando uma regra disparar, o alerta aparece aqui com o motivo e a região.' : 'Os alertas que você reconhecer ficam aqui enquanto a condição continuar.'}
                    action={tab === 'abertos' ? <button type="button" className="rf-btn secondary small" onClick={() => setTab('regras')}><SlidersHorizontal size={13} /> Ajustar regras</button> : undefined}
                  />
                ) : (
                  <ul className="mk-alert-list">
                    {shown.map((a) => (
                      <AlertRow key={a.id} a={a} acked={acks[a.id]} onAck={() => acknowledge([a])} onReopen={() => reopen(a)} />
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === 'regras' && (
              <div className="rf-card">
                <div className="rf-between" style={{ marginBottom: 6 }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Regras de alerta</h3>
                    <p className="rf-small" style={{ margin: '2px 0 0' }}>Salvas neste navegador para o seu usuário. Os padrões já cobrem o caso comum.</p>
                  </div>
                  <button type="button" className="rf-btn secondary small" onClick={resetRules}><RotateCcw size={13} /> Restaurar padrões</button>
                </div>
                <ul className="mk-rules">
                  {RULE_META.map((m) => {
                    const r = rules[m.id];
                    return (
                      <li key={m.id}>
                        <label className="mk-switch">
                          <input type="checkbox" checked={r.enabled} onChange={(e) => updateRule(m.id, { enabled: e.target.checked })} />
                          <span aria-hidden="true" />
                          <b>{m.label}</b>
                        </label>
                        <small>{m.description}</small>
                        {m.hasThreshold && (
                          <div className="mk-rule-input">
                            <input
                              type="range" min={m.min} max={m.max} step={m.step} value={r.threshold} disabled={!r.enabled}
                              aria-label={`Limiar de ${m.label}`}
                              onChange={(e) => updateRule(m.id, { threshold: Number(e.target.value) })}
                            />
                            <output>{r.threshold} {m.unit}</output>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {tab === 'historico' && (
              <div className="rf-card">
                <h3>Histórico de ações</h3>
                {log.length === 0 ? (
                  <EmptyState icon={<History size={20} />} title="Sem ações registradas" text="Reconhecimentos e mudanças de regra aparecem aqui, com quem fez e quando." />
                ) : (
                  <ul className="mk-log">
                    {log.map((e, i) => (
                      <li key={`${e.at}-${i}`}><time>{dateTimeOf(e.at)}</time><b>{e.by}</b> {e.action}<span>{e.title}</span></li>
                    ))}
                  </ul>
                )}
                <p className="rf-tiny">O histórico fica neste navegador. A trilha de auditoria do servidor (publicação de sinais) segue disponível na FlexIA e em Sinais de preço.</p>
              </div>
            )}

            <SourceNote source={meta?.dataset.source} iso={overview.data.generatedAt} />
          </>
        )}
      </div>
    </ManagerShell>
  );
}
