import { useCallback, useMemo } from 'react';
import { useManagerAuth } from '@/context/ManagerAuthContext';
import { useManagerPref } from '@/lib/manager-store';
import { useOverview } from '@/pages/manager/hooks';
import {
  DEFAULT_RULES, evaluateAlerts,
  type Alert, type AlertAck, type AlertLogEntry, type RuleId, type Rules,
} from '@/lib/alerts';

/**
 * Alertas abertos/reconhecidos do gestor logado. Compartilhado pela barra lateral (contador),
 * pela visão geral e pela central de alertas — todos leem o mesmo /manager/overview em cache.
 */
export function useManagerAlerts() {
  const { user } = useManagerAuth();
  const overview = useOverview();
  const [storedRules, setRules] = useManagerPref<Partial<Rules>>('alert-rules', {});
  const [acks, setAcks] = useManagerPref<Record<string, AlertAck>>('alert-acks', {});
  const [log, setLog] = useManagerPref<AlertLogEntry[]>('alert-log', []);

  const rules = useMemo<Rules>(() => ({ ...DEFAULT_RULES, ...storedRules }) as Rules, [storedRules]);
  const alerts = useMemo(() => (overview.data ? evaluateAlerts(overview.data, rules) : []), [overview.data, rules]);
  const who = user?.name ?? 'gestor';

  const push = useCallback(
    (entry: Omit<AlertLogEntry, 'at' | 'by'>) =>
      setLog((prev) => [{ at: new Date().toISOString(), by: who, ...entry }, ...prev].slice(0, 60)),
    [setLog, who],
  );

  const acknowledge = useCallback(
    (list: Alert[]) => {
      if (!list.length) return;
      const at = new Date().toISOString();
      setAcks((prev) => ({ ...prev, ...Object.fromEntries(list.map((a) => [a.id, { at, by: who }])) }));
      list.forEach((a) => push({ action: 'reconheceu', alertId: a.id, title: a.title }));
    },
    [push, setAcks, who],
  );

  const reopen = useCallback(
    (a: Alert) => {
      setAcks((prev) => {
        const next = { ...prev };
        delete next[a.id];
        return next;
      });
      push({ action: 'reabriu', alertId: a.id, title: a.title });
    },
    [push, setAcks],
  );

  const updateRule = useCallback(
    (id: RuleId, patch: Partial<Rules[RuleId]>) => {
      setRules((prev) => ({ ...prev, [id]: { ...rules[id], ...patch } }));
      push({ action: 'alterou regra', alertId: `rule:${id}`, title: `${id}: ${JSON.stringify(patch)}` });
    },
    [push, rules, setRules],
  );

  const resetRules = useCallback(() => {
    setRules({});
    push({ action: 'restaurou regras padrão', alertId: 'rule:*', title: 'Regras de alerta' });
  }, [push, setRules]);

  const open = alerts.filter((a) => !acks[a.id]);
  const acknowledged = alerts.filter((a) => acks[a.id]);

  return { overview, alerts, open, acknowledged, acks, log, rules, acknowledge, reopen, updateRule, resetRules };
}
