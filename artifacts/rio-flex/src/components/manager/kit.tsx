import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Database, Inbox, RefreshCw } from 'lucide-react';
import { num } from '@/lib/format';

/** true quando o usuário pediu menos movimento (sistema operacional). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** Conta do valor anterior até o novo em ~700 ms (ease-out). Na primeira carga sai de 0. */
export function useCountUp(target: number, ms = 700): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  const from = useRef(reduced ? target : 0);
  useEffect(() => {
    if (reduced) { setValue(target); from.current = target; return; }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = origin + (target - origin) * eased;
      setValue(v);
      from.current = v;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduced]);
  return value;
}

export function CountUp({ value, digits = 0 }: { value: number; digits?: number }) {
  const v = useCountUp(value);
  return <>{num(v, digits)}</>;
}

export type KpiTone = 'default' | 'accent' | 'ok' | 'warn' | 'crit';

/** Um número herói por cartão; rótulo pequeno; unidade em tom suave; dica embaixo. */
export function Kpi({
  label, value, digits = 0, unit, hint, tone = 'default', icon, text,
}: {
  label: string; value?: number | null; digits?: number; unit?: string; hint?: ReactNode; tone?: KpiTone; icon?: ReactNode; text?: string;
}) {
  return (
    <div className={`mk-kpi ${tone}`}>
      <div className="mk-kpi-head">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mk-kpi-value">
        {text ?? (value == null ? '—' : <CountUp value={value} digits={digits} />)}
        {unit && <em>{unit}</em>}
      </div>
      {hint && <div className="mk-kpi-hint">{hint}</div>}
    </div>
  );
}

export function Skeleton({ h = 16, w = '100%', r = 8 }: { h?: number; w?: number | string; r?: number }) {
  return <span className="mk-skel" style={{ height: h, width: w, borderRadius: r }} aria-hidden="true" />;
}

export function KpiSkeletonRow({ count = 6 }: { count?: number }) {
  return (
    <div className="mk-kpis" role="status" aria-label="Carregando indicadores">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="mk-kpi">
          <Skeleton h={10} w="55%" />
          <div style={{ height: 14 }} />
          <Skeleton h={30} w="70%" r={10} />
          <div style={{ height: 12 }} />
          <Skeleton h={10} w="80%" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="mk-empty">
      <div className="mk-empty-icon">{icon ?? <Inbox size={20} />}</div>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

/** Erro em linguagem humana, botão de tentar de novo e detalhe técnico recolhido. */
export function ErrorPanel({ error, onRetry, what = 'os dados' }: { error: unknown; onRetry?: () => void; what?: string }) {
  if (!error) return null;
  const detail = error instanceof Error ? error.message : String(error);
  return (
    <div className="mk-error" role="alert">
      <AlertTriangle size={18} />
      <div>
        <strong>Não foi possível carregar {what}.</strong>
        <p>Verifique sua conexão e tente novamente. Se persistir, a sessão pode ter expirado.</p>
        <details><summary>Detalhe técnico</summary><code>{detail}</code></details>
      </div>
      {onRetry && (
        <button type="button" className="rf-btn secondary small" onClick={onRetry}><RefreshCw size={13} /> Tentar de novo</button>
      )}
    </div>
  );
}

/** Fonte e data de referência: nenhuma métrica aparece sem dizer de onde veio. */
export function SourceNote({ source, iso }: { source?: string; iso?: string }) {
  const when = iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : null;
  return (
    <p className="mk-source"><Database size={11} /> Fonte: {source ?? 'backend Rio Flex'}{when ? ` · referência ${when}` : ''}</p>
  );
}

/** Mini gráfico de linha (SVG puro) com área em gradiente de baixa opacidade. */
export function Sparkline({ values, color = '#4ae3a5', width = 120, height = 34 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const id = useRef(`sp${Math.random().toString(36).slice(2, 8)}`).current;
  if (values.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => [i * step, height - 3 - ((v - min) / span) * (height - 6)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="mk-spark">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
