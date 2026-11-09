import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: ['./src/server/db/schema.ts', './src/server/modules/*/schema.ts'],
  out: './drizzle',
});
