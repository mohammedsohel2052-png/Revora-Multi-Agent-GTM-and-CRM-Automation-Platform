import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { sql } from 'drizzle-orm';

const connectionString =
  process.env['DATABASE_URL'] || 'postgresql://revora:revora_dev_password@localhost:5432/revora_dev';

// Connection client for normal queries
export const queryClient = postgres(connectionString, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });
export type Database = typeof db;

/**
 * Execute a callback within an isolated transaction scoped to a specific tenant.
 * Uses PostgreSQL's `SET LOCAL app.tenant_id = ...` to enforce Row-Level Security policies.
 */
export async function withTenantContext<T>(
  tenantId: string,
  fn: (scopedDb: any) => Promise<T>,
): Promise<T> {
  return await db.transaction(async (tx) => {
    // Set tenant_id for the duration of this transaction
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    return await fn(tx);
  });
}
