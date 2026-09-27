import L from 'leaflet';

/**
 * Camada de calor em canvas para o Leaflet, sem dependências extras.
 *  - modo "intensidade": pontos somam brilho (densidade ou potência) e o resultado é colorido por
 *    uma rampa de calor (azul → verde → amarelo → vermelho), como um mapa de calor de verdade;
 *  - modo "cor": cada ponto é uma mancha com a sua própria cor (usado para o preço: verde barato,
 *    vermelho caro), então dá para ler o preço por região olhando só a cor.
 */
export type HeatPoint = { lat: number; lng: number; w: number; color?: string };
export type HeatOptions = { mode: 'intensity' | 'color'; radius?: (zoom: number) => number; opacity?: number };

const RAMP: [number, string][] = [
  [0, 'rgba(56,130,246,0)'],
  [0.1, 'rgba(56,130,246,0.55)'],
  [0.28, 'rgba(56,150,246,0.8)'],
  [0.5, 'rgba(74,227,165,0.85)'],
  [0.72, 'rgba(247,198,92,0.92)'],
  [1, 'rgba(255,107,107,0.97)'],
];

function buildLut(): Uint8ClampedArray {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 1;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  RAMP.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 1);
  return ctx.getImageData(0, 0, 256, 1).data;
}

type HeatLayerInstance = L.Layer & { setPoints(p: HeatPoint[]): void; setOptions(o: Partial<HeatOptions>): void };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HeatLayer = (L.Layer as any).extend({
  initialize(this: any, points: HeatPoint[], options: HeatOptions) {
    this._points = points;
    this._opts = { radius: (z: number) => Math.max(16, Math.min(80, 12 * 2 ** ((z - 10) * 0.6))), opacity: 1, ...options };
    this._lut = null;
  },
  onAdd(this: any, map: L.Map) {
    this._map = map;
    if (!map.getPane('heat')) {
      const pane = map.createPane('heat');
      pane.style.zIndex = '350';
      pane.style.pointerEvents = 'none';
    }
    const c = (this._canvas = L.DomUtil.create('canvas', 'mx-heat leaflet-zoom-hide') as HTMLCanvasElement);
    c.style.pointerEvents = 'none';
    map.getPane('heat')!.appendChild(c);
    map.on('moveend zoomend resize', this._reset, this);
    this._reset();
  },
  onRemove(this: any, map: L.Map) {
    map.off('moveend zoomend resize', this._reset, this);
    this._canvas.remove();
  },
  setPoints(this: any, p: HeatPoint[]) { this._points = p; if (this._map) this._draw(); },
  setOptions(this: any, o: Partial<HeatOptions>) { this._opts = { ...this._opts, ...o }; if (this._map) this._draw(); },
  _reset(this: any) {
    const size = this._map.getSize();
    const c: HTMLCanvasElement = this._canvas;
    c.width = size.x; c.height = size.y;
    c.style.width = `${size.x}px`; c.style.height = `${size.y}px`;
    L.DomUtil.setPosition(c, this._map.containerPointToLayerPoint([0, 0]));
    this._draw();
  },
  _draw(this: any) {
    const map: L.Map = this._map;
    const c: HTMLCanvasElement = this._canvas;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    const r: number = this._opts.radius(map.getZoom());
    const pad = r * 1.5;
    const pts: { x: number; y: number; w: number; color?: string }[] = [];
    for (const p of this._points as HeatPoint[]) {
      const pt = map.latLngToContainerPoint([p.lat, p.lng]);
      if (pt.x < -pad || pt.y < -pad || pt.x > c.width + pad || pt.y > c.height + pad) continue;
      pts.push({ x: pt.x, y: pt.y, w: p.w, color: p.color });
    }

    if (this._opts.mode === 'color') {
      ctx.globalAlpha = this._opts.opacity;
      for (const p of pts) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 1.35);
        g.addColorStop(0, `${p.color ?? '#f7c65c'}d0`);
        g.addColorStop(0.5, `${p.color ?? '#f7c65c'}70`);
        g.addColorStop(1, `${p.color ?? '#f7c65c'}00`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.35, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      return;
    }

    // intensidade: acumula alfa em preto e depois pinta pela rampa de calor
    ctx.filter = 'blur(3px)'; // suaviza o ruído de dithering dos gradientes (ignorado onde não há suporte)
    for (const p of pts) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      const a = Math.min(1, Math.max(0.06, p.w) * 0.13);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.filter = 'none';
    if (!this._lut) this._lut = buildLut();
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    const lut: Uint8ClampedArray = this._lut;
    for (let i = 3; i < d.length; i += 4) {
      // quantiza em passos de 8 (o Chrome adiciona ruído de "dithering" aos gradientes) e corta o
      // chuvisco de baixa opacidade nas bordas, senão a rampa amplifica o ruído em pontinhos coloridos
      const a = d[i]! & 0xfc;
      if (a < 8) { d[i] = 0; continue; }
      const k = Math.min(255, (a - 8) * 1.5) * 4;
      d[i - 3] = lut[k]!; d[i - 2] = lut[k + 1]!; d[i - 1] = lut[k + 2]!;
      d[i] = lut[k + 3]! * this._opts.opacity;
    }
    ctx.putImageData(img, 0, 0);
  },
});

export function heatLayer(points: HeatPoint[], options: HeatOptions): HeatLayerInstance {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (HeatLayer as any)(points, options) as HeatLayerInstance;
}
