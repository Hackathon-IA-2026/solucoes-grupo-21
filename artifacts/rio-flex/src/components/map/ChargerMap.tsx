import { useCallback, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { COLOR, makePriceScale, type Carregador } from '@/lib/carregadores';
import { heatLayer, type HeatPoint } from './heat-layer';

export type MapItem = Carregador & { partner?: boolean };
export type MapMode = 'pontos' | 'densidade' | 'preco' | 'potencia';
export type FocusTarget = { lat: number; lng: number; zoom?: number; ts: number };
export type RouteLine = { coords: [number, number][]; ts: number };

/** Token público do Mapbox (pk.*), injetado em build (VITE_MAPBOX_TOKEN). Sem token, usa tiles CARTO. */
const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN ?? '').trim() || null;
const ATTR = '&copy; <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

function mapboxLayer(style: string, token: string) {
  return L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/512/{z}/{x}/{y}@2x?access_token=${token}`, {
    tileSize: 512, zoomOffset: -1, maxZoom: 20, attribution: ATTR,
  });
}

const pinColor = (i: MapItem) => (i.tipo === 'DC' ? COLOR.dc : i.tipo === 'AC' ? COLOR.ac : COLOR.unknown);

function pinIcon(i: MapItem, opts: { selected: boolean; color: string; dim: boolean }) {
  const size = i.partner ? 30 : opts.selected ? 26 : i.tipo === 'DC' ? 18 : 14;
  const cls = ['mx-pin', i.partner ? 'partner' : '', opts.selected ? 'sel' : '', i.man ? 'man' : '', opts.dim ? 'dim' : ''].join(' ');
  return L.divIcon({
    className: 'mx-pin-wrap',
    html: `<div class="${cls}" style="--c:${opts.color};--s:${size}px">${i.partner ? '★' : ''}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function clusterIcon(n: number, color: string) {
  const size = Math.min(46, 26 + Math.log2(n) * 4.2);
  return L.divIcon({
    className: 'mx-pin-wrap',
    html: `<div class="mx-cluster" style="--c:${color};--s:${size}px">${n}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function ChargerMap({
  items, allItems, selectedId, onSelect, userCoords, mode, route, focus, onViewChange,
}: {
  items: MapItem[];
  /** Base completa (a escala de preços usa todos, não só o filtro). */
  allItems: MapItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  userCoords: { latitude: number; longitude: number } | null;
  mode: MapMode;
  route: RouteLine | null;
  focus: FocusTarget | null;
  onViewChange: (b: L.LatLngBounds) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pins = useRef<L.LayerGroup | null>(null);
  const routeGroup = useRef<L.LayerGroup | null>(null);
  const userMarker = useRef<L.Marker | null>(null);
  const heat = useRef<ReturnType<typeof heatLayer> | null>(null);
  const cb = useRef({ onSelect, onViewChange });
  cb.current = { onSelect, onViewChange };

  const scale = useMemo(() => makePriceScale(allItems), [allItems]);
  // Os parceiros Rio Flex têm preços reais, porém num intervalo próprio (menor que a mediana do
  // estado): com a escala geral, todos cairiam sempre no verde. Uma escala só entre eles mostra a
  // variação real de preço entre os postos parceiros mais próximos do consumidor.
  const partnerScale = useMemo(() => makePriceScale(allItems.filter((i) => i.partner)), [allItems]);

  // ---- criação do mapa (uma vez)
  useEffect(() => {
    if (!el.current || mapRef.current) return;
    const map = L.map(el.current, { center: [-22.93, -43.25], zoom: 11, zoomControl: false, attributionControl: false, minZoom: 7 });
    if (MAPBOX_TOKEN) {
      const dark = mapboxLayer('dark-v11', MAPBOX_TOKEN).addTo(map);
      L.control.layers({ Escuro: dark, Ruas: mapboxLayer('streets-v12', MAPBOX_TOKEN), Satélite: mapboxLayer('satellite-streets-v12', MAPBOX_TOKEN) }, undefined, { position: 'topright' }).addTo(map);
    } else {
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd', attribution: '&copy; OpenStreetMap &copy; CARTO' }).addTo(map);
    }
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ prefix: false, position: 'bottomleft' }).addTo(map);
    map.createPane('route').style.zIndex = '380';
    pins.current = L.layerGroup().addTo(map);
    routeGroup.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    map.on('moveend', () => cb.current.onViewChange(map.getBounds()));
    cb.current.onViewChange(map.getBounds());
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ---- pinos e clusters
  const render = useCallback(() => {
    const map = mapRef.current;
    const layer = pins.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const z = map.getZoom();
    const view = map.getBounds().pad(0.2);
    const visible = items.filter((i) => view.contains([i.lat, i.lng]));
    // Cor = preço quando informado (verde barato -> vermelho caro), em qualquer modo — é o sinal
    // mais útil para o motorista. Sem preço, cai no tipo (DC/AC/n.d.); parceiros somam a estrela.
    const colorOf = (i: MapItem) => {
      if (!(i.p && i.p > 0)) return pinColor(i);
      return i.partner ? partnerScale.color(i.p) : scale.color(i.p);
    };
    const add = (i: MapItem, dim: boolean) => {
      const m = L.marker([i.lat, i.lng], { icon: pinIcon(i, { selected: i.id === selectedId, color: colorOf(i), dim }), zIndexOffset: i.id === selectedId ? 1000 : i.partner ? 500 : i.tipo === 'DC' ? 100 : 0 });
      m.on('click', () => cb.current.onSelect(i.id));
      m.addTo(layer);
    };

    if (mode === 'pontos') {
      const cell = z >= 15 ? 36 : z >= 12 ? 56 : 72;
      const groups = new Map<string, MapItem[]>();
      for (const i of visible) {
        if (i.id === selectedId || i.partner) { add(i, false); continue; }
        const p = map.latLngToContainerPoint([i.lat, i.lng]);
        const key = `${Math.floor(p.x / cell)}:${Math.floor(p.y / cell)}`;
        (groups.get(key) ?? groups.set(key, []).get(key)!).push(i);
      }
      groups.forEach((g) => {
        if (g.length === 1 || z >= 17) { g.forEach((i) => add(i, false)); return; }
        // Cor do grupo: preço médio de quem tem preço informado (mostra onde a região é mais
        // barata ou mais cara já no zoom afastado); sem preço na maioria, cai no tipo predominante.
        const priced = g.map((i) => i.p).filter((p): p is number => p != null && p > 0);
        const dc = g.filter((i) => i.tipo === 'DC').length;
        const c = priced.length >= g.length * 0.3 ? scale.color(priced.reduce((s, p) => s + p, 0) / priced.length) : dc > g.length / 2 ? COLOR.dc : COLOR.ac;
        const lat = g.reduce((s, i) => s + i.lat, 0) / g.length;
        const lng = g.reduce((s, i) => s + i.lng, 0) / g.length;
        const m = L.marker([lat, lng], { icon: clusterIcon(g.length, c) });
        m.on('click', () => map.fitBounds(L.latLngBounds(g.map((i) => [i.lat, i.lng] as [number, number])), { padding: [50, 50], maxZoom: 16 }));
        m.addTo(layer);
      });
    } else {
      // modos de calor: pinos só a partir de zoom 13, discretos; selecionado e parceiros sempre
      visible.filter((i) => z >= 13 || i.id === selectedId || i.partner).slice(0, 500).forEach((i) => add(i, i.id !== selectedId && !i.partner));
    }
  }, [items, mode, selectedId, scale, partnerScale]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    render();
    map.on('zoomend moveend', render);
    return () => { map.off('zoomend moveend', render); };
  }, [render]);

  // ---- mapa de calor
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (mode === 'pontos') { if (heat.current) { map.removeLayer(heat.current); heat.current = null; } return; }
    const pts: HeatPoint[] = [];
    for (const i of items) {
      if (mode === 'densidade') pts.push({ lat: i.lat, lng: i.lng, w: 1 });
      else if (mode === 'potencia') pts.push({ lat: i.lat, lng: i.lng, w: Math.max(0.15, Math.min(1, (i.kw ?? 7) / 150)) });
      else if (i.p && i.p > 0) pts.push({ lat: i.lat, lng: i.lng, w: 1, color: scale.color(i.p) });
    }
    const opts = { mode: mode === 'preco' ? ('color' as const) : ('intensity' as const), opacity: 0.9 };
    if (!heat.current) heat.current = heatLayer(pts, opts).addTo(map) as ReturnType<typeof heatLayer>;
    else { heat.current.setOptions(opts); heat.current.setPoints(pts); }
  }, [items, mode, scale]);

  // ---- posição do usuário
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    userMarker.current?.remove();
    userMarker.current = null;
    if (!userCoords) return;
    userMarker.current = L.marker([userCoords.latitude, userCoords.longitude], {
      icon: L.divIcon({ className: 'mx-pin-wrap', html: '<div class="mx-me"><i></i></div>', iconSize: [22, 22], iconAnchor: [11, 11] }),
      zIndexOffset: 2000, interactive: false,
    }).addTo(map);
  }, [userCoords]);

  // ---- rota real (Directions API) com contorno e traço animado
  useEffect(() => {
    const map = mapRef.current;
    const g = routeGroup.current;
    if (!map || !g) return;
    g.clearLayers();
    if (!route || route.coords.length < 2) return;
    L.polyline(route.coords, { pane: 'route', color: '#050912', weight: 9, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }).addTo(g);
    L.polyline(route.coords, { pane: 'route', color: '#38bdf8', weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }).addTo(g);
    L.polyline(route.coords, { pane: 'route', color: '#ffffff', weight: 2, opacity: 0.85, dashArray: '2 12', className: 'mx-route-flow' }).addTo(g);
    map.fitBounds(L.latLngBounds(route.coords), { padding: [60, 60], maxZoom: 16 });
  }, [route]);

  // ---- foco (voar até um ponto)
  useEffect(() => {
    if (focus && mapRef.current) mapRef.current.flyTo([focus.lat, focus.lng], focus.zoom ?? 15, { duration: 0.8 });
  }, [focus]);

  return <div ref={el} className="mx-map" role="application" aria-label="Mapa de carregadores" />;
}
