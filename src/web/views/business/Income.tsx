import { useState } from 'react';
import { CURRENCIES, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../../../shared/business.ts';
import { money } from '../../lib/money.ts';
import { useList } from '../../lib/rest.ts';
import { fmtDay } from '../../lib/time.ts';
import type { Brand, Deal, Payment } from '../../types.ts';
import { FormDrawer } from '../../components/FormDrawer.tsx';
import { Sym } from '../../components/Sym.tsx';
import { Button } from '../../components/ui.tsx';

export function Income({ year }: { year: number }) {
  const payments = useList<Payment>('/api/payments');
  const deals = useList<Deal>('/api/deals');
  const brands = useList<Brand>('/api/brands');
  const [editing, setEditing] = useState<Partial<Payment> | null>(null);

  const pending = payments.items.filter((p) => !p.receivedAt);
  const received = payments.items.filter((p) => p.receivedAt && new Date(p.receivedAt).getFullYear() === year).sort((a, b) => b.receivedAt!.localeCompare(a.receivedAt!));
  const total = received.reduce((n, p) => n + (p.amountIls ?? 0), 0);
  const brandName = (p: Payment) => brands.items.find((b) => b.id === (p.brandId ?? deals.items.find((d) => d.id === p.dealId)?.brandId))?.name;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Button tone="primary" icon="plus" onClick={() => setEditing({ currency: 'ILS', receivedAt: new Date().toISOString() })}>הכנסה חדשה</Button>
        <Button icon="clock.fill" onClick={() => setEditing({ currency: 'ILS', receivedAt: null })}>תשלום צפוי</Button>
        <span className="ms-auto text-body text-muted">התקבל ב־{year}: <span className="font-semibold text-ink tabular-nums">{money(total)}</span></span>
      </div>

      {pending.length > 0 && (
        <section>
          <h3 className="mb-2 text-title3 font-semibold">מחכים לתשלום</h3>
          <Table rows={pending} />
        </section>
      )}
      <section>
        <h3 className="mb-2 text-title3 font-semibold">התקבלו</h3>
        {received.length === 0 ? <p className="text-body text-muted">אין הכנסות ב־{year}.</p> : <Table rows={received} />}
      </section>

      {editing && (
        <FormDrawer
          title={editing.id ? 'הכנסה' : editing.receivedAt === null ? 'תשלום צפוי' : 'הכנסה חדשה'}
          icon="banknote.fill"
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(v) => (editing.id ? payments.update(editing.id, v) : payments.create({ ...v, receivedAt: v.receivedAt ?? editing.receivedAt ?? null }))}
          onDelete={editing.id ? () => payments.remove(editing.id!) : undefined}
          footer={editing.id && !editing.receivedAt ? <Button icon="checkmark" onClick={async () => { await payments.update(editing.id!, { receivedAt: new Date().toISOString() }); setEditing(null); }}>התקבל היום</Button> : undefined}
          fields={[
            { key: 'description', label: 'תיאור', type: 'text', placeholder: 'למשל: רילס ל־Notion, נובמבר' },
            { key: 'amount', label: 'סכום ברוטו', type: 'number', half: true },
            { key: 'currency', label: 'מטבע', type: 'select', allowEmpty: false, options: CURRENCIES.map((c) => ({ value: c, label: c })), half: true },
            { key: 'fxRate', label: 'שער (ריק = שער יציג אוטומטי)', type: 'number', half: true },
            { key: 'method', label: 'אמצעי תשלום', type: 'select', options: PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] })), half: true },
            { key: 'expectedAt', label: 'צפוי להתקבל', type: 'date', half: true },
            { key: 'receivedAt', label: 'התקבל בפועל', type: 'date', half: true },
            { key: 'dealId', label: 'שיתוף פעולה', type: 'select', options: deals.items.map((d) => ({ value: d.id, label: d.title })), half: true },
            { key: 'brandId', label: 'מותג', type: 'select', options: brands.items.map((b) => ({ value: b.id, label: b.name })), half: true },
            { key: 'fees', label: 'עמלות ₪ (PayPal, Wise, בנק)', type: 'number', half: true },
            { key: 'withholding', label: 'ניכוי במקור ₪', type: 'number', half: true },
            { key: 'receiptNumber', label: 'מספר קבלה', type: 'text', half: true, dir: 'ltr' },
            { key: 'receiptIssuedAt', label: 'תאריך הקבלה', type: 'date', half: true },
            { key: 'receiptPath', label: 'קובץ הקבלה שהוצאת', type: 'file', kind: 'receipt', dateKey: 'receiptIssuedAt' },
            { key: 'notes', label: 'הערות', type: 'textarea' },
          ]}
        />
      )}
    </div>
  );

  function Table({ rows }: { rows: Payment[] }) {
    return (
      <div className="overflow-hidden rounded-md border border-line">
        <table className="w-full text-body">
          <thead className="bg-fill-hover text-subheadline text-muted">
            <tr><th className="p-2.5 text-start font-normal">תאריך</th><th className="text-start font-normal">תיאור</th><th className="text-start font-normal">מותג</th><th className="text-start font-normal">סכום</th><th className="text-start font-normal">₪</th><th className="text-start font-normal">קבלה</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const date = p.receivedAt ?? p.expectedAt;
              const overdue = !p.receivedAt && p.expectedAt && new Date(p.expectedAt) < new Date();
              return (
                <tr key={p.id} onClick={() => setEditing(p)} className="cursor-pointer border-t border-line hover:bg-fill-hover">
                  <td className={`p-2.5 tabular-nums ${overdue ? 'text-neon-pink' : 'text-muted'}`}>{date ? fmtDay.format(new Date(date)) : '—'}</td>
                  <td className="max-w-64 truncate">{p.description ?? '—'}</td>
                  <td className="text-muted">{brandName(p) ?? '—'}</td>
                  <td className="tabular-nums">{money(p.amount, p.currency, true)}</td>
                  <td className="tabular-nums">{p.currency === 'ILS' ? '' : money(p.amountIls)}</td>
                  <td>{p.receiptNumber ? <span className="flex items-center gap-1 text-neon-green"><Sym name="checkmark.circle.fill" size={12} />{p.receiptNumber}</span> : p.receivedAt ? <span className="text-neon-orange">חסרה</span> : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}
