import type { HourlyForecast } from '@/types/forecast';

// Fallback offline: curva de carga horária REAL do Brasil (soma dos 4
// subsistemas do ONS: S+NE+N+SECO), média jun-set/2026, coletada pelo
// pipeline rj-energy-datalake (github.com/EstevezCodando/EstevezCodando-rj-energy-datalake).
// Usada apenas se a chamada a /api/grid/forecast falhar — ver src/api/index.ts.
// `solarGw` é sempre 0: este datalake não coleta geração solar, então nunca
// inventamos esse valor. O pico real (19h, ~93.8 GW) define a janela 18h-21h.
export const hourlyForecast: HourlyForecast[] = [
  { hour: 0, label: '00h', demandGw: 77.58, solarGw: 0.0, status: 'normal' },
  { hour: 1, label: '01h', demandGw: 73.4, solarGw: 0.0, status: 'normal' },
  { hour: 2, label: '02h', demandGw: 70.51, solarGw: 0.0, status: 'normal' },
  { hour: 3, label: '03h', demandGw: 68.79, solarGw: 0.0, status: 'normal' },
  { hour: 4, label: '04h', demandGw: 68.11, solarGw: 0.0, status: 'normal' },
  { hour: 5, label: '05h', demandGw: 68.89, solarGw: 0.0, status: 'normal' },
  { hour: 6, label: '06h', demandGw: 71.41, solarGw: 0.0, status: 'normal' },
  { hour: 7, label: '07h', demandGw: 73.84, solarGw: 0.0, status: 'normal' },
  { hour: 8, label: '08h', demandGw: 77.19, solarGw: 0.0, status: 'normal' },
  { hour: 9, label: '09h', demandGw: 79.56, solarGw: 0.0, status: 'normal' },
  { hour: 10, label: '10h', demandGw: 81.51, solarGw: 0.0, status: 'normal' },
  { hour: 11, label: '11h', demandGw: 83.64, solarGw: 0.0, status: 'normal' },
  { hour: 12, label: '12h', demandGw: 83.46, solarGw: 0.0, status: 'normal' },
  { hour: 13, label: '13h', demandGw: 82.81, solarGw: 0.0, status: 'normal' },
  { hour: 14, label: '14h', demandGw: 84.29, solarGw: 0.0, status: 'normal' },
  { hour: 15, label: '15h', demandGw: 84.85, solarGw: 0.0, status: 'normal' },
  { hour: 16, label: '16h', demandGw: 86.03, solarGw: 0.0, status: 'normal' },
  { hour: 17, label: '17h', demandGw: 87.55, solarGw: 0.0, status: 'normal' },
  { hour: 18, label: '18h', demandGw: 91.52, solarGw: 0.0, status: 'pico' },
  { hour: 19, label: '19h', demandGw: 93.81, solarGw: 0.0, status: 'pico' },
  { hour: 20, label: '20h', demandGw: 91.74, solarGw: 0.0, status: 'pico' },
  { hour: 21, label: '21h', demandGw: 89.95, solarGw: 0.0, status: 'pico' },
  { hour: 22, label: '22h', demandGw: 87.23, solarGw: 0.0, status: 'normal' },
  { hour: 23, label: '23h', demandGw: 82.71, solarGw: 0.0, status: 'normal' },
];
