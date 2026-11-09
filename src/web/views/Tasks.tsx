// General tasks: content, business, admin and personal, with due dates and links.
import { useState, type FormEvent } from 'react';
import { TASK_AREAS, TASK_AREA_LABELS, TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS, type TaskArea } from '../../shared/business.ts';
import { useList } from '../lib/rest.ts';
import { useStore } from '../store.tsx';
import { addDays, fmtDay, sameDay } from '../lib/time.ts';
import type { Deal, Task } from '../types.ts';
import { FormDrawer } from '../components/FormDrawer.tsx';
import { Sym } from '../components/Sym.tsx';
import { Button, inputCls, Segmented } from '../components/ui.tsx';

const AREA_ICONS: Record<TaskArea, string> = { content: 'video.fill', business: 'briefcase.fill', admin: 'doc.text.fill', personal: 'person.fill' };
const QUICK_DUE = [
  { label: 'היום', days: 0 },
  { label: 'מחר', days: 1 },
  { label: 'בשבוע', days: 7 },
];

export function Tasks() {
  const tasks = useList<Task>('/api/tasks');
  const deals = useList<Deal>('/api/deals');
  const { videos } = useStore();
  const [filter, setFilter] = useState<TaskArea | 'all'>('all');
  const [title, setTitle] = useState('');
  const [area, setArea] = useState<TaskArea>('content');
  const [due, setDue] = useState<number | null>(null);
  const [editing, setEditing] = useState<Partial<Task> | null>(null);
  const [showDone, setShowDone] = useState(false);

  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const visible = tasks.items.filter((t) => filter === 'all' || t.area === filter);
  const open = visible.filter((t) => t.status !== 'done');
  const by = (pred: (t: Task) => boolean) =>
    open.filter(pred).sort((a, b) => (a.dueAt ?? '9').localeCompare(b.dueAt ?? '9') || TASK_PRIORITIES.indexOf(b.priority) - TASK_PRIORITIES.indexOf(a.priority));
  const groups = [
    { title: 'באיחור', tone: 'text-neon-pink', items: by((t) => !!t.dueAt && new Date(t.dueAt) < today) },
    { title: 'היום', tone: 'text-neon-orange', items: by((t) => !!t.dueAt && sameDay(new Date(t.dueAt), today)) },
    { title: 'השבוע', tone: '', items: by((t) => !!t.dueAt && new Date(t.dueAt) > addDays(today, 1) && new Date(t.dueAt) < addDays(today, 8)) },
    { title: 'מחר', tone: '', items: by((t) => !!t.dueAt && sameDay(new Date(t.dueAt), addDays(today, 1))) },
    { title: 'בהמשך', tone: '', items: by((t) => !!t.dueAt && new Date(t.dueAt) >= addDays(today, 8)) },
    { title: 'בלי תאריך', tone: '', items: by((t) => !t.dueAt) },
  ].sort((a, b) => ['באיחור', 'היום', 'מחר', 'השבוע', 'בהמשך', 'בלי תאריך'].indexOf(a.title) - ['באיחור', 'היום', 'מחר', 'השבוע', 'בהמשך', 'בלי תאריך'].indexOf(b.title));
  const done = visible.filter((t) => t.status === 'done').sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''));

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const dueAt = due == null ? null : new Date(addDays(today, due).setHours(12)).toISOString();
    await tasks.create({ title: title.trim(), area, dueAt });
    setTitle('');
  }

  return (
    <div className="max-w-4xl space-y-6">
      <form onSubmit={add} className="space-y-3 rounded-lg border border-line bg-surface p-6">
        <div className="flex gap-2">
          <input className={inputCls} placeholder="משימה חדשה… (Enter)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button type="submit" tone="primary" icon="plus">הוסף</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-callout">
          {TASK_AREAS.map((a) => (
            <button type="button" key={a} onClick={() => setArea(a)} className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${area === a ? 'bg-fill-strong text-ink' : 'text-muted hover:bg-fill-hover'}`}>
              <Sym name={AREA_ICONS[a]} size={12} /> {TASK_AREA_LABELS[a]}
            </button>
          ))}
          <span className="mx-2 h-4 w-px bg-line" />
          {QUICK_DUE.map((q) => (
            <button type="button" key={q.label} onClick={() => setDue(due === q.days ? null : q.days)} className={`rounded-full px-3 py-1 ${due === q.days ? 'bg-tint/30 text-ink' : 'text-muted hover:bg-fill-hover'}`}>
              {q.label}
            </button>
          ))}
        </div>
      </form>

      <div className="max-w-xl">
        <Segmented<TaskArea | 'all'> value={filter} onChange={setFilter} options={[{ value: 'all', label: 'הכול' }, ...TASK_AREAS.map((a) => ({ value: a, label: TASK_AREA_LABELS[a] }))]} />
      </div>

      {open.length === 0 && <p className="text-body text-muted">אין משימות פתוחות.</p>}

      {groups.filter((g) => g.items.length).map((g) => (
        <section key={g.title}>
          <h3 className={`mb-2 text-title3 font-semibold ${g.tone}`}>{g.title} <span className="text-subheadline font-normal text-muted">{g.items.length}</span></h3>
          <ul className="space-y-1.5">{g.items.map((t) => <Row key={t.id} t={t} />)}</ul>
        </section>
      ))}

      {done.length > 0 && (
        <section>
          <button onClick={() => setShowDone((s) => !s)} className="mb-2 flex items-center gap-2 text-body text-muted hover:text-ink">
            <Sym name={showDone ? 'chevron.down' : 'chevron.left'} size={11} /> בוצעו ({done.length})
          </button>
          {showDone && <ul className="space-y-1.5 opacity-60">{done.slice(0, 50).map((t) => <Row key={t.id} t={t} />)}</ul>}
        </section>
      )}

      {editing && (
        <FormDrawer
          title={editing.id ? 'משימה' : 'משימה חדשה'}
          icon="checklist"
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(v) => (editing.id ? tasks.update(editing.id, v) : tasks.create(v))}
          onDelete={editing.id ? () => tasks.remove(editing.id!) : undefined}
          fields={[
            { key: 'title', label: 'משימה', type: 'text' },
            { key: 'status', label: 'סטטוס', type: 'segmented', options: TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABELS[s] })) },
            { key: 'area', label: 'תחום', type: 'select', allowEmpty: false, options: TASK_AREAS.map((a) => ({ value: a, label: TASK_AREA_LABELS[a] })), half: true },
            { key: 'priority', label: 'עדיפות', type: 'select', allowEmpty: false, options: TASK_PRIORITIES.map((p) => ({ value: p, label: TASK_PRIORITY_LABELS[p] })), half: true },
            { key: 'dueAt', label: 'תאריך יעד', type: 'datetime' },
            { key: 'videoId', label: 'סרטון', type: 'select', options: videos.map((v) => ({ value: v.id, label: v.title })), half: true },
            { key: 'dealId', label: 'שיתוף פעולה', type: 'select', options: deals.items.map((d) => ({ value: d.id, label: d.title })), half: true },
            { key: 'notes', label: 'הערות', type: 'textarea' },
          ]}
        />
      )}
    </div>
  );

  function Row({ t }: { t: Task }) {
    const video = videos.find((v) => v.id === t.videoId);
    const deal = deals.items.find((d) => d.id === t.dealId);
    const overdue = t.status !== 'done' && t.dueAt && new Date(t.dueAt) < today;
    return (
      <li className="group flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5 hover:bg-fill-hover">
        <button onClick={() => tasks.update(t.id, { status: t.status === 'done' ? 'todo' : 'done' })} className={t.status === 'done' ? 'text-neon-green' : 'text-muted hover:text-ink'} title="סמן כבוצע">
          <Sym name={t.status === 'done' ? 'checkmark.circle.fill' : 'circle'} size={20} />
        </button>
        <button onClick={() => setEditing(t)} className="min-w-0 flex-1 text-start">
          <div className={`truncate text-body ${t.status === 'done' ? 'line-through' : ''}`}>{t.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-subheadline text-muted">
            <span className="flex items-center gap-1"><Sym name={AREA_ICONS[t.area]} size={10} />{TASK_AREA_LABELS[t.area]}</span>
            {t.dueAt && <span className={overdue ? 'text-neon-pink' : ''}>{fmtDay.format(new Date(t.dueAt))}</span>}
            {t.status === 'doing' && <span className="text-neon-blue">בעבודה</span>}
            {video && <span className="flex items-center gap-1 truncate"><Sym name="film.fill" size={10} />{video.title}</span>}
            {deal && <span className="flex items-center gap-1 truncate"><Sym name="person.2.fill" size={10} />{deal.title}</span>}
          </div>
        </button>
        {t.priority === 'high' && <Sym name="exclamationmark.circle.fill" size={15} className="text-neon-orange" />}
      </li>
    );
  }
}
