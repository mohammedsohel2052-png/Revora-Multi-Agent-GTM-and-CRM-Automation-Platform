import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, tenantId, userId, correlationId } = request;

    // Only audit mutation operations (POST, PUT, PATCH, DELETE) automatically
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle().pipe(
        tap((data) => {
          this.auditService.record({
            tenantId: tenantId || 'anonymous',
            userId,
            traceId: correlationId,
            toolName: `HTTP:${method}:${url}`,
            inputParams: body,
            outputSummary: data ? JSON.stringify(data).slice(0, 500) : 'Success',
            result: 'success',
          });
        }),
        catchError((error) => {
          this.auditService.record({
            tenantId: tenantId || 'anonymous',
            userId,
            traceId: correlationId,
            toolName: `HTTP:${method}:${url}`,
            inputParams: body,
            result: 'error',
            errorMessage: error.message,
          });
          throw error;
        }),
      );
    }

    return next.handle();
  }
}
