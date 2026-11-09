// The registry of modules. Remove a line to switch a module off.
import type { Module } from './types.ts';
import { accounts } from './accounts/index.ts';
import { automations } from './automations/index.ts';

export const modules: Module[] = [accounts, automations];
