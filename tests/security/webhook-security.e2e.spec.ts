import { WebhooksService } from '../../apps/api/src/modules/webhooks/webhooks.service';
import { StripeWebhookService } from '../../apps/api/src/modules/webhooks/stripe-webhook.service';
import { createHmac } from 'crypto';

describe('Security Test: Webhook Authentication, Signatures & Replay Prevention', () => {
  let webhooksService: WebhooksService;
  let stripeService: StripeWebhookService;
  let mockAudit: any;

  beforeEach(() => {
    mockAudit = { record: jest.fn().mockResolvedValue('audit-sec-1') };
    const mockSupervisor = { runPipeline: jest.fn() } as any;
    webhooksService = new WebhooksService(mockSupervisor, mockAudit);
    stripeService = new StripeWebhookService(mockAudit);
  });

  it('rejects inbound webhook with forged HMAC SHA-256 signature', () => {
    process.env['INSTAGRAM_WEBHOOK_SECRET'] = 'secret_real_key';
    const body = JSON.stringify({ sender: 'attacker', message: 'payload' });
    const forgedSignature = 'sha256=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

    const isValid = webhooksService.verifySignature('instagram', body, forgedSignature);
    expect(isValid).toBe(false);
  });

  it('rejects Stripe webhook when signature timestamp or digest does not match secret', () => {
    process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_production_secret_key';
    const body = JSON.stringify({ id: 'evt_stripe_test', type: 'charge.failed' });
    const fakeHeader = 't=1600000000,v1=bad_hash_signature';

    const isValid = stripeService.verifyStripeSignature(body, fakeHeader);
    expect(isValid).toBe(false);
  });

  it('validates authentic Stripe webhook signature generated with genuine secret', () => {
    const secret = 'whsec_valid_secret';
    process.env['STRIPE_WEBHOOK_SECRET'] = secret;
    const body = JSON.stringify({ id: 'evt_stripe_123', type: 'payment_intent.succeeded' });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const digest = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
    const header = `t=${timestamp},v1=${digest}`;

    const isValid = stripeService.verifyStripeSignature(body, header);
    expect(isValid).toBe(true);
  });
});
