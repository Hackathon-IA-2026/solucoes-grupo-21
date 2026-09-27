import { useMemo } from 'react';
import { Download, FileText, Printer, Star } from 'lucide-react';
import { ManagerShell } from '@/components/layout/ManagerShell';
import { EmptyState, ErrorPanel, Skeleton, SourceNote } from '@/components/manager/kit';
import { LevelBadge } from '@/components/manager/ui';
import { useManagerMeta } from '@/hooks/manager-queries';
import { money, num } from '@/lib/format';
import { useManagerPref } from '@/lib/manager-store';
import type { ManagerOverview } from '@/types/manager';
import { useOverview } from './hooks';

type Region = ManagerOverview['regions'][number];
type MetricId = 'level' | 'load' | 'demand' | 'energy' | 'dc' | 'ev' | 'busy' | 'stations' | 'maintenance';

const METRICS: { id: MetricId; label: string; unit: string; csv: (r: Region) => string | number; cell: (r: Region) => React.ReactNode }[] = [
  { id: 'level', label: 'Sinal', unit: '', csv: (r) => r.level, cell: (r) => <LevelBadge level={r.level} label={r.level} /> },
  { id: 'load', label: 'Carga', unit: '%', csv: (r) => r.loadFactorPct, cell: (r) => `${r.loadFactorPct}%` },
  { id: 'demand', label: 'Demanda', unit: 'MW', csv: (r) => r.demandMw, cell: (r) => `${num(r.demandMw)} MW` },
  { id: 'energy', label: 'Custo de energia', unit: 'R$/kWh', csv: (r) => r.energyCostKwh, cell: (r) => money(r.energyCostKwh) },
  { id: 'dc', label: 'DC rápida', unit: 'R$/kWh', csv: (r) => r.dcPriceKwh, cell: (r) => money(r.dcPriceKwh) },
  { id: 'ev', label: 'Recarga VE', unit: 'MW', csv: (r) => r.evLoadMw, cell: (r) => `${num(r.evLoadMw, 2)} MW` },
  { id: 'busy', label: 'Conectores ocupados', unit: '', csv: (r) => `${r.busyConnectors}/${r.totalConnectors}`, cell: (r) => `${r.busyConnectors}/${r.totalConnectors}` },
  { id: 'stations', label: 'Estações', unit: '', csv: (r) => r.stations, cell: (r) => num(r.stations) },
  { id: 'maintenance', label: 'Em manutenção', unit: '', csv: (r) => r.maintenance, cell: (r) => num(r.maintenance) },
];

const TEMPLATES: { id: string; label: string; metrics: MetricId[] }[] = [
  { id: 'diario', label: 'Diário da operação', metrics: ['level', 'load', 'demand', 'dc', 'busy'] },
  { id: 'precos', label: 'Preços e sinais', metrics: ['level', 'energy', 'dc'] },
  { id: 'capacidade', label: 'Capacidade da rede', metrics: ['load', 'demand', 'ev', 'busy', 'stations', 'maintenance'] },
  { id: 'completo', label: 'Completo', metrics: METRICS.map((m) => m.id) },
];

function csvCell(v: string | number): string {
  const s = typeof v === 'number' ? String(v).replace('.', ',') : v;
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ManagerReportsPage() {
  const { data, isLoading, error, refetch } = useOverview();
  const { data: meta } = useManagerMeta();
  const [picked, setPicked] = useManagerPref<MetricId[]>('report-metrics', TEMPLATES[0]!.metrics);
  const [regionIds, setRegionIds] = useManagerPref<string[] | null>('report-regions', null);
  const [favorites] = useManagerPref<string[]>('favorite-regions', []);

  const regions = useMemo(() => (data ? data.regions.filter((r) => !regionIds || regionIds.includes(r.regionId)) : []), [data, regionIds]);
  const cols = METRICS.filter((m) => picked.includes(m.id));
  const generated = data ? new Date(data.generatedAt) : null;

  const toggleMetric = (id: MetricId) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleRegion = (id: string) =>
    setRegionIds((cur) => {
      const all = data?.regions.map((r) => r.regionId) ?? [];
      const base = cur ?? all;
      const next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
      return next.length === all.length ? null : next;
    });

  const exportCsv = () => {
    if (!data) return;
    const head = ['Região', ...cols.map((c) => (c.unit ? `${c.label} (${c.unit})` : c.label))];
    const lines = [head, ...regions.map((r) => [r.regionName, ...cols.map((c) => c.csv(r))])];
    const source = meta?.dataset.source ?? 'backend Rio Flex';
    const EOL = String.fromCharCode(13, 10);
    const body = lines.map((l) => l.map(csvCell).join(';')).join(EOL);
    const footer = EOL + EOL + csvCell(`Fonte: ${source} · referência ${generated?.toLocaleString('pt-BR')}`);
    // BOM para o Excel reconhecer UTF-8; ";" e vírgula decimal são o padrão do Excel em pt-BR.
    const blob = new Blob([String.fromCharCode(0xfeff) + body + footer], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rioflex-relatorio-${data.generatedAt.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <ManagerShell>
      <div className="rf-page">
        <div className="rf-page-head mk-noprint">
          <div>
            <span className="rf-eyebrow">Relatórios</span>
            <h1 className="rf-title">Qual recorte quero levar para a reunião?</h1>
            <p className="rf-subtitle">Escolha regiões e indicadores, confira a prévia e exporte em CSV (Excel) ou PDF. Toda página exportada traz fonte e data de referência.</p>
          </div>
          <div className="rf-row">
            <button type="button" className="rf-btn secondary small" onClick={() => window.print()} disabled={!data || !cols.length}><Printer size={13} /> Imprimir / PDF</button>
            <button type="button" className="rf-btn purple small" onClick={exportCsv} disabled={!data || !cols.length || !regions.length}><Download size={13} /> Exportar CSV</button>
          </div>
        </div>

        <ErrorPanel error={error} onRetry={() => void refetch()} what="os dados do relatório" />
        {isLoading && <div className="rf-card"><Skeleton h={220} r={14} /></div>}

        {data && (
          <>
            <div className="rf-card mk-noprint">
              <h3>Modelo e indicadores</h3>
              <div className="mk-chips" role="group" aria-label="Modelos prontos">
                {TEMPLATES.map((t) => (
                  <button key={t.id} type="button" className={`mk-chip ${JSON.stringify(t.metrics) === JSON.stringify(picked) ? 'on' : ''}`} onClick={() => setPicked(t.metrics)}>
                    <FileText size={12} /> {t.label}
                  </button>
                ))}
              </div>
              <div className="mk-checks">
                {METRICS.map((m) => (
                  <label key={m.id}><input type="checkbox" checked={picked.includes(m.id)} onChange={() => toggleMetric(m.id)} /> {m.label}</label>
                ))}
              </div>
              <h3 style={{ marginTop: 18 }}>Regiões</h3>
              <div className="mk-chips" role="group" aria-label="Atalhos de região">
                <button type="button" className={`mk-chip ${regionIds === null ? 'on' : ''}`} onClick={() => setRegionIds(null)}>Todas</button>
                <button type="button" className="mk-chip" disabled={!favorites.length} onClick={() => setRegionIds(favorites)} title={favorites.length ? '' : 'Marque regiões com a estrela na visão geral'}>
                  <Star size={12} /> Minha atenção
                </button>
              </div>
              <div className="mk-checks">
                {data.regions.map((r) => (
                  <label key={r.regionId}><input type="checkbox" checked={!regionIds || regionIds.includes(r.regionId)} onChange={() => toggleRegion(r.regionId)} /> {r.regionName}</label>
                ))}
              </div>
              <p className="rf-tiny">Assinatura recorrente por e-mail depende do serviço de envio do backend e ainda não está disponível.</p>
            </div>

            <div className="rf-card mk-report">
              <div className="mk-print-head">
                <b>Rio Flex · Relatório operacional</b>
                <span>Referência: {generated?.toLocaleString('pt-BR')} · {regions.length} região(ões)</span>
              </div>
              {!cols.length || !regions.length ? (
                <EmptyState title="Nada para mostrar" text="Escolha pelo menos um indicador e uma região para ver a prévia." />
              ) : (
                <div className="rf-table-wrap">
                  <table className="rf-table plain mk-table">
                    <thead><tr><th>Região</th>{cols.map((c) => <th key={c.id}>{c.label}</th>)}</tr></thead>
                    <tbody>
                      {regions.map((r) => (
                        <tr key={r.regionId}>
                          <td className="rf-strong">{r.regionName}</td>
                          {cols.map((c) => <td key={c.id} className="mk-num">{c.cell(r)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <SourceNote source={meta?.dataset.source} iso={data.generatedAt} />
            </div>
          </>
        )}
      </div>
    </ManagerShell>
  );
}
