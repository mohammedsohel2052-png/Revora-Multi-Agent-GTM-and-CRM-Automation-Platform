import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  tenantId: string;
  userId?: string;
  role?: string;
  correlationId?: string;
}

export const tenantLocalStorage = new AsyncLocalStorage<TenantStore>();

export function getTenantContext(): TenantStore | undefined {
  return tenantLocalStorage.getStore();
}

export function getCurrentTenantId(): string | undefined {
  return tenantLocalStorage.getStore()?.tenantId;
}
