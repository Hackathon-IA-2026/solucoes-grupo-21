import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { Activity, Bell, Bot, CornerDownLeft, FileText, LayoutDashboard, MapPin, Megaphone, Monitor, Scale, Search, Sparkles, Workflow } from 'lucide-react';
import { useManagerMeta } from '@/hooks/manager-queries';

type Item = { id: string; group: string; label: string; hint?: string; icon: ReactNode; run: () => void };

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Busca global (Ctrl+K ou "/"): pula para qualquer tela, região ou pergunta à FlexIA. */
export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, go] = useLocation();
  const { data: meta } = useManagerMeta();
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(() => {
    const nav = (href: string) => () => { go(href); onClose(); };
    const pages: Item[] = [
      { id: 'p-overview', group: 'Telas', label: 'Visão geral', icon: <LayoutDashboard size={15} />, run: nav('/gestor') },
      { id: 'p-alerts', group: 'Telas', label: 'Central de alertas', hint: 'regras, reconhecer, histórico', icon: <Bell size={15} />, run: nav('/gestor/alertas') },
      { id: 'p-cycle', group: 'Telas', label: 'Ciclo', hint: 'frota, carregador, medidor, orquestrador, FlexIA', icon: <Workflow size={15} />, run: nav('/gestor/ciclo') },
      { id: 'p-grid', group: 'Telas', label: 'Rede, preço & clima', icon: <Activity size={15} />, run: nav('/gestor/rede') },
      { id: 'p-signals', group: 'Telas', label: 'Sinais de preço', hint: 'publicar sinal', icon: <Megaphone size={15} />, run: nav('/gestor/sinais') },
      { id: 'p-flexia', group: 'Telas', label: 'FlexIA', hint: 'conversar com a IA', icon: <Bot size={15} />, run: nav('/gestor/flexia') },
      { id: 'p-reports', group: 'Telas', label: 'Relatórios', hint: 'exportar CSV / PDF', icon: <FileText size={15} />, run: nav('/gestor/relatorios') },
      { id: 'p-reg', group: 'Telas', label: 'Regulação & protocolos', icon: <Scale size={15} />, run: nav('/gestor/regulacao') },
      { id: 'p-wall', group: 'Telas', label: 'Modo telão', hint: 'tela cheia para a sala de operação', icon: <Monitor size={15} />, run: nav('/gestor/telao') },
    ];
    const regions: Item[] = (meta?.regions ?? []).map((r) => ({
      id: `r-${r.id}`, group: 'Regiões', label: r.name, hint: `${r.distributor} · ${r.submarket}`, icon: <MapPin size={15} />, run: nav(`/gestor/rede?region=${r.id}`),
    }));
    const ask: Item[] = q.trim().length > 2
      ? [{ id: 'ask', group: 'FlexIA', label: `Perguntar: “${q.trim()}”`, hint: 'abre o chat já com a pergunta', icon: <Sparkles size={15} />, run: nav(`/gestor/flexia?q=${encodeURIComponent(q.trim())}`) }]
      : [];
    return [...pages, ...regions, ...ask];
  }, [meta, q, go, onClose]);

  const results = useMemo(() => {
    const needle = fold(q.trim());
    const list = needle ? items.filter((i) => i.id === 'ask' || fold(`${i.label} ${i.hint ?? ''}`).includes(needle)) : items.filter((i) => i.group === 'Telas');
    return list.slice(0, 12);
  }, [items, q]);

  useEffect(() => { if (open) { setQ(''); setCursor(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);
  useEffect(() => { setCursor(0); }, [q]);

  if (!open) return null;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); results[cursor]?.run(); }
  };

  let lastGroup = '';
  return (
    <div className="mk-palette-backdrop" onMouseDown={onClose} role="presentation">
      <div className="mk-palette" role="dialog" aria-modal="true" aria-label="Busca global" onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <div className="mk-palette-input">
          <Search size={16} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar tela, região ou perguntar à FlexIA…" aria-label="Buscar" />
          <kbd>Esc</kbd>
        </div>
        <ul role="listbox">
          {results.length === 0 && <li className="mk-palette-empty">Nada encontrado. Tente o nome de uma região ou de uma tela.</li>}
          {results.map((r, i) => {
            const head = r.group !== lastGroup ? <li className="mk-palette-group">{r.group}</li> : null;
            lastGroup = r.group;
            return (
              <Fragment key={r.id}>
                {head}
                <li>
                  <button type="button" role="option" aria-selected={i === cursor} className={i === cursor ? 'active' : ''} onMouseEnter={() => setCursor(i)} onClick={r.run}>
                    {r.icon}
                    <span>{r.label}{r.hint && <small>{r.hint}</small>}</span>
                    {i === cursor && <CornerDownLeft size={13} />}
                  </button>
                </li>
              </Fragment>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
