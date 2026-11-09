// Weekly calendar: publishing slots per day, drag videos onto a slot to schedule.
import { useState, type DragEvent } from 'react';
import type { Slot } from '../../shared/constants.ts';
import type { Video } from '../api.ts';
import { useStore } from '../store.tsx';
import { DRAG_TYPE, VideoCard } from '../components/VideoCard.tsx';
import { Sym } from '../components/Sym.tsx';
import { Button, inputCls } from '../components/ui.tsx';
import { WEEKDAYS, addDays, atTime, fmtDay, hhmm, sameDay, stageIndex, startOfWeek } from '../lib/time.ts';

const isOpen = (v: Video) => stageIndex(v.stage) >= stageIndex('script') && stageIndex(v.stage) < stageIndex('published');

function dropTarget(onDrop: (id: number) => void, setOver: (b: boolean) => void) {
  return {
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setOver(false);
      const id = Number(e.dataTransfer.getData(DRAG_TYPE));
      if (id) onDrop(id);
    },
  };
}

export function Week() {
  const { videos, slots, update } = useStore();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [editing, setEditing] = useState(false);
  const [poolOver, setPoolOver] = useState(false);
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const scheduledThisWeek = videos.filter((v) => v.scheduledAt && new Date(v.scheduledAt) >= weekStart && new Date(v.scheduledAt) < addDays(weekStart, 7));
  const pool = videos.filter((v) => isOpen(v) && !v.scheduledAt);
  const filledSlots = days.reduce((n, d) => n + slots.filter((s) => s.weekday === d.getDay() && scheduledThisWeek.some((v) => sameTime(v, atTime(d, s.time)))).length, 0);

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center gap-2">
          <button className="rounded-full p-2 hover:bg-fill" onClick={() => setWeekStart(addDays(weekStart, -7))} title="שבוע קודם">
            <Sym name="chevron.right" size={14} />
          </button>
          <button className="rounded-full p-2 hover:bg-fill" onClick={() => setWeekStart(addDays(weekStart, 7))} title="שבוע הבא">
            <Sym name="chevron.left" size={14} />
          </button>
          <h2 className="text-title2 font-semibold">
            {fmtDay.format(days[0]!)} – {fmtDay.format(days[6]!)}
          </h2>
          <span className="text-callout text-muted">
            {filledSlots}/{days.reduce((n, d) => n + slots.filter((s) => s.weekday === d.getDay()).length, 0)} משבצות מלאות
          </span>
          <div className="ms-auto flex gap-2">
            <Button onClick={() => setWeekStart(startOfWeek(new Date()))}>השבוע</Button>
            <Button icon="gearshape.fill" onClick={() => setEditing((e) => !e)}>משבצות</Button>
          </div>
        </div>

        {editing && <SlotEditor onDone={() => setEditing(false)} />}

        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const daySlots = slots.filter((s) => s.weekday === day.getDay());
            const dayVideos = scheduledThisWeek.filter((v) => sameDay(new Date(v.scheduledAt!), day));
            const extras = dayVideos.filter((v) => !daySlots.some((s) => sameTime(v, atTime(day, s.time))));
            const isToday = sameDay(day, today);
            return (
              <div key={day.toISOString()} className={`flex min-h-72 flex-col gap-2 rounded-md border p-2 ${isToday ? 'border-tint/50 bg-tint/[0.04]' : 'border-line bg-fill-hover'}`}>
                <div className="px-1 pb-1">
                  <div className={`text-callout font-semibold ${isToday ? 'text-tint' : ''}`}>{WEEKDAYS[day.getDay()]}</div>
                  <div className="text-subheadline text-muted">{fmtDay.format(day)}</div>
                </div>
                {daySlots.map((s) => (
                  <SlotCell key={s.time} at={atTime(day, s.time)} video={dayVideos.find((v) => sameTime(v, atTime(day, s.time)))} onDrop={(id) => update(id, { scheduledAt: atTime(day, s.time).toISOString() })} />
                ))}
                {extras.map((v) => (
                  <VideoCard key={v.id} video={v} variant="tile" />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <aside
        {...dropTarget((id) => update(id, { scheduledAt: null }), setPoolOver)}
        className={`w-64 shrink-0 self-start rounded-lg border p-3 transition ${poolOver ? 'border-tint/60 bg-tint/5' : 'border-line bg-fill-hover'}`}
      >
        <h3 className="mb-1 px-1 text-title3 font-semibold">לא מתוזמנים</h3>
        <p className="mb-3 px-1 text-subheadline text-muted">גרור למשבצת כדי לתזמן. גרור לכאן כדי לבטל תזמון.</p>
        <div className="flex flex-col gap-2">
          {pool.map((v) => <VideoCard key={v.id} video={v} />)}
          {pool.length === 0 && <p className="px-1 py-4 text-callout text-muted">אין סרטונים פתוחים בלי תאריך.</p>}
        </div>
      </aside>
    </div>
  );
}

function sameTime(v: Video, at: Date) {
  return !!v.scheduledAt && Math.abs(new Date(v.scheduledAt).getTime() - at.getTime()) < 60_000;
}

function SlotCell({ at, video, onDrop }: { at: Date; video?: Video; onDrop: (id: number) => void }) {
  const [over, setOver] = useState(false);
  const past = at < new Date();
  return (
    <div {...dropTarget(onDrop, setOver)} className={`rounded-sm transition ${over ? 'ring-2 ring-tint' : ''}`}>
      {video ? (
        <div className="space-y-1">
          <div className="px-1 text-subheadline text-muted">{hhmm(at)}</div>
          <VideoCard video={video} variant="tile" />
        </div>
      ) : (
        <div className={`grid h-16 place-items-center rounded-sm border border-dashed text-subheadline ${past ? 'border-line/50 text-muted/40' : 'border-neon-orange/40 text-neon-orange/80'}`}>
          {hhmm(at)} · ריק
        </div>
      )}
    </div>
  );
}

function SlotEditor({ onDone }: { onDone: () => void }) {
  const { slots, saveSlots } = useStore();
  const [draft, setDraft] = useState<Slot[]>(slots);
  const toggle = (weekday: number) =>
    setDraft((d) => (d.some((s) => s.weekday === weekday) ? d.filter((s) => s.weekday !== weekday) : [...d, { weekday, time: d[0]?.time ?? '18:00' }]));
  return (
    <div className="mb-4 rounded-md border border-line bg-surface p-4">
      <p className="mb-3 text-callout text-muted">באילו ימים ובאיזו שעה מפרסמים? ({draft.length} בשבוע)</p>
      <div className="mb-4 grid grid-cols-7 gap-2">
        {WEEKDAYS.map((name, weekday) => {
          const slot = draft.find((s) => s.weekday === weekday);
          return (
            <div key={name} className="space-y-2">
              <button onClick={() => toggle(weekday)} className={`w-full rounded-sm py-2 text-callout ${slot ? 'bg-tint/30 text-ink' : 'bg-fill text-muted'}`}>
                {name}
              </button>
              {slot && (
                <input type="time" dir="ltr" className={`${inputCls} px-2 py-1 text-callout`} value={slot.time} onChange={(e) => setDraft((d) => d.map((s) => (s.weekday === weekday ? { ...s, time: e.target.value } : s)))} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Button tone="primary" icon="checkmark" onClick={() => saveSlots(draft).then(onDone)}>שמור</Button>
        <Button onClick={onDone}>ביטול</Button>
      </div>
    </div>
  );
}
