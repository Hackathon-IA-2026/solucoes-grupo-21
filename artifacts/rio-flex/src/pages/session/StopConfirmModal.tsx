import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { money } from '@/lib/format';

type StopConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentSoc: number;
  remainingMinutes: number;
  targetSoc: number;
  savingsRs?: number;
};

export function StopConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  currentSoc,
  remainingMinutes,
  targetSoc,
  savingsRs = 25.65,
}: StopConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="rf-modal-overlay" onClick={onClose}>
      <div className="rf-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="rf-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={20} color="#4ae3a5" />
            <h3 style={{ margin: 0, fontSize: 18, color: '#f8fafc' }}>Encerrar Recarga</h3>
          </div>
          <button
            type="button"
            className="rf-modal-close"
            onClick={onClose}
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 12px' }}>
          Sua bateria atingiu <b>{currentSoc}%</b> (meta: {targetSoc}%).
        </p>

        {savingsRs > 0 && (
          <div
            style={{
              background: 'rgba(74, 227, 165, 0.1)',
              border: '1px solid rgba(74, 227, 165, 0.3)',
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 16,
              fontSize: 13,
              color: '#f8fafc',
            }}
          >
            <span style={{ color: '#4ae3a5', fontWeight: 700 }}>
              Economia por Deslocamento de Carga:
            </span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#4ae3a5', margin: '2px 0' }}>
              {money(savingsRs)}
            </div>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              Esta economia será salva como anotação no extrato da sua carteira.
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <Button className="secondary full" onClick={onClose}>
            Continuar Carga
          </Button>
          <Button className="primary full" onClick={onConfirm}>
            Encerrar & Ver Recibo
          </Button>
        </div>
      </div>
    </div>
  );
}
