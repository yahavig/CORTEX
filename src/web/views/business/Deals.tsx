// Brand collaborations pipeline: lead → … → paid.
import { useState, type DragEvent } from 'react';
import { CONTENT_TYPES, CONTENT_TYPE_LABELS, CURRENCIES, DEAL_STAGES, DEAL_STAGE_LABELS, type DealStage } from '../../../shared/business.ts';
import { money } from '../../lib/money.ts';
import { useList } from '../../lib/rest.ts';
import { fmtDay } from '../../lib/time.ts';
import { useStore } from '../../store.tsx';
import type { Brand, Contact, Deal } from '../../types.ts';
import { FormDrawer } from '../../components/FormDrawer.tsx';
import { Sym } from '../../components/Sym.tsx';
import { Button } from '../../components/ui.tsx';

const DRAG = 'application/x-cortex-deal';
const PIPELINE = DEAL_STAGES.filter((s) => s !== 'lost');

export function Deals() {
  const deals = useList<Deal>('/api/deals');
  const brands = useList<Brand>('/api/brands');
  const contacts = useList<Contact>('/api/contacts');
  const { videos } = useStore();
  const [editing, setEditing] = useState<Partial<Deal> | null>(null);
  const [over, setOver] = useState<DealStage | null>(null);

  const open = deals.items.filter((d) => d.stage !== 'paid' && d.stage !== 'lost');
  const pipelineValue = open.reduce((n, d) => n + (d.currency === 'ILS' ? d.amount ?? 0 : 0), 0);
  const lost = deals.items.filter((d) => d.stage === 'lost');

  const drop = (stage: DealStage) => ({
    onDragOver: (e: DragEvent) => { if (e.dataTransfer.types.includes(DRAG)) { e.preventDefault(); setOver(stage); } },
    onDragLeave: () => setOver(null),
    onDrop: (e: DragEvent) => { e.preventDefault(); setOver(null); const id = Number(e.dataTransfer.getData(DRAG)); if (id) void deals.update(id, { stage }); },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button tone="primary" icon="plus" onClick={() => setEditing({ stage: 'lead', currency: 'ILS' })}>שיתוף פעולה חדש</Button>
        <span className="ms-auto text-body text-muted">{open.length} פתוחים · שווי בשקלים: <span className="tabular-nums text-ink">{money(pipelineValue)}</span></span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3">
        {PIPELINE.map((stage) => {
          const items = deals.items.filter((d) => d.stage === stage);
          return (
            <div key={stage} {...drop(stage)} className={`flex min-h-56 min-w-44 flex-1 flex-col gap-2 rounded-lg border p-3 transition ${over === stage ? 'border-tint/60 bg-tint/5' : 'border-line bg-fill-hover'}`}>
              <h3 className="px-1 text-body font-semibold">{DEAL_STAGE_LABELS[stage]} <span className="text-subheadline font-normal text-muted">{items.length}</span></h3>
              {items.map((d) => {
                const brand = brands.items.find((b) => b.id === d.brandId);
                const late = d.dueAt && new Date(d.dueAt) < new Date() && (stage === 'contract' || stage === 'negotiation');
                return (
                  <div key={d.id} draggable onDragStart={(e) => e.dataTransfer.setData(DRAG, String(d.id))} onClick={() => setEditing(d)} className="cursor-grab rounded-md border border-line bg-surface p-3 hover:bg-fill-hover active:cursor-grabbing">
                    <div className="text-body font-semibold">{d.title}</div>
                    <div className="mt-1 flex flex-wrap gap-x-2 text-subheadline text-muted">
                      {brand && <span>{brand.name}</span>}
                      {d.amount != null && <span className="tabular-nums text-ink">{money(d.amount, d.currency)}</span>}
                      {d.contentType && <span>{CONTENT_TYPE_LABELS[d.contentType]}</span>}
                      {d.dueAt && <span className={late ? 'text-neon-pink' : ''}>{fmtDay.format(new Date(d.dueAt))}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {lost.length > 0 && <p className="text-callout text-muted">לא יצאו: {lost.map((d) => <button key={d.id} onClick={() => setEditing(d)} className="me-2 underline-offset-2 hover:underline">{d.title}</button>)}</p>}

      {editing && (
        <FormDrawer
          title={editing.id ? 'שיתוף פעולה' : 'שיתוף פעולה חדש'}
          icon="person.2.fill"
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(v) => (editing.id ? deals.update(editing.id, v) : deals.create({ ...editing, ...v }))}
          onDelete={editing.id ? () => deals.remove(editing.id!) : undefined}
          footer={editing.id ? <Linked dealId={editing.id} /> : undefined}
          fields={[
            { key: 'title', label: 'שם', type: 'text', placeholder: 'למשל: Notion, רילס נובמבר' },
            { key: 'stage', label: 'שלב', type: 'select', allowEmpty: false, options: DEAL_STAGES.map((s) => ({ value: s, label: DEAL_STAGE_LABELS[s] })), half: true },
            { key: 'contentType', label: 'סוג תוכן', type: 'select', options: CONTENT_TYPES.map((c) => ({ value: c, label: CONTENT_TYPE_LABELS[c] })), half: true },
            { key: 'brandId', label: 'מותג', type: 'select', options: brands.items.map((b) => ({ value: b.id, label: b.name })), half: true },
            { key: 'contactId', label: 'איש קשר', type: 'select', options: contacts.items.map((c) => ({ value: c.id, label: c.name })), half: true },
            { key: 'amount', label: 'סכום', type: 'number', half: true },
            { key: 'currency', label: 'מטבע', type: 'select', allowEmpty: false, options: CURRENCIES.map((c) => ({ value: c, label: c })), half: true },
            { key: 'dueAt', label: 'מסירת תוכן', type: 'date', half: true },
            { key: 'paymentTermsDays', label: 'תנאי תשלום (שוטף + ימים)', type: 'number', half: true },
            { key: 'deliverables', label: 'מה מוסרים', type: 'textarea' },
            { key: 'usageRights', label: 'זכויות שימוש', type: 'text', placeholder: 'למשל: 3 חודשים, אורגני בלבד, בלי ממומן' },
            { key: 'notes', label: 'הערות', type: 'textarea' },
          ]}
        />
      )}
    </div>
  );

  function Linked({ dealId }: { dealId: number }) {
    const linked = videos.filter((v) => (v as { dealId?: number | null }).dealId === dealId);
    return linked.length ? <span className="flex items-center gap-1 text-subheadline text-muted"><Sym name="film.fill" size={11} />{linked.length} סרטונים</span> : null;
  }
}
