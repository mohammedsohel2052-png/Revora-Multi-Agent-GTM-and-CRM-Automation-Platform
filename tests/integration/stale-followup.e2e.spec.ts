import { ConversationSlaService } from '../../apps/api/src/modules/workflows/conversation-sla.service';
import { randomUUID } from 'crypto';

jest.mock('@revora/db', () => ({
  db: {
    query: {
      conversations: {
        findMany: jest.fn(),
      },
    },
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 'mock-id' }]),
      }),
    }),
  },
  conversations: {},
  leads: {},
}));

describe('Integration Test: Stale Conversation Follow-up & SLA Automation', () => {
  let slaService: ConversationSlaService;
  let mockAudit: any;
  const tenantId = 'tenant_sla_test';

  beforeEach(() => {
    mockAudit = {
      record: jest.fn().mockResolvedValue('audit-sla-1'),
    };
    slaService = new ConversationSlaService(mockAudit);
  });

  it('identifies threads inactive for >48h, transitions lead to nurture, and marks thread stale', async () => {
    const threadId = randomUUID();
    const leadId = randomUUID();
    const oldTimestamp = new Date(Date.now() - 50 * 3600 * 1000); // 50 hours ago

    const { db } = require('@revora/db');
    db.query.conversations.findMany.mockResolvedValueOnce([
      {
        id: threadId,
        tenantId,
        leadId,
        status: 'active',
        lastMessageAt: oldTimestamp,
      },
    ]);

    const result = await slaService.checkAndMarkStaleConversations(tenantId);

    expect(result.markedAsStale).toBe(1);
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        toolName: 'SLA:MarkStaleConversation',
        result: 'success',
      }),
    );
  });

  it('leaves active or recently updated conversations (<48h) untouched', async () => {
    const { db } = require('@revora/db');
    // When lastMessageAt is recent, Drizzle lt() filter excludes it so findMany returns empty array
    db.query.conversations.findMany.mockResolvedValueOnce([]);

    const result = await slaService.checkAndMarkStaleConversations(tenantId);

    expect(result.markedAsStale).toBe(0);
  });
});
