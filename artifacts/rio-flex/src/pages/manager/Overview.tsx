import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ArrowUpDown, Bell, Bot, Gauge, Megaphone, Monitor, PlugZap, Sparkles, Star, Workflow, Zap } from 'lucide-react';
import { ManagerShell } from '@/components/layout/ManagerShell';
import { Button } from '@/components/common/Button';
import { LevelBadge } from '@/components/manager/ui';
import { EmptyState, ErrorPanel, Kpi, KpiSkeletonRow, Skeleton, SourceNote } from '@/components/manager/kit';
import { useManagerAlerts } from '@/hooks/manager-alerts';
import { useManagerMeta } from '@/hooks/manager-queries';
import { ALERT_COLOR, LEVEL_NAME } from '@/lib/alerts';
import { LEVEL_COLOR, money, num } from '@/lib/format';
import { useManagerPref } from '@/lib/manager-store';
import type { ManagerOverview, SignalLevel } from '@/types/manager';
import { Freshness, PriceAlertsPanel } from './PriceAlertsPanel';

type Region = ManagerOverview['regions'][number];
type SortKey = 'loadFactorPct' | 'demandMw' | 'regionName';

const LEVELS: SignalLevel[] = ['verde', 'amarelo', 'vermelho'];
const loadColor = (pct: number) => (pct > 85 ? '#ff6b6b' : pct > 75 ? '#f7c65c' : '#4ae3a5');

function LoadBar({ pct }: { pct: number }) {
  return (
    <div className="mk-load" role="img" aria-label={`Carga de ${pct}%`}>
      <span style={{ width: `${Math.min(100, pct)}%`, background: loadColor(pct) }} />
      <b style={{ color: loadColor(pct) }}>{pct}%</b>
    </div>
  );
}

/** Resumo em linguagem natural, calculado só a partir dos números da própria tela (sem inventar). */
function dailySummary(data: ManagerOverview, openAlerts: number, critical: number): string[] {
  const lines: string[] = [];
  const reds = data.regions.filter((r) => r.level === 'vermelho');
  const top = [...data.regions].sort((a, b) => b.loadFactorPct - a.loadFactorPct)[0];
  lines.push(
    reds.length
      ? `${reds.length} região(ões) em janela vermelha: ${reds.map((r) => r.regionName).join(', ')}.`
      : 'Nenhuma região em janela vermelha agora.',
  );
  if (top) lines.push(`Maior carga: ${top.regionName}, com ${top.loadFactorPct}% (${num(top.demandMw)} MW de demanda).`);
  lines.push(openAlerts ? `${openAlerts} alerta(s) aberto(s), ${critical} crítico(s).` : 'Sem alertas abertos.');
  lines.push(`Últimos 7 dias: ${num(data.totals.sessions7d)} recargas, ${num(data.totals.energy7dKwh)} kWh e ${num(data.totals.flexEvents7d)} modulações aceitas.`);
  return lines;
}

export default function ManagerOverviewPage() {
  const { overview, open, acknowledged } = useManagerAlerts();
  const { data, isLoading, error, refetch } = overview;
  const { data: meta } = useManagerMeta();
  const [favorites, setFavorites] = useManagerPref<string[]>('favorite-regions', []);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'loadFactorPct', dir: -1 });
  const [levelFilter, setLevelFilter] = useState<SignalLevel | 'todos'>('todos');

  const toggleFavorite = (id: string) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  const critical = open.filter((a) => a.level === 3).length;

  const rows = useMemo(() => {
    if (!data) return [];
    const list = data.regions.filter((r) => levelFilter === 'todos' || r.level === levelFilter);
    return [...list].sort((a, b) => {
      const fav = Number(favorites.includes(b.regionId)) - Number(favorites.includes(a.regionId));
      if (fav) return fav;
      const va = a[sort.key];
      const vb = b[sort.key];
      return (typeof va === 'string' ? va.localeCompare(String(vb)) : (va as number) - (vb as number)) * sort.dir;
    });
  }, [data, favorites, sort, levelFilter]);

  const favRegions = data?.regions.filter((r) => favorites.includes(r.regionId)) ?? [];
  const setSortKey = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'regionName' ? 1 : -1 }));

  return (
    <ManagerShell>
      <div className="rf-page">
        <div className="rf-page-head">
          <div>
            <span className="rf-eyebrow">Visão geral</span>
            <h1 className="rf-title">Como está a rede de recarga agora?</h1>
            <p className="rf-subtitle">Preço, demanda e uso dos carregadores por região. Dados agregados — sem informações individuais de consumidores.</p>
            {data && <Freshness iso={data.generatedAt} />}
          </div>
          <div className="rf-row">
            <Button href="/gestor/ciclo" className="secondary small"><Workflow size={13} /> Ver ciclo</Button>
            <Button href="/gestor/telao" className="secondary small"><Monitor size={13} /> Telão</Button>
            <Button href="/gestor/sinais" className="secondary small"><Megaphone size={13} /> Publicar sinal</Button>
            <Button href="/gestor/flexia" className="purple small"><Bot size={13} /> Perguntar à FlexIA</Button>
          </div>
        </div>

        <ErrorPanel error={error} onRetry={() => void refetch()} what="a visão geral" />
        {isLoading && (
          <>
            <KpiSkeletonRow />
            <div className="rf-card"><Skeleton h={260} r={14} /></div>
          </>
        )}

        {data && (
          <>
            <section className="mk-summary" aria-label="Resumo do dia">
              <div className="mk-summary-head"><Sparkles size={14} /> Resumo do dia <small>calculado a partir dos números desta tela</small></div>
              <ul>{dailySummary(data, open.length, critical).map((l) => <li key={l}>{l}</li>)}</ul>
              <div className="rf-row">
                <Button href="/gestor/alertas" className="secondary small"><Bell size={13} /> Ver alertas</Button>
                <Button href={`/gestor/flexia?q=${encodeURIComponent('Resuma a situação da rede agora e o que devo priorizar.')}`} className="purple small"><Bot size={13} /> Pedir análise à FlexIA</Button>
              </div>
            </section>

            <div className="mk-kpis">
              <Kpi label="Recargas agora" value={data.totals.activeSessions} icon={<PlugZap size={15} />} tone="accent" hint={`${num(data.totals.sessions7d)} nos últimos 7 dias`} />
              <Kpi label="Energia · 7 dias" value={data.totals.energy7dKwh} unit="kWh" icon={<Zap size={15} />} hint="entregue pelos carregadores" />
              <Kpi label="Modulações aceitas" value={data.totals.flexEvents7d} icon={<Gauge size={15} />} tone="accent" hint="flexibilidade · 7 dias" />
              <Kpi label="Estações" value={data.totals.stations} hint={`${data.totals.publicStations} públicas · ${data.totals.dcStations} com DC`} />
              <Kpi label="Conectores" value={data.totals.connectors} hint={`${data.totals.maintenance} locais em manutenção`} tone={data.totals.maintenance > 0 ? 'warn' : 'default'} />
              <Kpi
                label="Alertas abertos"
                value={open.length}
                tone={critical ? 'crit' : open.length ? 'warn' : 'ok'}
                hint={open.length ? `${critical} crítico(s) · ${acknowledged.length} reconhecido(s)` : 'nada exige atenção'}
                icon={<Bell size={15} />}
              />
            </div>

            {favRegions.length > 0 && (
              <section aria-label="Minha atenção">
                <div className="mk-section-title"><Star size={14} fill="#f7c65c" color="#f7c65c" /> Minha atenção</div>
                <div className="mk-fav-grid">
                  {favRegions.map((r) => (
                    <Link key={r.regionId} href={`/gestor/rede?region=${r.regionId}`} className="mk-fav">
                      <div className="rf-between"><b>{r.regionName}</b><LevelBadge level={r.level} label={r.level} /></div>
                      <LoadBar pct={r.loadFactorPct} />
                      <div className="mk-fav-meta"><span>{num(r.demandMw)} MW</span><span>DC {money(r.dcPriceKwh)}</span><span>{r.busyConnectors}/{r.totalConnectors} ocupados</span></div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <div className="rf-card">
              <div className="rf-between">
                <div>
                  <h3 style={{ margin: 0 }}>Onde a rede está mais pressionada?</h3>
                  <p className="rf-small" style={{ margin: '2px 0 0' }}>Marque uma região com a estrela para fixá-la no topo e em “Minha atenção”.</p>
                </div>
                <div className="mk-chips" role="group" aria-label="Filtrar por sinal">
                  {(['todos', ...LEVELS] as const).map((l) => (
                    <button key={l} type="button" className={`mk-chip ${levelFilter === l ? 'on' : ''}`} onClick={() => setLevelFilter(l)} aria-pressed={levelFilter === l}>
                      {l !== 'todos' && <i style={{ background: LEVEL_COLOR[l] }} />}{l === 'todos' ? 'Todas' : l.charAt(0).toUpperCase() + l.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {rows.length === 0 ? (
                <EmptyState title="Nenhuma região neste filtro" text="Escolha outro nível de sinal ou volte para todas as regiões." action={<button type="button" className="rf-btn secondary small" onClick={() => setLevelFilter('todos')}>Mostrar todas</button>} />
              ) : (
                <div className="rf-table-wrap">
                  <table className="rf-table plain mk-table">
                    <thead>
                      <tr>
                        <th aria-label="Favorita" />
                        <th><button type="button" onClick={() => setSortKey('regionName')}>Região <ArrowUpDown size={11} /></button></th>
                        <th>Sinal</th>
                        <th><button type="button" onClick={() => setSortKey('loadFactorPct')}>Carga <ArrowUpDown size={11} /></button></th>
                        <th><button type="button" onClick={() => setSortKey('demandMw')}>Demanda <ArrowUpDown size={11} /></button></th>
                        <th>Custo energia</th><th>DC rápida</th><th>Recarga VE</th><th>Conectores</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r: Region) => {
                        const fav = favorites.includes(r.regionId);
                        return (
                          <tr key={r.regionId}>
                            <td>
                              <button type="button" className={`mk-star ${fav ? 'on' : ''}`} onClick={() => toggleFavorite(r.regionId)} aria-pressed={fav} aria-label={`${fav ? 'Remover' : 'Marcar'} ${r.regionName} ${fav ? 'de' : 'em'} minha atenção`}>
                                <Star size={15} fill={fav ? '#f7c65c' : 'none'} />
                              </button>
                            </td>
                            <td className="rf-strong"><Link href={`/gestor/rede?region=${r.regionId}`}>{r.regionName}</Link></td>
                            <td><LevelBadge level={r.level} label={`${r.level}${r.signalSource === 'gestor' ? ' ★' : ''}`} /></td>
                            <td><LoadBar pct={r.loadFactorPct} /></td>
                            <td className="mk-num">{num(r.demandMw)} <em>MW</em></td>
                            <td className="mk-num">{money(r.energyCostKwh)}</td>
                            <td className="mk-num">{money(r.dcPriceKwh)}</td>
                            <td className="mk-num">{num(r.evLoadMw, 2)} <em>MW</em></td>
                            <td className="mk-num">{r.busyConnectors}/{r.totalConnectors}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="rf-tiny">★ no sinal = publicado por gestor. Demais níveis são calculados a partir do custo horário (percentis do dia) e do posto tarifário.</p>
            </div>

            <div className="rf-card">
              <div className="rf-between">
                <h3 style={{ margin: 0 }}>Alertas que pedem atenção {open.length ? `(${open.length})` : ''}</h3>
                <Link href="/gestor/alertas" className="rf-small" style={{ color: '#b98cff' }}>central de alertas</Link>
              </div>
              {open.length === 0 ? (
                <EmptyState icon={<Bell size={20} />} title="Tudo tranquilo" text="Nenhum alerta aberto. As regras e os limiares podem ser ajustados na central de alertas." />
              ) : (
                <ul className="mk-alert-mini">
                  {open.slice(0, 5).map((a) => (
                    <li key={a.id}>
                      <span className="mk-lvl" style={{ color: ALERT_COLOR[a.level], borderColor: ALERT_COLOR[a.level] }}>{LEVEL_NAME[a.level]}</span>
                      <div><b>{a.title}</b><small>{a.detail}</small></div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <PriceAlertsPanel />

            <div className="rf-card">
              <div className="rf-between"><h3 style={{ margin: 0 }}>Sinais ativos e agendados</h3><Link href="/gestor/sinais" className="rf-small" style={{ color: '#b98cff' }}>gerenciar</Link></div>
              {data.signals.length === 0 && <EmptyState title="Nenhum sinal manual ativo" text="A precificação está no modo automático. Publique um sinal para orientar os consumidores." action={<Button href="/gestor/sinais" className="secondary small"><Megaphone size={13} /> Publicar sinal</Button>} />}
              {data.signals.map((s) => (
                <div key={s.id} className="rf-wallet-history-item">
                  <div>
                    <div className="rf-strong" style={{ fontSize: 13 }}>{s.title}</div>
                    <div className="rf-tiny">{s.regionId} · {s.startsAt.slice(0, 16).replace('T', ' ')} → {s.endsAt.slice(0, 16).replace('T', ' ')} · {s.status}</div>
                  </div>
                  <LevelBadge level={s.level} label={s.level} />
                </div>
              ))}
            </div>

            <SourceNote source={meta?.dataset.source} iso={data.generatedAt} />
          </>
        )}
      </div>
    </ManagerShell>
  );
}
