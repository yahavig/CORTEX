// The lessons book: rules that feed every new script.
import { useEffect, useState, type FormEvent } from 'react';
import { LESSON_STATUSES, LESSON_STATUS_LABELS, type LessonStatus } from '../../../shared/constants.ts';
import { api, type Lesson } from '../../api.ts';
import { useJob } from '../../lib/useJob.ts';
import { Button, inputCls } from '../../components/ui.tsx';
import { Sym } from '../../components/Sym.tsx';

const ORDER: LessonStatus[] = ['proposed', 'confirmed', 'hypothesis', 'refuted'];
const HINTS: Record<LessonStatus, string> = {
  proposed: 'Claude הציע. אשר כהשערה או מחק.',
  confirmed: 'כללים. כל תסריט חדש חייב לעמוד בהם.',
  hypothesis: 'שווה לנסות. עוברים ל"מאושר" אחרי 3 סרטונים שתומכים.',
  refuted: 'נבדק ולא עבד. נשמר כדי לא לחזור עליו.',
};

export function LessonsPanel() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [rule, setRule] = useState('');
  const [paste, setPaste] = useState('');
  const [showImport, setShowImport] = useState(false);
  const load = () => api.lessons().then(setLessons);
  const { job, setJob, active } = useJob(() => (load(), setPaste('')));
  useEffect(() => void load(), []);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!rule.trim()) return;
    await api.createLesson({ rule: rule.trim(), status: 'hypothesis' });
    setRule('');
    load();
  }
  const patch = async (id: number, p: Partial<Lesson>) => {
    const row = await api.updateLesson(id, p);
    setLessons((ls) => ls.map((l) => (l.id === id ? row : l)));
  };
  const remove = async (id: number) => {
    await api.deleteLesson(id);
    setLessons((ls) => ls.filter((l) => l.id !== id));
  };

  return (
    <div className="max-w-3xl space-y-6">
      <p className="text-body text-muted">
        כל תסריט ש־Claude כותב מקבל את הלקחים המאושרים וההשערות. הספר נשמר גם כקובץ ב־<span dir="ltr">yahav-brand/lessons/lessons.md</span>.
      </p>

      <form onSubmit={add} className="flex gap-2">
        <input className={inputCls} placeholder="לקח חדש, למשל: הוק שמתחיל בשאלה על הצופה מחזיק יותר מהוק עם עובדה" value={rule} onChange={(e) => setRule(e.target.value)} />
        <Button type="submit" tone="primary" icon="plus">הוסף</Button>
        <Button icon="tray.and.arrow.down.fill" onClick={() => setShowImport((s) => !s)}>ייבוא מניתוח</Button>
      </form>

      {showImport && (
        <div className="space-y-3 rounded-md border border-line bg-surface p-4">
          <p className="text-callout text-muted">הדבק ניתוח ידני שעשית (נתוני Reel insights, סיכום משיחה עם Claude). Claude יחלץ ממנו לקחים, והם יופיעו כאן כ"הוצע".</p>
          <textarea rows={8} className={inputCls} value={paste} onChange={(e) => setPaste(e.target.value)} disabled={active} />
          <div className="flex items-center gap-3">
            <Button tone="primary" icon="sparkles" disabled={active || !paste.trim()} onClick={async () => setJob(await api.extractLessons(paste))}>חלץ לקחים</Button>
            {active && <span className="text-callout text-muted">Claude קורא…</span>}
            {job?.status === 'done' && <span className="text-callout text-neon-green">נוספו {(job.output as { proposed: number }).proposed} הצעות</span>}
            {job?.status === 'failed' && <span className="text-callout text-neon-pink">{job.error}</span>}
          </div>
        </div>
      )}

      {lessons.length === 0 && <p className="text-body text-muted">הספר ריק. הוסף לקח ראשון, או ייבא ניתוח שעשית.</p>}

      {ORDER.map((status) => {
        const items = lessons.filter((l) => l.status === status);
        if (!items.length) return null;
        return (
          <section key={status}>
            <h3 className="mb-1 text-title3 font-semibold">
              {LESSON_STATUS_LABELS[status]} <span className="text-subheadline font-normal text-muted">{items.length}</span>
            </h3>
            <p className="mb-2 text-subheadline text-muted">{HINTS[status]}</p>
            <ul className="space-y-2">
              {items.map((l) => (
                <li key={l.id} className="group flex items-start gap-3 rounded-md border border-line bg-surface p-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <input className="w-full bg-transparent text-body outline-none" defaultValue={l.rule} onBlur={(e) => e.target.value.trim() && e.target.value !== l.rule && patch(l.id, { rule: e.target.value })} />
                    <input className="w-full bg-transparent text-callout text-muted outline-none placeholder:text-muted/40" placeholder="ראיות: איזה סרטון, אילו מספרים" defaultValue={l.detail ?? ''} onBlur={(e) => e.target.value !== (l.detail ?? '') && patch(l.id, { detail: e.target.value })} />
                  </div>
                  {status === 'proposed' ? (
                    <Button icon="hand.thumbsup.fill" onClick={() => patch(l.id, { status: 'hypothesis' })}>אשר</Button>
                  ) : (
                    <select className="rounded-sm border border-line bg-fill px-2 py-1 text-subheadline" value={l.status} onChange={(e) => patch(l.id, { status: e.target.value as LessonStatus })}>
                      {LESSON_STATUSES.map((s) => <option key={s} value={s}>{LESSON_STATUS_LABELS[s]}</option>)}
                    </select>
                  )}
                  <button className="p-1.5 text-muted opacity-0 transition group-hover:opacity-100 hover:text-neon-pink" onClick={() => remove(l.id)} title="מחק">
                    <Sym name="trash.fill" size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
