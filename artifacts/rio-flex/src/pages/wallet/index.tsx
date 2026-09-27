import { useState, useEffect } from 'react';
import { HelpCircle, TrendingDown, Sun, ShieldCheck, Zap, Info, Calendar } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { money } from '@/lib/format';
import { useWallet } from '@/api';

interface WalletActivityItem {
  id: string | number;
  date: string;
  station: string;
  energyKwh: number;
  cost: number;
  bonusText: string;
  event: string;
  peakCost?: number;
  savings?: number;
}

const defaultActivities: WalletActivityItem[] = [
  {
    id: 1,
    date: 'Hoje, 10:30',
    station: 'COPPE / UFRJ Eletroposto Solar',
    energyKwh: 20.2,
    cost: 19.80,
    peakCost: 45.45,
    savings: 25.65,
    bonusText: 'Economizou R$ 25,65',
    event: 'Anotação: Deslocamento para Janela Solar da Manhã (10:30)',
  },
  {
    id: 2,
    date: 'Ontem, 13:15',
    station: 'Marina Flex Station',
    energyKwh: 21.7,
    cost: 21.26,
    peakCost: 48.82,
    savings: 27.56,
    bonusText: 'Economizou R$ 27,56',
    event: 'Anotação: Recarga com Excedente Fotovoltaico Máximo (13:00)',
  },
  {
    id: 3,
    date: '12 set 2026',
    station: 'Hub Maricá Tarifa Zero V2G',
    energyKwh: 18.2,
    cost: 17.83,
    peakCost: 40.95,
    savings: 23.12,
    bonusText: 'Economizou R$ 23,12',
    event: 'Anotação: Antecipação de recarga fora do pico vespertino',
  },
  {
    id: 4,
    date: '04 set 2026',
    station: 'Barra da Tijuca Park',
    energyKwh: 16.8,
    cost: 18.48,
    peakCost: 37.80,
    savings: 19.32,
    bonusText: 'Economizou R$ 19,32',
    event: 'Anotação: Deslocamento de horário pré-pico (15:30)',
  },
  {
    id: 5,
    date: '28 ago 2026',
    station: 'Marina Flex Station',
    energyKwh: 14.1,
    cost: 13.81,
    peakCost: 31.72,
    savings: 17.91,
    bonusText: 'Economizou R$ 17,91',
    event: 'Anotação: Aproveitamento de janela solar matutina',
  },
];

export default function WalletPage() {
  const { data: wallet } = useWallet();
  const [walletTab, setWalletTab] = useState<'annotations' | 'comparison'>('annotations');
  const [isCo2TooltipOpen, setIsCo2TooltipOpen] = useState(false);
  const [activities, setActivities] = useState<WalletActivityItem[]>(defaultActivities);
  const [totalSavingsRs, setTotalSavingsRs] = useState<number>(178.50);

  // Carregar anotações salvas em localStorage
  useEffect(() => {
    try {
      const customSaved = localStorage.getItem('rioflex_wallet_custom_activities');
      if (customSaved) {
        const parsed = JSON.parse(customSaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Combinar anotações customizadas no topo sem duplicatas
          const combined = [...parsed, ...defaultActivities.filter((def) => !parsed.some((p: WalletActivityItem) => p.id === def.id))];
          setActivities(combined);
        }
      }

      const savedTotal = localStorage.getItem('rioflex_wallet_total_savings');
      if (savedTotal) {
        setTotalSavingsRs(Number(savedTotal));
      }
    } catch {
      // fallback
    }
  }, []);

  const totalFlexEnergyKwh = wallet?.totalFlexEnergyKwh ?? 63.0;
  const co2AvoidedKg = wallet?.co2AvoidedKg ?? 25.6;
  const smartSessionsCount = activities.length;

  return (
    <AppShell>
      <div className="rf-wallet-container">
        <div>
          <span className="rf-eyebrow">Etapa 4 • Saldo de Economia & Anotações</span>
          <h1 className="rf-title" style={{ fontSize: 24, margin: '2px 0 0' }}>
            Minha Carteira & Economia
          </h1>
          <p className="rf-subtitle">
            Acompanhe o quanto você economizou diretamente no bolso por deslocar suas recargas para os horários solares e de vale.
          </p>
        </div>

        {/* Card Principal: Total Economizado por Deslocamento de Carga */}
        <div
          className="rf-wallet-balance-card"
          style={{
            background: 'linear-gradient(135deg, rgba(74, 227, 165, 0.14) 0%, rgba(56, 189, 248, 0.08) 100%)',
            border: '1.5px solid #4ae3a5',
            boxShadow: '0 8px 32px rgba(74, 227, 165, 0.16)',
            padding: 22,
            borderRadius: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#4ae3a5', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <TrendingDown size={14} /> SUA ECONOMIA ACUMULADA POR DESLOCAMENTO
            </span>
            <span className="rf-badge green" style={{ fontSize: 10, padding: '3px 8px' }}>
              Janela Solar & Tarifa de Vale
            </span>
          </div>

          <div
            className="rf-wallet-balance-num"
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: '#4ae3a5',
              margin: '10px 0 6px',
              textShadow: '0 0 20px rgba(74, 227, 165, 0.35)',
            }}
          >
            {money(totalSavingsRs)}
            <span style={{ fontSize: 16, color: '#94a3b8', fontWeight: 500, marginLeft: 8 }}>
              economizados
            </span>
          </div>

          <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
            Valor total que você <b>deixou de pagar</b> ao transferir suas recargas para os horários de maior geração solar e menor demanda da Light/ONS, evitando as tarifas de ponta das 18h às 21h.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 14,
              padding: '10px 14px',
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: 10,
              border: '1px solid rgba(74, 227, 165, 0.25)',
              fontSize: 12,
              color: '#4ae3a5',
            }}
          >
            <ShieldCheck size={16} />
            <span>
              <b>Média economizada por sessão:</b> ~{money(totalSavingsRs / (smartSessionsCount || 1))} por deslocamento programado.
            </span>
          </div>
        </div>

        {/* Grade Compacta de Impacto Energético */}
        <div className="rf-compact-impact-grid">
          <div className="rf-compact-impact-card">
            <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Energia Deslocada
            </span>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#4ae3a5', margin: '4px 0 2px' }}>
              {totalFlexEnergyKwh.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} kWh
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>consumidos em janelas solares</div>
          </div>

          <div className="rf-compact-impact-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                CO₂ Evitado
              </span>
              <button
                type="button"
                onClick={() => setIsCo2TooltipOpen(!isCo2TooltipOpen)}
                style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: 0 }}
                title="Como calculamos o CO2 evitado?"
              >
                <HelpCircle size={12} />
              </button>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#38bdf8', margin: '4px 0 2px' }}>
              {co2AvoidedKg.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} kg
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>termelétricas evitadas</div>
          </div>

          <div className="rf-compact-impact-card">
            <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Adesão Fora do Pico
            </span>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#c084fc', margin: '4px 0 2px' }}>
              {smartSessionsCount} sessões
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>100% de flexibilidade</div>
          </div>
        </div>

        {isCo2TooltipOpen && (
          <div style={{ background: '#111822', border: '1px solid #263848', borderRadius: 10, padding: 12, fontSize: 12, color: '#cbd5e1' }}>
            <b>Fator de Emissão ONS/SIN:</b> O CO₂ evitado é calculado considerando as termelétricas a gás e óleo que deixam de ser acionadas no horário de pico noturno porque o seu consumo foi deslocado para a manhã e início da tarde (excedente solar fotovoltaico).
          </div>
        )}

        {/* Card de Anotações Salvas na Carteira */}
        <div className="rf-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: '#f8fafc' }}>Anotações da Carteira</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                Registro detalhado de cada recarga e o quanto foi poupado por deslocar o horário.
              </p>
            </div>

            <div className="rf-segmented-toggle">
              <button
                type="button"
                className={`rf-segmented-btn ${walletTab === 'annotations' ? 'active' : ''}`}
                onClick={() => setWalletTab('annotations')}
              >
                Anotações ({activities.length})
              </button>
              <button
                type="button"
                className={`rf-segmented-btn ${walletTab === 'comparison' ? 'active' : ''}`}
                onClick={() => setWalletTab('comparison')}
              >
                Comparativo Pico
              </button>
            </div>
          </div>

          {/* Aba 1: Anotações Detalhadas */}
          {walletTab === 'annotations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activities.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: '#0d1318',
                    border: '1px solid #1e2935',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#f8fafc' }}>
                      {item.station}
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3 }}>
                      {item.date} · <b>{item.energyKwh} kWh</b> · Valor pago: <b style={{ color: '#4ae3a5' }}>{money(item.cost)}</b>
                    </div>
                    <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Sun size={12} />
                      {item.event}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 12,
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: 20,
                        background: 'rgba(74, 227, 165, 0.15)',
                        border: '1px solid rgba(74, 227, 165, 0.35)',
                        color: '#4ae3a5',
                      }}
                    >
                      <TrendingDown size={13} />
                      {item.bonusText}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Aba 2: Comparativo com Horário de Pico da Light */}
          {walletTab === 'comparison' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                style={{
                  padding: 12,
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: 10,
                  fontSize: 12,
                  color: '#cbd5e1',
                  marginBottom: 6,
                }}
              >
                Comparação direta entre o valor pago na janela solar/vale vs. o que você teria pago no horário de pico (19h, R$ 2,25/kWh).
              </div>

              {activities.map((item) => {
                const peak = item.peakCost ?? Number((item.energyKwh * 2.25).toFixed(2));
                const diff = Number((peak - item.cost).toFixed(2));
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: '#0d1318',
                      border: '1px solid #1e2935',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#f8fafc' }}>
                        {item.station} ({item.date})
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {item.energyKwh} kWh consumidos fora da ponta
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 10, color: '#f87171' }}>Pico 19h</span>
                        <div style={{ fontSize: 12, color: '#f87171', fontWeight: 600 }}>{money(peak)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 10, color: '#4ae3a5' }}>Pago Real</span>
                        <div style={{ fontSize: 13, color: '#4ae3a5', fontWeight: 700 }}>{money(item.cost)}</div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 90 }}>
                        <span style={{ fontSize: 10, color: '#38bdf8' }}>Você Poupatou</span>
                        <div style={{ fontSize: 13, color: '#38bdf8', fontWeight: 800 }}>+{money(diff)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
