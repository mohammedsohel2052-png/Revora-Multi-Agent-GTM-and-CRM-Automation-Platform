import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { getCurrentTenantId } from '../context/tenant-context';

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId || getCurrentTenantId();
  },
);

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return {
      id: request.userId,
      role: request.headers['x-user-role'],
    };
  },
);
