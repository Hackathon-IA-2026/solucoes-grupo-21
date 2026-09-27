/**
 * Utilitários para Notificações Nativas no Celular (PWA)
 * Suporte completo para Android (Chrome/Edge/Samsung) e iOS 16.4+ (Safari PWA)
 */

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    localStorage.setItem('rioflex_notification_permission', permission);
    return permission;
  } catch (err) {
    console.error('[Notification] Erro ao solicitar permissão:', err);
    return 'denied';
  }
}

export async function sendNativeNotification(payload: NotificationPayload): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn('[Notification] Notificações não suportadas neste ambiente.');
    return false;
  }

  // Se a permissão ainda não foi concedida, solicitar
  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await requestNotificationPermission();
  }

  if (permission !== 'granted') {
    console.warn('[Notification] Permissão de notificação não concedida:', permission);
    return false;
  }

  const { title, body, url = '/app', tag = 'rio-flex-alert' } = payload;

  try {
    // 1. Tentar exibir via Service Worker Registration (Funciona com o app em segundo plano no celular)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200],
          tag,
          renotify: true,
          data: {
            url,
            timestamp: Date.now(),
          },
        });

        // Vibração nativa extra no dispositivo se suportado
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
        return true;
      }
    }

    // 2. Fallback via construtor Notification do navegador
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag,
      data: { url },
    });

    return true;
  } catch (err) {
    console.error('[Notification] Falha ao disparar notificação nativa:', err);
    return false;
  }
}

// ============================================================================
// CENÁRIOS PRONTOS DE ALERTA RIO-FLEX PARA DEMONSTRAÇÃO E USO REAL
// ============================================================================

export async function triggerSolarWindowAlert(): Promise<boolean> {
  return sendNativeNotification({
    title: 'Janela Solar Aberta no Rio',
    body: 'ONS e Light com 4,8 GW de excedente limpo. Desloque sua recarga agora e economize até R$ 25,65 fora do pico.',
    url: '/app/session',
    tag: 'solar-window',
  });
}

export async function triggerChargeStartedAlert(stationName = 'COPPE / UFRJ Eletroposto Solar'): Promise<boolean> {
  return sendNativeNotification({
    title: 'Recarga Iniciada com Sucesso',
    body: `Conectado ao ${stationName}. Tarifa de vale com 56% de economia ativada.`,
    url: '/app/session',
    tag: 'charge-started',
  });
}

export async function triggerChargeFinishedAlert(savingsRs = 25.65): Promise<boolean> {
  return sendNativeNotification({
    title: 'Recarga Concluída (80%)',
    body: `Veículo pronto! Você economizou R$ ${savingsRs.toFixed(2).replace('.', ',')} por deslocar a carga para a manhã.`,
    url: '/app/receipt',
    tag: 'charge-finished',
  });
}

export async function triggerPeakHourWarning(): Promise<boolean> {
  return sendNativeNotification({
    title: 'Alerta: Horário de Pico (18h às 21h)',
    body: 'Pico crítico de consumo no RJ. Evite recarregar agora para não pagar tarifa de ponta de R$ 2,25/kWh.',
    url: '/app',
    tag: 'peak-warning',
  });
}
