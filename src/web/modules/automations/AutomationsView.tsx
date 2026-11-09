// ManyChat-style automations: rules, a live preview, and a tester.
import { useEffect, useState } from 'react';
import { MATCH_MODES, MATCH_MODE_LABELS, TRIGGERS, TRIGGER_LABELS, type AutomationRule, type Trigger } from '../../../shared/automation.ts';
import { rest, useList } from '../../lib/rest.ts';
import { useStore } from '../../store.tsx';
import { FormDrawer } from '../../components/FormDrawer.tsx';
import { Sym } from '../../components/Sym.tsx';
import { Button, Field, inputCls, Segmented } from '../../components/ui.tsx';

interface Automation extends AutomationRule { videoId: number | null; sentCount: number; clickCount: number }
interface Media { id: string; caption?: string; permalink: string; thumbnail_url?: string; media_url?: string; timestamp: string }
interface SimResult { matched: boolean; ruleName?: string; publicReply?: string | null; dm?: { text: string; linkUrl: string | null; linkLabel: string | null } | null; gatedByFollow?: boolean }

const TRIGGER_ICONS: Record<Trigger, string> = { comment: 'text.bubble.fill', dm: 'bubble.left.and.bubble.right.fill', story_reply: 'arrowshape.turn.up.left.fill', story_mention: 'at' };

export function AutomationsView() {
  const autos = useList<Automation>('/api/automations');
  const { videos } = useStore();
  const [editing, setEditing] = useState<Partial<Automation> | null>(null);
  const [media, setMedia] = useState<Media[] | null>(null);
  useEffect(() => void rest.get<Media[]>('/api/accounts/instagram/media').then(setMedia).catch(() => setMedia(null)), []);

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-start gap-3 rounded-md border border-neon-orange/30 bg-neon-orange/[0.06] p-4 text-callout">
        <Sym name="pause.fill" size={14} className="mt-0.5 text-neon-orange" />
        <div>
          <b>האוטומציות נשמרות, אבל עוד לא רצות בזמן אמת.</b>
          <span className="text-muted"> כדי לענות להודעות צריך מקבל webhooks שדולק כל הזמן (שרת ה־Air או רכיב בענן). נגדיר אותו בהמשך, והכללים שכאן יתחילו לעבוד בלי שינוי.</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button tone="primary" icon="plus" onClick={() => setEditing({ trigger: 'comment', matchMode: 'contains', enabled: true, keywords: [], publicReplies: [], mediaIds: [], dmText: '' })}>אוטומציה חדשה</Button>
        <span className="text-callout text-muted">{autos.items.filter((a) => a.enabled).length} פעילות מתוך {autos.items.length}</span>
      </div>

      {autos.loaded && autos.items.length === 0 && (
        <p className="text-body text-muted">עוד אין אוטומציות. הדוגמה הקלאסית: מי שכותב "מדריך" בתגובה מקבל לינק ב־DM.</p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {autos.items.map((a) => (
          <section key={a.id} className={`rounded-lg border border-line bg-surface p-6 transition ${a.enabled ? '' : 'opacity-50'}`}>
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-sm bg-tint/20 text-tint"><Sym name={TRIGGER_ICONS[a.trigger]} size={17} /></div>
              <button onClick={() => setEditing(a)} className="min-w-0 flex-1 text-start">
                <div className="text-title3 font-semibold">{a.name}</div>
                <div className="mt-0.5 text-subheadline text-muted">
                  {TRIGGER_LABELS[a.trigger]} · {a.matchMode === 'any' ? 'כל הודעה' : a.keywords.map((k) => `"${k}"`).join(', ')}
                  {a.trigger === 'comment' && (a.mediaIds.length ? ` · ${a.mediaIds.length} פוסטים` : ' · כל הפוסטים')}
                </div>
                <div className="mt-2 flex gap-3 text-subheadline text-muted">
                  {a.linkUrl && <span className="flex items-center gap-1"><Sym name="link" size={10} />{a.linkLabel || 'לינק'}</span>}
                  {a.requireFollow && <span className="flex items-center gap-1"><Sym name="person.crop.circle.badge.checkmark" size={11} />רק לעוקבים</span>}
                  <span>{a.sentCount} נשלחו</span>
                </div>
              </button>
              <label className="relative inline-flex cursor-pointer items-center" title={a.enabled ? 'פעילה' : 'כבויה'}>
                <input type="checkbox" className="peer sr-only" checked={a.enabled} onChange={(e) => autos.update(a.id, { enabled: e.target.checked })} />
                <span className="h-5 w-9 rounded-full bg-fill-strong transition peer-checked:bg-neon-green" />
                <span className="absolute right-0.5 size-4 rounded-full bg-white shadow-sm transition peer-checked:-translate-x-4" />
              </label>
            </div>
          </section>
        ))}
      </div>

      <Tester />

      {editing && (
        <FormDrawer
          title={editing.id ? editing.name ?? 'אוטומציה' : 'אוטומציה חדשה'}
          icon="bubble.left.and.bubble.right.fill"
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(v) => (editing.id ? autos.update(editing.id, v) : autos.create({ ...editing, ...v }))}
          onDelete={editing.id ? () => autos.remove(editing.id!) : undefined}
          fields={[
            { key: 'name', label: 'שם', type: 'text', placeholder: 'למשל: מדריך דופמין' },
            { key: 'trigger', label: 'מתי', type: 'select', allowEmpty: false, options: TRIGGERS.map((t) => ({ value: t, label: TRIGGER_LABELS[t] })) },
            { key: 'matchMode', label: 'התאמה', type: 'segmented', options: MATCH_MODES.map((m) => ({ value: m, label: MATCH_MODE_LABELS[m] })) },
            { key: 'keywords', label: 'מילות מפתח', type: 'custom', render: (d, set) => d.matchMode === 'any' ? null : <ListInput label="מילות מפתח" hint="ה, ו, ב… בתחילת מילה נתפסים אוטומטית" values={d.keywords ?? []} onChange={(v) => set('keywords', v)} placeholder="מדריך" /> },
            { key: 'mediaIds', label: 'פוסטים', type: 'custom', render: (d, set) => d.trigger === 'comment' ? <MediaPicker media={media} values={d.mediaIds ?? []} onChange={(v) => set('mediaIds', v)} /> : null },
            { key: 'videoId', label: 'הסרטון ב־CORTEX (לסטטיסטיקה)', type: 'select', options: videos.map((v) => ({ value: v.id, label: v.title })) },
            { key: 'publicReplies', label: 'תגובה פומבית', type: 'custom', render: (d, set) => d.trigger === 'comment' ? <ListInput label="תגובה פומבית (נבחרת אחת באקראי)" hint="{{username}} = שם המגיב" values={d.publicReplies ?? []} onChange={(v) => set('publicReplies', v)} placeholder="שלחתי לך בפרטי 🙌" multiline /> : null },
            { key: 'dmText', label: 'ההודעה בפרטי', type: 'textarea', placeholder: 'היי {{username}}! הנה המדריך שביקשת:' },
            { key: 'linkUrl', label: 'לינק', type: 'url', half: true },
            { key: 'linkLabel', label: 'טקסט הכפתור', type: 'text', half: true, placeholder: 'למדריך' },
            { key: 'requireFollow', label: 'לשלוח את הלינק רק לעוקבים', type: 'bool' },
            { key: 'notFollowingText', label: 'הודעה למי שלא עוקב', type: 'custom', render: (d, set) => d.requireFollow ? <Field label="הודעה למי שלא עוקב"><textarea rows={2} className={inputCls} placeholder="כדי לקבל את הלינק, עקבו אחריי ושלחו שוב 🙏" value={d.notFollowingText ?? ''} onChange={(e) => set('notFollowingText', e.target.value)} /></Field> : null },
            { key: 'preview', label: 'תצוגה מקדימה', type: 'custom', render: (d) => <Preview a={d} /> },
          ]}
        />
      )}
    </div>
  );
}

function ListInput({ label, hint, values, onChange, placeholder, multiline }: { label: string; hint?: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string; multiline?: boolean }) {
  const [draft, setDraft] = useState('');
  const add = () => { if (draft.trim()) { onChange([...values, draft.trim()]); setDraft(''); } };
  return (
    <Field label={label} hint={hint && <span className="text-subheadline">{hint}</span>}>
      <div className={`mb-2 flex flex-wrap gap-1.5 ${multiline ? 'flex-col' : ''}`}>
        {values.map((v, i) => (
          <span key={i} className="flex items-center gap-1.5 rounded-sm bg-fill-strong px-2.5 py-1 text-callout">
            <span className="flex-1">{v}</span>
            <button type="button" className="text-muted hover:text-neon-pink" onClick={() => onChange(values.filter((_, j) => j !== i))}><Sym name="xmark" size={9} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input className={inputCls} placeholder={placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
        <Button icon="plus" onClick={add}>הוסף</Button>
      </div>
    </Field>
  );
}

function MediaPicker({ media, values, onChange }: { media: Media[] | null; values: string[]; onChange: (v: string[]) => void }) {
  if (!media) return <Field label="פוסטים"><p className="text-subheadline text-muted">כל הפוסטים. כדי לבחור פוסט מסוים, חבר את Instagram במסך החשבונות.</p></Field>;
  const toggle = (id: string) => onChange(values.includes(id) ? values.filter((x) => x !== id) : [...values, id]);
  return (
    <Field label="פוסטים" hint={<span className="text-subheadline">{values.length ? `${values.length} נבחרו` : 'אף אחד = כל הפוסטים'}</span>}>
      <div className="grid max-h-56 grid-cols-5 gap-1.5 overflow-y-auto">
        {media.map((m) => (
          <button key={m.id} type="button" onClick={() => toggle(m.id)} title={m.caption?.slice(0, 80)} className={`relative aspect-[9/16] overflow-hidden rounded-sm bg-fill ring-2 ${values.includes(m.id) ? 'ring-tint' : 'ring-transparent'}`}>
            {(m.thumbnail_url || m.media_url) && <img src={m.thumbnail_url || m.media_url} alt="" className="size-full object-cover" />}
            {values.includes(m.id) && <span className="absolute left-1 top-1 rounded-full bg-accent p-0.5"><Sym name="checkmark" size={9} /></span>}
          </button>
        ))}
      </div>
    </Field>
  );
}

// What the follower sees, as Instagram-like bubbles.
function Preview({ a }: { a: Record<string, any> }) {
  const fill = (s: string) => s.replaceAll('{{username}}', '@dana');
  return (
    <Field label="מה העוקב יראה">
      <div className="space-y-2 rounded-md bg-bg p-4">
        {a.trigger === 'comment' && a.publicReplies?.[0] && (
          <div className="text-subheadline text-muted"><span className="font-semibold text-ink">yahav</span> {fill(a.publicReplies[0])}</div>
        )}
        {(a.dmText || a.linkUrl) && (
          <div className="ms-auto max-w-[80%] space-y-1.5 rounded-md rounded-ee-xs bg-gradient-to-br from-[#7b3dfa] to-[#c13dfa] px-3.5 py-2.5 text-body text-white">
            <div className="whitespace-pre-wrap">{fill(a.dmText || '')}</div>
            {a.linkUrl && <div className="rounded-sm bg-white/20 py-1.5 text-center text-callout font-semibold">{a.linkLabel || 'פתח'}</div>}
          </div>
        )}
        {!a.dmText && !a.linkUrl && <p className="text-subheadline text-muted">כתוב הודעה כדי לראות תצוגה.</p>}
      </div>
    </Field>
  );
}

function Tester() {
  const [trigger, setTrigger] = useState<Trigger>('comment');
  const [text, setText] = useState('');
  const [follows, setFollows] = useState(true);
  const [res, setRes] = useState<SimResult | null>(null);
  const run = async () => setRes(await rest.post<SimResult>('/api/automations/simulate', { trigger, text, follows, username: 'dana' }));
  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <h3 className="mb-1 text-title3 font-semibold">בדיקה</h3>
      <p className="mb-3 text-subheadline text-muted">כתוב תגובה או הודעה ותראה איזו אוטומציה הייתה עונה ומה הייתה שולחת. שום דבר לא נשלח.</p>
      <div className="mb-3 max-w-lg"><Segmented<Trigger> value={trigger} onChange={setTrigger} options={TRIGGERS.map((t) => ({ value: t, label: TRIGGER_LABELS[t] }))} /></div>
      <div className="flex gap-2">
        <input className={inputCls} placeholder="למשל: אפשר את המדריך?" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} />
        <label className="flex shrink-0 items-center gap-1.5 text-callout"><input type="checkbox" checked={follows} onChange={(e) => setFollows(e.target.checked)} />עוקב</label>
        <Button tone="primary" icon="play.fill" onClick={run}>בדוק</Button>
      </div>
      {res && (
        <div className="mt-3 rounded-md bg-fill-hover p-3 text-callout">
          {!res.matched ? <p className="text-muted">אף אוטומציה לא הייתה עונה.</p> : (
            <div className="space-y-1">
              <p><b>{res.ruleName}</b>{res.gatedByFollow && <span className="text-neon-orange"> · לא עוקב, הלינק לא נשלח</span>}</p>
              {res.publicReply && <p className="text-muted">תגובה פומבית: {res.publicReply}</p>}
              {res.dm && <p className="text-muted">DM: {res.dm.text}{res.dm.linkUrl && <span dir="ltr"> → {res.dm.linkUrl}</span>}</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
