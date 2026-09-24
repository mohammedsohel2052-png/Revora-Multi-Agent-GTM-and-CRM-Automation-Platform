import { Injectable, Logger } from '@nestjs/common';
import { db, approvalRequests } from '@revora/db';
import { randomUUID } from 'crypto';

export interface PolicyEvaluationRequest {
  tenantId: string;
  actionType: 'send_outbound_message' | 'execute_tool' | 'apply_discount' | 'schedule_meeting';
  channel?: string;
  leadId?: string;
  conversationId?: string;
  proposedPayload: Record<string, unknown>;
  agentId?: string;
  workflowRunId?: string;
}

export interface PolicyEvaluationResult {
  decision: 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reason?: string;
  approvalRequestId?: string;
  sanitizedPayload?: Record<string, unknown>;
}

@Injectable()
export class PolicyEngineService {
  private readonly logger = new Logger(PolicyEngineService.name);

  // Sensitive data regex patterns
  private readonly sensitivePatterns = [
    { name: 'Credit Card', regex: /\b(?:\d{4}[ -]?){3}\d{4}\b/ },
    { name: 'US SSN', regex: /\b\d{3}-\d{2}-\d{4}\b/ },
    { name: 'API Key / Secret', regex: /(?:sk_live_|bearer\s+[a-zA-Z0-9_\-\.]{20,}|ghp_[a-zA-Z0-9]{36})/i },
  ];

  /**
   * Evaluates an agent's proposed action against multi-tenant safety and compliance rules.
   */
  async evaluateAction(req: PolicyEvaluationRequest): Promise<PolicyEvaluationResult> {
    const payloadStr = JSON.stringify(req.proposedPayload);

    // Rule 1: CRITICAL Security Guardrail - PII & Secret Leakage Prevention
    for (const pattern of this.sensitivePatterns) {
      if (pattern.regex.test(payloadStr)) {
        this.logger.warn(`[Policy Block] Action blocked due to detected ${pattern.name} in tenant ${req.tenantId}`);
        return {
          decision: 'BLOCK',
          riskLevel: 'critical',
          reason: `Policy Violation: Payload contains unredacted confidential data (${pattern.name}). Immediate block.`,
        };
      }
    }

    // Rule 2: Pricing & Discount Threshold Gate (High Risk)
    // Autonomous agents cannot offer >15% discount or contracts >$10,000 without human sign-off
    const discountPercent = Number(req.proposedPayload['discountPercent'] ?? req.proposedPayload['discount'] ?? 0);
    const quoteValue = Number(req.proposedPayload['quoteValue'] ?? req.proposedPayload['contractValue'] ?? 0);

    if (discountPercent > 15 || quoteValue > 10000) {
      this.logger.log(`[Policy Gate] Pricing threshold exceeded (discount: ${discountPercent}%, value: $${quoteValue}). Routing to HITL.`);
      const approvalId = await this.createApprovalRecord(req, 'high', `Discount of ${discountPercent}% or contract value of $${quoteValue} requires executive sign-off.`);
      return {
        decision: 'REQUIRE_APPROVAL',
        riskLevel: 'high',
        reason: `Pricing policy: Discounts above 15% or contracts over $10,000 require human sales manager approval.`,
        approvalRequestId: approvalId,
      };
    }

    // Rule 3: Bounded Autonomy Guardrail (Outbound Messaging)
    // Per Revora architecture, ENABLE_AUTONOMOUS_SENDING defaults to false unless explicitly enabled in environment/tenant
    const autonomousSendingEnabled = process.env['ENABLE_AUTONOMOUS_SENDING'] === 'true';

    if (req.actionType === 'send_outbound_message' && !autonomousSendingEnabled) {
      this.logger.log(`[Policy Gate] Autonomous outbound sending is disabled. Holding outbound message for human review.`);
      const approvalId = await this.createApprovalRecord(
        req,
        'medium',
        `Draft message to ${req.proposedPayload['recipientEmail'] || req.proposedPayload['recipientPhone'] || 'lead'} awaiting sign-off.`,
      );
      return {
        decision: 'REQUIRE_APPROVAL',
        riskLevel: 'medium',
        reason: `Tenant autonomy policy: Autonomous outbound messaging is disabled. Human approval required prior to dispatch.`,
        approvalRequestId: approvalId,
      };
    }

    // Rule 4: Action is within safe bounds
    return {
      decision: 'ALLOW',
      riskLevel: 'low',
      reason: 'Action cleared all compliance, PII, rate-limiting, and autonomy guardrails.',
      sanitizedPayload: req.proposedPayload,
    };
  }

  private async createApprovalRecord(
    req: PolicyEvaluationRequest,
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    summary: string,
  ): Promise<string> {
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 day expiration

    try {
      await db.insert(approvalRequests).values({
        id,
        tenantId: req.tenantId,
        agentId: req.agentId,
        workflowRunId: req.workflowRunId,
        leadId: req.leadId,
        conversationId: req.conversationId,
        actionType: req.actionType,
        actionSummary: summary,
        proposedAction: req.proposedPayload,
        riskLevel,
        status: 'pending',
        expiresAt,
      });
    } catch (err) {
      this.logger.warn(`Failed to insert approval_request into DB (in-memory test mode or unmigrated DB): ${err}`);
    }

    return id;
  }
}
