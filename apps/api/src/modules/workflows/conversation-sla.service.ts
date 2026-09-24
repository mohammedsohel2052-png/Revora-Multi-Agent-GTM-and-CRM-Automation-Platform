import { Injectable, Logger } from '@nestjs/common';
import { db, conversations, leads } from '@revora/db';
import { eq, and, lt } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ConversationSlaService {
  private readonly logger = new Logger(ConversationSlaService.name);

  constructor(private readonly auditService: AuditService) {}

  async checkAndMarkStaleConversations(tenantId: string, staleThresholdHours = 48) {
    const cutoffDate = new Date(Date.now() - staleThresholdHours * 3600 * 1000);

    const staleThreads = await db.query.conversations.findMany({
      where: (c, { eq, and, lt }) =>
        and(
          eq(c.tenantId, tenantId),
          eq(c.status, 'active'),
          lt(c.lastMessageAt, cutoffDate),
        ),
      limit: 50,
    });

    let markedCount = 0;

    for (const thread of staleThreads) {
      await db
        .update(conversations)
        .set({
          status: 'stale',
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, thread.id));

      if (thread.leadId) {
        await db
          .update(leads)
          .set({
            status: 'nurture',
            nextAction: 'Inactivity detected (>48h). Queue for re-engagement nurture cadence.',
            updatedAt: new Date(),
          })
          .where(eq(leads.id, thread.leadId));
      }

      await this.auditService.record({
        tenantId,
        toolName: 'SLA:MarkStaleConversation',
        inputParams: { conversationId: thread.id, leadId: thread.leadId },
        outputSummary: `Conversation marked as stale after ${staleThresholdHours} hours of inactivity. Lead moved to nurture.`,
        result: 'success',
      });

      markedCount++;
    }

    this.logger.log(`[Conversation SLA] Scanned tenant ${tenantId}: marked ${markedCount} threads as stale`);
    return {
      scanned: staleThreads.length,
      markedAsStale: markedCount,
      cutoffDate: cutoffDate.toISOString(),
    };
  }
}
