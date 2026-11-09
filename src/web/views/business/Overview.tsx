import { useEffect, useState } from 'react';
import type { TaxSettings } from '../../../shared/business.ts';
import type { TaxEstimate } from '../../../shared/taxcalc.ts';
import { money, pct } from '../../lib/money.ts';
import { rest } from '../../lib/rest.ts';
import { addDays, fmtDay } from '../../lib/time.ts';
import { Sym } from '../../components/Sym.tsx';
import { MonthlyChart } from './MonthlyChart.tsx';

export interface Summary {
  year: number;
  businessType: 'patur' | 'murshe';
  income: number; expenses: number; deductible: number; fees: number; withholding: number; profit: number;
  months: { income: number; expenses: number; deductible: number }[];
  byCategory: Record<string, number>;
  ceiling: { limit: number; used: number; pct: number; projected: number };
  projection: { elapsed: number; income: number; profit: number };
  tax: TaxEstimate;
  advances: { monthly: number; gap: number };
  vatIfMurshe: { output: number; input: number; net: number };
  outstanding: { id: number; description: string | null; amount: number; currency: string; amountIls: number | null; expectedAt: string | null; overdue: boolean }[];
  issues: { missingRates: number; missingReceipts: number; missingFiles: number };
}

// Next due dates for tax advances (15th) and the annual report.
function obligations(tax: TaxSettings) {
  const now = new Date();
  const out: { label: string; at: Date }[] = [];
  for (let i = 0; i < 4 && out.length < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 15);
    if (d < now) continue;
    if (tax.advanceFrequency === 'bimonthly' && d.getMonth() % 2 !== 0) continue; // Jan, Mar, May…
    out.push({ label: 'מקדמות מס הכנסה וביטוח לאומי', at: d });
  }
  const report = new Date(now.getFullYear(), 3, 30);
  out.push({ label: `דוח שנתי לשנת ${now.getFullYear() - (now < report ? 1 : 0)} (לבדוק מועד מדויק מול רו״ח)`, at: now < report ? report : new Date(now.getFullYear() + 1, 3, 30) });
  return out;
}

export function Overview({ year }: { year: number }) {
  const [s, setS] = useState<Summary | null>(null);
  const [tax, setTax] = useState<TaxSettings | null>(null);
  useEffect(() => {
    rest.get<Summary>(`/api/business/summary?year=${year}`).then(setS);
    rest.get<TaxSettings>('/api/settings/tax').then(setTax);
  }, [year]);
  if (!s || !tax) return null;
  const ceilingWarn = s.ceiling.pct >= 0.8 || s.ceiling.projected > s.ceiling.limit;
  const issues = [
    s.issues.missingReceipts && `${s.issues.missingReceipts} הכנסות בלי מספר קבלה`,
    s.issues.missingFiles && `${s.issues.missingFiles} הוצאות בלי קובץ קבלה`,
    s.issues.missingRates && `${s.issues.missingRates} סכומים במט״ח בלי שער`,
  ].filter(Boolean) as string[];

  return (
    <div className="grid max-w-6xl gap-6 lg:grid-cols-3">
      <Kpi label={`הכנסות ${year}`} value={money(s.income)} sub={s.projection.elapsed < 1 ? `צפי לשנה: ${money(s.projection.income)}` : undefined} />
      <Kpi label="הוצאות מוכרות" value={money(s.deductible)} sub={`מתוך ${money(s.expenses)} הוצאות${s.fees ? ` + עמלות` : ''}`} />
      <Kpi label="רווח" value={money(s.profit)} sub={s.projection.elapsed < 1 ? `צפי לשנה: ${money(s.projection.profit)}` : undefined} />

      {s.businessType === 'patur' && (
        <Card className="lg:col-span-3">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-title3 font-semibold">תקרת עוסק פטור</h3>
            <span className="text-callout text-muted tabular-nums">{money(s.ceiling.used)} / {money(s.ceiling.limit)} · {pct(s.ceiling.pct)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-fill-strong">
            <div className={`h-full rounded-full ${ceilingWarn ? 'bg-neon-orange' : 'bg-neon-green'}`} style={{ width: `${Math.min(100, s.ceiling.pct * 100)}%` }} />
          </div>
          <p className={`mt-2 text-callout ${ceilingWarn ? 'text-neon-orange' : 'text-muted'}`}>
            {s.ceiling.projected > s.ceiling.limit
              ? `בקצב הנוכחי תעבור את התקרה השנה (צפי ${money(s.ceiling.projected)}). כדאי לדבר עם רו״ח על מעבר לעוסק מורשה.`
              : s.ceiling.pct >= 0.8 ? 'מתקרב לתקרה. כדאי להתכונן למעבר לעוסק מורשה.' : `צפי לסוף השנה: ${money(s.ceiling.projected)}.`}
          </p>
        </Card>
      )}

      <Card className="lg:col-span-2">
        <h3 className="mb-3 text-title3 font-semibold">הכנסות והוצאות לפי חודש</h3>
        <MonthlyChart months={s.months} />
      </Card>

      <Card>
        <h3 className="mb-1 flex items-center gap-2 text-title3 font-semibold"><Sym name="percent" size={14} className="text-tint" /> כמה להפריש</h3>
        <p className="mb-3 text-subheadline text-muted">הערכה לפי הרווח הצפוי לשנה. לא ייעוץ מס.</p>
        <div className="text-large-title font-semibold tabular-nums">{money(s.tax.monthlySetAside)}<span className="text-body font-normal text-muted"> לחודש</span></div>
        <dl className="mt-3 space-y-1 text-callout">
          <Row k="מס הכנסה (שנתי)" v={money(s.tax.incomeTax)} />
          <Row k="ביטוח לאומי ובריאות (שנתי)" v={money(s.tax.bituachLeumi)} />
          <Row k="שיעור אפקטיבי" v={pct(s.tax.effectiveRate)} />
          <Row k="מדרגת מס שולית" v={pct(s.tax.marginalRate)} />
          <Row k="מקדמות שאתה משלם" v={money(s.advances.monthly)} />
        </dl>
        {s.advances.monthly > 0 || s.tax.total > 0 ? (
          <p className={`mt-3 text-callout ${Math.abs(s.advances.gap) > 200 ? 'text-neon-orange' : 'text-muted'}`}>
            {s.advances.gap > 200 ? `המקדמות נמוכות בכ־${money(s.advances.gap)} לחודש מההערכה. צפוי תשלום בדוח השנתי.` : s.advances.gap < -200 ? `המקדמות גבוהות בכ־${money(-s.advances.gap)} לחודש מההערכה. אפשר לבקש עדכון מקדמות.` : 'המקדמות תואמות את ההערכה.'}
          </p>
        ) : null}
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 text-title3 font-semibold"><Sym name="calendar.badge.exclamationmark" size={14} className="text-neon-orange" /> מועדים קרובים</h3>
        <ul className="space-y-2 text-callout">
          {obligations(tax).map((o) => (
            <li key={o.label + o.at.toISOString()} className="flex justify-between gap-3">
              <span>{o.label}</span>
              <span className={`shrink-0 tabular-nums ${o.at < addDays(new Date(), 7) ? 'text-neon-orange' : 'text-muted'}`}>{fmtDay.format(o.at)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 text-title3 font-semibold"><Sym name="clock.fill" size={14} className="text-neon-blue" /> תשלומים שמחכים</h3>
        {s.outstanding.length === 0 && <p className="text-callout text-muted">אין תשלומים פתוחים.</p>}
        <ul className="space-y-2 text-callout">
          {s.outstanding.slice(0, 6).map((o) => (
            <li key={o.id} className="flex justify-between gap-3">
              <span className="truncate">{o.description ?? 'תשלום'}</span>
              <span className={`shrink-0 tabular-nums ${o.overdue ? 'text-neon-pink' : 'text-muted'}`}>{money(o.amount, o.currency)}{o.expectedAt ? ` · ${fmtDay.format(new Date(o.expectedAt))}` : ''}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 text-title3 font-semibold"><Sym name="arrow.triangle.branch" size={14} className="text-neon-green" /> אם היית עוסק מורשה</h3>
        <dl className="space-y-1 text-callout">
          <Row k={`מע״מ על ההכנסות (${pct(tax.vatRate)})`} v={money(s.vatIfMurshe.output)} />
          <Row k="מע״מ תשומות שהיית מקזז" v={money(s.vatIfMurshe.input)} />
          <Row k="מע״מ לתשלום השנה" v={money(s.vatIfMurshe.net)} />
        </dl>
        <p className="mt-3 text-subheadline text-muted">כדי שהחישוב יהיה נכון, רשום את המע״מ בכל קבלת הוצאה כבר עכשיו.</p>
      </Card>

      {issues.length > 0 && (
        <Card className="lg:col-span-3 border-neon-orange/30">
          <h3 className="mb-2 flex items-center gap-2 text-title3 font-semibold"><Sym name="exclamationmark.triangle.fill" size={14} className="text-neon-orange" /> להשלים לפני הדוח</h3>
          <ul className="list-inside list-disc text-callout text-muted">{issues.map((i) => <li key={i}>{i}</li>)}</ul>
        </Card>
      )}
    </div>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-line bg-surface p-6 ${className}`}>{children}</section>;
}
function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <div className="text-callout text-muted">{label}</div>
      <div className="mt-1 text-large-title font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-subheadline text-muted">{sub}</div>}
    </Card>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="tabular-nums">{v}</dd></div>;
}
