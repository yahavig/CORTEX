import { useEffect, useState } from 'react';
import { DEFAULT_TAX, type TaxSettings } from '../../../shared/business.ts';
import { estimateTax } from '../../../shared/taxcalc.ts';
import { money, pct } from '../../lib/money.ts';
import { rest } from '../../lib/rest.ts';
import { Button, Field, inputCls, Segmented } from '../../components/ui.tsx';
import { Card } from './Overview.tsx';

export function TaxSettingsPanel() {
  const [s, setS] = useState<TaxSettings | null>(null);
  const [saved, setSaved] = useState('');
  const [sim, setSim] = useState(150_000);
  useEffect(() => void rest.get<TaxSettings>('/api/settings/tax').then((t) => (setS(t), setSaved(JSON.stringify(t)))), []);
  if (!s) return null;
  const set = <K extends keyof TaxSettings>(k: K, v: TaxSettings[K]) => setS({ ...s, [k]: v });
  const num = (k: keyof TaxSettings, label: string, hint?: string) => (
    <Field label={label} hint={hint && <span className="text-subheadline">{hint}</span>}>
      <input type="number" step="any" dir="ltr" className={inputCls} value={s[k] as number} onChange={(e) => set(k, Number(e.target.value) as never)} />
    </Field>
  );
  const est = estimateTax(sim, s);

  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="mb-4 text-title3 font-semibold">המצב שלך</h3>
        <div className="space-y-4">
          <Field label="סוג עוסק">
            <Segmented value={s.businessType} onChange={(v) => set('businessType', v)} options={[{ value: 'patur', label: 'עוסק פטור' }, { value: 'murshe', label: 'עוסק מורשה' }]} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {num('advanceTaxMonthly', 'מקדמת מס הכנסה ₪ לחודש')}
            {num('advanceBlMonthly', 'מקדמת ביטוח לאומי ₪ לחודש')}
          </div>
          <Field label="תדירות מקדמות">
            <Segmented value={s.advanceFrequency} onChange={(v) => set('advanceFrequency', v)} options={[{ value: 'monthly', label: 'חודשי' }, { value: 'bimonthly', label: 'דו־חודשי' }]} />
          </Field>
          {num('creditPoints', 'נקודות זיכוי', 'גבר תושב: 2.25')}
        </div>
      </Card>

      <Card>
        <h3 className="mb-1 text-title3 font-semibold">סימולציה</h3>
        <p className="mb-4 text-subheadline text-muted">כמה נשאר מרווח שנתי, לפי ההגדרות. הערכה בלבד.</p>
        <Field label="רווח שנתי ₪">
          <input type="range" min={0} max={600_000} step={5_000} value={sim} onChange={(e) => setSim(Number(e.target.value))} className="w-full accent-accent" />
        </Field>
        <div className="mt-2 text-title1 font-semibold tabular-nums">{money(sim)}</div>
        <dl className="mt-3 space-y-1 text-callout">
          {[
            ['ביטוח לאומי ובריאות', money(est.bituachLeumi)],
            ['מס הכנסה (אחרי נקודות זיכוי)', money(est.incomeTax)],
            ['סה״כ', money(est.total)],
            ['נשאר נטו', money(sim - est.total)],
            ['שיעור אפקטיבי', pct(est.effectiveRate)],
            ['להפריש בחודש', money(est.monthlySetAside)],
          ].map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-muted">{k}</dt><dd className="tabular-nums">{v}</dd></div>)}
          {s.businessType === 'patur' && sim > s.paturCeiling && <p className="pt-2 text-neon-orange">מעל תקרת הפטור: בהכנסה כזו תהיה עוסק מורשה ותגבה מע״מ.</p>}
        </dl>
      </Card>

      <Card className="lg:col-span-2">
        <h3 className="mb-1 text-title3 font-semibold">פרמטרים של החוק</h3>
        <p className="mb-4 text-subheadline text-muted">ערכי ברירת המחדל הם של 2025 (מדרגות המס ונקודות הזיכוי מוקפאות עד 2027). כדאי לוודא מול רו״ח בתחילת כל שנה.</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {num('paturCeiling', 'תקרת עוסק פטור ₪')}
          {num('vatRate', 'שיעור מע״מ', '0.18')}
          {num('creditPointValue', 'שווי נקודת זיכוי ₪ לשנה')}
          {num('blDeductibleShare', 'חלק מוכר מביטוח לאומי')}
          {num('blReducedCeiling', 'ב״ל: תקרת שיעור מופחת ₪/חודש')}
          {num('blReducedRate', 'ב״ל: שיעור מופחת')}
          {num('blFullRate', 'ב״ל: שיעור מלא')}
          {num('blMaxIncome', 'ב״ל: הכנסה מרבית ₪/חודש')}
        </div>
        <h4 className="mb-2 mt-5 text-callout text-muted">מדרגות מס הכנסה (שנתי)</h4>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {s.brackets.map((b, i) => (
            <div key={i} className="flex items-center gap-2 rounded-sm border border-line p-2 text-callout">
              <input type="number" dir="ltr" className="w-20 bg-transparent outline-none" value={b.upTo ?? ''} placeholder="∞" onChange={(e) => set('brackets', s.brackets.map((x, j) => (j === i ? { ...x, upTo: e.target.value ? Number(e.target.value) : null } : x)))} />
              <span className="text-muted">₪ →</span>
              <input type="number" step="0.01" dir="ltr" className="w-14 bg-transparent outline-none" value={b.rate} onChange={(e) => set('brackets', s.brackets.map((x, j) => (j === i ? { ...x, rate: Number(e.target.value) } : x)))} />
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-2 lg:col-span-2">
        <Button tone="primary" icon="checkmark" disabled={JSON.stringify(s) === saved} onClick={async () => { const r = await rest.put<TaxSettings>('/api/settings/tax', s); setS(r); setSaved(JSON.stringify(r)); }}>שמור</Button>
        <Button onClick={() => setS({ ...DEFAULT_TAX, businessType: s.businessType, advanceTaxMonthly: s.advanceTaxMonthly, advanceBlMonthly: s.advanceBlMonthly, advanceFrequency: s.advanceFrequency, creditPoints: s.creditPoints })}>החזר פרמטרים לברירת מחדל</Button>
      </div>
    </div>
  );
}
