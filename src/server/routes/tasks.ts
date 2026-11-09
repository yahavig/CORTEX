import { Hono } from 'hono';
import { TASK_AREAS, TASK_PRIORITIES, TASK_STATUSES } from '../../shared/business.ts';
import { schema } from '../db/index.ts';
import { crud } from '../lib/crud.ts';

export const tasks = new Hono();

crud(tasks, '/api/tasks', schema.tasks, {
  spec: {
    title: { type: 'text', required: true, max: 500 }, notes: { type: 'text' },
    status: { type: 'enum', values: TASK_STATUSES }, priority: { type: 'enum', values: TASK_PRIORITIES }, area: { type: 'enum', values: TASK_AREAS },
    dueAt: { type: 'date' }, videoId: { type: 'ref' }, dealId: { type: 'ref' },
  },
  // Stamp completion time when a task is marked done.
  prepare: (p) => ('status' in p ? { ...p, doneAt: p.status === 'done' ? new Date() : null } : p),
});
