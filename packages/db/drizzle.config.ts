import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] || 'postgresql://revora:revora_dev_password@localhost:5432/revora_dev',
  },
  verbose: true,
  strict: true,
});
