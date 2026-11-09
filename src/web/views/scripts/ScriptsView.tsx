import { useEffect, useState } from 'react';
import { DEFAULT_WPS, STAGE_LABELS } from '../../../shared/constants.ts';
import { api } from '../../api.ts';
import { useStore } from '../../store.tsx';
import { stageIndex } from '../../lib/time.ts';
import { Thumb } from '../../components/Thumb.tsx';
import { Segmented } from '../../components/ui.tsx';
import { ScriptEditor } from './ScriptEditor.tsx';
import { LessonsPanel } from './LessonsPanel.tsx';
import { FormulaPanel } from './FormulaPanel.tsx';

type Tab = 'scripts' | 'lessons' | 'formula';

export function ScriptsView() {
  const { videos, scriptVideoId, setScriptVideoId } = useStore();
  const [tab, setTab] = useState<Tab>('scripts');
  const [wps, setWps] = useState(DEFAULT_WPS);
  useEffect(() => void api.wps().then((r) => setWps(r.wps)).catch(() => {}), []);

  // Ideas and videos up to editing; done ones stay reachable below.
  const active = videos.filter((v) => stageIndex(v.stage) <= stageIndex('editing')).sort((a, b) => stageIndex(a.stage) - stageIndex(b.stage) || b.updatedAt.localeCompare(a.updatedAt));
  const rest = videos.filter((v) => stageIndex(v.stage) > stageIndex('editing'));
  const selected = videos.find((v) => v.id === scriptVideoId) ?? null;

  return (
    <div className="space-y-6">
      <div className="max-w-md">
        <Segmented<Tab> value={tab} onChange={setTab} options={[{ value: 'scripts', label: 'תסריטים' }, { value: 'lessons', label: 'ספר לקחים' }, { value: 'formula', label: 'הנוסחה' }]} />
      </div>

      {tab === 'lessons' && <LessonsPanel />}
      {tab === 'formula' && <FormulaPanel wps={wps} onWps={setWps} />}
      {tab === 'scripts' && (
        <div className="flex items-start gap-6">
          <aside className="sticky top-0 w-64 shrink-0 space-y-1">
            {active.length === 0 && <p className="text-callout text-muted">אין רעיונות. הוסף רעיון בלוח התוכן.</p>}
            {active.map((v) => <Item key={v.id} id={v.id} />)}
            {rest.length > 0 && <div className="px-2 pt-4 text-subheadline text-muted">פורסמו / מוכנים</div>}
            {rest.map((v) => <Item key={v.id} id={v.id} />)}
          </aside>
          {selected ? <ScriptEditor key={selected.id} video={selected} wps={wps} /> : <p className="pt-2 text-body text-muted">בחר רעיון מהרשימה כדי לכתוב לו תסריט.</p>}
        </div>
      )}
    </div>
  );

  function Item({ id }: { id: number }) {
    const v = videos.find((x) => x.id === id)!;
    return (
      <button onClick={() => setScriptVideoId(v.id)} className={`flex w-full items-center gap-3 rounded-sm p-2 text-start transition ${v.id === scriptVideoId ? 'bg-fill-strong' : 'hover:bg-fill-hover'}`}>
        <Thumb video={v} size={32} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-body">{v.title}</div>
          <div className="text-subheadline text-muted">{STAGE_LABELS[v.stage]}</div>
        </div>
      </button>
    );
  }
}
