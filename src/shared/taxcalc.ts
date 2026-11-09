// Rough annual income tax + Bituach Leumi estimate for a self-employed individual in Israel.
// An estimate to plan cash, not tax advice: it ignores pension deductions, other income,
// depreciation schedules and special credits.
import type { TaxSettings } from './business.ts';

export interface TaxEstimate {
  profit: number;
  bituachLeumi: number;
  taxable: number;
  incomeTaxBeforeCredits: number;
  credits: number;
  incomeTax: number;
  total: number;
  monthlySetAside: number;
  effectiveRate: number;
  marginalRate: number;
}

export function bituachLeumi(annualProfit: number, s: TaxSettings) {
  const monthly = Math.max(0, annualProfit) / 12;
  const reduced = Math.min(monthly, s.blReducedCeiling) * s.blReducedRate;
  const full = Math.max(0, Math.min(monthly, s.blMaxIncome) - s.blReducedCeiling) * s.blFullRate;
  return (reduced + full) * 12;
}

export function bracketTax(taxable: number, s: TaxSettings) {
  let tax = 0;
  let prev = 0;
  let marginal = s.brackets[0]?.rate ?? 0;
  for (const b of s.brackets) {
    const top = b.upTo ?? Infinity;
    if (taxable > prev) {
      tax += (Math.min(taxable, top) - prev) * b.rate;
      marginal = b.rate;
    }
    prev = top;
  }
  return { tax, marginal };
}

export function estimateTax(annualProfit: number, s: TaxSettings): TaxEstimate {
  const profit = Math.max(0, annualProfit);
  const bl = bituachLeumi(profit, s);
  const taxable = Math.max(0, profit - bl * s.blDeductibleShare);
  const { tax, marginal } = bracketTax(taxable, s);
  const credits = s.creditPoints * s.creditPointValue;
  const incomeTax = Math.max(0, tax - credits);
  const total = incomeTax + bl;
  return {
    profit,
    bituachLeumi: bl,
    taxable,
    incomeTaxBeforeCredits: tax,
    credits,
    incomeTax,
    total,
    monthlySetAside: total / 12,
    effectiveRate: profit ? total / profit : 0,
    marginalRate: marginal,
  };
}
