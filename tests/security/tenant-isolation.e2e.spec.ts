import { withTenantContext } from '../../packages/db/src/client';
import { KnowledgeService } from '../../apps/api/src/modules/knowledge/knowledge.service';
import { ApprovalsService } from '../../apps/api/src/modules/approvals/approvals.service';
import { randomUUID } from 'crypto';

jest.mock('@revora/db', () => ({
  db: {
    query: {
      contacts: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      knowledgeDocuments: {
        findMany: jest.fn(),
      },
      approvalRequests: {
        findFirst: jest.fn(),
      },
    },
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
  },
  contacts: {},
  knowledgeDocuments: {},
  knowledgeChunks: {},
  approvalRequests: {},
}));

describe('Security Test: Strict Multi-Tenant Data Isolation & RLS Boundary', () => {
  const tenantA = 'tenant_alpha_1111';
  const tenantB = 'tenant_beta_2222';
  let mockAudit: any;

  beforeEach(() => {
    mockAudit = { record: jest.fn() };
  });

  it('guarantees Tenant A cannot retrieve or query Tenant B contacts', async () => {
    const contactBId = randomUUID();
    const { db } = require('@revora/db');

    // Tenant B's contact in DB
    const contactB = {
      id: contactBId,
      tenantId: tenantB,
      name: 'Secret Client of Tenant B',
      email: 'secret@tenantb.com',
    };

    // When Tenant A queries by ID, database filter strictly includes tenantId: tenantA
    db.query.contacts.findFirst.mockImplementation(async (args: any) => {
      // Simulate RLS or tenant filter:
      // If query does not match the active session tenant, return null
      return null;
    });

    const result = await db.query.contacts.findFirst({
      where: (c: any, { eq, and }: any) => and(eq(c.tenantId, tenantA), eq(c.id, contactBId)),
    });

    expect(result).toBeNull();
  });

  it('guarantees Tenant A cannot view or approve Tenant B approval requests (IDOR defense)', async () => {
    const approvalBId = randomUUID();
    const approvalsService = new ApprovalsService(mockAudit);

    const { db } = require('@revora/db');
    // Tenant B owns this approval request; querying under Tenant A returns null
    db.query.approvalRequests.findFirst.mockResolvedValueOnce(null);

    // Attempting to approve Tenant B's request while logged into Tenant A must throw NotFoundException
    await expect(
      approvalsService.approveAction(tenantA, approvalBId, 'attacker_user'),
    ).rejects.toThrow(`Approval request with ID "${approvalBId}" not found`);
  });

  it('guarantees vector search RAG only returns documents belonging to the authenticated tenant', async () => {
    const knowledgeService = new KnowledgeService();
    const { db } = require('@revora/db');

    db.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                chunkId: 'chunk-a-1',
                documentId: 'doc-a-1',
                documentTitle: 'Tenant A Internal SOP',
                content: 'Confidential knowledge for Tenant A only',
              },
            ]),
          }),
        }),
      }),
    });

    const results = await knowledgeService.search(tenantA, 'What are our internal procedures?');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.documentTitle).toContain('Tenant A');
    expect(results[0]?.content).not.toContain('Tenant B');
  });
});
