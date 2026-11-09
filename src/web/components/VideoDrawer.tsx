// Side panel for one video card: all fields, publishing prep status, actions.
import { useEffect, useState } from 'react';
import { MODE_LABELS, PILLAR_LABELS, PILLARS, STAGE_LABELS, VIDEO_MODES, VIDEO_STAGES } from '../../shared/constants.ts';
import { api, type Video, type VideoPatch } from '../api.ts';
import { useStore } from '../store.tsx';
import { fmtFull, fromLocalInput, toLocalInput } from '../lib/time.ts';
import { Button, Field, inputCls, Segmented } from './ui.tsx';
import { SymbolPicker } from './SymbolPicker.tsx';
import { Sym } from './Sym.tsx';
import { Thumb } from './Thumb.tsx';

const CAPTION_LIMIT = 2200; // Instagram caption limit

export function VideoDrawer() {
  const { videos, openId, open } = useStore();
  const video = videos.find((v) => v.id === openId);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && open(null);
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);
  if (!video) return null;
  return (
    <div className="fixed inset-0 z-40 flex" onMouseDown={() => open(null)}>
      <div className="absolute inset-0 bg-scrim backdrop-blur-[2px]" />
      <aside
        onMouseDown={(e) => e.stopPropagation()}
        className="relative ms-auto flex h-full w-[420px] max-w-full flex-col border-s border-line bg-elevated"
      >
        <Editor key={video.id} video={video} />
      </aside>
    </div>
  );
}

function Editor({ video }: { video: Video }) {
  const { update, prepare, remove, open, setScriptVideoId } = useStore();
  const [draft, setDraft] = useState<Video>(video);
  const [projects, setProjects] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);

  useEffect(() => setDraft(video), [video]);
  useEffect(() => void api.projects().then(setProjects).catch(() => {}), []);

  const set = <K extends keyof Video>(k: K, v: Video[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const changed = (Object.keys(draft) as (keyof Video)[]).filter((k) => JSON.stringify(draft[k]) !== JSON.stringify(video[k]));
  const dirty = changed.length > 0;

  async function save(extra: VideoPatch = {}) {
    const patch: VideoPatch = Object.fromEntries(changed.filter((k) => !['prep', 'reminderId', 'updatedAt', 'createdAt', 'id'].includes(k)).map((k) => [k, draft[k]]));
    setBusy(true);
    try {
      await update(video.id, { ...patch, ...extra });
    } finally {
      setBusy(false);
    }
  }

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="flex items-center gap-3 border-b border-line p-5">
        <button type="button" onClick={() => setShowSymbols((s) => !s)} title="בחר אייקון">
          <Thumb video={draft} size={52} />
        </button>
        <input className="flex-1 bg-transparent text-title2 font-semibold outline-none" value={draft.title} onChange={(e) => set('title', e.target.value)} />
        <button type="button" onClick={() => open(null)} className="rounded-full p-2 text-muted hover:bg-fill hover:text-ink">
          <Sym name="xmark" size={14} />
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {showSymbols && <SymbolPicker value={draft.symbol} onChange={(s) => set('symbol', s)} />}

        <div className="grid grid-cols-2 gap-3">
          <Field label="שלב">
            <select className={inputCls} value={draft.stage} onChange={(e) => set('stage', e.target.value as Video['stage'])}>
              {VIDEO_STAGES.map((s) => (
                <option key={s} value={s}>{STAGE_LABELS[s]}</option>
              ))}
            </select>
          </Field>
          <Field label="תאריך ושעת פרסום">
            <input type="datetime-local" className={inputCls} value={toLocalInput(draft.scheduledAt)} onChange={(e) => set('scheduledAt', fromLocalInput(e.target.value))} />
          </Field>
        </div>

        <Field label="תחום">
          <Segmented value={draft.pillar} options={PILLARS.map((p) => ({ value: p, label: PILLAR_LABELS[p] }))} onChange={(p) => set('pillar', p)} />
        </Field>
        <Field label="סוג">
          <Segmented value={draft.mode} options={VIDEO_MODES.map((m) => ({ value: m, label: MODE_LABELS[m] }))} onChange={(m) => set('mode', m)} />
        </Field>

        <Field label="תיקיית פרויקט" hint={<span dir="ltr" className="text-subheadline">yahav-brand/videos/…</span>}>
          <input dir="ltr" list="projects" className={inputCls} value={draft.slug} onChange={(e) => set('slug', e.target.value)} />
          <datalist id="projects">{projects.map((p) => <option key={p} value={p} />)}</datalist>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="סוג הוק">
            <input className={inputCls} placeholder="שאלה, טענה, סיפור…" value={draft.hookType ?? ''} onChange={(e) => set('hookType', e.target.value)} />
          </Field>
          <Field label="המנגנון">
            <input className={inputCls} placeholder="דופמין, השוואה חברתית…" value={draft.mechanism ?? ''} onChange={(e) => set('mechanism', e.target.value)} />
          </Field>
        </div>

        <Field label="הערות">
          <textarea rows={3} className={inputCls} value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>

        <Field label="כיתוב לאינסטגרם" hint={<span className={(draft.caption?.length ?? 0) > CAPTION_LIMIT ? 'text-neon-pink' : ''}>{draft.caption?.length ?? 0}/{CAPTION_LIMIT}</span>}>
          <textarea rows={5} className={inputCls} value={draft.caption ?? ''} onChange={(e) => set('caption', e.target.value)} />
        </Field>

        <div className="space-y-2 rounded-sm border border-line p-3">
          <label className="flex items-center gap-2 text-body">
            <input type="checkbox" checked={draft.isExperiment} onChange={(e) => set('isExperiment', e.target.checked)} />
            ניסוי
          </label>
          {draft.isExperiment && <input className={inputCls} placeholder="מה בודקים? למשל: הוק עם שאלה מול טענה" value={draft.experimentNote ?? ''} onChange={(e) => set('experimentNote', e.target.value)} />}
          <label className="flex items-center gap-2 text-body">
            <input type="checkbox" checked={draft.alsoOnTiktok} onChange={(e) => set('alsoOnTiktok', e.target.checked)} />
            הועלה גם לטיקטוק
          </label>
        </div>

        <PrepPanel video={video} busy={busy} onPrepare={() => run(() => prepare(video.id))} />

        {video.publishedAt && <p className="text-callout text-muted">פורסם: {fmtFull.format(new Date(video.publishedAt))}</p>}
      </div>

      <footer className="flex items-center gap-2 border-t border-line p-4">
        <Button tone="primary" icon="checkmark" disabled={!dirty || busy} onClick={() => save()}>שמור</Button>
        {video.stage === 'ready' && (
          <Button icon="paperplane.fill" disabled={busy} onClick={() => save({ stage: 'published' })}>סמן כפורסם</Button>
        )}
        <Button icon="pencil.and.scribble" onClick={() => { setScriptVideoId(video.id); open(null); location.hash = 'scripts'; }}>תסריט</Button>
        <div className="flex-1" />
        <Button tone="danger" icon="trash.fill" disabled={busy} onClick={() => confirm(`למחוק את "${video.title}"?`) && run(() => remove(video.id))}>מחק</Button>
      </footer>
    </>
  );
}

function PrepPanel({ video, busy, onPrepare }: { video: Video; busy: boolean; onPrepare: () => void }) {
  if (video.stage !== 'ready' && !video.prep) return null;
  const p = video.prep;
  return (
    <div className="space-y-2 rounded-sm border border-line bg-surface p-4 text-callout">
      <div className="flex items-center gap-2 text-body font-semibold">
        <Sym name="icloud.fill" size={15} className="text-neon-blue" /> מוכן לפרסום
      </div>
      {!p && <p className="text-muted">עוד לא הוכן.</p>}
      {p && (
        <>
          <Row ok={!!p.videoFile} text={p.videoFile ? `סרטון: ${p.videoFile.split('/').pop()}` : 'אין קובץ סרטון'} />
          <Row ok={!!p.folder} text={p.folder ? `iCloud Drive › מוכן לפרסום › ${p.folder.split('/').pop()}` : 'אין תיקייה'} />
          <Row ok={!!video.reminderId} text={video.reminderId ? 'תזכורת ב־Reminders (רשימת CORTEX)' : 'אין תזכורת'} />
          {p.warnings.map((w) => <p key={w} className="text-neon-orange">{w}</p>)}
          {p.error && <p className="break-words text-neon-pink">שגיאה: {p.error.slice(0, 300)}</p>}
          <p className="text-muted">עודכן {fmtFull.format(new Date(p.at))}</p>
        </>
      )}
      {video.stage === 'ready' && <Button icon="arrow.clockwise" disabled={busy} onClick={onPrepare}>הכן שוב</Button>}
    </div>
  );
}

function Row({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Sym name={ok ? 'checkmark.circle.fill' : 'exclamationmark.triangle.fill'} size={14} className={ok ? 'text-neon-green' : 'text-neon-orange'} />
      <span className="truncate">{text}</span>
    </div>
  );
}
