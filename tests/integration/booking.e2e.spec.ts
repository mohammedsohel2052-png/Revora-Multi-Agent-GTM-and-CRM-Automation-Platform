import { BookingAgent } from '../../apps/api/src/agents/booking/booking.agent';
import { ToolRegistryService } from '../../apps/api/src/tools/tool-registry.service';
import { randomUUID } from 'crypto';

jest.mock('@revora/db', () => ({
  db: {
    query: {},
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue([{ id: 'mock-booking-id' }]),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 'mock-booking-id' }]),
      }),
    }),
  },
  calendarEvents: {},
  leads: {},
  auditEvents: {},
}));

describe('Integration Test: Meeting Booking & Pre-Call Intelligence Dossier', () => {
  let bookingAgent: BookingAgent;
  let toolRegistry: ToolRegistryService;
  let mockAudit: any;
  const tenantId = 'tenant_booking_test';

  beforeEach(() => {
    mockAudit = {
      record: jest.fn().mockResolvedValue('audit-book-1'),
    };
    toolRegistry = new ToolRegistryService(mockAudit);
    bookingAgent = new BookingAgent(toolRegistry);
  });

  it('reserves calendar slot, generates video meeting link, and compiles pre-call sales briefing', async () => {
    const leadId = randomUUID();
    const ctx = {
      tenantId,
      traceId: `tr_book_${randomUUID().slice(0, 8)}`,
      leadId,
    };

    const result = await bookingAgent.execute(
      {
        leadId,
        contactName: 'Nadia Petrova',
        contactEmail: 'nadia@cloudscale.tech',
        companyName: 'CloudScale Systems',
        industry: 'Fintech Cloud Infrastructure',
        companySize: '100-250',
        icpFitScore: 92,
        intentScore: 89,
        buyingSignals: ['Hiring 8 DevOps engineers', 'Evaluating SOC2 automated compliance tools'],
        preferredTime: '2026-09-26T15:00:00Z',
      },
      ctx,
    );

    expect(result.status).toBe('booked');
    expect(result.meetingUrl).toContain('meet.google.com');
    expect(result.bookingId).toBeDefined();

    // Verify Pre-Meeting Briefing Dossier
    const briefing = result.preMeetingBriefing;
    expect(briefing.attendee).toBe('Nadia Petrova');
    expect(briefing.targetCompany).toContain('CloudScale Systems');
    expect(briefing.fitAssessment).toContain('92/100');
    expect(briefing.keySignals).toContain('Hiring 8 DevOps engineers');
    expect(briefing.recommendedTalkTrack.length).toBeGreaterThan(0);
  });
});
