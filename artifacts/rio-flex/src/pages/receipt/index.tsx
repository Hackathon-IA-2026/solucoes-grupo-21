import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Check, Wallet, TrendingDown, Sun, ArrowRight, ShieldCheck } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { money } from '@/lib/format';

interface CompletedSessionData {
  stationName: string;
  date: string;
  timeWindow: string;
  energyKwh: number;
  costRs: number;
  savingsRs: number;
  peakCostRs: number;
  socStart: number;
  socEnd: number;
  durationMin: number;
}

export default function ReceiptPage() {
  const [, setLocation] = useLocation();
  const [sessionData, setSessionData] = useState<CompletedSessionData>({
    stationName: 'COPPE / UFRJ Eletroposto Solar',
    date: 'Hoje, 10:30',
    timeWindow: 'Manhã Solar (Janela de Excedente)',
    energyKwh: 20.2,
    costRs: 19.80,
    savingsRs: 25.65,
    peakCostRs: 45.45,
    socStart: 35,
    socEnd: 80,
    durationMin: 22,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('rioflex_last_completed_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSessionData((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // fallback
    }
  }, []);

  const percentageSaved = Math.round((sessionData.savingsRs / sessionData.peakCostRs) * 100) || 56;

  return (
    <AppShell>
      <div className="rf-receipt-card" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
        {/* Ícone de Sucesso */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'rgba(74, 227, 165, 0.15)',
            border: '1.5px solid #4ae3a5',
            margin: '0 auto 14px',
            boxShadow: '0 0 25px rgba(74, 227, 165, 0.25)',
          }}
        >
          <Check size={32} color="#4ae3a5" />
        </div>

        <span className="rf-eyebrow">Etapa 4 • Recarga Concluída com Sucesso</span>
        <h1 className="rf-title" style={{ fontSize: 26, margin: '6px 0 6px' }}>
          Veículo Pronto & Economia Garantida!
        </h1>
        <p className="rf-subtitle" style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 18px' }}>
          {sessionData.stationName} • Recarga realizada fora do pico da rede.
        </p>

        {/* Caixa de Celebração de Economia por Deslocamento de Carga */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(74, 227, 165, 0.16) 0%, rgba(56, 189, 248, 0.08) 100%)',
            border: '1.5px solid #4ae3a5',
            borderRadius: 16,
            padding: '20px 18px',
            boxShadow: '0 8px 30px rgba(74, 227, 165, 0.18)',
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#4ae3a5', fontWeight: 800 }}>
            <TrendingDown size={14} /> Economia por Deslocamento de Carga
          </div>

          <div
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: '#4ae3a5',
              margin: '8px 0 4px',
              letterSpacing: '-0.02em',
              textShadow: '0 0 20px rgba(74, 227, 165, 0.4)',
            }}
          >
            {money(sessionData.savingsRs)} economizados
          </div>

          <p style={{ margin: '6px 0 12px', fontSize: 13, color: '#cbd5e1', lineHeight: 1.45 }}>
            Você antecipou sua carga para a <b>manhã / horário solar</b> em vez de recarregar no pico noturno das 19h.
            Essa economia de <b>{percentageSaved}%</b> já foi anotada e registrada na sua carteira.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.12)',
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid rgba(56, 189, 248, 0.25)',
              margin: '0 auto',
              width: 'fit-content',
            }}
          >
            <ShieldCheck size={14} /> Anotação salva com sucesso na sua Carteira Rio Flex
          </div>
        </div>

        {/* Comparativo de Custos: Horário Solar vs. Pico ONS/Light */}
        <div
          style={{
            background: '#0d1318',
            border: '1px solid #1e2935',
            borderRadius: 14,
            padding: 16,
            marginBottom: 20,
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Comparativo Tarifário do Dia
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 10, padding: 12 }}>
              <span style={{ fontSize: 11, color: '#f87171' }}>Se carregasse às 19h (Pico)</span>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#f87171', margin: '4px 0 2px' }}>
                {money(sessionData.peakCostRs)}
              </div>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>Tarifa de ponta R$ 2,25/kWh</span>
            </div>

            <div style={{ background: 'rgba(74, 227, 165, 0.1)', border: '1px solid rgba(74, 227, 165, 0.35)', borderRadius: 10, padding: 12 }}>
              <span style={{ fontSize: 11, color: '#4ae3a5' }}>Valor Real Pago (Manhã Solar)</span>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#4ae3a5', margin: '4px 0 2px' }}>
                {money(sessionData.costRs)}
              </div>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>Tarifa vale {money(sessionData.costRs / sessionData.energyKwh)}/kWh</span>
            </div>
          </div>
        </div>

        {/* Resumo da Sessão */}
        <div className="rf-session-grid" style={{ margin: '0 0 22px' }}>
          <div className="rf-session-stat-box">
            <span>Bateria</span>
            <strong>{sessionData.socStart}% → {sessionData.socEnd}%</strong>
          </div>
          <div className="rf-session-stat-box">
            <span>Energia Total</span>
            <strong>{sessionData.energyKwh.toFixed(1).replace('.', ',')} kWh</strong>
          </div>
          <div className="rf-session-stat-box">
            <span>Duração</span>
            <strong>{sessionData.durationMin} min</strong>
          </div>
          <div className="rf-session-stat-box">
            <span>Total Pago</span>
            <strong style={{ color: '#4ae3a5' }}>{money(sessionData.costRs)}</strong>
          </div>
        </div>

        {/* Ações */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Button className="secondary full" onClick={() => setLocation('/app')}>
            Voltar ao Início
          </Button>
          <Button
            className="primary full"
            onClick={() => setLocation('/app/wallet')}
            style={{
              background: 'linear-gradient(135deg, #4ae3a5 0%, #38bdf8 100%)',
              color: '#080d12',
              fontWeight: 800,
            }}
          >
            <Wallet size={16} />
            Ver Anotação na Carteira
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
