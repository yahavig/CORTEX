// Content board: ideas row with thumbnails on top, then the production pipeline.
import { useState, type DragEvent, type FormEvent } from 'react';
import { STAGE_LABELS, VIDEO_STAGES, type Stage } from '../../shared/constants.ts';
import { useStore } from '../store.tsx';
import { DRAG_TYPE, VideoCard } from '../components/VideoCard.tsx';
import { Thumb } from '../components/Thumb.tsx';
import { Sym } from '../components/Sym.tsx';
import { inputCls } from '../components/ui.tsx';

const PIPELINE = VIDEO_STAGES.filter((s) => s !== 'idea');

function useDrop(onDrop: (id: number) => void) {
  const [over, setOver] = useState(false);
  return {
    over,
    props: {
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
    },
  };
}

export function Board() {
  const { videos, create, update, open } = useStore();
  const ideas = videos.filter((v) => v.stage === 'idea');
  const [title, setTitle] = useState('');

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await create({ title: title.trim() });
    setTitle('');
  }

  const moveTo = (stage: Stage) => (id: number) => {
    const v = videos.find((x) => x.id === id);
    if (v && v.stage !== stage) void update(id, { stage });
  };
  const ideaDrop = useDrop(moveTo('idea'));

  return (
    <div className="space-y-8">
      <section {...ideaDrop.props} className={`rounded-lg border p-5 transition ${ideaDrop.over ? 'border-tint/60 bg-tint/5' : 'border-line bg-fill-hover'}`}>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-title2 font-semibold">רעיונות</h2>
          <span className="text-callout text-muted">{ideas.length}</span>
          <form onSubmit={add} className="ms-auto flex w-full max-w-sm items-center gap-2">
            <input className={`${inputCls} py-1.5`} placeholder="רעיון חדש… (Enter)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <button type="submit" className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-white hover:brightness-110" title="הוסף">
              <Sym name="plus" size={14} />
            </button>
          </form>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-2">
          {ideas.length === 0 && <p className="py-6 text-body text-muted">אין עדיין רעיונות. כתוב אחד למעלה.</p>}
          {ideas.map((v) => (
            <button
              key={v.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData(DRAG_TYPE, String(v.id))}
              onClick={() => open(v.id)}
              className="group flex w-36 shrink-0 cursor-grab flex-col items-center gap-2.5 rounded-md p-3 text-center transition hover:bg-fill-hover active:cursor-grabbing"
            >
              <div className="transition group-hover:scale-105">
                <Thumb video={v} size={96} />
              </div>
              <span className="line-clamp-2 text-callout leading-snug">{v.title}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE.map((stage) => (
          <Column key={stage} stage={stage} onDrop={moveTo(stage)} />
        ))}
      </section>
    </div>
  );
}

function Column({ stage, onDrop }: { stage: Stage; onDrop: (id: number) => void }) {
  const { videos } = useStore();
  const items = videos
    .filter((v) => v.stage === stage)
    .sort((a, b) => (a.scheduledAt ?? '9').localeCompare(b.scheduledAt ?? '9'));
  const drop = useDrop(onDrop);
  return (
    <div {...drop.props} className={`flex min-h-64 min-w-52 flex-1 flex-col rounded-lg border p-3 transition ${drop.over ? 'border-tint/60 bg-tint/5' : 'border-line bg-fill-hover'}`}>
      <div className="mb-3 flex items-center gap-2 px-1">
        <h3 className="text-title3 font-semibold">{STAGE_LABELS[stage]}</h3>
        <span className="text-subheadline text-muted">{items.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
    </div>
  );
}
