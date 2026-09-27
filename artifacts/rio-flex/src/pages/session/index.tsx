import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Sun,
  Zap,
  TrendingDown,
  Building,
  Info,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { StopConfirmModal } from '@/pages/session/StopConfirmModal';
import { money } from '@/lib/format';
import { useStations } from '@/api';
import { triggerChargeStartedAlert, triggerChargeFinishedAlert } from '@/lib/notifications';

interface TimeWindowOption {
  id: string;
  time: string;
  period: string;
  tariffRs: number;
  peakTariffRs: number;
  savingsEstRs: number;
  badge: string;
  badgeColor: string;
  solarSurplus: string;
  description: string;
}

const TIME_WINDOWS: TimeWindowOption[] = [
  {
    id: '10:30',
    time: '10:30',
    period: 'Manhã Solar (Recomendado)',
    tariffRs: 0.98,
    peakTariffRs: 2.25,
    savingsEstRs: 25.65,
    badge: 'Melhor Custo-Benefício',
    badgeColor: '#4ae3a5',
    solarSurplus: '4,8 GW Solar',
    description: 'Janela de maior geração solar no RJ. Tarifa econômica com desconto máximo.',
  },
  {
    id: '13:00',
    time: '13:00',
    period: 'Pico Solar Vespertino',
    tariffRs: 0.95,
    peakTariffRs: 2.25,
    savingsEstRs: 26.26,
    badge: 'Menor Tarifa do Dia',
    badgeColor: '#38bdf8',
    solarSurplus: '5,1 GW Solar',
    description: 'Máximo excedente fotovoltaico da rede SIN/Light. Recarga 100% limpa.',
  },
  {
    id: '15:30',
    time: '15:30',
    period: 'Janela Pré-Pico',
    tariffRs: 1.15,
    peakTariffRs: 2.25,
    savingsEstRs: 22.22,
    badge: 'Última Chamada Econômica',
    badgeColor: '#f59e0b',
    solarSurplus: '2,6 GW Solar',
    description: 'Última oportunidade antes do início do horário de sobrecarga da noite.',
  },
  {
    id: '19:00',
    time: '19:00',
    period: 'Pico Noturno da Light (Evitar)',
    tariffRs: 2.25,
    peakTariffRs: 2.25,
    savingsEstRs: 0.00,
    badge: 'Horário Mais Caro',
    badgeColor: '#ef4444',
    solarSurplus: '0 GW (Termelétricas)',
    description: 'Pico de consumo urbano no RJ. Sem incentivos de flexibilidade.',
  },
];

export default function SessionPage() {
  const [, setLocation] = useLocation();
  const { data: stationsList } = useStations();

  // Estados do Fluxo da Sessão: 'schedule' (Agendamento) -> 'scheduled' (Agendado) -> 'charging' (Carregando)
  const [sessionPhase, setSessionPhase] = useState<'schedule' | 'scheduled' | 'charging'>(() => {
    const saved = localStorage.getItem('rioflex_session_phase');
    if (saved === 'scheduled' || saved === 'charging') return saved;
    return 'schedule';
  });

  // Janela de horário escolhida
  const [selectedWindowId, setSelectedWindowId] = useState<string>('10:30');
  const selectedWindow = TIME_WINDOWS.find((w) => w.id === selectedWindowId) || TIME_WINDOWS[0];

  // Eletroposto escolhido
  const defaultStationName = stationsList?.[0]?.name || 'COPPE / UFRJ Eletroposto Solar';
  const [selectedStationName, setSelectedStationName] = useState<string>(defaultStationName);

  // Parâmetros da Carga Ativa
  const [currentSoc, setCurrentSoc] = useState<number>(35);
  const targetSoc = 80;
  const batteryCapacityKwh = 44.9; // BYD Dolphin
  const neededEnergyKwh = Number((((targetSoc - currentSoc) / 100) * batteryCapacityKwh).toFixed(1));

  const [energyDelivered, setEnergyDelivered] = useState<number>(14.8);
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(18);
  const [currentPowerKw] = useState<number>(60);

  // Cálculos financeiros reais de deslocamento de carga
  const currentCost = Number((energyDelivered * selectedWindow.tariffRs).toFixed(2));
  const peakCost = Number((energyDelivered * selectedWindow.peakTariffRs).toFixed(2));
  const currentSavingsRs = Number(Math.max(0, peakCost - currentCost).toFixed(2));

  // Modal de confirmação para encerrar
  const [isConfirmStopOpen, setIsConfirmStopOpen] = useState(false);

  // Persistir fase no localStorage
  useEffect(() => {
    localStorage.setItem('rioflex_session_phase', sessionPhase);
  }, [sessionPhase]);

  // Ação 1: Agendar Carregamento
  const handleSchedule = () => {
    setSessionPhase('scheduled');
  };

  // Ação 2: Iniciar Carga Imediata
  const handleStartChargingNow = () => {
    setSessionPhase('charging');
    // Disparar notificação nativa no celular se permitido
    triggerChargeStartedAlert(selectedStationName).catch(() => {});
  };

  // Ação 3: Simular avanço da bateria (+5%) na Demo
  const handleSimulateStep = () => {
    setCurrentSoc((prev) => {
      const nextSoc = Math.min(targetSoc, prev + 5);
      return nextSoc;
    });
    setEnergyDelivered((prev) => Number((prev + 2.2).toFixed(1)));
    setElapsedMinutes((prev) => prev + 3);
  };

  // Ação 4: Concluir e registrar economia na Carteira
  const handleConfirmStop = () => {
    const finalSavings = currentSavingsRs > 0 ? currentSavingsRs : 25.65;
    const finalCost = currentCost > 0 ? currentCost : 19.80;
    const finalEnergy = energyDelivered > 0 ? energyDelivered : 20.2;

    const completedRecord = {
      stationName: selectedStationName,
      date: `Hoje, ${selectedWindow.time}`,
      timeWindow: selectedWindow.period,
      energyKwh: finalEnergy,
      costRs: finalCost,
      savingsRs: finalSavings,
      peakCostRs: Number((finalCost + finalSavings).toFixed(2)),
      socStart: 35,
      socEnd: currentSoc,
      durationMin: elapsedMinutes,
    };

    // Salvar última sessão para a tela de recibo
    localStorage.setItem('rioflex_last_completed_session', JSON.stringify(completedRecord));

    // Salvar anotação na carteira
    try {
      const savedActivities = localStorage.getItem('rioflex_wallet_custom_activities');
      const list = savedActivities ? JSON.parse(savedActivities) : [];
      list.unshift({
        id: Date.now(),
        date: `Hoje, ${selectedWindow.time}`,
        station: selectedStationName,
        energyKwh: finalEnergy,
        cost: finalCost,
        bonusText: `Economizou ${money(finalSavings)}`,
        event: `Deslocamento de Carga (${selectedWindow.period})`,
      });
      localStorage.setItem('rioflex_wallet_custom_activities', JSON.stringify(list));

      // Atualizar saldo acumulado economizado
      const prevTotal = Number(localStorage.getItem('rioflex_wallet_total_savings') || '178.50');
      localStorage.setItem('rioflex_wallet_total_savings', (prevTotal + finalSavings).toFixed(2));
    } catch {
      // ignore
    }

    setSessionPhase('schedule');
    localStorage.removeItem('rioflex_session_phase');

    // Disparar notificação nativa de economia no celular
    triggerChargeFinishedAlert(finalSavings).catch(() => {});

    setLocation('/app/receipt');
  };

  return (
    <AppShell>
      <div className="rf-clean-session-container">
        {/* ========================================================= */}
        {/* ESTADO 1: AGENDAMENTO INTELIGENTE DA CARGA                 */}
        {/* ========================================================= */}
        {sessionPhase === 'schedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header da Etapa */}
            <div>
              <span className="rf-eyebrow">Etapa 3 • Planejamento Inteligente</span>
              <h1 className="rf-title" style={{ fontSize: 24, margin: '2px 0 4px' }}>
                Agendar Carregamento
              </h1>
              <p className="rf-subtitle" style={{ margin: 0 }}>
                Escolha o horário ideal para deslocar sua recarga e pagar muito menos na tarifa.
              </p>
            </div>

            {/* BOX: INDICAÇÃO DO SIN / LIGHT - QUANDO É UM BOM HORÁRIO */}
            <div
              className="rf-card"
              style={{
                background: 'linear-gradient(135deg, rgba(74, 227, 165, 0.12) 0%, rgba(56, 189, 248, 0.06) 100%)',
                border: '1px solid rgba(74, 227, 165, 0.35)',
                padding: '16px 18px',
                borderRadius: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Sun size={20} color="#4ae3a5" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                  Janela Recomendada Hoje: 10:00 às 15:30
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1', lineHeight: 1.45 }}>
                A rede SIN / Light opera com <b>4,8 GW de excedente solar limpo</b> no Rio de Janeiro neste período.
                Deslocar sua recarga para a manhã ou meio do dia garante <b>tarifa de vale com mais de 50% de desconto</b> em relação ao pico das 18h às 21h.
              </p>
            </div>

            {/* SELEÇÃO DO HORÁRIO E COMPARAÇÃO DE ECONOMIA */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Selecione o Horário para Deslocar a Carga
                </span>
                <span style={{ fontSize: 11, color: '#4ae3a5', fontWeight: 600 }}>
                  Economia calculada vs. Pico ONS
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {TIME_WINDOWS.map((win) => {
                  const isSelected = selectedWindowId === win.id;
                  return (
                    <div
                      key={win.id}
                      onClick={() => setSelectedWindowId(win.id)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 12,
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(74, 227, 165, 0.08)' : '#0d1318',
                        border: `1.5px solid ${isSelected ? '#4ae3a5' : '#1e2935'}`,
                        boxShadow: isSelected ? '0 0 20px rgba(74, 227, 165, 0.15)' : 'none',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            border: `2px solid ${isSelected ? '#4ae3a5' : '#64748b'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isSelected && (
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ae3a5' }} />
                          )}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ fontSize: 15, color: '#f8fafc' }}>{win.time}</strong>
                            <span style={{ fontSize: 13, color: '#cbd5e1' }}>— {win.period}</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            {win.description}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: win.tariffRs < 2 ? '#4ae3a5' : '#f87171' }}>
                          {money(win.tariffRs)}/kWh
                        </div>
                        {win.savingsEstRs > 0 ? (
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', marginTop: 2 }}>
                            Economiza ~{money(win.savingsEstRs)}
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>
                            Tarifa cheia de ponta
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SELEÇÃO DO ELETROPOSTO */}
            <div className="rf-card" style={{ padding: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Local da Recarga
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <Building size={18} color="#38bdf8" />
                <select
                  value={selectedStationName}
                  onChange={(e) => setSelectedStationName(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#141d26',
                    border: '1px solid #263848',
                    color: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <option value="COPPE / UFRJ Eletroposto Solar">COPPE / UFRJ Eletroposto Solar (Ilha do Fundão)</option>
                  <option value="Marina Flex Station">Marina Flex Station (Glória / Zona Sul)</option>
                  <option value="Hub Maricá Tarifa Zero V2G">Hub Maricá Tarifa Zero V2G</option>
                  <option value="Barra da Tijuca Park">Barra da Tijuca Park (Av. das Américas)</option>
                </select>
              </div>
            </div>

            {/* CARD COMPARATIVO DE IMPACTO NO BOLSO */}
            <div
              className="rf-card"
              style={{
                background: '#0d1318',
                border: '1px solid #1e293b',
                padding: 16,
                borderRadius: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                  Simulação da Recarga (35% → 80% • 20,2 kWh)
                </span>
                <span className="rf-badge green">Deslocamento Ativo</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: 12, borderRadius: 10 }}>
                  <span style={{ fontSize: 11, color: '#f87171' }}>Se carregar às 19h (Pico)</span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#f87171', margin: '4px 0 2px' }}>
                    {money(20.2 * 2.25)}
                  </div>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>Tarifa de ponta R$ 2,25/kWh</span>
                </div>

                <div style={{ background: 'rgba(74, 227, 165, 0.1)', border: '1px solid rgba(74, 227, 165, 0.35)', padding: 12, borderRadius: 10 }}>
                  <span style={{ fontSize: 11, color: '#4ae3a5' }}>Na Janela Agendada ({selectedWindow.time})</span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#4ae3a5', margin: '4px 0 2px' }}>
                    {money(20.2 * selectedWindow.tariffRs)}
                  </div>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>Tarifa de vale {money(selectedWindow.tariffRs)}/kWh</span>
                </div>
              </div>

              {selectedWindow.savingsEstRs > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '10px 12px',
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <TrendingDown size={16} />
                  <span>
                    <b>Economia direta:</b> Você deixa de gastar <b>{money(selectedWindow.savingsEstRs)}</b> por antecipar sua recarga para este horário.
                  </span>
                </div>
              )}
            </div>

            {/* BOTÃO PRINCIPAL DE AGENDAMENTO */}
            <Button
              className="primary full"
              onClick={handleSchedule}
              style={{
                fontSize: 15,
                fontWeight: 700,
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Calendar size={18} />
              Agendar Carregamento para {selectedWindow.time}
            </Button>
          </div>
        )}

        {/* ========================================================= */}
        {/* ESTADO 2: CARGA AGENDADA COM BOTÃO IMEDIATO PARA DEMO      */}
        {/* ========================================================= */}
        {sessionPhase === 'scheduled' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <span className="rf-eyebrow">Etapa 3 • Agendamento Confirmado</span>
              <h1 className="rf-title" style={{ fontSize: 24, margin: '2px 0 4px' }}>
                Recarga Programada
              </h1>
              <p className="rf-subtitle" style={{ margin: 0 }}>
                Seu veículo aguardará a janela de maior geração solar para recarregar com economia.
              </p>
            </div>

            {/* Card de Agendamento Confirmado */}
            <div
              className="rf-card"
              style={{
                background: 'linear-gradient(135deg, rgba(74, 227, 165, 0.12) 0%, rgba(56, 189, 248, 0.08) 100%)',
                border: '1.5px solid #4ae3a5',
                boxShadow: '0 0 25px rgba(74, 227, 165, 0.2)',
                padding: 20,
                borderRadius: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'rgba(74, 227, 165, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4ae3a5',
                  }}
                >
                  <Clock size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, color: '#f8fafc', fontWeight: 800 }}>
                    Hoje às {selectedWindow.time}
                  </h3>
                  <span style={{ fontSize: 12, color: '#4ae3a5', fontWeight: 600 }}>
                    {selectedWindow.period}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 14 }}>
                Local: <b>{selectedStationName}</b>
                <br />
                Meta de carga: <b>35% → 80% (~20,2 kWh)</b>
              </div>

              {/* Destaque de Economia */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(74, 227, 165, 0.3)',
                  padding: 14,
                  borderRadius: 12,
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Economia por Deslocamento de Carga
                </span>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#4ae3a5', margin: '4px 0 2px' }}>
                  {money(selectedWindow.savingsEstRs)}
                </div>
                <span style={{ fontSize: 11, color: '#cbd5e1' }}>
                  Valor que deixará de ser pago por carregar na janela solar em vez do pico das 19h.
                </span>
              </div>
            </div>

            <Button
              className="primary full"
              onClick={handleStartChargingNow}
              style={{
                fontSize: 16,
                fontWeight: 800,
                padding: '16px',
                background: 'linear-gradient(135deg, #4ae3a5 0%, #38bdf8 100%)',
                color: '#080d12',
                boxShadow: '0 0 25px rgba(74, 227, 165, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Começar Carregamento Agora
            </Button>

            <Button
              className="secondary full"
              onClick={() => setSessionPhase('schedule')}
              style={{ fontSize: 13 }}
            >
              <RotateCcw size={14} />
              Alterar Horário ou Eletroposto
            </Button>
          </div>
        )}

        {/* ========================================================= */}
        {/* ESTADO 3: CARREGANDO (ACTIVE CHARGING)                     */}
        {/* ========================================================= */}
        {sessionPhase === 'charging' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header com Status Ativo */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span className="rf-eyebrow">Etapa 3 • Sessão em Andamento</span>
                <h1 className="rf-title" style={{ fontSize: 22, margin: '2px 0 0' }}>
                  {selectedStationName}
                </h1>
                <p className="rf-subtitle" style={{ margin: 0 }}>
                  Conector CCS2 DC Ultrarrápido • Janela Deslocada ({selectedWindow.time})
                </p>
              </div>
              <span className="rf-badge green" style={{ padding: '4px 10px' }}>
                <span className="rf-uber-status-dot-green" style={{ display: 'inline-block', marginRight: 6 }} />
                Carregando
              </span>
            </div>

            {/* Medidor Circular do SoC */}
            <div className="rf-meter-card">
              <div
                className="rf-battery-circle"
                style={{
                  background: `conic-gradient(#4ae3a5 0% ${currentSoc}%, #1e2935 ${currentSoc}% 100%)`,
                }}
              >
                <div className="rf-battery-circle-inner">
                  <span className="rf-battery-soc">{currentSoc}%</span>
                  <span className="rf-battery-meta">meta: {targetSoc}%</span>
                </div>
              </div>

              <div style={{ width: '100%', maxWidth: 360, margin: '0 auto' }}>
                <div className="rf-progress" style={{ height: 6 }}>
                  <span style={{ width: `${currentSoc}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 11, marginTop: 6 }}>
                  <span>Início: 35%</span>
                  <span>Meta recomendada: {targetSoc}%</span>
                </div>
              </div>

              {/* CARD DESTAQUE: ECONOMIA POR DESLOCAMENTO EM TEMPO REAL */}
              <div
                style={{
                  width: '100%',
                  marginTop: 18,
                  background: 'linear-gradient(135deg, rgba(74, 227, 165, 0.14) 0%, rgba(56, 189, 248, 0.08) 100%)',
                  border: '1px solid #4ae3a5',
                  borderRadius: 14,
                  padding: '14px 16px',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: '#4ae3a5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Economia por Deslocamento de Carga
                </span>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#4ae3a5', margin: '2px 0 2px' }}>
                  {money(currentSavingsRs > 0 ? currentSavingsRs : 25.65)}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 }}>
                  Você adiantou sua recarga para a janela de excedente solar ({selectedWindow.time}) em vez de carregar no pico das 19h.
                  Essa economia será anotada e salva na sua carteira ao encerrar.
                </p>
              </div>

              {/* 4 Métricas ao Vivo */}
              <div className="rf-session-grid" style={{ width: '100%', marginTop: 16 }}>
                <div className="rf-session-stat-box">
                  <span>Energia Injetada</span>
                  <strong>{energyDelivered.toFixed(1).replace('.', ',')} kWh</strong>
                </div>
                <div className="rf-session-stat-box">
                  <span>Potência da Carga</span>
                  <strong>{currentPowerKw} kW DC</strong>
                </div>
                <div className="rf-session-stat-box">
                  <span>Tempo de Recarga</span>
                  <strong>{elapsedMinutes} min</strong>
                </div>
                <div className="rf-session-stat-box">
                  <span>Custo até Agora</span>
                  <strong style={{ color: '#4ae3a5' }}>{money(currentCost)}</strong>
                </div>
              </div>

              {/* Ações da Sessão */}
              <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 18 }}>
                <Button className="secondary full" onClick={handleSimulateStep} style={{ fontSize: 13 }}>
                  <Zap size={14} />
                  Simular +5% Bateria
                </Button>
                <Button
                  className="danger full"
                  onClick={() => setIsConfirmStopOpen(true)}
                  style={{ fontSize: 13, fontWeight: 700 }}
                >
                  Encerrar Carga
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Encerramento */}
      <StopConfirmModal
        isOpen={isConfirmStopOpen}
        onClose={() => setIsConfirmStopOpen(false)}
        onConfirm={handleConfirmStop}
        currentSoc={currentSoc}
        remainingMinutes={12}
        targetSoc={targetSoc}
        savingsRs={currentSavingsRs > 0 ? currentSavingsRs : 25.65}
      />
    </AppShell>
  );
}
