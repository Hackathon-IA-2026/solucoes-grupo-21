import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import type L from 'leaflet';
import {
  Crosshair, ExternalLink, Info, Layers, LocateFixed, MapPin, Navigation, PlugZap, Route as RouteIcon, Search, Sparkles, X, Zap,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { ChargerMap, type FocusTarget, type MapItem, type MapMode, type RouteLine } from '@/components/map/ChargerMap';
import { ErrorPanel, Skeleton } from '@/components/manager/kit';
import { WhyRecommendedModal } from '@/pages/map/WhyRecommendedModal';
import { StationDetailModal } from '@/pages/map/StationDetailModal';
import { stations as defaultStations } from '@/data/stations';
import { POPULAR_LOCATIONS } from '@/data/locations';
import { useStations } from '@/api';
import { brl, COLOR, distKm, kwText, makePriceScale, priceText, useCarregadoresRj, type Carregador } from '@/lib/carregadores';
import type { ChargingStation } from '@/types/station';

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN ?? '').trim() || null;
const DEFAULT_ORIGIN = { name: 'Botafogo, Rio de Janeiro', lat: -22.9452, lng: -43.1818 };
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const PAGE = 40;

type Sort = 'perto' | 'preco' | 'potencia';
type RouteInfo = { distKm: number; minutes: number; estimated: boolean };

const MODES: { id: MapMode; label: string; hint: string }[] = [
  { id: 'pontos', label: 'Pontos', hint: 'Cada carregador, agrupados por região' },
  { id: 'densidade', label: 'Densidade', hint: 'Onde há mais carregadores' },
  { id: 'preco', label: 'Preço', hint: 'Verde é mais barato, vermelho é mais caro' },
  { id: 'potencia', label: 'Potência', hint: 'Onde há carga mais rápida' },
];

async function fetchRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }): Promise<{ coords: [number, number][]; info: RouteInfo }> {
  const straight: [number, number][] = [[from.lat, from.lng], [to.lat, to.lng]];
  const km = distKm(from.lat, from.lng, to.lat, to.lng);
  const estimate = { coords: straight, info: { distKm: km * 1.3, minutes: Math.max(3, Math.round(km * 1.3 * 2.4)), estimated: true } };
  if (!MAPBOX_TOKEN) return estimate;
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) return estimate;
    const r = (await res.json()).routes?.[0];
    if (!r) return estimate;
    return {
      coords: (r.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number]),
      info: { distKm: r.distance / 1000, minutes: Math.max(1, Math.round(r.duration / 60)), estimated: false },
    };
  } catch {
    return estimate;
  }
}

function toMapItem(s: ChargingStation): MapItem {
  const dc = s.connectors.some((c) => c.powerKw >= 50);
  return {
    id: s.id, n: s.name, m: 'Rio de Janeiro', a: s.address, lat: s.latitude, lng: s.longitude, pub: true, tipo: dc ? 'DC' : 'AC',
    kw: s.specs.maxPowerKw, p: s.pricePerKwh, taxa: null, gr: false, cf: false, man: false, rd: [s.operator], tl: 'Parceiro Rio Flex',
    nc: s.totalConnectors, cs: s.connectors.map((c) => ({ t: c.type, c: c.powerKw >= 50 ? 'DC' : 'AC', k: c.powerKw, n: 1 })), hr: null, up: null, url: '', partner: true,
  };
}

function TypeBadge({ item }: { item: Carregador }) {
  const color = item.tipo === 'DC' ? COLOR.dc : item.tipo === 'AC' ? COLOR.ac : COLOR.unknown;
  return (
    <span className="mx-type" style={{ color, borderColor: `${color}66`, background: `${color}14` }}>
      {item.tipo === 'DC' ? 'Rápido DC' : item.tipo === 'AC' ? 'AC' : 'Tipo n/d'}{item.kw ? ` · ${kwText(item.kw)}` : ''}
    </span>
  );
}

export default function MapPage() {
  const [, setLocation] = useLocation();
  const { data: doc, isLoading, error, refetch } = useCarregadoresRj();
  const { data: stationsData } = useStations();
  const partnerStations = stationsData ?? defaultStations;

  const all = useMemo<MapItem[]>(() => [...partnerStations.map(toMapItem), ...(doc?.locais ?? [])], [partnerStations, doc]);
  const scale = useMemo(() => makePriceScale(doc?.locais ?? []), [doc]);

  // filtros
  const [q, setQ] = useState('');
  const [onlyDc, setOnlyDc] = useState(false);
  const [onlyPublic, setOnlyPublic] = useState(false);
  const [onlyPriced, setOnlyPriced] = useState(false);
  const [hideMaint, setHideMaint] = useState(true);
  const [minKw, setMinKw] = useState(0);
  const [network, setNetwork] = useState('');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState<Sort>('perto');
  const [inView, setInView] = useState(true);
  const [mode, setMode] = useState<MapMode>('pontos');
  const [limit, setLimit] = useState(PAGE);

  // seleção, origem, rota
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<FocusTarget | null>(null);
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN);
  const [gps, setGps] = useState<'idle' | 'loading' | 'ok' | 'denied'>('idle');
  const [route, setRoute] = useState<RouteLine | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routing, setRouting] = useState(false);
  const [why, setWhy] = useState(false);
  const [detail, setDetail] = useState(false);
  const [originOpen, setOriginOpen] = useState(false);

  const locate = useCallback((zoom = 13) => {
    if (!navigator.geolocation) { setGps('denied'); return; }
    setGps('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ name: 'Minha localização', lat: pos.coords.latitude, lng: pos.coords.longitude });
        setFocus({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom, ts: Date.now() });
        setGps('ok');
      },
      () => setGps('denied'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  // Ao abrir o mapa, tenta centralizar na localização do usuário (zoom que já mostra os postos
  // próximos); se o navegador negar ou não responder a tempo, fica no centro padrão do estado.
  useEffect(() => { locate(13); }, [locate]);

  const networks = useMemo(() => {
    const c = new Map<string, number>();
    all.forEach((i) => i.rd.forEach((r) => c.set(r, (c.get(r) ?? 0) + 1)));
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  }, [all]);
  const cities = useMemo(() => {
    const c = new Map<string, number>();
    all.forEach((i) => c.set(i.m, (c.get(i.m) ?? 0) + 1));
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  }, [all]);

  const filtered = useMemo(() => {
    const needle = fold(q.trim());
    return all.filter((i) => {
      if (onlyDc && i.tipo !== 'DC') return false;
      if (onlyPublic && !i.pub) return false;
      if (onlyPriced && !(i.p && i.p > 0)) return false;
      if (hideMaint && i.man) return false;
      if (minKw && (i.kw ?? 0) < minKw) return false;
      if (network && !i.rd.includes(network)) return false;
      if (city && i.m !== city) return false;
      if (needle && !fold(`${i.n} ${i.a} ${i.m} ${i.rd.join(' ')}`).includes(needle)) return false;
      return true;
    });
  }, [all, q, onlyDc, onlyPublic, onlyPriced, hideMaint, minKw, network, city]);

  const listed = useMemo(() => {
    const base = inView && bounds ? filtered.filter((i) => bounds.contains([i.lat, i.lng])) : filtered;
    const d = (i: MapItem) => distKm(origin.lat, origin.lng, i.lat, i.lng);
    return [...base].sort((a, b) => {
      if (a.partner !== b.partner) return a.partner ? -1 : 1;
      if (sort === 'preco') return (a.p && a.p > 0 ? a.p : 99) - (b.p && b.p > 0 ? b.p : 99) || d(a) - d(b);
      if (sort === 'potencia') return (b.kw ?? 0) - (a.kw ?? 0) || d(a) - d(b);
      return d(a) - d(b);
    });
  }, [filtered, inView, bounds, sort, origin]);

  const selected = useMemo(() => all.find((i) => i.id === selectedId) ?? null, [all, selectedId]);
  const partnerOf = (i: MapItem | null): ChargingStation | undefined => (i?.partner ? partnerStations.find((s) => s.id === i.id) : undefined);

  const select = useCallback((id: string, fly = false) => {
    setSelectedId(id);
    setRoute(null);
    setRouteInfo(null);
    if (fly) {
      const it = all.find((i) => i.id === id);
      if (it) setFocus({ lat: it.lat, lng: it.lng, zoom: 15, ts: Date.now() });
    }
  }, [all]);

  const trace = async () => {
    if (!selected) return;
    setRouting(true);
    const r = await fetchRoute(origin, selected);
    setRoute({ coords: r.coords, ts: Date.now() });
    setRouteInfo(r.info);
    setRouting(false);
  };

  useEffect(() => { setLimit(PAGE); }, [filtered, inView, sort]);

  const activeFilters = [onlyDc, onlyPublic, onlyPriced, !hideMaint, minKw > 0, !!network, !!city, !!q].filter(Boolean).length;
  const clearFilters = () => { setQ(''); setOnlyDc(false); setOnlyPublic(false); setOnlyPriced(false); setHideMaint(true); setMinKw(0); setNetwork(''); setCity(''); };

  const stats = useMemo(() => {
    const l = doc?.locais ?? [];
    return { total: l.length, dc: l.filter((i) => i.tipo === 'DC').length, pub: l.filter((i) => i.pub).length, priced: l.filter((i) => i.p && i.p > 0).length };
  }, [doc]);

  return (
    <AppShell>
      <div className="mx-page">
        <header className="mx-head">
          <div>
            <span className="rf-eyebrow">Carregadores no estado do Rio</span>
            <h1>Onde carregar agora?</h1>
          </div>
          {doc && (
            <ul className="mx-stats" aria-label="Resumo da base">
              <li><b>{stats.total}</b> locais</li>
              <li><b>{stats.dc}</b> rápidos DC</li>
              <li><b>{stats.pub}</b> públicos</li>
              <li><b>{stats.priced}</b> com preço</li>
            </ul>
          )}
        </header>

        <ErrorPanel error={error} onRetry={() => void refetch()} what="os carregadores" />

        <div className="mx-layout">
          {/* ---------- painel ---------- */}
          <aside className="mx-panel" aria-label="Busca e lista de carregadores">
            <div className="mx-search">
              <Search size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome, endereço, cidade ou rede" aria-label="Buscar carregador" />
              {q && <button type="button" onClick={() => setQ('')} aria-label="Limpar busca"><X size={14} /></button>}
            </div>

            <div className="mx-origin">
              <button type="button" onClick={() => setOriginOpen((o) => !o)} aria-expanded={originOpen}>
                <span className="dot" /> <span>Saindo de <b>{origin.name}</b></span>
              </button>
              <button type="button" className={`mx-gps ${gps}`} onClick={() => locate(14)} title="Usar minha localização">
                <Crosshair size={13} className={gps === 'loading' ? 'animate-spin' : ''} /> {gps === 'ok' ? 'GPS ativo' : gps === 'denied' ? 'GPS negado' : 'GPS'}
              </button>
              {originOpen && (
                <ul className="mx-origin-list">
                  {POPULAR_LOCATIONS.map((l) => (
                    <li key={l.name}>
                      <button type="button" onClick={() => { setOrigin({ name: l.name.split(',')[0]!, lat: l.lat, lng: l.lng }); setOriginOpen(false); setFocus({ lat: l.lat, lng: l.lng, zoom: 14, ts: Date.now() }); }}>
                        <MapPin size={13} /> {l.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mx-chips" role="group" aria-label="Filtros rápidos">
              <button type="button" aria-pressed={onlyDc} className={onlyDc ? 'on' : ''} onClick={() => setOnlyDc((v) => !v)}><Zap size={12} /> Rápido DC</button>
              <button type="button" aria-pressed={onlyPublic} className={onlyPublic ? 'on' : ''} onClick={() => setOnlyPublic((v) => !v)}>Públicos</button>
              <button type="button" aria-pressed={onlyPriced} className={onlyPriced ? 'on' : ''} onClick={() => setOnlyPriced((v) => !v)}>Com preço</button>
              <button type="button" aria-pressed={hideMaint} className={hideMaint ? 'on' : ''} onClick={() => setHideMaint((v) => !v)}>Sem manutenção</button>
            </div>
            <div className="mx-selects">
              <label><span>Potência</span>
                <select value={minKw} onChange={(e) => setMinKw(Number(e.target.value))}>
                  <option value={0}>Qualquer</option><option value={22}>22 kW ou mais</option><option value={50}>50 kW ou mais</option><option value={100}>100 kW ou mais</option>
                </select>
              </label>
              <label><span>Rede</span>
                <select value={network} onChange={(e) => setNetwork(e.target.value)}>
                  <option value="">Todas</option>{networks.map(([n, c]) => <option key={n} value={n}>{n} ({c})</option>)}
                </select>
              </label>
              <label><span>Município</span>
                <select value={city} onChange={(e) => setCity(e.target.value)}>
                  <option value="">Todos</option>{cities.map(([n, c]) => <option key={n} value={n}>{n} ({c})</option>)}
                </select>
              </label>
              <label><span>Ordenar</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                  <option value="perto">Mais perto</option><option value="preco">Menor preço</option><option value="potencia">Maior potência</option>
                </select>
              </label>
            </div>

            <div className="mx-count">
              <span><b>{listed.length}</b> {inView ? 'neste mapa' : 'no estado'} · {filtered.length} com os filtros</span>
              <label className="mx-toggle"><input type="checkbox" checked={inView} onChange={(e) => setInView(e.target.checked)} /> só o que está no mapa</label>
              {activeFilters > 0 && <button type="button" className="mx-link" onClick={clearFilters}>limpar filtros</button>}
            </div>

            {isLoading && <div className="mx-list">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} h={62} r={12} />)}</div>}

            {doc && (
              <ul className="mx-list" aria-label="Resultados">
                {listed.length === 0 && (
                  <li className="mx-empty">
                    <strong>Nenhum carregador com esses filtros</strong>
                    <p>Afaste o mapa, desmarque “só o que está no mapa” ou limpe os filtros.</p>
                    <button type="button" className="rf-btn secondary small" onClick={() => { clearFilters(); setInView(false); }}>Mostrar todos</button>
                  </li>
                )}
                {listed.slice(0, limit).map((i) => {
                  const d = distKm(origin.lat, origin.lng, i.lat, i.lng);
                  return (
                    <li key={i.id}>
                      <button type="button" className={`mx-row ${i.id === selectedId ? 'sel' : ''}`} onClick={() => select(i.id, true)}>
                        <span className="mx-row-ico" style={{ background: i.partner ? COLOR.partner : i.tipo === 'DC' ? COLOR.dc : i.tipo === 'AC' ? COLOR.ac : COLOR.unknown }}>
                          {i.partner ? <Sparkles size={13} /> : <PlugZap size={13} />}
                        </span>
                        <span className="mx-row-body">
                          <b>{i.n}</b>
                          <small>{i.m} · {d.toFixed(1).replace('.', ',')} km{i.rd[0] ? ` · ${i.rd[0]}` : ''}</small>
                          <span className="mx-row-meta">
                            <TypeBadge item={i} />
                            {i.man && <span className="mx-warn">manutenção</span>}
                          </span>
                        </span>
                        <span className="mx-row-price" style={{ color: i.p && i.p > 0 ? scale.color(i.p) : undefined }}>
                          {i.p && i.p > 0 ? <>{brl(i.p)}<small>/kWh</small></> : <small>{i.gr ? 'grátis' : 'sem preço'}</small>}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {listed.length > limit && (
                  <li><button type="button" className="rf-btn secondary small full" onClick={() => setLimit((l) => l + PAGE)}>Mostrar mais {Math.min(PAGE, listed.length - limit)}</button></li>
                )}
              </ul>
            )}

            {doc && <p className="mx-source"><Info size={11} /> {doc.fonte} · {doc.snapshot.split('-').reverse().join('/')}. {doc.aviso}</p>}
          </aside>

          {/* ---------- mapa ---------- */}
          <section className="mx-mapwrap" aria-label="Mapa">
            <div className="mx-modes" role="tablist" aria-label="Visão do mapa">
              <Layers size={14} />
              {MODES.map((m) => (
                <button key={m.id} type="button" role="tab" aria-selected={mode === m.id} title={m.hint} className={mode === m.id ? 'on' : ''} onClick={() => setMode(m.id)}>{m.label}</button>
              ))}
            </div>

            <ChargerMap
              items={filtered}
              allItems={all}
              selectedId={selectedId}
              onSelect={(id) => select(id)}
              userCoords={{ latitude: origin.lat, longitude: origin.lng }}
              mode={mode}
              route={route}
              focus={focus}
              onViewChange={setBounds}
            />

            <div className="mx-legend" aria-live="polite">
              {mode === 'pontos' && (
                <>
                  <span>{brl(scale.lo)}</span><i className="ramp price" /><span>{brl(scale.hi)}/kWh</span>
                  <span><i style={{ background: COLOR.unknown }} />sem preço</span>
                  <span className="mx-legend-star">★ parceiro Rio Flex</span>
                  <small>ponto maior = carga rápida DC</small>
                </>
              )}
              {mode === 'densidade' && (<><span>menos</span><i className="ramp" /><span>mais carregadores</span></>)}
              {mode === 'potencia' && (<><span>carga lenta</span><i className="ramp" /><span>ultrarrápida</span></>)}
              {mode === 'preco' && (<><span>{brl(scale.lo)}</span><i className="ramp price" /><span>{brl(scale.hi)}/kWh</span><small>só locais com preço informado ({stats.priced})</small></>)}
            </div>

            {selected && (
              <div className="mx-card" role="dialog" aria-label={`Detalhes de ${selected.n}`}>
                <button type="button" className="mx-card-x" onClick={() => { setSelectedId(null); setRoute(null); setRouteInfo(null); }} aria-label="Fechar detalhes"><X size={15} /></button>
                <div className="mx-card-top">
                  <TypeBadge item={selected} />
                  {selected.partner && <span className="mx-partner"><Sparkles size={11} /> Parceiro Rio Flex</span>}
                  {selected.man && <span className="mx-warn">possível manutenção/obra</span>}
                </div>
                <h3>{selected.n}</h3>
                <p className="mx-addr">{selected.a}{selected.m && !selected.a.includes(selected.m) ? ` · ${selected.m}` : ''}</p>

                <div className="mx-price">
                  <strong className={selected.p && selected.p > 0 ? '' : 'none'} style={{ color: selected.p && selected.p > 0 ? scale.color(selected.p) : undefined }}>{priceText(selected)}</strong>
                  {selected.taxa ? <span>+ taxa de ativação {brl(selected.taxa)}</span> : null}
                </div>
                {!selected.partner && (
                  <p className="mx-note">
                    {selected.cf ? 'Há divergência entre o preço estruturado e a descrição no cadastro; confirme com o operador. ' : ''}
                    Preço informado por comunidade/operador, não confirmado.
                  </p>
                )}

                <ul className="mx-conn" aria-label="Conectores">
                  {selected.cs.map((c, i) => (
                    <li key={i}><b>{c.n}×</b> {c.t} <span>{c.c === 'DC' ? 'DC' : c.c === 'AC' ? 'AC' : ''}</span><em>{kwText(c.k)}</em></li>
                  ))}
                </ul>
                <div className="mx-facts">
                  {selected.rd.length > 0 && <span><b>Rede</b> {selected.rd.join(', ')}</span>}
                  {selected.hr && <span><b>Horário</b> {selected.hr}</span>}
                  {selected.up && <span><b>Cadastro atualizado</b> {selected.up.split('-').reverse().join('/')}</span>}
                </div>

                {routeInfo && (
                  <div className="mx-route">
                    <RouteIcon size={14} />
                    <b>{routeInfo.minutes} min</b> · {routeInfo.distKm.toFixed(1).replace('.', ',')} km de carro
                    {routeInfo.estimated && <small> (estimativa em linha reta; rota exata indisponível)</small>}
                  </div>
                )}

                <div className="mx-actions">
                  <button type="button" className="rf-btn primary" onClick={() => void trace()} disabled={routing}>
                    <Navigation size={13} /> {routing ? 'Calculando…' : routeInfo ? 'Recalcular rota' : 'Traçar rota'}
                  </button>
                  <a className="rf-btn secondary" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${selected.lat},${selected.lng}`}>
                    <ExternalLink size={13} /> Google Maps
                  </a>
                </div>
                {partnerOf(selected) && (
                  <div className="mx-actions">
                    <button type="button" className="rf-btn secondary small" onClick={() => setWhy(true)}><Info size={13} /> Por que recomendamos?</button>
                    <button type="button" className="rf-btn secondary small" onClick={() => setDetail(true)}><LocateFixed size={13} /> Detalhes e conectar</button>
                  </div>
                )}
                {selected.url && <a className="mx-link" href={selected.url} target="_blank" rel="noopener noreferrer">ver cadastro na fonte ↗</a>}
              </div>
            )}
          </section>
        </div>
      </div>

      {partnerOf(selected) && (
        <>
          <WhyRecommendedModal isOpen={why} onClose={() => setWhy(false)} station={partnerOf(selected)!} />
          <StationDetailModal isOpen={detail} onClose={() => setDetail(false)} station={partnerOf(selected)!} onConnect={() => { setDetail(false); setLocation('/app/session'); }} />
        </>
      )}
    </AppShell>
  );
}
