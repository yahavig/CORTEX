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

// Annual BL + health on profit, at the reduced rate up to the reduced ceiling and the full
// rate up to the maximum insurable income (monthly figures).
function tiered(annualProfit: number, s: TaxSettings, reducedRate: number, fullRate: number) {
  const monthly = Math.max(0, annualProfit) / 12;
  const reduced = Math.min(monthly, s.blReducedCeiling) * reducedRate;
  const full = Math.max(0, Math.min(monthly, s.blMaxIncome) - s.blReducedCeiling) * fullRate;
  return (reduced + full) * 12;
}

export function bituachLeumi(annualProfit: number, s: TaxSettings) {
  return tiered(annualProfit, s, s.blReducedRate, s.blFullRate);
}

// The deduction applies to the national-insurance part only, not to health insurance.
// Without the split rates (older saved settings) fall back to the whole payment.
export function bituachLeumiNi(annualProfit: number, s: TaxSettings) {
  if (s.blReducedNiRate == null || s.blFullNiRate == null) return bituachLeumi(annualProfit, s);
  return tiered(annualProfit, s, s.blReducedNiRate, s.blFullNiRate);
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
  const taxable = Math.max(0, profit - bituachLeumiNi(profit, s) * s.blDeductibleShare);
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
