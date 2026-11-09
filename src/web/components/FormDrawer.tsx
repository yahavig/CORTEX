// Generic side-panel form for a record, driven by a field list.
import { useEffect, useState, type ReactNode } from 'react';
import { fileUrl, revealFile, uploadFile } from '../lib/rest.ts';
import { Button, Field, inputCls, Segmented } from './ui.tsx';
import { Sym } from './Sym.tsx';

export type FieldDef =
  | { key: string; label: string; type: 'text' | 'textarea' | 'number' | 'email' | 'url'; placeholder?: string; half?: boolean; dir?: 'ltr' }
  | { key: string; label: string; type: 'date' | 'datetime'; half?: boolean }
  | { key: string; label: string; type: 'select'; options: { value: string | number; label: string }[]; half?: boolean; allowEmpty?: boolean }
  | { key: string; label: string; type: 'segmented'; options: { value: string; label: string }[] }
  | { key: string; label: string; type: 'bool' }
  | { key: string; label: string; type: 'file'; kind: 'expense' | 'receipt'; dateKey?: string }
  | { key: string; label: string; type: 'custom'; render: (draft: Record<string, any>, set: (k: string, v: unknown) => void) => ReactNode };

const toDateInput = (v: unknown) => (v ? new Date(String(v)).toISOString().slice(0, 10) : '');
const toDateTimeInput = (v: unknown) => {
  if (!v) return '';
  const d = new Date(String(v));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function FormDrawer({
  title, icon, fields, initial, onSave, onDelete, onClose, footer,
}: {
  title: string;
  icon?: string;
  fields: FieldDef[];
  initial: Record<string, any>;
  onSave: (values: Record<string, any>) => Promise<unknown>;
  onDelete?: () => Promise<unknown>;
  onClose: () => void;
  footer?: ReactNode;
}) {
  const [draft, setDraft] = useState<Record<string, any>>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      // Send only fields that changed (or everything for a new record).
      const out: Record<string, any> = {};
      for (const f of fields) if (f.type !== 'custom' && (initial.id == null || JSON.stringify(draft[f.key]) !== JSON.stringify(initial[f.key]))) out[f.key] = draft[f.key];
      for (const k of Object.keys(draft)) if (!(k in out) && !fields.some((f) => f.key === k) && JSON.stringify(draft[k]) !== JSON.stringify(initial[k])) out[k] = draft[k];
      await onSave(out);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-scrim backdrop-blur-[2px]" />
      <aside onMouseDown={(e) => e.stopPropagation()} className="relative ms-auto flex h-full w-[420px] max-w-full flex-col border-s border-line bg-elevated">
        <header className="flex items-center gap-3 border-b border-line p-5">
          {icon && <Sym name={icon} size={18} className="text-tint" />}
          <h2 className="flex-1 text-title2 font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-muted hover:bg-fill hover:text-ink">
            <Sym name="xmark" size={14} />
          </button>
        </header>
        <div className="flex flex-1 flex-wrap content-start gap-x-3 gap-y-4 overflow-y-auto p-5">
          {fields.map((f) => (
            <div key={f.key} className={'half' in f && f.half ? 'w-[calc(50%-0.375rem)]' : 'w-full'}>
              <FieldInput f={f} draft={draft} set={set} />
            </div>
          ))}
          {error && <p className="w-full text-callout text-neon-pink">{error}</p>}
        </div>
        <footer className="flex items-center gap-2 border-t border-line p-4">
          <Button tone="primary" icon="checkmark" disabled={busy} onClick={save}>שמור</Button>
          {footer}
          <div className="flex-1" />
          {onDelete && initial.id != null && (
            <Button tone="danger" icon="trash.fill" disabled={busy} onClick={async () => { if (confirm('למחוק?')) { await onDelete(); onClose(); } }}>מחק</Button>
          )}
        </footer>
      </aside>
    </div>
  );
}

function FieldInput({ f, draft, set }: { f: FieldDef; draft: Record<string, any>; set: (k: string, v: unknown) => void }) {
  const v = draft[f.key];
  switch (f.type) {
    case 'text': case 'email': case 'url': case 'number':
      return (
        <Field label={f.label}>
          <input
            type={f.type === 'number' ? 'number' : f.type}
            step="any"
            dir={f.dir ?? (f.type === 'email' || f.type === 'url' || f.type === 'number' ? 'ltr' : undefined)}
            className={inputCls}
            placeholder={f.placeholder}
            value={v ?? ''}
            onChange={(e) => set(f.key, f.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
          />
        </Field>
      );
    case 'textarea':
      return (
        <Field label={f.label}>
          <textarea rows={3} className={inputCls} placeholder={f.placeholder} value={v ?? ''} onChange={(e) => set(f.key, e.target.value)} />
        </Field>
      );
    case 'date':
      return (
        <Field label={f.label}>
          <input type="date" className={inputCls} value={toDateInput(v)} onChange={(e) => set(f.key, e.target.value ? new Date(e.target.value + 'T12:00:00').toISOString() : null)} />
        </Field>
      );
    case 'datetime':
      return (
        <Field label={f.label}>
          <input type="datetime-local" className={inputCls} value={toDateTimeInput(v)} onChange={(e) => set(f.key, e.target.value ? new Date(e.target.value).toISOString() : null)} />
        </Field>
      );
    case 'select':
      return (
        <Field label={f.label}>
          <select className={inputCls} value={v ?? ''} onChange={(e) => set(f.key, e.target.value === '' ? null : typeof f.options[0]?.value === 'number' ? Number(e.target.value) : e.target.value)}>
            {(f.allowEmpty ?? true) && <option value="">—</option>}
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      );
    case 'segmented':
      return (
        <Field label={f.label}>
          <Segmented value={v} options={f.options} onChange={(x) => set(f.key, x)} />
        </Field>
      );
    case 'bool':
      return (
        <label className="flex items-center gap-2 text-body">
          <input type="checkbox" checked={!!v} onChange={(e) => set(f.key, e.target.checked)} />
          {f.label}
        </label>
      );
    case 'file':
      return <FileInput label={f.label} path={v} onChange={(p) => set(f.key, p)} kind={f.kind} date={f.dateKey ? draft[f.dateKey] : null} />;
    case 'custom':
      return <>{f.render(draft, set)}</>;
  }
}

function FileInput({ label, path, onChange, kind, date }: { label: string; path: string | null; onChange: (p: string | null) => void; kind: 'expense' | 'receipt'; date: string | null }) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function take(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      onChange(await uploadFile(file, kind, date));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const isImage = path && /\.(png|jpe?g|webp|heic)$/i.test(path);
  return (
    <Field label={label}>
      {path ? (
        <div className="space-y-2 rounded-sm border border-line bg-surface p-3">
          {isImage && <img src={fileUrl(path)} alt="" className="max-h-48 rounded-sm object-contain" />}
          <div className="flex items-center gap-2 text-callout">
            <Sym name="doc.fill" size={13} className="text-neon-blue" />
            <a href={fileUrl(path)} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:underline">{path.split('/').pop()}</a>
            <button type="button" className="text-muted hover:text-ink" onClick={() => revealFile(path)} title="הצג ב־Finder"><Sym name="folder.fill" size={13} /></button>
            <button type="button" className="text-muted hover:text-neon-pink" onClick={() => onChange(null)} title="הסר"><Sym name="xmark" size={11} /></button>
          </div>
        </div>
      ) : (
        <label
          onDragOver={(e) => (e.preventDefault(), setOver(true))}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => (e.preventDefault(), setOver(false), take(e.dataTransfer.files[0]))}
          className={`flex cursor-pointer flex-col items-center gap-1 rounded-sm border border-dashed p-5 text-center text-callout transition ${over ? 'border-tint bg-tint/10' : 'border-line text-muted hover:bg-fill-hover'}`}
        >
          <Sym name="tray.and.arrow.down.fill" size={20} />
          {busy ? 'מעלה…' : 'גרור לכאן PDF או תמונה, או לחץ לבחירה'}
          <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => take(e.target.files?.[0])} />
        </label>
      )}
      {err && <p className="mt-1 text-subheadline text-neon-pink">{err}</p>}
    </Field>
  );
}
