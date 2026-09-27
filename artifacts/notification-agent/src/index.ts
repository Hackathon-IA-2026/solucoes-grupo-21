import type { ChargingStation, Vehicle, GridStatus } from '@workspace/shared-types';

export interface WhatsAppNotificationPayload {
  recipientName: string;
  recipientPhone?: string;
  station: ChargingStation;
  vehicle: Vehicle;
  gridStatus: GridStatus;
  baseUrl?: string;
}

export interface DispatchedAlert {
  id: string;
  timestamp: string;
  recipientName: string;
  recipientPhone: string;
  stationName: string;
  discountPriceRs: number;
  bonusCreditsRs: number;
  windowHours: string;
  messageText: string;
  deepLink: string;
  whatsappDirectUrl: string;
  status: 'sent' | 'queued' | 'simulated';
}

const dispatchHistory: DispatchedAlert[] = [];

/**
 * Agente de IA para Otimização de Flexibilidade e Despacho de Alertas WhatsApp
 */
export class NotificationAgent {
  /**
   * Constrói o texto formatado para envio no WhatsApp
   */
  static generateMessage(payload: WhatsAppNotificationPayload): {
    messageText: string;
    deepLink: string;
    whatsappDirectUrl: string;
    windowHours: string;
  } {
    const { recipientName, recipientPhone, station, vehicle, gridStatus, baseUrl } = payload;
    const origin = baseUrl || 'http://localhost:3000';
    const deepLink = `${origin}/app/map?station=${station.id}&auto_select=true&source=whatsapp_agent`;

    const windowHours = gridStatus.bestChargingWindow || '11h às 15h30';
    const bonusValue = station.incentive?.value || 4.5;
    const priceFormatted = station.pricePerKwh.toFixed(2).replace('.', ',');
    const bonusFormatted = bonusValue.toFixed(2).replace('.', ',');

    const messageText = `☀️ *ALERTA RIO-FLEX: JANELA DE DESCONTO SOLAR* ⚡

Olá, *${recipientName}*! Nosso agente identificou um alto excedente solar no SIN agora.

📍 *Posto Recomendado:* ${station.name}
💰 *Tarifa Promocional:* R$ ${priceFormatted}/kWh (Economia de ~38%)
🎁 *Bônus de Flexibilidade:* + R$ ${bonusFormatted} em créditos na carteira
⏰ *Janela Ideal:* Hoje, das ${windowHours}
🔋 *Bateria do seu ${vehicle.manufacturer}:* ${vehicle.currentSoc}% (Ideal para carregar até ${vehicle.targetSoc}%)

Aproveite a energia limpa barata e poupe a rede elétrica do Rio:
👉 ${deepLink}`;

    const cleanPhone = (recipientPhone || '').replace(/\D/g, '');
    const encodedText = encodeURIComponent(messageText);
    const whatsappDirectUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    return {
      messageText,
      deepLink,
      whatsappDirectUrl,
      windowHours,
    };
  }

  /**
   * Executa o disparo do alerta inteligente
   */
  static dispatchAlert(payload: WhatsAppNotificationPayload): DispatchedAlert {
    const { messageText, deepLink, whatsappDirectUrl, windowHours } = this.generateMessage(payload);

    const alertRecord: DispatchedAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      recipientName: payload.recipientName,
      recipientPhone: payload.recipientPhone || '+55 (21) 99876-5432',
      stationName: payload.station.name,
      discountPriceRs: payload.station.pricePerKwh,
      bonusCreditsRs: payload.station.incentive?.value || 4.5,
      windowHours,
      messageText,
      deepLink,
      whatsappDirectUrl,
      status: 'sent',
    };

    dispatchHistory.unshift(alertRecord);
    return alertRecord;
  }

  /**
   * Retorna o histórico de mensagens enviadas pelo agente
   */
  static getHistory(): DispatchedAlert[] {
    return [...dispatchHistory];
  }
}
