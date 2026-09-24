import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { tenantLocalStorage } from '../context/tenant-context';
import { randomUUID } from 'crypto';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = (req.headers['x-tenant-id'] as string) || (req.headers['x-workspace-id'] as string);
    const userId = req.headers['x-user-id'] as string | undefined;
    const role = req.headers['x-user-role'] as string | undefined;
    const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();

    // Attach to request object for easy access
    (req as any).tenantId = tenantId;
    (req as any).userId = userId;
    (req as any).correlationId = correlationId;

    // Set correlation ID header in response
    res.setHeader('x-correlation-id', correlationId);

    tenantLocalStorage.run(
      {
        tenantId: tenantId || '',
        userId,
        role,
        correlationId,
      },
      () => {
        next();
      },
    );
  }
}
