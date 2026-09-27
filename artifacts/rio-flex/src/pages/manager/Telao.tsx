import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Expand, Pause, Play, Shrink } from 'lucide-react';
import { EnergyFlow, type FlowTone } from '@/components/viz/EnergyFlow';
import { ErrorPanel, Skeleton } from '@/components/manager/kit';
import { useManagerAlerts } from '@/hooks/manager-alerts';
import { ALERT_COLOR, LEVEL_NAME } from '@/lib/alerts';
import { LEVEL_COLOR, money, num } from '@/lib/format';
import { useManagerPref } from '@/lib/manager-store';

const INTERVALS = [8, 15, 30, 60];

/** Modo telão: tela cheia, fonte grande e carrossel de regiões para a sala de operação. */
export default function ManagerWallPage() {
  const { overview, open } = useManagerAlerts();
  const { data, error, refetch } = overview;
  const [interval, setIntervalSec] = useManagerPref<number>('wall-interval', 15);
  const [favorites] = useManagerPref<string[]>('favorite-regions', []);
  const [playing, setPlaying] = useState(true);
  const [index, setIndex] = useState(0);
  const [tick, setTick] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const root = useRef<HTMLDivElement>(null);

  // Favoritas primeiro; sem favoritas, todas as regiões por carga decrescente.
  const regions = useMemo(() => {
    if (!data) return [];
    const favs = data.regions.filter((r) => favorites.includes(r.regionId));
    const rest = data.regions.filter((r) => !favorites.includes(r.regionId)).sort((a, b) => b.loadFactorPct - a.loadFactorPct);
    return [...favs, ...rest];
  }, [data, favorites]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!playing || regions.length < 2) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, [playing, regions.length]);

  useEffect(() => {
    if (tick * 0.25 >= interval) { setTick(0); setIndex((i) => (i + 1) % Math.max(1, regions.length)); }
  }, [tick, interval, regions.length]);

  useEffect(() => {
    const on = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.current?.requestFullscreen?.();
  };

  const region = regions[index % Math.max(1, regions.length)];
  const critical = open.filter((a) => a.level === 3).length;
  const tone: FlowTone = region?.level ?? 'verde';
  const go = (i: number) => { setIndex(i); setTick(0); };

  return (
    <div className="mk-wall" ref={root}>
      <header className="mk-wall-top">
        <Link href="/gestor" className="mk-wall-back"><ArrowLeft size={16} /> Sair do telão</Link>
        <div className="mk-wall-brand"><span className="rf-logo-mark">RF</span> Rio Flex · Operação</div>
        <div className="mk-wall-tools">
          <label>
            <span>Troca a cada</span>
            <select value={interval} onChange={(e) => { setIntervalSec(Number(e.target.value)); setTick(0); }} aria-label="Intervalo do carrossel">
              {INTERVALS.map((s) => <option key={s} value={s}>{s} s</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pausar carrossel' : 'Retomar carrossel'}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
          <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}>{fullscreen ? <Shrink size={16} /> : <Expand size={16} />}</button>
          <time className="mk-wall-clock">{now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
        </div>
      </header>

      {error && <div style={{ padding: 24 }}><ErrorPanel error={error} onRetry={() => void refetch()} what="o telão" /></div>}
      {!data && !error && <div className="mk-wall-body"><Skeleton h={420} r={24} /></div>}

      {data && region && (
        <div className="mk-wall-body">
          <section className="mk-wall-region" key={region.regionId}>
            <span className="mk-wall-eyebrow">Região {index % regions.length + 1} de {regions.length}</span>
            <h1>{region.regionName}</h1>
            <span className="mk-wall-level" style={{ color: LEVEL_COLOR[region.level], borderColor: LEVEL_COLOR[region.level] }}>
              <i style={{ background: LEVEL_COLOR[region.level] }} /> janela {region.level}{region.signalSource === 'gestor' ? ' · sinal do gestor' : ''}
            </span>
            <div className="mk-wall-metrics">
              <div><span>Carga</span><strong style={{ color: region.loadFactorPct > 85 ? '#ff6b6b' : region.loadFactorPct > 75 ? '#f7c65c' : '#4ae3a5' }}>{region.loadFactorPct}<em>%</em></strong></div>
              <div><span>Demanda</span><strong>{num(region.demandMw)}<em>MW</em></strong></div>
              <div><span>DC rápida</span><strong>{money(region.dcPriceKwh)}<em>/kWh</em></strong></div>
              <div><span>Conectores ocupados</span><strong>{region.busyConnectors}<em>/{region.totalConnectors}</em></strong></div>
            </div>
          </section>
          <section className="mk-wall-flow">
            <EnergyFlow
              tone={tone}
              showLegend={false}
              metrics={{
                fleet: `${data.totals.activeSessions} em recarga`,
                charger: `${region.busyConnectors}/${region.totalConnectors} ocupados`,
                meter: `${num(region.evLoadMw, 2)} MW VE`,
                grid: `${num(region.demandMw)} MW`,
                orchestrator: `janela ${region.level}`,
                flexia: `${data.totals.flexEvents7d} modulações · 7 d`,
                consumer: 'preço e crédito',
                manager: open.length ? `${open.length} alerta(s)` : 'sem alertas',
              }}
            />
          </section>
        </div>
      )}

      {data && (
        <footer className="mk-wall-foot">
          <div className="mk-wall-dots" role="tablist" aria-label="Regiões">
            {regions.map((r, i) => (
              <button key={r.regionId} type="button" role="tab" aria-selected={i === index % regions.length} className={i === index % regions.length ? 'on' : ''} onClick={() => go(i)} title={r.regionName}>
                <i style={{ background: LEVEL_COLOR[r.level] }} />
              </button>
            ))}
          </div>
          <div className="mk-wall-alerts">
            {open.length === 0 ? <span className="ok">Sem alertas abertos</span> : (
              open.slice(0, 3).map((a) => <span key={a.id} style={{ color: ALERT_COLOR[a.level] }}>{LEVEL_NAME[a.level]}: {a.title}</span>)
            )}
            {critical > 3 && <span>+{critical - 3}</span>}
          </div>
          <div className="mk-wall-progress"><span style={{ width: `${playing ? Math.min(100, (tick * 0.25 / interval) * 100) : 0}%` }} /></div>
        </footer>
      )}
    </div>
  );
}
