import type { Module } from '../types.ts';
import { routes } from './routes.ts';
import { refreshIfDue } from './service.ts';

export const accounts: Module = {
  name: 'accounts',
  routes,
  start() {
    void refreshIfDue();
    setInterval(refreshIfDue, 6 * 60 * 60 * 1000).unref();
  },
};
