import type { Module } from '../types.ts';
import { routes } from './routes.ts';

// The engine (webhook receiver + sender) is a separate piece that will plug in here
// once it's decided where it runs (Air server / cloud). Rules and matching are ready.
export const automations: Module = { name: 'automations', routes };
