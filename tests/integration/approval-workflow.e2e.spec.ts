import { ApprovalsService } from '../../apps/api/src/modules/approvals/approvals.service';
import { PolicyEngineService } from '../../apps/api/src/modules/policy/policy-engine.service';
import { AuditService } from '../../apps/api/src/modules/audit/audit.service';
import { randomUUID } from 'crypto';

jest.mock('@revora/db', () => ({
  db: {
    query: {
      approvalRequests: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    },
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue([{ id: 'mock-app-id' }]),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 'mock-app-id' }]),
      }),
    }),
  },
  approvalRequests: {},
}));

describe('Integration Test: Human-in-the-Loop Approval & Policy Lifecycle', () => {
  let approvalsService: ApprovalsService;
  let policyEngine: PolicyEngineService;
  let mockAudit: any;
  const tenantId = 'tenant_approval_suite';

  beforeEach(() => {
    mockAudit = {
      record: jest.fn().mockResolvedValue('audit-app-1'),
    };
    approvalsService = new ApprovalsService(mockAudit);
    policyEngine = new PolicyEngineService();
  });

  it('triggers approval requirement when agent offers excessive discount (>15%)', async () => {
    const evaluation = await policyEngine.evaluateAction({
      tenantId,
      actionType: 'apply_discount',
      proposedPayload: {
        quoteValue: 8000,
        discountPercent: 25, // exceeds 15% threshold
        reason: 'Client requested quarterly volume price break',
      },
    });

    expect(evaluation.decision).toBe('REQUIRE_APPROVAL');
    expect(evaluation.riskLevel).toBe('high');
    expect(evaluation.approvalRequestId).toBeDefined();
    expect(evaluation.reason).toContain('15%');
  });

  it('handles human approval, updates status to approved, and records audit trace', async () => {
    const approvalId = randomUUID();
    const { db } = require('@revora/db');
    db.query.approvalRequests.findFirst.mockResolvedValueOnce({
      id: approvalId,
      tenantId,
      actionType: 'send_outbound_message',
      actionSummary: 'Custom proposal quote to CTO',
      proposedAction: { draft: 'Here is your $8,000 quote.' },
      status: 'pending',
    });

    const result = await approvalsService.approveAction(tenantId, approvalId, 'sales_manager_user');

    expect(result.status).toBe('approved');
    expect(result.id).toBe(approvalId);
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        policyDecision: 'approved',
        approvalStatus: 'approved',
        result: 'success',
      }),
    );
  });

  it('handles human rejection, marks request blocked, and preserves rejection reason', async () => {
    const approvalId = randomUUID();
    const { db } = require('@revora/db');
    db.query.approvalRequests.findFirst.mockResolvedValueOnce({
      id: approvalId,
      tenantId,
      actionType: 'apply_discount',
      actionSummary: 'Requested 30% discount',
      proposedAction: { discount: 30 },
      status: 'pending',
    });

    const result = await approvalsService.rejectAction(
      tenantId,
      approvalId,
      'Margin too thin for Q3 targets',
      'finance_lead_user',
    );

    expect(result.status).toBe('rejected');
    expect(result.rejectionReason).toBe('Margin too thin for Q3 targets');
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        policyDecision: 'rejected',
        result: 'blocked',
      }),
    );
  });

  it('handles edit-and-approve, dispatches modified payload, and logs original vs edited', async () => {
    const approvalId = randomUUID();
    const originalAction = { message: 'We can offer 25% off.', discountPercent: 25 };
    const editedAction = { message: 'We can offer 10% off for annual prepayment.', discountPercent: 10 };

    const { db } = require('@revora/db');
    db.query.approvalRequests.findFirst.mockResolvedValueOnce({
      id: approvalId,
      tenantId,
      actionType: 'send_outbound_message',
      actionSummary: 'Draft discount message',
      proposedAction: originalAction,
      status: 'pending',
    });

    const result = await approvalsService.editAndApproveAction(
      tenantId,
      approvalId,
      editedAction,
      'sales_director_user',
    );

    expect(result.status).toBe('edited');
    expect(result.executedAction).toEqual(editedAction);
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        inputParams: { original: originalAction, edited: editedAction },
        policyDecision: 'edited_and_approved',
      }),
    );
  });
});
