// One video's script: generate with Claude, pick a hook, edit lines with live timing, approve.
import { useCallback, useEffect, useState } from 'react';
import { SCRIPT_SECTIONS, SECTION_LABELS, STAGE_LABELS, type ScriptLine, type ScriptSection } from '../../../shared/constants.ts';
import { api, type Script, type Video } from '../../api.ts';
import { useStore } from '../../store.tsx';
import { useJob } from '../../lib/useJob.ts';
import { fmtSec, sectionEnd, timeLines, wordCount } from '../../lib/timing.ts';
import { fmtFull } from '../../lib/time.ts';
import { Button, Field, inputCls } from '../../components/ui.tsx';
import { Sym } from '../../components/Sym.tsx';
import { Thumb } from '../../components/Thumb.tsx';

const SECTION_COLORS: Record<ScriptSection, string> = {
  hook: 'bg-neon-pink/20 text-neon-pink',
  promise: 'bg-neon-orange/20 text-neon-orange',
  mechanism: 'bg-tint/25 text-tint',
  research: 'bg-neon-blue/20 text-neon-blue',
  challenge: 'bg-neon-green/20 text-neon-green',
};

export function ScriptEditor({ video, wps }: { video: Video; wps: number }) {
  const { update } = useStore();
  const [versions, setVersions] = useState<Script[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState<Script | null>(null);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async (pick?: number) => {
    const list = await api.scripts(video.id);
    setVersions(list);
    const chosen = list.find((s) => s.id === pick) ?? list.find((s) => s.approved) ?? list[0] ?? null;
    setSelected(chosen?.id ?? null);
    setDraft(chosen);
  }, [video.id]);

  const { job, setJob, active } = useJob(async (j) => {
    if (j.status === 'done') {
      await load((j.output as { scriptId: number }).scriptId);
      setFeedback('');
      // The job may have moved the card from idea to script.
      const fresh = (await api.videos()).find((v) => v.id === video.id);
      if (fresh && fresh.stage !== video.stage) void update(video.id, { stage: fresh.stage });
    }
  });

  useEffect(() => {
    setJob(null);
    void load();
    // Resume watching a job that is still running for this video.
    api.jobs(video.id).then((jobs) => {
      const running = jobs.find((j) => j.kind === 'script' && (j.status === 'queued' || j.status === 'running'));
      if (running) setJob(running);
    });
  }, [video.id]);

  const current = versions.find((s) => s.id === selected) ?? null;
  const dirty = !!draft && !!current && JSON.stringify([draft.lines, draft.hook, draft.caption, draft.source]) !== JSON.stringify([current.lines, current.hook, current.caption, current.source]);
  const lines = draft?.lines ?? [];
  const timed = timeLines(lines, wps);
  const hookEnd = sectionEnd(timed, 'hook');
  const promiseEnd = sectionEnd(timed, 'promise');
  const total = timed.length ? timed[timed.length - 1]!.end : 0;
  const words = lines.reduce((n, l) => n + wordCount(l.text), 0);

  const setLine = (i: number, patch: Partial<ScriptLine>) => setDraft((d) => d && { ...d, lines: (d.lines ?? []).map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const removeLine = (i: number) => setDraft((d) => d && { ...d, lines: (d.lines ?? []).filter((_, j) => j !== i) });
  const addLine = (after: number) =>
    setDraft((d) => {
      if (!d) return d;
      const ls = [...(d.lines ?? [])];
      ls.splice(after + 1, 0, { section: ls[after]?.section ?? 'mechanism', tag: 'calm', text: '', visual: '' });
      return { ...d, lines: ls };
    });

  function pickHook(h: string) {
    setDraft((d) => {
      if (!d) return d;
      const ls = [...(d.lines ?? [])];
      const i = ls.findIndex((l) => l.section === 'hook');
      if (i >= 0) ls[i] = { ...ls[i]!, text: h };
      else ls.unshift({ section: 'hook', tag: 'curious, direct', text: h, visual: '' });
      return { ...d, hook: h, lines: ls };
    });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const row = await api.updateScript(draft.id, { lines: draft.lines, hook: draft.hook, caption: draft.caption, source: draft.source });
      setVersions((vs) => vs.map((s) => (s.id === row.id ? row : s)));
      setDraft(row);
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    if (!draft) return;
    if (dirty) await save();
    const res = await api.approveScript(draft.id);
    await load(draft.id);
    void update(video.id, { stage: res.video.stage, caption: res.video.caption });
    setFlash(res.file ? `אושר. נשמר ל־${res.file.split('/').slice(-2).join('/')}` : 'אושר. הכיתוב הועתק לכרטיס. (אין עדיין תיקיית פרויקט, אז SCRIPT.md לא נכתב)');
    setTimeout(() => setFlash(null), 6000);
  }

  async function generate() {
    setJob(await api.generateScript(video.id, feedback.trim() || undefined));
  }

  async function copyVoiceover() {
    await navigator.clipboard.writeText(lines.map((l) => `[${l.tag}] ${l.text}`).join('\n\n'));
    setFlash('הטקסט ל־ElevenLabs הועתק');
    setTimeout(() => setFlash(null), 2500);
  }

  return (
    <div className="min-w-0 flex-1 space-y-5">
      <header className="flex items-center gap-6">
        <Thumb video={video} size={52} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-title1 font-semibold">{video.title}</h2>
          <div className="text-callout text-muted">
            {STAGE_LABELS[video.stage]}
            {video.mechanism && ` · מנגנון: ${video.mechanism}`}
          </div>
        </div>
        {versions.length > 0 && (
          <div className="flex gap-1">
            {versions.map((s) => (
              <button
                key={s.id}
                onClick={() => (setSelected(s.id), setDraft(s))}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-callout ${s.id === selected ? 'bg-fill-strong text-ink' : 'text-muted hover:bg-fill-hover'}`}
              >
                v{s.version}
                {s.approved && <Sym name="checkmark.circle.fill" size={11} className="text-neon-green" />}
              </button>
            ))}
          </div>
        )}
      </header>

      <section className="rounded-md border border-line bg-surface p-4">
        <div className="flex items-start gap-3">
          <textarea
            rows={versions.length ? 2 : 1}
            className={`${inputCls} flex-1`}
            placeholder={versions.length ? 'מה לשנות בגרסה הבאה? (אופציונלי) למשל: הוק יותר אישי, לקצר את המנגנון' : 'כיוון לתסריט (אופציונלי)'}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={active}
          />
          <Button tone="primary" icon="sparkles" disabled={active} onClick={generate}>
            {versions.length ? 'גרסה חדשה' : 'כתוב עם Claude'}
          </Button>
        </div>
        {active && (
          <p className="mt-3 flex items-center gap-2 text-callout text-muted">
            <span className="size-2 animate-pulse rounded-full bg-accent" />
            Claude כותב ובודק מחקרים ברשת. זה לוקח בערך דקה או שתיים.
          </p>
        )}
        {job?.status === 'failed' && <p className="mt-3 text-callout text-neon-pink">נכשל: {job.error}</p>}
      </section>

      {flash && <div className="rounded-sm bg-neon-green/10 px-4 py-2 text-body text-neon-green">{flash}</div>}

      {!draft && !active && <p className="text-body text-muted">עוד אין תסריט לסרטון הזה.</p>}

      {draft && (
        <>
          <div className="grid grid-cols-4 gap-2">
            <Stat label="אורך משוער" value={fmtSec(total)} warn={total > 50} />
            <Stat label="מילים" value={String(words)} />
            <Stat label="סוף ההוק" value={hookEnd == null ? '—' : fmtSec(hookEnd)} warn={hookEnd != null && hookEnd > 3.5} />
            <Stat label="סוף ההבטחה" value={promiseEnd == null ? '—' : fmtSec(promiseEnd)} warn={promiseEnd == null || promiseEnd > 8} />
          </div>

          {draft.hookOptions && draft.hookOptions.length > 0 && (
            <section>
              <h3 className="mb-2 text-body font-semibold">אפשרויות להוק</h3>
              <div className="grid gap-2">
                {draft.hookOptions.map((h) => (
                  <button key={h} onClick={() => pickHook(h)} className={`rounded-sm border px-4 py-2.5 text-start text-body transition ${draft.hook === h ? 'border-neon-pink/60 bg-neon-pink/10' : 'border-line hover:bg-fill-hover'}`}>
                    {h}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-body font-semibold">קריינות</h3>
              <span className="text-subheadline text-muted">קצב: {wps} מילים לשנייה</span>
              <div className="ms-auto">
                <Button icon="doc.on.doc.fill" onClick={copyVoiceover}>העתק ל־ElevenLabs</Button>
              </div>
            </div>
            {timed.map((l, i) => (
              <div key={i} className="group grid grid-cols-[3.5rem_1fr] gap-3 rounded-md border border-line bg-surface p-3">
                <div className="pt-1 text-center">
                  <div className={`text-subheadline tabular-nums ${l.section === 'promise' && l.end > 8 ? 'text-neon-pink' : 'text-muted'}`}>{fmtSec(l.start)}</div>
                  <select
                    value={l.section}
                    onChange={(e) => setLine(i, { section: e.target.value as ScriptSection })}
                    className={`mt-1 w-full appearance-none rounded-full px-1 py-0.5 text-center text-subheadline outline-none ${SECTION_COLORS[l.section]}`}
                  >
                    {SCRIPT_SECTIONS.map((s) => (
                      <option key={s} value={s}>{SECTION_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <input dir="ltr" className="w-full bg-transparent text-left font-mono text-subheadline text-neon-blue/80 outline-none" value={`[${l.tag}]`} onChange={(e) => setLine(i, { tag: e.target.value.replace(/[[\]]/g, '') })} />
                  <textarea rows={Math.max(1, Math.ceil(l.text.length / 85))} className="w-full resize-none bg-transparent text-title3 leading-relaxed outline-none [field-sizing:content]" value={l.text} onChange={(e) => setLine(i, { text: e.target.value })} />
                  <div className="flex items-center gap-2 text-subheadline text-muted">
                    <Sym name="photo.fill" size={11} />
                    <input className="flex-1 bg-transparent outline-none placeholder:text-muted/50" placeholder="מה רואים על המסך" value={l.visual ?? ''} onChange={(e) => setLine(i, { visual: e.target.value })} />
                    <button className="opacity-0 transition group-hover:opacity-100 hover:text-ink" title="הוסף שורה" onClick={() => addLine(i)}>
                      <Sym name="plus" size={11} />
                    </button>
                    <button className="opacity-0 transition group-hover:opacity-100 hover:text-neon-pink" title="מחק שורה" onClick={() => removeLine(i)}>
                      <Sym name="trash.fill" size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="כיתוב לפוסט">
              <textarea rows={4} className={inputCls} value={draft.caption ?? ''} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} />
            </Field>
            <Field label="מקור להצגה על המסך">
              <textarea dir="auto" rows={4} className={inputCls} value={draft.source ?? ''} onChange={(e) => setDraft({ ...draft, source: e.target.value })} />
            </Field>
          </div>

          {draft.notes && (
            <section className="rounded-md border border-line bg-surface p-4 text-body">
              <h3 className="mb-1 flex items-center gap-2 font-semibold">
                <Sym name="text.bubble.fill" size={14} className="text-tint" /> הערות של Claude
              </h3>
              <p className="whitespace-pre-wrap text-muted">{draft.notes}</p>
            </section>
          )}
          {draft.feedback && <p className="text-callout text-muted">הבקשה לגרסה הזו: {draft.feedback}</p>}

          <footer className="sticky bottom-0 -mx-1 flex items-center gap-2 border-t border-line bg-bg/80 px-1 py-3 backdrop-blur">
            <Button tone="primary" icon="checkmark" disabled={!dirty || saving} onClick={save}>שמור שינויים</Button>
            <Button icon="checkmark.seal.fill" onClick={approve} disabled={saving}>{draft.approved ? 'מאושר ✓ (אשר שוב)' : 'אשר לצילום'}</Button>
            <span className="text-subheadline text-muted">v{draft.version} · {draft.author === 'claude' ? 'Claude' : 'יהב'} · {fmtFull.format(new Date(draft.createdAt))}</span>
          </footer>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-sm border p-3 ${warn ? 'border-neon-pink/40 bg-neon-pink/5' : 'border-line bg-surface'}`}>
      <div className="text-subheadline text-muted">{label}</div>
      <div className={`text-title2 font-semibold tabular-nums ${warn ? 'text-neon-pink' : ''}`}>{value}</div>
    </div>
  );
}
