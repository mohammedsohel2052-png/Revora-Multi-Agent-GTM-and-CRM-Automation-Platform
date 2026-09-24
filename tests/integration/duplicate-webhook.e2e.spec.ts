import { WebhooksService } from '../../apps/api/src/modules/webhooks/webhooks.service';
import { AuditService } from '../../apps/api/src/modules/audit/audit.service';
import { createHmac } from 'crypto';

jest.mock('@revora/db', () => ({
  db: {
    query: {
      webhookEvents: {
        findFirst: jest.fn(),
      },
      tenants: {
        findFirst: jest.fn().mockResolvedValue({ id: 'tenant-webhook-test' }),
      },
    },
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue([{ id: 'wh-123' }]),
    }),
  },
  webhookEvents: {},
  tenants: {},
}));

describe('Integration Test: Webhook Ingestion & Idempotency Engine', () => {
  let webhooksService: WebhooksService;
  let mockSupervisor: any;
  let mockAudit: any;

  beforeEach(() => {
    mockSupervisor = {
      runPipeline: jest.fn().mockResolvedValue({
        workflowRunId: 'run-idemp-1',
        qualification: { qualification_status: 'qualified' },
      }),
    };

    mockAudit = {
      record: jest.fn().mockResolvedValue('audit-wh-1'),
    };

    webhooksService = new WebhooksService(mockSupervisor, mockAudit);
    process.env['EMAIL_WEBHOOK_SECRET'] = 'secret_email_test';
  });

  it('ingests first-time webhook event, records idempotency key, and executes supervisor pipeline', async () => {
    const { db } = require('@revora/db');
    db.query.webhookEvents.findFirst.mockResolvedValueOnce(null); // Not seen yet

    const providerEventId = 'email_msg_unique_101';
    const rawPayload = { providerEventId, text: 'Interested in Revora' };
    const rawBody = JSON.stringify(rawPayload);
    const hmac = createHmac('sha256', 'secret_email_test');
    const signature = `sha256=${hmac.update(rawBody).digest('hex')}`;

    const result = await webhooksService.processInboundWebhook(
      'email',
      {
        providerEventId,
        sender: { email: 'prospect@acme.com', name: 'Prospect' },
        message: 'Interested in Revora',
        tenantId: 'tenant-webhook-test',
      },
      rawPayload,
      signature,
    );

    expect(result.status).toBe('success');
    expect(result.idempotencyKey).toBe('email:email_msg_unique_101');
    expect(mockSupervisor.runPipeline).toHaveBeenCalledTimes(1);
    expect(mockAudit.record).toHaveBeenCalledTimes(1);
  });

  it('intercepts duplicate event replay and skips pipeline without duplicate side effects', async () => {
    const { db } = require('@revora/db');
    db.query.webhookEvents.findFirst.mockResolvedValueOnce({
      id: 'existing-event-uuid',
      idempotencyKey: 'email:email_msg_unique_101',
      processed: true,
    });

    const providerEventId = 'email_msg_unique_101';
    const rawPayload = { providerEventId, text: 'Interested in Revora' };
    const rawBody = JSON.stringify(rawPayload);
    const hmac = createHmac('sha256', 'secret_email_test');
    const signature = `sha256=${hmac.update(rawBody).digest('hex')}`;

    const result = await webhooksService.processInboundWebhook(
      'email',
      {
        providerEventId,
        sender: { email: 'prospect@acme.com', name: 'Prospect' },
        message: 'Interested in Revora',
        tenantId: 'tenant-webhook-test',
      },
      rawPayload,
      signature,
    );

    expect(result.idempotent).toBe(true);
    expect(result.status).toBe('already_processed');
    expect(mockSupervisor.runPipeline).not.toHaveBeenCalled();
  });
});
