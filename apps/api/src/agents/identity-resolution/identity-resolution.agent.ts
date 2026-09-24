import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentRunContext } from '../base.agent';
import { ToolRegistryService } from '../../tools/tool-registry.service';
import { db, contacts, approvalRequests } from '@revora/db';
import { eq, and, ne, or, ilike } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface IdentityMatchCandidate {
  contactId: string;
  name: string;
  email?: string;
  phone?: string;
  confidence: number;
  matchReasons: string[];
}

export interface IdentityResolutionInput {
  currentContactId: string;
  name: string;
  email?: string;
  phone?: string;
  socialId?: string;
  channel?: string;
}

export interface IdentityResolutionResult {
  action: 'no_match' | 'auto_merged' | 'approval_requested';
  targetContactId?: string;
  confidence: number;
  matchReasons: string[];
  approvalRequestId?: string;
}

@Injectable()
export class IdentityResolutionAgent extends BaseAgent<IdentityResolutionInput, IdentityResolutionResult> {
  readonly name = 'Identity Resolution Agent';
  readonly role = 'identity_resolution';
  readonly autonomyLevel = 'semi-autonomous' as const;
  readonly allowedTools = ['search_crm_contacts', 'request_human_approval'];

  constructor(toolRegistry: ToolRegistryService) {
    super(toolRegistry);
  }

  async execute(input: IdentityResolutionInput, ctx: AgentRunContext): Promise<IdentityResolutionResult> {
    this.logger.log(`[Identity Resolution] Evaluating candidate matches for contact ${input.currentContactId}`);

    const tenantId = ctx.tenantId;

    // Search existing contacts excluding current one
    const existing = await db.query.contacts.findMany({
      where: (c, { eq, and, ne }) =>
        and(eq(c.tenantId, tenantId), ne(c.id, input.currentContactId)),
      limit: 20,
    });

    let bestMatch: IdentityMatchCandidate | null = null;

    for (const c of existing) {
      let confidence = 0;
      const reasons: string[] = [];

      // 1. Exact Email Match (100% confidence)
      if (input.email && c.email && input.email.toLowerCase() === c.email.toLowerCase()) {
        confidence = 1.0;
        reasons.push(`Exact email match: ${input.email}`);
      }

      // 2. Exact Phone Match (100% confidence)
      if (input.phone && c.phone && input.phone.replace(/\D/g, '') === c.phone.replace(/\D/g, '')) {
        confidence = 1.0;
        reasons.push(`Exact phone number match: ${input.phone}`);
      }

      // 3. Social Profile ID Match (100% confidence)
      if (input.socialId && input.channel && c.socialProfileIds) {
        const profiles = c.socialProfileIds as Record<string, string>;
        if (profiles[input.channel] === input.socialId) {
          confidence = 1.0;
          reasons.push(`Exact ${input.channel} social ID match: ${input.socialId}`);
        }
      }

      // 4. Fuzzy Name Match (75% confidence - Ambiguous threshold)
      if (confidence < 1.0 && input.name && c.name) {
        if (input.name.toLowerCase().trim() === c.name.toLowerCase().trim()) {
          confidence = 0.75;
          reasons.push(`Identical name match: "${input.name}" with different email/channel`);
        }
      }

      if (confidence > (bestMatch?.confidence || 0)) {
        bestMatch = {
          contactId: c.id,
          name: c.name,
          email: c.email || undefined,
          phone: c.phone || undefined,
          confidence,
          matchReasons: reasons,
        };
      }
    }

    if (!bestMatch || bestMatch.confidence < 0.6) {
      return {
        action: 'no_match',
        confidence: 0,
        matchReasons: ['No identity match found exceeding 60% confidence'],
      };
    }

    // High confidence (>= 85%): Autonomous Merge
    if (bestMatch.confidence >= 0.85) {
      this.logger.log(`[Identity Resolution] Auto-merging contact ${input.currentContactId} into ${bestMatch.contactId} (Confidence: ${bestMatch.confidence * 100}%)`);

      // Merge social profiles and last activity
      const targetContact = await db.query.contacts.findFirst({
        where: (c, { eq }) => eq(c.id, bestMatch!.contactId),
      });

      const mergedSocial = {
        ...(targetContact?.socialProfileIds as Record<string, string> || {}),
        ...(input.socialId && input.channel ? { [input.channel]: input.socialId } : {}),
      };

      await db
        .update(contacts)
        .set({
          socialProfileIds: mergedSocial,
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, bestMatch.contactId));

      return {
        action: 'auto_merged',
        targetContactId: bestMatch.contactId,
        confidence: bestMatch.confidence,
        matchReasons: bestMatch.matchReasons,
      };
    }

    // Ambiguous Match (60% <= confidence < 85%): Create Human Approval Request
    this.logger.log(`[Identity Resolution] Ambiguous merge detected (${bestMatch.confidence * 100}%). Creating HITL approval request.`);

    const approvalId = randomUUID();
    await db.insert(approvalRequests).values({
      id: approvalId,
      tenantId,
      agentId: this.name,
      actionType: 'Entity Merge',
      actionSummary: `Merge Contact "${input.name}" into existing Contact "${bestMatch.name}" (${Math.round(bestMatch.confidence * 100)}% Match)`,
      proposedAction: {
        sourceContactId: input.currentContactId,
        targetContactId: bestMatch.contactId,
        confidence: bestMatch.confidence,
        matchReasons: bestMatch.matchReasons,
      },
      riskLevel: 'medium',
      status: 'pending',
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000), // 48h
    });

    return {
      action: 'approval_requested',
      targetContactId: bestMatch.contactId,
      confidence: bestMatch.confidence,
      matchReasons: bestMatch.matchReasons,
      approvalRequestId: approvalId,
    };
  }
}
