import { useEffect, useState } from 'react';
import { STAGE_LABELS, VIDEO_STAGES } from '../../shared/constants.ts';
import { useStore } from '../store.tsx';
import { computeAlerts, fmtDateTime, fmtFull } from '../lib/time.ts';
import { Sym } from '../components/Sym.tsx';
import { Thumb } from '../components/Thumb.tsx';

interface Health { dbPath: string; lastBackupAt: number | null; startedAt: number }

export function Home() {
  const { videos, slots, open } = useStore();
  const [health, setHealth] = useState<Health | null>(null);
  useEffect(() => void fetch('/api/health').then((r) => r.json()).then(setHealth).catch(() => {}), []);
  const alerts = computeAlerts(videos, slots);
  const next = videos
    .filter((v) => v.scheduledAt && new Date(v.scheduledAt) > new Date() && v.stage !== 'published')
    .sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!))
    .slice(0, 5);

  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
      <section className="rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 flex items-center gap-2 text-title2 font-semibold">
          <Sym name="bell.fill" size={16} className="text-neon-orange" /> דורש תשומת לב
        </h2>
        {alerts.length === 0 && <p className="text-body text-muted">הכול מסודר לשבוע הקרוב.</p>}
        <ul className="space-y-2">
          {alerts.map((a, i) => (
            <li key={i}>
              <button
                disabled={!a.videoId}
                onClick={() => a.videoId && open(a.videoId)}
                className={`flex w-full items-start gap-2 rounded-sm px-3 py-2 text-start text-body ${a.level === 'warn' ? 'bg-neon-orange/10 text-ink' : 'bg-fill-hover text-muted'} ${a.videoId ? 'hover:bg-fill' : ''}`}
              >
                <Sym name={a.level === 'warn' ? 'exclamationmark.triangle.fill' : 'calendar'} size={14} className={`mt-0.5 ${a.level === 'warn' ? 'text-neon-orange' : ''}`} />
                {a.text}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 flex items-center gap-2 text-title2 font-semibold">
          <Sym name="calendar" size={16} className="text-neon-blue" /> הפרסומים הקרובים
        </h2>
        {next.length === 0 && <p className="text-body text-muted">אין פרסומים מתוזמנים.</p>}
        <ul className="space-y-2">
          {next.map((v) => (
            <li key={v.id}>
              <button onClick={() => open(v.id)} className="flex w-full items-center gap-3 rounded-sm p-2 text-start hover:bg-fill-hover">
                <Thumb video={v} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-body">{v.title}</div>
                  <div className="text-subheadline text-muted">{fmtDateTime.format(new Date(v.scheduledAt!))} · {STAGE_LABELS[v.stage]}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-line bg-surface p-6 lg:col-span-2">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {VIDEO_STAGES.map((s) => (
            <div key={s} className="rounded-md bg-fill-hover p-3 text-center">
              <div className="text-title1 font-semibold">{videos.filter((v) => v.stage === s).length}</div>
              <div className="text-subheadline text-muted">{STAGE_LABELS[s]}</div>
            </div>
          ))}
        </div>
        {health && (
          <p className="mt-4 text-subheadline text-muted">
            גיבוי אחרון: {health.lastBackupAt ? fmtFull.format(health.lastBackupAt) : 'עוד אין'} · השרת עלה {fmtFull.format(health.startedAt)}
          </p>
        )}
      </section>
    </div>
  );
}
