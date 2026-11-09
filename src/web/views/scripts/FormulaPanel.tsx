import { useEffect, useState } from 'react';
import { api } from '../../api.ts';
import { Button, Field, inputCls } from '../../components/ui.tsx';

export function FormulaPanel({ wps, onWps }: { wps: number; onWps: (n: number) => void }) {
  const [formula, setFormula] = useState('');
  const [saved, setSaved] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [wpsDraft, setWpsDraft] = useState(String(wps));
  useEffect(() => void api.formula().then((f) => (setFormula(f.formula), setSaved(f.formula), setIsDefault(f.isDefault))), []);

  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-body text-muted">הנוסחה והסגנון ש־Claude מקבל בכל תסריט. כאן משנים את הכללים עצמם. לקחים מהנתונים נכנסים לספר הלקחים.</p>
      <textarea rows={22} className={`${inputCls} font-mono text-callout leading-relaxed`} value={formula} onChange={(e) => setFormula(e.target.value)} />
      <div className="flex gap-2">
        <Button tone="primary" icon="checkmark" disabled={formula === saved} onClick={async () => { const r = await api.saveFormula(formula); setSaved(r.formula); setIsDefault(false); }}>שמור</Button>
        {!isDefault && (
          <Button onClick={async () => { const r = await api.saveFormula(null); setFormula(r.formula); setSaved(r.formula); setIsDefault(true); }}>חזור לברירת המחדל</Button>
        )}
      </div>

      <div className="max-w-xs">
        <Field label="קצב קריינות (מילים לשנייה)" hint={<span>לבדיקת התזמון</span>}>
          <div className="flex gap-2">
            <input type="number" step="0.1" min="1" max="5" dir="ltr" className={inputCls} value={wpsDraft} onChange={(e) => setWpsDraft(e.target.value)} />
            <Button disabled={Number(wpsDraft) === wps} onClick={async () => onWps((await api.saveWps(Number(wpsDraft))).wps)}>שמור</Button>
          </div>
        </Field>
        <p className="mt-2 text-subheadline text-muted">בשלב 3 הקצב יכויל אוטומטית מהקלטות אמיתיות.</p>
      </div>
    </div>
  );
}
