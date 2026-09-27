import type { SignalLevel } from '@/types/manager';

export function money(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export function num(value: number, digits = 0): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function dateTimeOf(iso: string): string {
  const [date, time] = [iso.slice(0, 10), iso.slice(11, 16)];
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y} ${time}`;
}

export const LEVEL_COLOR: Record<SignalLevel, string> = {
  verde: '#4ae3a5',
  amarelo: '#f7c65c',
  vermelho: '#ff6b6b',
};

export const LEVEL_HINT: Record<SignalLevel, string> = {
  verde: 'Energia abundante e barata — ótimo momento para carregar e ganhar créditos.',
  amarelo: 'Condição normal da rede — preço padrão.',
  vermelho: 'Rede pressionada — se puder, adie a recarga ou reduza a potência.',
};
