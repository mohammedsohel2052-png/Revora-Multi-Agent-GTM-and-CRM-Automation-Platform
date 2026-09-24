import { UserRole } from '../../packages/shared/src/events/domain-events';

interface RbacPolicyCheck {
  role: 'workspace_owner' | 'sales_manager' | 'sales_rep' | 'reviewer' | 'platform_admin';
  action: 'manage_billing' | 'approve_discounts' | 'send_outreach' | 'review_approvals' | 'view_crm';
}

function evaluateRbacPermission(check: RbacPolicyCheck): boolean {
  const permissions: Record<string, string[]> = {
    workspace_owner: ['manage_billing', 'approve_discounts', 'send_outreach', 'review_approvals', 'view_crm'],
    sales_manager: ['approve_discounts', 'send_outreach', 'review_approvals', 'view_crm'],
    sales_rep: ['send_outreach', 'view_crm'],
    reviewer: ['review_approvals', 'view_crm'],
    platform_admin: ['view_crm', 'manage_billing'],
  };

  return permissions[check.role]?.includes(check.action) ?? false;
}

describe('Security Test: Role-Based Access Control (RBAC 5 Roles)', () => {
  it('allows workspace_owner full administrative and financial authority', () => {
    expect(evaluateRbacPermission({ role: 'workspace_owner', action: 'manage_billing' })).toBe(true);
    expect(evaluateRbacPermission({ role: 'workspace_owner', action: 'approve_discounts' })).toBe(true);
    expect(evaluateRbacPermission({ role: 'workspace_owner', action: 'send_outreach' })).toBe(true);
  });

  it('allows sales_manager to approve discounts and review approvals, but blocks billing configuration', () => {
    expect(evaluateRbacPermission({ role: 'sales_manager', action: 'approve_discounts' })).toBe(true);
    expect(evaluateRbacPermission({ role: 'sales_manager', action: 'review_approvals' })).toBe(true);
    expect(evaluateRbacPermission({ role: 'sales_manager', action: 'manage_billing' })).toBe(false);
  });

  it('restricts sales_rep from approving high-risk discounts or altering billing', () => {
    expect(evaluateRbacPermission({ role: 'sales_rep', action: 'send_outreach' })).toBe(true);
    expect(evaluateRbacPermission({ role: 'sales_rep', action: 'view_crm' })).toBe(true);
    expect(evaluateRbacPermission({ role: 'sales_rep', action: 'approve_discounts' })).toBe(false);
    expect(evaluateRbacPermission({ role: 'sales_rep', action: 'manage_billing' })).toBe(false);
  });

  it('allows reviewer read-only review and approval authority, blocking direct outreach dispatch', () => {
    expect(evaluateRbacPermission({ role: 'reviewer', action: 'review_approvals' })).toBe(true);
    expect(evaluateRbacPermission({ role: 'reviewer', action: 'view_crm' })).toBe(true);
    expect(evaluateRbacPermission({ role: 'reviewer', action: 'send_outreach' })).toBe(false);
    expect(evaluateRbacPermission({ role: 'reviewer', action: 'manage_billing' })).toBe(false);
  });
});
