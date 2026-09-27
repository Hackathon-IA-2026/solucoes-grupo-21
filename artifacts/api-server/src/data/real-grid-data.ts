/**
 * Curva de carga horária REAL — coletada do ONS (Operador Nacional do Sistema
 * Elétrico) pelo pipeline `rj-energy-datalake`
 * (https://github.com/EstevezCodando/EstevezCodando-rj-energy-datalake).
 *
 * NÃO é dado sintético. `rj`: área geoelétrica RJ do ONS. `brasil`: soma real
 * dos 4 subsistemas do ONS (S+NE+N+SECO) — `cod_areacarga=SIN` existe na API
 * do ONS mas nunca é populado, confirmado por observação direta.
 *
 * Período coberto: 2026-06-01 a 2026-09-25 (média por hora do dia, todas as
 * datas). Regenerar rodando `python -m rj_energy build-gold` no repositório do
 * datalake e reexportando `data/gold/{rj,brasil}_average_24h.csv`.
 *
 * NÃO inclui geração solar real (esse dado não está neste datalake) — nunca
 * inventar um valor de geração solar aqui.
 */

export interface RealHourlyLoad {
  hour: number;
  avgMw: number;
  avgGw: number;
}

export const REAL_HOURLY_LOAD_RJ: RealHourlyLoad[] = [
  { hour: 0, avgMw: 5226.4, avgGw: 5.226 },
  { hour: 1, avgMw: 4984.7, avgGw: 4.985 },
  { hour: 2, avgMw: 4829.6, avgGw: 4.83 },
  { hour: 3, avgMw: 4728.0, avgGw: 4.728 },
  { hour: 4, avgMw: 4676.8, avgGw: 4.677 },
  { hour: 5, avgMw: 4705.8, avgGw: 4.706 },
  { hour: 6, avgMw: 4855.9, avgGw: 4.856 },
  { hour: 7, avgMw: 4968.3, avgGw: 4.968 },
  { hour: 8, avgMw: 5179.6, avgGw: 5.18 },
  { hour: 9, avgMw: 5341.2, avgGw: 5.341 },
  { hour: 10, avgMw: 5456.3, avgGw: 5.456 },
  { hour: 11, avgMw: 5570.5, avgGw: 5.57 },
  { hour: 12, avgMw: 5645.0, avgGw: 5.645 },
  { hour: 13, avgMw: 5617.8, avgGw: 5.618 },
  { hour: 14, avgMw: 5637.6, avgGw: 5.638 },
  { hour: 15, avgMw: 5641.8, avgGw: 5.642 },
  { hour: 16, avgMw: 5679.9, avgGw: 5.68 },
  { hour: 17, avgMw: 5728.8, avgGw: 5.729 },
  { hour: 18, avgMw: 6011.0, avgGw: 6.011 },
  { hour: 19, avgMw: 6077.1, avgGw: 6.077 },
  { hour: 20, avgMw: 5987.9, avgGw: 5.988 },
  { hour: 21, avgMw: 5890.5, avgGw: 5.891 },
  { hour: 22, avgMw: 5727.8, avgGw: 5.728 },
  { hour: 23, avgMw: 5501.0, avgGw: 5.501 },
];

export const REAL_HOURLY_LOAD_BRASIL: RealHourlyLoad[] = [
  { hour: 0, avgMw: 77577.1, avgGw: 77.577 },
  { hour: 1, avgMw: 73402.3, avgGw: 73.402 },
  { hour: 2, avgMw: 70508.6, avgGw: 70.509 },
  { hour: 3, avgMw: 68787.5, avgGw: 68.787 },
  { hour: 4, avgMw: 68113.0, avgGw: 68.113 },
  { hour: 5, avgMw: 68891.5, avgGw: 68.891 },
  { hour: 6, avgMw: 71413.9, avgGw: 71.414 },
  { hour: 7, avgMw: 73841.4, avgGw: 73.841 },
  { hour: 8, avgMw: 77194.4, avgGw: 77.194 },
  { hour: 9, avgMw: 79556.7, avgGw: 79.557 },
  { hour: 10, avgMw: 81512.4, avgGw: 81.512 },
  { hour: 11, avgMw: 83641.1, avgGw: 83.641 },
  { hour: 12, avgMw: 83462.4, avgGw: 83.462 },
  { hour: 13, avgMw: 82814.2, avgGw: 82.814 },
  { hour: 14, avgMw: 84293.7, avgGw: 84.294 },
  { hour: 15, avgMw: 84849.2, avgGw: 84.849 },
  { hour: 16, avgMw: 86032.0, avgGw: 86.032 },
  { hour: 17, avgMw: 87553.1, avgGw: 87.553 },
  { hour: 18, avgMw: 91516.1, avgGw: 91.516 },
  { hour: 19, avgMw: 93814.2, avgGw: 93.814 },
  { hour: 20, avgMw: 91738.2, avgGw: 91.738 },
  { hour: 21, avgMw: 89952.6, avgGw: 89.953 },
  { hour: 22, avgMw: 87234.5, avgGw: 87.234 },
  { hour: 23, avgMw: 82713.1, avgGw: 82.713 },
];
