import { useId, type ComponentType, type CSSProperties } from 'react';
import { BrainCircuit, Building2, Car, Gauge, PlugZap, ShieldCheck, UserRound, Workflow } from 'lucide-react';
import { useReducedMotion } from '@/components/manager/kit';

/**
 * Ciclo do Rio Flex em uma imagem animada:
 *
 *   Frota → Carregador → Medidor inteligente ─┬─ Distribuidora            (medição de faturamento)
 *                                             └─ Orquestrador ⇄ FlexIA → Consumidor · Gestor
 *
 * O medidor não se repete: ele abre dois caminhos (distribuidora e orquestrador), e o caminho do orquestrador é de ida e volta. A energia (verde)
 * corre no sentido físico, da distribuidora até a frota; a medição (azul) sobe pelo mesmo trilho
 * até o medidor e segue pelos dois ramos; o orquestrador e a FlexIA trocam estado da rede e
 * recomendações (violeta); o orquestrador envia ao medidor o comando de modulação (âmbar, tracejado), que chega ao carregador.
 */
export type FlowMetrics = Partial<Record<'fleet' | 'charger' | 'meter' | 'grid' | 'orchestrator' | 'flexia' | 'consumer' | 'manager', string>>;
export type FlowTone = 'verde' | 'amarelo' | 'vermelho';

const C = {
  energy: '#4ae3a5',
  data: '#5cc8ff',
  ai: '#b98cff',
  mod: '#f7c65c',
  text: '#f4f7f9',
  muted: '#8f9da8',
  node: '#0e1419',
  edge: '#27313a',
};
const TONE: Record<FlowTone, string> = { verde: '#4ae3a5', amarelo: '#f7c65c', vermelho: '#ff6b6b' };

type NodeDef = {
  key: keyof FlowMetrics;
  x: number;
  y: number;
  label: string;
  color: string;
  Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
};

const NODES: NodeDef[] = [
  { key: 'fleet', x: 80, y: 225, label: 'Frota', color: C.energy, Icon: Car },
  { key: 'charger', x: 245, y: 225, label: 'Carregador', color: C.energy, Icon: PlugZap },
  { key: 'meter', x: 410, y: 225, label: 'Medidor inteligente', color: C.data, Icon: Gauge },
  { key: 'grid', x: 620, y: 90, label: 'Distribuidora', color: C.energy, Icon: Building2 },
  { key: 'orchestrator', x: 620, y: 360, label: 'Orquestrador', color: C.ai, Icon: Workflow },
  { key: 'flexia', x: 790, y: 360, label: 'FlexIA', color: C.ai, Icon: BrainCircuit },
  { key: 'consumer', x: 940, y: 290, label: 'Consumidor', color: C.ai, Icon: UserRound },
  { key: 'manager', x: 940, y: 430, label: 'Gestor', color: C.ai, Icon: ShieldCheck },
];

type PathDef = { id: string; d: string; color: string; dash?: boolean; width?: number; particles?: number; dur?: number; arrow?: boolean; faint?: boolean };

const PATHS: PathDef[] = [
  // trilho físico: energia da distribuidora até a frota (sentido real do fluxo)
  { id: 'e1', d: 'M590 82 C 520 82, 505 211, 444 211 L 114 211', color: C.energy, width: 3, particles: 5, dur: 4.2, arrow: true },
  // medição: frota → carregador → medidor
  { id: 'd1', d: 'M114 239 L 376 239', color: C.data, width: 2, particles: 4, dur: 3.2, arrow: false },
  // medidor → distribuidora (faturamento)
  { id: 'd2', d: 'M444 239 C 505 239, 520 98, 586 98', color: C.data, width: 2, particles: 2, dur: 3.4, arrow: true },
  // medidor ⇄ orquestrador: telemetria sobe, comando de modulação volta (caminho de ida e volta)
  { id: 'd3', d: 'M446 233 C 515 233, 520 350, 585 350', color: C.data, width: 2, particles: 3, dur: 3.4, arrow: true },
  { id: 'c1', d: 'M585 370 C 520 370, 515 249, 446 249', color: C.mod, width: 2, dash: true, particles: 3, dur: 3.4, arrow: true },
  // medidor → carregador: o comando chega ao ponto de recarga
  { id: 'c2', d: 'M376 225 L 281 225', color: C.mod, width: 2, dash: true, particles: 2, dur: 2.2, arrow: true },
  // distribuidora → orquestrador (preço e carga da rede)
  { id: 'g1', d: 'M620 126 L 620 322', color: C.data, width: 1.5, dash: true, particles: 2, dur: 5, arrow: true, faint: true },
  // orquestrador ⇄ FlexIA
  { id: 'o1', d: 'M654 350 L 756 350', color: C.ai, width: 2, particles: 2, dur: 2.6, arrow: true },
  { id: 'o2', d: 'M756 372 L 654 372', color: C.ai, width: 2, particles: 2, dur: 2.6, arrow: true },
  // FlexIA → consumidor e gestor
  { id: 'f1', d: 'M822 346 C 880 346, 890 290, 906 290', color: C.ai, width: 2, particles: 2, dur: 2.8, arrow: true },
  { id: 'f2', d: 'M822 374 C 880 374, 890 430, 906 430', color: C.ai, width: 2, particles: 2, dur: 2.8, arrow: true },
];

export function EnergyFlow({
  metrics = {},
  tone = 'verde',
  compact = false,
  className = '',
  style,
  showLegend = true,
}: {
  metrics?: FlowMetrics;
  tone?: FlowTone;
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
  showLegend?: boolean;
}) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const pid = (id: string) => `${uid}-${id}`;
  const toneColor = TONE[tone];

  return (
    <figure className={`mk-flow ${compact ? 'compact' : ''} ${className}`} style={style}>
      <svg viewBox="0 0 1000 480" role="img" aria-label="Ciclo Rio Flex: frota, carregador, medidor inteligente, distribuidora, orquestrador, FlexIA, consumidor e gestor">
        <defs>
          {[C.energy, C.data, C.ai, C.mod].map((c) => (
            <marker key={c} id={`${uid}-ah-${c.slice(1)}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M1 1 L9 5 L1 9 Z" fill={c} />
            </marker>
          ))}
          <radialGradient id={`${uid}-halo`}>
            <stop offset="0" stopColor="#fff" stopOpacity=".16" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          {PATHS.map((p) => <path key={p.id} id={pid(p.id)} d={p.d} />)}
        </defs>

        {/* trilhos */}
        {PATHS.map((p) => (
          <path
            key={p.id}
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeOpacity={p.faint ? 0.28 : 0.42}
            strokeWidth={p.width ?? 2}
            strokeDasharray={p.dash ? '5 7' : undefined}
            strokeLinecap="round"
            markerEnd={p.arrow ? `url(#${uid}-ah-${p.color.slice(1)})` : undefined}
          />
        ))}

        {/* partículas em movimento */}
        {!reduced &&
          PATHS.map((p) =>
            Array.from({ length: p.particles ?? 0 }, (_, i) => (
              <circle key={`${p.id}-${i}`} r={p.id === 'e1' ? 3.6 : 2.8} fill={p.color} className="mk-particle">
                <animateMotion
                  dur={`${p.dur ?? 3}s`}
                  begin={`${-((p.dur ?? 3) / (p.particles ?? 1)) * i}s`}
                  repeatCount="indefinite"
                  keyPoints="0;1"
                  keyTimes="0;1"
                  calcMode="linear"
                >
                  <mpath href={`#${pid(p.id)}`} />
                </animateMotion>
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.12;.88;1" dur={`${p.dur ?? 3}s`} begin={`${-((p.dur ?? 3) / (p.particles ?? 1)) * i}s`} repeatCount="indefinite" />
              </circle>
            )),
          )}

        {/* rótulos dos trilhos */}
        <g className="mk-flow-tag" fontSize="10.5">
          <text x="180" y="200" fill={C.energy} textAnchor="middle">energia</text>
          <text x="180" y="262" fill={C.data} textAnchor="middle">medição</text>
          <text x="330" y="214" fill={C.mod} textAnchor="middle">comando</text>
          <text x="518" y="398" fill={C.data} textAnchor="middle">telemetria</text>
          <text x="518" y="412" fill={C.mod} textAnchor="middle">modulação</text>
          <text x="632" y="232" fill={C.data} opacity=".8">preço e carga da rede</text>
          <text x="705" y="344" fill={C.ai} textAnchor="middle">estado</text>
          <text x="705" y="389" fill={C.ai} textAnchor="middle">recomendação</text>
        </g>

        {/* nós */}
        {NODES.map((n) => {
          const color = n.key === 'orchestrator' ? toneColor : n.color;
          const metric = metrics[n.key];
          return (
            <g key={n.key} transform={`translate(${n.x} ${n.y})`}>
              <circle r="62" fill={`url(#${uid}-halo)`} className={reduced ? undefined : 'mk-halo'} style={{ color }} />
              <circle r="36" fill={C.node} stroke={color} strokeOpacity=".75" strokeWidth="1.6" />
              <circle r="36" fill="none" stroke={color} strokeOpacity=".25" strokeWidth="6" />
              <svg x="-14" y="-14" width="28" height="28" viewBox="0 0 24 24" overflow="visible">
                <n.Icon size={24} color={color} strokeWidth={1.7} />
              </svg>
              <text y="60" textAnchor="middle" className="mk-node-label">{n.label}</text>
              {metric && <text y="77" textAnchor="middle" className="mk-node-metric">{metric}</text>}
            </g>
          );
        })}
      </svg>
      {showLegend && (
        <figcaption className="mk-flow-legend">
          <span><i style={{ background: C.energy }} />Energia</span>
          <span><i style={{ background: C.data }} />Medição e telemetria</span>
          <span><i style={{ background: C.ai }} />Estado, recomendação e sinais</span>
          <span><i className="dash" style={{ background: C.mod }} />Comando de modulação</span>
        </figcaption>
      )}
    </figure>
  );
}
