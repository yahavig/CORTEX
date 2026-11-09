// Polls a background job until it finishes.
import { useEffect, useRef, useState } from 'react';
import { api, type Job } from '../api.ts';

export function useJob(onDone?: (job: Job) => void) {
  const [job, setJob] = useState<Job | null>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!job || (job.status !== 'queued' && job.status !== 'running')) return;
    const t = setInterval(async () => {
      const next = await api.job(job.id).catch(() => null);
      if (!next) return;
      setJob(next);
      if (next.status !== 'queued' && next.status !== 'running') done.current?.(next);
    }, 2500);
    return () => clearInterval(t);
  }, [job?.id, job?.status]);

  const active = !!job && (job.status === 'queued' || job.status === 'running');
  return { job, setJob, active };
}
