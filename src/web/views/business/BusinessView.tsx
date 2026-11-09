import { useState } from 'react';
import { Segmented } from '../../components/ui.tsx';
import { Sym } from '../../components/Sym.tsx';
import { Overview } from './Overview.tsx';
import { Income } from './Income.tsx';
import { Expenses } from './Expenses.tsx';
import { Deals } from './Deals.tsx';
import { Contacts } from './Contacts.tsx';
import { TaxSettingsPanel } from './TaxSettingsPanel.tsx';

type Tab = 'overview' | 'income' | 'expenses' | 'deals' | 'contacts' | 'tax';
const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'סקירה' },
  { value: 'income', label: 'הכנסות' },
  { value: 'expenses', label: 'הוצאות' },
  { value: 'deals', label: 'שיתופי פעולה' },
  { value: 'contacts', label: 'מותגים ואנשי קשר' },
  { value: 'tax', label: 'מס והגדרות' },
];

export function BusinessView() {
  const [tab, setTab] = useState<Tab>('overview');
  const [year, setYear] = useState(new Date().getFullYear());
  const yearly = tab === 'overview' || tab === 'income' || tab === 'expenses';
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-3xl"><Segmented<Tab> value={tab} onChange={setTab} options={TABS} /></div>
        {yearly && (
          <div className="flex items-center gap-1 text-body">
            <button className="rounded-full p-1.5 hover:bg-fill" onClick={() => setYear(year - 1)}><Sym name="chevron.right" size={12} /></button>
            <span className="tabular-nums">{year}</span>
            <button className="rounded-full p-1.5 hover:bg-fill" onClick={() => setYear(year + 1)}><Sym name="chevron.left" size={12} /></button>
          </div>
        )}
        {yearly && <a href={`/api/business/export.csv?year=${year}`} className="ms-auto flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-callout hover:bg-fill-hover"><Sym name="arrow.down.doc.fill" size={13} /> ייצוא לרו״ח</a>}
      </div>
      {tab === 'overview' && <Overview year={year} />}
      {tab === 'income' && <Income year={year} />}
      {tab === 'expenses' && <Expenses year={year} />}
      {tab === 'deals' && <Deals />}
      {tab === 'contacts' && <Contacts />}
      {tab === 'tax' && <TaxSettingsPanel />}
    </div>
  );
}
