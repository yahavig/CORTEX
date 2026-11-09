// A CORTEX module: a self-contained feature with its own schema, routes and logic.
// To add one: create src/server/modules/<name>/ with schema.ts (optional), routes,
// and an index.ts exporting a Module; then add it to modules/index.ts.
import type { Hono } from 'hono';

export interface Module {
  name: string;
  routes?: Hono;
  start?: () => void; // timers, background checks
}
