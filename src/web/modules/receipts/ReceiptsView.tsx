// Receipts: payments received that still need a receipt, and receipts already issued.
// Built on the income records (/api/payments); the receipt itself comes from the invoicing software.
import { useState } from 'react';
import { PAYMENT_METHOD_LABELS } from '../../../shared/business.ts';
import { money } from '../../lib/money.ts';
import { fileUrl, useList } from '../../lib/rest.ts';
import { fmtDay } from '../../lib/time.ts';
import type { Brand, Deal, Payment } from '../../types.ts';
import { FormDrawer } from '../../components/FormDrawer.tsx';
import { Sym } from '../../components/Sym.tsx';
import { Button, Card } from '../../components/ui.tsx';

const noon = () => new Date(new Date().setHours(12, 0, 0, 0)).toISOString();

export function ReceiptsView() {
  const payments = useList<Payment>('/api/payments');
  const deals = useList<Deal>('/api/deals');
  const brands = useList<Brand>('/api/brands');
  const [editing, setEditing] = useState<Partial<Payment> | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const toIssue = payments.items.filter((p) => p.receivedAt && !p.receiptNumber).sort((a, b) => a.receivedAt!.localeCompare(b.receivedAt!));
  const issued = payments.items.filter((p) => p.receiptNumber).sort((a, b) => (b.receiptIssuedAt ?? '').localeCompare(a.receiptIssuedAt ?? ''));
  const total = toIssue.reduce((n, p) => n + (p.amountIls ?? 0), 0);

  const client = (p: Payment) => brands.items.find((b) => b.id === (p.brandId ?? deals.items.find((d) => d.id === p.dealId)?.brandId))?.name;
  const numbers = issued.map((p) => Number(p.receiptNumber)).filter(Number.isInteger);
  const nextNumber = numbers.length ? String(Math.max(...numbers) + 1) : '';

  async function copy(p: Payment) {
    await navigator.clipboard.writeText([
      `לקוח: ${client(p) ?? ''}`,
      `תיאור: ${p.description ?? ''}`,
      `סכום: ${money(p.amount, p.currency, true)}`,
      `תאריך תשלום: ${fmtDay.format(new Date(p.receivedAt!))}`,
      `אמצעי תשלום: ${p.method ? PAYMENT_METHOD_LABELS[p.method] : ''}`,
    ].join('\n'));
    setCopied(p.id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function save(values: Record<string, any>) {
    const number = String(values.receiptNumber ?? editing!.receiptNumber ?? '').trim();
    if (!number) throw new Error('צריך מספר קבלה');
    if (payments.items.some((p) => p.id !== editing!.id && p.receiptNumber === number)) throw new Error(`כבר קיימת קבלה מספר ${number}`);
    await payments.update(editing!.id!, { receiptIssuedAt: editing!.receiptIssuedAt, ...values, receiptNumber: number });
  }

  const head = 'text-start font-normal';
  return (
    <div className="max-w-5xl space-y-8">
      <section>
        <div className="mb-3 flex items-baseline gap-3">
          <h2 className="text-title2 font-semibold">צריך להפיק</h2>
          <span className="text-callout text-muted">{toIssue.length ? `${toIssue.length} קבלות · ${money(total)}` : ''}</span>
        </div>
        {payments.loaded && toIssue.length === 0 && (
          <Card className="flex items-center gap-3 text-body text-muted">
            <Sym name="checkmark.circle.fill" size={18} className="text-neon-green" />
            אין קבלות שמחכות להפקה. כל תשלום שמתקבל במסך ההכנסות יופיע כאן.
          </Card>
        )}
        <div className="space-y-2">
          {toIssue.map((p) => (
            <Card key={p.id} className="flex flex-wrap items-center gap-4">
              <div className="min-w-48 flex-1">
                <div className="text-title3 font-semibold">{p.description ?? client(p) ?? 'תשלום'}</div>
                <div className="text-callout text-muted">{client(p) ?? 'בלי לקוח'} · התקבל {fmtDay.format(new Date(p.receivedAt!))}</div>
              </div>
              <div className="text-title3 font-semibold tabular-nums">{money(p.amount, p.currency, true)}</div>
              <Button icon="doc.on.doc.fill" onClick={() => copy(p)}>{copied === p.id ? 'הועתק' : 'העתק פרטים'}</Button>
              <Button tone="primary" icon="checkmark" onClick={() => setEditing({ ...p, receiptNumber: nextNumber, receiptIssuedAt: noon() })}>סמן כהופקה…</Button>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-title2 font-semibold">הופקו</h2>
        {payments.loaded && issued.length === 0 ? (
          <p className="text-body text-muted">עוד לא הופקו קבלות.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <table className="w-full text-body">
              <thead className="bg-fill-hover text-callout text-muted">
                <tr><th className={`p-3 ${head}`}>מספר</th><th className={head}>תאריך</th><th className={head}>תיאור</th><th className={head}>לקוח</th><th className={head}>סכום</th><th className={head}>קובץ</th></tr>
              </thead>
              <tbody>
                {issued.map((p) => (
                  <tr key={p.id} onClick={() => setEditing(p)} className="cursor-pointer border-t border-line hover:bg-fill-hover">
                    <td className="p-3 font-semibold tabular-nums">{p.receiptNumber}</td>
                    <td className="tabular-nums text-muted">{p.receiptIssuedAt ? fmtDay.format(new Date(p.receiptIssuedAt)) : '—'}</td>
                    <td className="max-w-64 truncate">{p.description ?? '—'}</td>
                    <td className="text-muted">{client(p) ?? '—'}</td>
                    <td className="tabular-nums">{money(p.amount, p.currency, true)}</td>
                    <td>{p.receiptPath ? <a href={fileUrl(p.receiptPath)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-tint" aria-label="פתח קובץ"><Sym name="doc.fill" size={14} /> פתח</a> : <span className="text-callout text-neon-orange">חסר</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <FormDrawer
          key={editing.id}
          title={editing.description ?? 'קבלה'}
          icon="doc.text.fill"
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={save}
          footer={payments.items.find((p) => p.id === editing.id)?.receiptNumber ? (
            <Button onClick={async () => { await payments.update(editing.id!, { receiptNumber: null, receiptIssuedAt: null, receiptPath: null }); setEditing(null); }}>החזר ל"צריך להפיק"</Button>
          ) : undefined}
          fields={[
            { key: 'summary', label: '', type: 'custom', render: () => <div className="text-title2 font-semibold tabular-nums">{money(editing.amount, editing.currency, true)}</div> },
            { key: 'receiptNumber', label: 'מספר קבלה', type: 'text', half: true, dir: 'ltr' },
            { key: 'receiptIssuedAt', label: 'תאריך הקבלה', type: 'date', half: true },
            { key: 'receiptPath', label: 'קובץ הקבלה', type: 'file', kind: 'receipt', dateKey: 'receiptIssuedAt' },
          ]}
        />
      )}
    </div>
  );
}
