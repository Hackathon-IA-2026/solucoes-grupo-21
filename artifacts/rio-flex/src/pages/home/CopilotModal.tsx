import { useState } from 'react';
import { Send, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/context/AuthContext';
import { askCopilot, type CopilotMessage } from '@/api';

type CopilotModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type ChatEntry = { role: 'user' | 'assistant'; text: string };

export function CopilotModal({ isOpen, onClose }: CopilotModalProps) {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  // Só usuários com sessão real do Cognito (login/Google) têm accessToken —
  // o Modo Demo nunca gera um, então o Copilot fica bloqueado nesse caso.
  const hasRealToken = Boolean(user?.accessToken);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || isSending) return;

    const priorHistory: CopilotMessage[] = messages.map((m) => ({
      role: m.role,
      content: [{ text: m.text }],
    }));

    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setInput('');
    setIsSending(true);

    const result = await askCopilot(question, priorHistory);

    setMessages((prev) => [
      ...prev,
      { role: 'assistant', text: result.error ? `Atenção: ${result.error}` : result.answer },
    ]);
    setIsSending(false);
  };

  return (
    <div className="rf-modal-overlay" onClick={onClose}>
      <div
        className="rf-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column', maxHeight: '82vh' }}
      >
        <div className="rf-modal-header">
          <div>
            <div className="rf-badge blue" style={{ fontSize: 10, padding: '2px 8px', marginBottom: 6 }}>
              Bedrock · Dados Reais do ONS
            </div>
            <h3 style={{ margin: 0, fontSize: 18, color: '#f8fafc' }}>Rio-Flex Copilot</h3>
          </div>
          <button type="button" className="rf-modal-close" onClick={onClose} title="Fechar">
            <X size={18} />
          </button>
        </div>

        {!hasRealToken ? (
          <p style={{ fontSize: 13, color: '#f7c65c', lineHeight: 1.5, margin: '8px 0 4px' }}>
            O Copilot exige uma conta real (login ou cadastro via Amazon Cognito ou Google). O Modo
            Demo não gera token de autenticação, então esta função fica indisponível nele.
          </p>
        ) : (
          <>
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                margin: '8px 0 12px',
                minHeight: 140,
              }}
            >
              {messages.length === 0 && (
                <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                  Pergunte, por exemplo: "Qual o impacto no pico de demanda se a frota carregar sem
                  controle em 2035?" ou "Quanto a curva do RJ sobe às 19h?"
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    background: m.role === 'user' ? 'rgba(56, 189, 248, 0.15)' : '#141d26',
                    border: `1px solid ${m.role === 'user' ? 'rgba(56, 189, 248, 0.3)' : '#1f2b36'}`,
                    borderRadius: 10,
                    padding: '8px 12px',
                    fontSize: 13,
                    color: '#e2e8f0',
                    maxWidth: '85%',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {m.text}
                </div>
              ))}
              {isSending && <div style={{ fontSize: 12, color: '#94a3b8' }}>Consultando dados reais…</div>}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Pergunte sobre a rede ou a frota de VEs..."
                style={{
                  flex: 1,
                  background: '#0e141a',
                  border: '1px solid #1f2b36',
                  borderRadius: 8,
                  padding: '10px 12px',
                  color: '#f8fafc',
                  fontSize: 13,
                }}
              />
              <Button className="primary" onClick={handleSend} disabled={isSending || !input.trim()}>
                <Send size={15} />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
