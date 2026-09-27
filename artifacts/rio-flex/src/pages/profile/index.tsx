import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  BatteryCharging, Bell, Car, Check, Download, Smartphone, Zap, ChevronRight, Send, Volume2, ShieldCheck,
} from 'lucide-react';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  triggerSolarWindowAlert,
  triggerChargeFinishedAlert,
} from '@/lib/notifications';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { VehicleModal } from '@/pages/profile/VehicleModal';
import { initialVehicle } from '@/data/vehicles';
import { usePwa } from '@/context/PwaContext';
import { useAuth } from '@/context/AuthContext';
import type { Vehicle } from '@/types/vehicle';

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const [vehicle, setVehicle] = useState<Vehicle>(() => {
    try {
      const saved = localStorage.getItem('rioflex_user_vehicle');
      return saved ? JSON.parse(saved) : initialVehicle;
    } catch {
      return initialVehicle;
    }
  });
  const [targetSoc, setTargetSoc] = useState<number>(80);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

  const { isInstalled, promptInstall } = usePwa();

  // Toggles de Flexibilidade
  const [enableFlexEvents, setEnableFlexEvents] = useState(true);
  const [enableModulation, setEnableModulation] = useState(true);
  const [enableV2G, setEnableV2G] = useState(false);

  // Toggles de Notificação & Privacidade
  const [notifySolarWindows, setNotifySolarWindows] = useState(true);
  const [notifyPeakHours, setNotifyPeakHours] = useState(true);
  const [shareTelemetry, setShareTelemetry] = useState(true);

  // Estado das Notificações Nativas no Celular (PWA)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    return getNotificationPermission();
  });
  const [notificationFeedback, setNotificationFeedback] = useState<string>('');

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      setNotificationFeedback('Notificações ativadas com sucesso. Enviando alerta de teste...');
      await triggerSolarWindowAlert();
    } else if (perm === 'denied') {
      setNotificationFeedback('Permissão negada pelo navegador. Permita nas configurações de site do celular.');
    }
  };

  const handleTestSolarAlert = async () => {
    const ok = await triggerSolarWindowAlert();
    if (ok) {
      setNotificationFeedback('Alerta da Janela Solar disparado para o seu celular.');
    } else {
      handleRequestPermission();
    }
  };

  const handleTestChargeAlert = async () => {
    const ok = await triggerChargeFinishedAlert(25.65);
    if (ok) {
      setNotificationFeedback('Alerta de Recarga Concluída disparado para o seu celular.');
    } else {
      handleRequestPermission();
    }
  };

  const handleSelectVehicle = (newVehicle: Vehicle) => {
    setVehicle(newVehicle);
    try {
      localStorage.setItem('rioflex_user_vehicle', JSON.stringify(newVehicle));
    } catch {
      // ignore
    }
  };

  return (
    <AppShell>
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <span className="rf-eyebrow">Configurações & Regras Pessoais</span>
          <h1 className="rf-title" style={{ fontSize: 24, margin: '2px 0 0' }}>Minha Conta Rio Flex</h1>
          <p className="rf-subtitle">Defina suas preferências de autonomia, bateria e limites de flexibilidade.</p>
        </div>

        {/* Cartão de Identificação do Motorista com Cognito/Google */}
        <div className="rf-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid #4ae3a5', objectFit: 'cover' }}
                />
              ) : (
                <div className="rf-avatar" style={{ width: 48, height: 48, fontSize: 16 }}>
                  {user?.name?.slice(0, 2).toUpperCase() || 'RF'}
                </div>
              )}
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: '#f8fafc' }}>{user?.name || 'Condutor Rio-Flex'}</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                  {user?.email || 'condutor@rioflex.app'} · {user?.city || 'Rio de Janeiro, RJ'}
                </p>
              </div>
            </div>
            <span
              className={`rf-badge ${user?.provider === 'google' ? 'cyan' : 'green'}`}
              style={{ fontSize: 11, padding: '3px 10px' }}
            >
              {user?.provider === 'google' ? 'Google OAuth' : user?.provider === 'cognito' ? 'AWS Cognito' : 'Modo Demo'}
            </span>
          </div>
        </div>

        {/* OPÇÃO PWA (Aplicativo no Celular) */}
        <div className="rf-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Smartphone size={18} color="#4ae3a5" />
              <h3 style={{ margin: 0, fontSize: 15, color: '#f8fafc' }}>Aplicativo no Celular</h3>
            </div>
            {isInstalled ? (
              <span className="rf-badge green" style={{ fontSize: 10, padding: '2px 8px' }}>
                <Check size={12} /> Instalado
              </span>
            ) : (
              <span className="rf-badge blue" style={{ fontSize: 10, padding: '2px 8px' }}>
                Disponível
              </span>
            )}
          </div>

          <p style={{ margin: '0 0 14px', fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 }}>
            Instale o Rio Flex na tela inicial do seu celular para navegação em tela cheia, inicialização instantânea e menor consumo de dados móveis.
          </p>

          {!isInstalled ? (
            <button
              type="button"
              className="rf-btn primary full"
              onClick={promptInstall}
            >
              <Download size={14} />
              Instalar Aplicativo no Celular
            </button>
          ) : (
            <div style={{ fontSize: 12, color: '#4ae3a5', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={14} />
              Você já está utilizando a versão de aplicativo instalada.
            </div>
          )}
        </div>

        {/* 1. SEU VEÍCULO CONECTADO */}
        <div className="rf-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Car size={18} color="#38bdf8" />
              <h3 style={{ margin: 0, fontSize: 15, color: '#f8fafc' }}>Veículo Conectado</h3>
            </div>
            <button
              type="button"
              className="rf-btn secondary small"
              onClick={() => setIsVehicleModalOpen(true)}
            >
              Trocar de Veículo
            </button>
          </div>

          <div style={{ background: '#0e141a', border: '1px solid #1f2b36', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
              {vehicle.manufacturer} {vehicle.model}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              Bateria {vehicle.batteryCapacityKwh} kWh · Conector {vehicle.connector} (Carga rápida até {vehicle.maxDcPowerKw} kW) · Autonomia estimada ~{vehicle.estimatedRangeKm} km
            </div>
          </div>
        </div>

        {/* 2. REGRAS PESSOAIS DE RECARGA */}
        <div className="rf-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <BatteryCharging size={18} color="#4ae3a5" />
            <h3 style={{ margin: 0, fontSize: 15, color: '#f8fafc' }}>Preferências de Bateria</h3>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="rf-label" style={{ marginBottom: 6 }}>
              Meta de Carga Padrão (Preserva a vida útil da bateria)
            </label>
            <div className="rf-segmented-toggle" style={{ width: '100%', justifyContent: 'space-between' }}>
              {[70, 80, 90, 100].map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`rf-segmented-btn ${targetSoc === val ? 'active' : ''}`}
                  onClick={() => setTargetSoc(val)}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {val}% {val === 80 && '(Ideal)'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #1c2732' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#f8fafc' }}>Reserva Mínima de Emergência</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Nunca descarregar abaixo deste limite</div>
            </div>
            <span className="rf-badge blue">20% SOC</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #1c2732' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#f8fafc' }}>Prioridade de Recomendação</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Buscar menor custo e créditos Rio Flex</div>
            </div>
            <span className="rf-badge green">Econômica & Flexível</span>
          </div>
        </div>

        {/* 3. REGRAS DE FLEXIBILIDADE VPP */}
        <div className="rf-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Zap size={18} color="#c084fc" />
            <h3 style={{ margin: 0, fontSize: 15, color: '#f8fafc' }}>Regras de Flexibilidade Energética</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#f8fafc' }}>Participar de Eventos Rio Flex</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Receber bônus financeiro ao recarregar fora dos picos da rede</div>
              </div>
              <label className="rf-switch-toggle">
                <input
                  type="checkbox"
                  checked={enableFlexEvents}
                  onChange={(e) => setEnableFlexEvents(e.target.checked)}
                />
                <span className="rf-switch-slider" />
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, borderTop: '1px solid #1c2732', paddingTop: 10 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#f8fafc' }}>Permitir Modulação Temporária de Potência</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Ajustar potência por até 15 min em troca de créditos extras</div>
              </div>
              <label className="rf-switch-toggle">
                <input
                  type="checkbox"
                  checked={enableModulation}
                  onChange={(e) => setEnableModulation(e.target.checked)}
                />
                <span className="rf-switch-slider" />
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, borderTop: '1px solid #1c2732', paddingTop: 10 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#f8fafc' }}>Piloto V2G (Vehicle-to-Grid)</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Fornecer energia do carro para a rede em emergências (Piloto COPPE)</div>
              </div>
              <label className="rf-switch-toggle">
                <input
                  type="checkbox"
                  checked={enableV2G}
                  onChange={(e) => setEnableV2G(e.target.checked)}
                />
                <span className="rf-switch-slider" />
              </label>
            </div>
          </div>
        </div>

        {/* 4. NOTIFICAÇÕES NATIVAS NO CELULAR (PWA) */}
        <div
          className="rf-card"
          style={{
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(74, 227, 165, 0.05) 100%)',
            border: '1.5px solid rgba(56, 189, 248, 0.35)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Smartphone size={20} color="#38bdf8" />
              <h3 style={{ margin: 0, fontSize: 16, color: '#f8fafc', fontWeight: 700 }}>
                Notificações Nativas no Celular (PWA)
              </h3>
            </div>

            <span
              className={`rf-badge ${
                notificationPermission === 'granted'
                  ? 'green'
                  : notificationPermission === 'denied'
                  ? 'red'
                  : 'yellow'
              }`}
              style={{ fontSize: 11, padding: '3px 8px' }}
            >
              {notificationPermission === 'granted'
                ? 'Ativas no Dispositivo'
                : notificationPermission === 'denied'
                ? 'Bloqueadas no Navegador'
                : 'Permissão Pendente'}
            </span>
          </div>

          <p style={{ margin: '0 0 14px', fontSize: 13, color: '#cbd5e1', lineHeight: 1.45 }}>
            Receba alertas sonoros e na tela de bloqueio do seu smartphone quando a <b>Janela Solar abrir (10h às 15h30)</b>, quando sua <b>recarga terminar</b> ou quando o <b>ONS emitir um sinal de pico</b>. Funciona nativamente no Android e no iPhone (iOS 16.4+).
          </p>

          {notificationFeedback && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(74, 227, 165, 0.12)',
                border: '1px solid rgba(74, 227, 165, 0.3)',
                fontSize: 12,
                color: '#4ae3a5',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <ShieldCheck size={16} />
              <span>{notificationFeedback}</span>
            </div>
          )}

          {notificationPermission !== 'granted' ? (
            <Button
              className="primary full"
              onClick={handleRequestPermission}
              style={{
                padding: '14px',
                fontSize: 14,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #38bdf8 0%, #4ae3a5 100%)',
                color: '#080d12',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Bell size={16} />
              Permitir Notificações no Celular
            </Button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                <Button
                  className="secondary full"
                  onClick={handleTestSolarAlert}
                  style={{ fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Send size={14} color="#f7c65c" />
                  Testar Alerta Janela Solar
                </Button>

                <Button
                  className="secondary full"
                  onClick={handleTestChargeAlert}
                  style={{ fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Send size={14} color="#4ae3a5" />
                  Testar Alerta Recarga Concluída
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 5. PREFERÊNCIAS GERAIS DE NOTIFICAÇÃO */}
        <div className="rf-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Bell size={18} color="#38bdf8" />
            <h3 style={{ margin: 0, fontSize: 15, color: '#f8fafc' }}>Canais de Notificação & Privacidade</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#f8fafc' }}>Alertas de Janelas Solares</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Avisar quando a tarifa estiver mais baixa com créditos ativos</div>
              </div>
              <label className="rf-switch-toggle">
                <input
                  type="checkbox"
                  checked={notifySolarWindows}
                  onChange={(e) => setNotifySolarWindows(e.target.checked)}
                />
                <span className="rf-switch-slider" />
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, borderTop: '1px solid #1c2732', paddingTop: 10 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#f8fafc' }}>Avisos de Horário de Pico</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Lembrete diário às 17h45 para evitar recargas até 21h</div>
              </div>
              <label className="rf-switch-toggle">
                <input
                  type="checkbox"
                  checked={notifyPeakHours}
                  onChange={(e) => setNotifyPeakHours(e.target.checked)}
                />
                <span className="rf-switch-slider" />
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, borderTop: '1px solid #1c2732', paddingTop: 10 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#f8fafc' }}>Telemetria Anônima com COPPE/UFRJ</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Compartilhar dados agregados para pesquisa científica de rede</div>
              </div>
              <label className="rf-switch-toggle">
                <input
                  type="checkbox"
                  checked={shareTelemetry}
                  onChange={(e) => setShareTelemetry(e.target.checked)}
                />
                <span className="rf-switch-slider" />
              </label>
            </div>
          </div>
        </div>

        <div className="rf-card">
          <Button
            className="secondary full"
            style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            onClick={() => {
              logout();
              setLocation('/login');
            }}
          >
            Sair da Conta
          </Button>
        </div>
      </div>

      {/* Modais do Perfil */}
      <VehicleModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        currentVehicle={vehicle}
        onSelect={(newVehicle) => setVehicle(newVehicle)}
      />
    </AppShell>
  );
}
