import { CURRENCY_SYMBOLS, type Currency } from '../../shared/business.ts';

const nf = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 });

export function money(n: number | null | undefined, currency: string = 'ILS', precise = false) {
  if (n == null) return '—';
  const sym = CURRENCY_SYMBOLS[currency as Currency] ?? currency;
  return `${sym}${(precise ? nf2 : nf).format(n)}`;
}

export const pct = (n: number) => `${Math.round(n * 100)}%`;
