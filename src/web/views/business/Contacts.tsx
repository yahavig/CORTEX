import { useState } from 'react';
import { useList } from '../../lib/rest.ts';
import type { Brand, Contact, Deal } from '../../types.ts';
import { FormDrawer } from '../../components/FormDrawer.tsx';
import { Sym } from '../../components/Sym.tsx';
import { Button, inputCls } from '../../components/ui.tsx';

export function Contacts() {
  const brands = useList<Brand>('/api/brands');
  const contacts = useList<Contact>('/api/contacts');
  const deals = useList<Deal>('/api/deals');
  const [brand, setBrand] = useState<Partial<Brand> | null>(null);
  const [contact, setContact] = useState<Partial<Contact> | null>(null);
  const [q, setQ] = useState('');
  const match = (...xs: (string | null)[]) => !q || xs.some((x) => x?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button tone="primary" icon="plus" onClick={() => setBrand({})}>מותג</Button>
        <Button icon="plus" onClick={() => setContact({})}>איש קשר</Button>
        <input className={`${inputCls} ms-auto max-w-xs py-1.5`} placeholder="חיפוש" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {brands.items.length === 0 && contacts.items.length === 0 && <p className="text-body text-muted">אין עדיין מותגים או אנשי קשר.</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {brands.items.filter((b) => match(b.name, b.category, ...contacts.items.filter((c) => c.brandId === b.id).map((c) => c.name))).map((b) => {
          const people = contacts.items.filter((c) => c.brandId === b.id);
          const bDeals = deals.items.filter((d) => d.brandId === b.id);
          return (
            <section key={b.id} className="rounded-lg border border-line bg-surface p-6">
              <button onClick={() => setBrand(b)} className="flex w-full items-center gap-2 text-start">
                <Sym name="building.2.fill" size={15} className="text-tint" />
                <span className="flex-1 text-title3 font-semibold">{b.name}</span>
                {b.category && <span className="text-subheadline text-muted">{b.category}</span>}
              </button>
              <div className="mt-1 text-subheadline text-muted">{bDeals.length} שיתופי פעולה{bDeals.filter((d) => d.stage === 'paid').length ? ` · ${bDeals.filter((d) => d.stage === 'paid').length} שולמו` : ''}</div>
              <ul className="mt-3 space-y-1">{people.map((c) => <Person key={c.id} c={c} />)}</ul>
              <button onClick={() => setContact({ brandId: b.id })} className="mt-2 flex items-center gap-1 text-subheadline text-muted hover:text-ink"><Sym name="plus" size={10} /> איש קשר</button>
            </section>
          );
        })}
      </div>

      {contacts.items.some((c) => !c.brandId) && (
        <section>
          <h3 className="mb-2 text-title3 font-semibold">בלי מותג</h3>
          <ul className="max-w-xl space-y-1">{contacts.items.filter((c) => !c.brandId && match(c.name, c.company)).map((c) => <Person key={c.id} c={c} />)}</ul>
        </section>
      )}

      {brand && (
        <FormDrawer title={brand.id ? brand.name! : 'מותג חדש'} icon="building.2.fill" initial={brand} onClose={() => setBrand(null)}
          onSave={(v) => (brand.id ? brands.update(brand.id, v) : brands.create(v))} onDelete={brand.id ? () => brands.remove(brand.id!) : undefined}
          fields={[
            { key: 'name', label: 'שם', type: 'text' },
            { key: 'category', label: 'תחום', type: 'text', half: true, placeholder: 'אפליקציות, טק, לייפסטייל…' },
            { key: 'instagram', label: 'אינסטגרם', type: 'text', half: true, dir: 'ltr' },
            { key: 'website', label: 'אתר', type: 'url' },
            { key: 'notes', label: 'הערות', type: 'textarea' },
          ]} />
      )}
      {contact && (
        <FormDrawer title={contact.id ? contact.name! : 'איש קשר חדש'} icon="person.fill" initial={contact} onClose={() => setContact(null)}
          onSave={(v) => (contact.id ? contacts.update(contact.id, v) : contacts.create({ ...contact, ...v }))} onDelete={contact.id ? () => contacts.remove(contact.id!) : undefined}
          fields={[
            { key: 'name', label: 'שם', type: 'text' },
            { key: 'brandId', label: 'מותג', type: 'select', options: brands.items.map((b) => ({ value: b.id, label: b.name })), half: true },
            { key: 'role', label: 'תפקיד', type: 'text', half: true },
            { key: 'company', label: 'סוכנות / חברה', type: 'text' },
            { key: 'email', label: 'אימייל', type: 'email', half: true },
            { key: 'phone', label: 'טלפון', type: 'text', half: true, dir: 'ltr' },
            { key: 'instagram', label: 'אינסטגרם', type: 'text', dir: 'ltr' },
            { key: 'notes', label: 'הערות', type: 'textarea' },
          ]} />
      )}
    </div>
  );

  function Person({ c }: { c: Contact }) {
    return (
      <li className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-callout hover:bg-fill-hover">
        <button onClick={() => setContact(c)} className="flex flex-1 items-center gap-2 text-start">
          <Sym name="person.fill" size={12} className="text-muted" />
          <span>{c.name}</span>
          {c.role && <span className="text-muted">· {c.role}</span>}
        </button>
        {c.email && <a href={`mailto:${c.email}`} className="text-muted hover:text-ink" title={c.email}><Sym name="envelope.fill" size={12} /></a>}
        {c.phone && <a href={`tel:${c.phone}`} className="text-muted hover:text-ink" title={c.phone}><Sym name="phone.fill" size={12} /></a>}
      </li>
    );
  }
}
