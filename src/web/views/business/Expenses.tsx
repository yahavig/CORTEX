import { useState } from 'react';
import { CURRENCIES, DEFAULT_DEDUCTIBLE, EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from '../../../shared/business.ts';
import { money } from '../../lib/money.ts';
import { useList } from '../../lib/rest.ts';
import { fmtDay } from '../../lib/time.ts';
import type { Expense, Subscription } from '../../types.ts';
import { FormDrawer } from '../../components/FormDrawer.tsx';
import { Sym } from '../../components/Sym.tsx';
import { Button } from '../../components/ui.tsx';

const catOptions = EXPENSE_CATEGORIES.map((c) => ({ value: c, label: EXPENSE_CATEGORY_LABELS[c] }));

export function Expenses({ year }: { year: number }) {
  const expenses = useList<Expense>('/api/expenses');
  const subs = useList<Subscription>('/api/subscriptions');
  const [editing, setEditing] = useState<Partial<Expense> | null>(null);
  const [editingSub, setEditingSub] = useState<Partial<Subscription> | null>(null);
  const [cat, setCat] = useState<ExpenseCategory | 'all'>('all');

  const rows = expenses.items.filter((e) => new Date(e.date).getFullYear() === year && (cat === 'all' || e.category === cat));
  const total = rows.reduce((n, e) => n + (e.amountIls ?? 0), 0);
  const deductible = rows.reduce((n, e) => n + ((e.amountIls ?? 0) * e.deductiblePct) / 100, 0);
  const activeSubs = subs.items.filter((s) => s.active);
  const monthOf = (d: Date) => d.getFullYear() * 12 + d.getMonth();
  // A subscription "has a receipt this month" if an expense is linked to it in the current month.
  const missingThisMonth = activeSubs.filter((s) => s.cycle === 'monthly' && !expenses.items.some((e) => e.subscriptionId === s.id && monthOf(new Date(e.date)) === monthOf(new Date())));

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button tone="primary" icon="plus" onClick={() => setEditing({ currency: 'ILS', category: 'software', date: new Date().toISOString() })}>הוצאה חדשה</Button>
        <select className="rounded-full border border-line bg-fill px-3 py-1.5 text-callout" value={cat} onChange={(e) => setCat(e.target.value as ExpenseCategory | 'all')}>
          <option value="all">כל הקטגוריות</option>
          {catOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="ms-auto text-body text-muted">
          {year}: <span className="font-semibold text-ink tabular-nums">{money(total)}</span> · מוכר: <span className="tabular-nums text-ink">{money(deductible)}</span>
        </span>
      </div>

      <section className="rounded-lg border border-line bg-surface p-6">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-title3 font-semibold">מנויים קבועים</h3>
          <span className="text-subheadline text-muted">
            {money(activeSubs.reduce((n, s) => n + (s.cycle === 'monthly' ? s.amount : s.amount / 12), 0), activeSubs[0]?.currency ?? 'USD')} לחודש בערך
          </span>
          <div className="ms-auto"><Button icon="plus" onClick={() => setEditingSub({ currency: 'USD', cycle: 'monthly', category: 'software', active: true })}>מנוי</Button></div>
        </div>
        {activeSubs.length === 0 && <p className="text-callout text-muted">הוסף מנויים (Claude, ElevenLabs, Adobe…) כדי לקבל תזכורת כשקבלה חודשית חסרה.</p>}
        <div className="flex flex-wrap gap-2">
          {subs.items.map((s) => {
            const missing = missingThisMonth.some((m) => m.id === s.id);
            return (
              <div key={s.id} className={`flex items-center gap-2 rounded-sm border px-3 py-2 text-callout ${s.active ? 'border-line' : 'border-line opacity-50'}`}>
                <button onClick={() => setEditingSub(s)} className="text-start">
                  <span className="font-semibold">{s.vendor}</span> <span className="text-muted tabular-nums">{money(s.amount, s.currency, true)}/{s.cycle === 'monthly' ? 'חודש' : 'שנה'}</span>
                </button>
                {missing && (
                  <button onClick={() => setEditing({ vendor: s.vendor, amount: s.amount, currency: s.currency, category: s.category, subscriptionId: s.id, date: new Date().toISOString(), description: s.plan })} className="flex items-center gap-1 rounded-full bg-neon-orange/15 px-2 py-0.5 text-subheadline text-neon-orange" title="אין קבלה החודש">
                    <Sym name="plus" size={9} /> קבלה החודש
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {rows.length === 0 ? <p className="text-body text-muted">אין הוצאות.</p> : (
        <div className="overflow-hidden rounded-md border border-line">
          <table className="w-full text-body">
            <thead className="bg-fill-hover text-subheadline text-muted">
              <tr><th className="p-2.5 text-start font-normal">תאריך</th><th className="text-start font-normal">ספק</th><th className="text-start font-normal">קטגוריה</th><th className="text-start font-normal">סכום</th><th className="text-start font-normal">₪</th><th className="text-start font-normal">מוכר</th><th className="text-start font-normal">קבלה</th></tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} onClick={() => setEditing(e)} className="cursor-pointer border-t border-line hover:bg-fill-hover">
                  <td className="p-2.5 tabular-nums text-muted">{fmtDay.format(new Date(e.date))}</td>
                  <td className="max-w-56 truncate">{e.vendor}{e.description && <span className="text-muted"> · {e.description}</span>}</td>
                  <td className="text-muted">{EXPENSE_CATEGORY_LABELS[e.category]}</td>
                  <td className="tabular-nums">{money(e.amount, e.currency, true)}</td>
                  <td className="tabular-nums">{e.currency === 'ILS' ? '' : money(e.amountIls)}</td>
                  <td className="tabular-nums text-muted">{e.deductiblePct}%</td>
                  <td>{e.filePath ? <Sym name="doc.fill" size={13} className="text-neon-blue" /> : <span className="text-subheadline text-neon-orange">חסרה</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <FormDrawer
          title={editing.id ? 'הוצאה' : 'הוצאה חדשה'}
          icon="creditcard.fill"
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(v) => (editing.id ? expenses.update(editing.id, v) : expenses.create({ ...editing, ...v }))}
          onDelete={editing.id ? () => expenses.remove(editing.id!) : undefined}
          fields={[
            { key: 'filePath', label: 'קבלה / חשבונית', type: 'file', kind: 'expense', dateKey: 'date' },
            { key: 'vendor', label: 'ספק', type: 'text', half: true },
            { key: 'date', label: 'תאריך', type: 'date', half: true },
            { key: 'description', label: 'תיאור', type: 'text' },
            { key: 'amount', label: 'סכום ששולם (כולל מע״מ)', type: 'number', half: true },
            { key: 'currency', label: 'מטבע', type: 'select', allowEmpty: false, options: CURRENCIES.map((c) => ({ value: c, label: c })), half: true },
            {
              key: 'category', label: 'קטגוריה', type: 'custom',
              render: (d, set) => (
                <label className="block">
                  <div className="mb-1.5 text-callout text-muted">קטגוריה</div>
                  <select className="w-full rounded-sm border border-line bg-fill px-3 py-2 text-body" value={d.category ?? 'other'} onChange={(e) => { const c = e.target.value as ExpenseCategory; set('category', c); if (!d.id) set('deductiblePct', DEFAULT_DEDUCTIBLE[c]); }}>
                    {catOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              ),
            },
            { key: 'deductiblePct', label: '% מוכר', type: 'number', half: true },
            { key: 'vatAmount', label: 'מע״מ בקבלה ₪ (למעבר למורשה)', type: 'number', half: true },
            { key: 'fxRate', label: 'שער (ריק = שער יציג)', type: 'number', half: true },
            { key: 'subscriptionId', label: 'מנוי', type: 'select', options: subs.items.map((s) => ({ value: s.id, label: s.vendor })), half: true },
            { key: 'paymentMethod', label: 'אמצעי תשלום', type: 'text', half: true, placeholder: 'כרטיס אשראי עסקי…' },
            { key: 'isAsset', label: 'ציוד שמופחת (רכוש קבוע, למשל מחשב או מצלמה)', type: 'bool' },
            { key: 'notes', label: 'הערות', type: 'textarea' },
          ]}
        />
      )}

      {editingSub && (
        <FormDrawer
          title={editingSub.id ? 'מנוי' : 'מנוי חדש'}
          icon="arrow.clockwise"
          initial={editingSub}
          onClose={() => setEditingSub(null)}
          onSave={(v) => (editingSub.id ? subs.update(editingSub.id, v) : subs.create({ ...editingSub, ...v }))}
          onDelete={editingSub.id ? () => subs.remove(editingSub.id!) : undefined}
          fields={[
            { key: 'vendor', label: 'שירות', type: 'text', half: true, placeholder: 'Claude, ElevenLabs…' },
            { key: 'plan', label: 'תוכנית', type: 'text', half: true },
            { key: 'amount', label: 'סכום', type: 'number', half: true },
            { key: 'currency', label: 'מטבע', type: 'select', allowEmpty: false, options: CURRENCIES.map((c) => ({ value: c, label: c })), half: true },
            { key: 'cycle', label: 'חיוב', type: 'segmented', options: [{ value: 'monthly', label: 'חודשי' }, { value: 'yearly', label: 'שנתי' }] },
            { key: 'category', label: 'קטגוריה', type: 'select', allowEmpty: false, options: catOptions, half: true },
            { key: 'billingDay', label: 'יום חיוב בחודש', type: 'number', half: true },
            { key: 'active', label: 'פעיל', type: 'bool' },
            { key: 'notes', label: 'הערות', type: 'textarea' },
          ]}
        />
      )}
    </div>
  );
}
