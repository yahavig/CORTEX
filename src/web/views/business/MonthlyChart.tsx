// Income vs expenses per month: grouped bars, one axis (₪), hover tooltip, table view.
// Colors come from tokens and are validated per mode (dataviz validator):
// light #1a73e8 / #d6246e on #ffffff, dark #1e8ef5 / #ec3191 on #0c0c10.
import { useState } from 'react';
import { money } from '../../lib/money.ts';

const MONTHS = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
const INCOME = 'var(--chart-income)';
const EXPENSE = 'var(--chart-expense)';

export function MonthlyChart({ months }: { months: { income: number; expenses: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1000, ...months.flatMap((m) => [m.income, m.expenses])); // empty year: 0–1K axis, no fractions
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);

  return (
    <div>
      <div className="mb-3 flex items-center gap-6 text-subheadline text-muted">
        <Legend color={INCOME} label="הכנסות" />
        <Legend color={EXPENSE} label="הוצאות" />
        <button onClick={() => setTable((t) => !t)} className="ms-auto rounded-full px-2 py-0.5 hover:bg-fill hover:text-ink">{table ? 'גרף' : 'טבלה'}</button>
      </div>
      {table ? (
        <table className="w-full text-callout">
          <thead className="text-muted"><tr><th className="py-1 text-start font-normal">חודש</th><th className="text-start font-normal">הכנסות</th><th className="text-start font-normal">הוצאות</th><th className="text-start font-normal">רווח</th></tr></thead>
          <tbody>{months.map((m, i) => (
            <tr key={i} className="border-t border-line"><td className="py-1">{MONTHS[i]}</td><td className="tabular-nums">{money(m.income)}</td><td className="tabular-nums">{money(m.expenses)}</td><td className="tabular-nums">{money(m.income - m.expenses)}</td></tr>
          ))}</tbody>
        </table>
      ) : (
        <div className="relative mt-4 flex h-52 gap-2" dir="ltr">
          {/* y-axis labels */}
          <div className="relative w-12 shrink-0 text-subheadline text-muted">
            {ticks.map((t) => <span key={t} className="absolute right-1 -translate-y-1/2 tabular-nums" style={{ bottom: `${(t / top) * 100}%` }}>{short(t)}</span>)}
          </div>
          <div className="relative flex-1">
            {ticks.map((t) => <div key={t} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${(t / top) * 100}%` }} />)}
            <div className="absolute inset-0 flex items-end">
              {months.map((m, i) => (
                <div key={i} className="relative flex h-full flex-1 items-end justify-center gap-[2px]" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  {hover === i && <div className="absolute inset-y-0 inset-x-0.5 rounded-xs bg-fill-hover" />}
                  <Bar value={m.income} top={top} color={INCOME} />
                  <Bar value={m.expenses} top={top} color={EXPENSE} />
                  <span className="absolute -bottom-5 text-subheadline text-muted" dir="rtl">{MONTHS[i]}</span>
                  {hover === i && (
                    <div className={`pointer-events-none absolute bottom-full z-10 mb-2 w-40 rounded-sm border border-line bg-elevated p-2.5 text-subheadline ${i > 8 ? 'right-0' : i < 3 ? 'left-0' : ''}`} dir="rtl">
                      <div className="mb-1 font-semibold">{MONTHS[i]}</div>
                      <Tip color={INCOME} label="הכנסות" value={money(m.income)} />
                      <Tip color={EXPENSE} label="הוצאות" value={money(m.expenses)} />
                      <div className="mt-1 flex justify-between border-t border-line pt-1 text-muted"><span>רווח</span><span className="tabular-nums text-ink">{money(m.income - m.expenses)}</span></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {!table && <div className="h-6" />}
    </div>
  );
}

function Bar({ value, top, color }: { value: number; top: number; color: string }) {
  return <div className="relative w-[34%] max-w-4 rounded-t-[4px]" style={{ height: `${(value / top) * 100}%`, minHeight: value > 0 ? 2 : 0, background: color }} />;
}
function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px]" style={{ background: color }} />{label}</span>;
}
function Tip({ color, label, value }: { color: string; label: string; value: string }) {
  return <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-muted"><span className="size-2 rounded-[2px]" style={{ background: color }} />{label}</span><span className="tabular-nums">{value}</span></div>;
}
function niceStep(max: number) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
}
function short(n: number) {
  return n >= 1000 ? `${Math.round(n / 100) / 10}K` : String(n);
}
