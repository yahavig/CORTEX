import type { DragEvent } from 'react';
import { PILLAR_LABELS, STAGE_LABELS } from '../../shared/constants.ts';
import type { Video } from '../api.ts';
import { fmtDateTime } from '../lib/time.ts';
import { useStore } from '../store.tsx';
import { Sym } from './Sym.tsx';
import { Thumb } from './Thumb.tsx';

export const DRAG_TYPE = 'application/x-cortex-video';

// `row`: board columns and lists. `tile`: narrow calendar cells.
export function VideoCard({ video, variant = 'row' }: { video: Video; variant?: 'row' | 'tile' }) {
  const { open } = useStore();
  const drag = {
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer.setData(DRAG_TYPE, String(video.id));
      e.dataTransfer.effectAllowed = 'move';
    },
    onClick: () => open(video.id),
  };

  if (variant === 'tile') {
    const ready = video.stage === 'ready';
    return (
      <div {...drag} title={video.title} className="flex cursor-grab flex-col items-center gap-1.5 rounded-sm border border-line bg-surface p-2 text-center transition hover:border-line-strong hover:bg-fill-hover active:cursor-grabbing">
        <Thumb video={video} size={38} />
        <div className="line-clamp-2 text-subheadline leading-snug">{video.title}</div>
        <div className={`flex items-center gap-1 text-subheadline ${ready ? 'text-neon-green' : 'text-muted'}`}>
          {ready && <Sym name="checkmark.circle.fill" size={10} />}
          {STAGE_LABELS[video.stage]}
        </div>
      </div>
    );
  }

  return (
    <div {...drag} className="group flex cursor-grab items-center gap-3 rounded-md border border-line bg-surface p-2.5 transition hover:border-line-strong hover:bg-fill-hover active:cursor-grabbing">
      <Thumb video={video} size={42} />
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-body font-semibold leading-snug">{video.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-subheadline text-muted">
          {video.pillar && <span>{PILLAR_LABELS[video.pillar]}</span>}
          {video.scheduledAt && (
            <span className="flex items-center gap-1">
              <Sym name="clock.fill" size={10} />
              {fmtDateTime.format(new Date(video.scheduledAt))}
            </span>
          )}
          {video.isExperiment && <Sym name="flask.fill" size={11} className="text-neon-orange" />}
        </div>
      </div>
    </div>
  );
}
