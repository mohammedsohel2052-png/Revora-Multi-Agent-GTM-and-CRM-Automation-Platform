import { PaymentAgent } from '../../apps/api/src/agents/payment/payment.agent';
import { StripeWebhookService } from '../../apps/api/src/modules/webhooks/stripe-webhook.service';
import { ToolRegistryService } from '../../apps/api/src/tools/tool-registry.service';
import { createHmac, randomUUID } from 'crypto';

jest.mock('@revora/db', () => ({
  db: {
    query: {
      payments: {
        findFirst: jest.fn(),
      },
      webhookEvents: {
        findFirst: jest.fn(),
      },
      opportunities: {
        findFirst: jest.fn(),
      },
    },
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue([{ id: 'mock-payment-id' }]),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 'mock-payment-id' }]),
      }),
    }),
  },
  payments: {},
  opportunities: {},
  webhookEvents: {},
  auditEvents: {},
}));

describe('Integration Test: Authoritative Stripe Billing & Payment Webhook Flow', () => {
  let paymentAgent: PaymentAgent;
  let stripeService: StripeWebhookService;
  let mockAudit: any;
  const tenantId = 'tenant_stripe_suite';

  beforeEach(() => {
    mockAudit = {
      record: jest.fn().mockResolvedValue('audit-stripe-1'),
    };
    const toolRegistry = new ToolRegistryService(mockAudit);
    paymentAgent = new PaymentAgent(toolRegistry);
    stripeService = new StripeWebhookService(mockAudit);
    process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_payment_test_secret';
  });

  it('creates secure checkout session URL for qualified prospect', async () => {
    const contactId = randomUUID();
    const leadId = randomUUID();

    const session = await paymentAgent.createCheckoutSession(tenantId, {
      leadId,
      contactId,
      tier: 'growth',
      amount: 499,
      currency: 'USD',
    });

    expect(session.checkoutUrl).toContain('checkout.stripe.com');
    expect(session.sessionId).toBeDefined();
    expect(session.status).toBe('pending_payment');
  });

  it('CRITICAL: Strictly refuses payment claims in chat before authoritative webhook confirmation', async () => {
    const contactId = randomUUID();
    const ctx = {
      tenantId,
      traceId: 'tr_unverified_pay',
      leadId: randomUUID(),
    };

    // Database still shows payment as pending or non-existent
    const { db } = require('@revora/db');
    db.query.payments.findFirst.mockResolvedValueOnce({
      status: 'pending',
      verifiedViaWebhook: false,
    });

    const reply = await paymentAgent.execute(
      {
        contactId,
        message: 'I paid 5 minutes ago! Why is my account still locked?',
      },
      ctx,
    );

    expect(reply.paymentVerified).toBe(false);
    expect(reply.status).toBe('pending_webhook');
    expect(reply.reply).toContain('waiting for the official Stripe payment confirmation webhook');
  });

  it('completes payment, updates opportunity to won, and writes audit event upon verified webhook', async () => {
    const opportunityId = randomUUID();
    const contactId = randomUUID();
    const sessionId = 'cs_live_auth_999';
    const eventId = 'evt_charge_complete_123';

    const { db } = require('@revora/db');
    db.query.webhookEvents.findFirst.mockResolvedValueOnce(null); // not seen yet
    db.query.payments.findFirst.mockResolvedValueOnce(null);

    const rawPayload = {
      id: eventId,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: sessionId,
          amount_total: 49900,
          currency: 'usd',
          metadata: {
            tenantId,
            opportunityId,
            contactId,
          },
        },
      },
    };

    const rawBody = JSON.stringify(rawPayload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const hmac = createHmac('sha256', 'whsec_payment_test_secret');
    const signature = hmac.update(`${timestamp}.${rawBody}`).digest('hex');
    const sigHeader = `t=${timestamp},v1=${signature}`;

    const result = await stripeService.handleStripeEvent(rawBody, sigHeader, tenantId);

    expect(result.status).toBe('payment_verified');
    expect(result.amount).toBe(499);
    expect(result.currency).toBe('USD');
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        toolName: 'stripe:webhook_confirmation',
        result: 'success',
      }),
    );
  });
});
