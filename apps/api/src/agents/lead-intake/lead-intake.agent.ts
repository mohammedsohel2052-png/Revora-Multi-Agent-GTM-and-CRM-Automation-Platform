import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentRunContext } from '../base.agent';
import { ToolRegistryService } from '../../tools/tool-registry.service';
import { db, contacts, leads, conversations, messages } from '@revora/db';
import { eq, and, or } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface RawLeadIntakeInput {
  channel: 'instagram' | 'email' | 'whatsapp' | 'form' | 'website';
  providerEventId: string;
  sender: {
    name?: string;
    email?: string;
    phone?: string;
    socialId?: string;
  };
  message?: string;
  formData?: Record<string, string>;
  rawEvent?: Record<string, unknown>;
}

export interface IntakeResult {
  contactId: string;
  leadId: string;
  conversationId?: string;
  isNewContact: boolean;
  channel: string;
  status: 'ingested';
}

@Injectable()
export class LeadIntakeAgent extends BaseAgent<RawLeadIntakeInput, IntakeResult> {
  readonly name = 'Lead Intake Agent';
  readonly role = 'lead_intake';
  readonly autonomyLevel = 'autonomous' as const;
  readonly allowedTools = ['search_crm_contacts'];

  constructor(toolRegistry: ToolRegistryService) {
    super(toolRegistry);
  }

  async execute(input: RawLeadIntakeInput, ctx: AgentRunContext): Promise<IntakeResult> {
    this.logger.log(`[Lead Intake] Ingesting event from ${input.channel} (${input.providerEventId})`);

    const tenantId = ctx.tenantId;

    // 1. Resolve or Create Contact
    let existingContact: any = null;
    if (input.sender.email || input.sender.phone) {
      existingContact = await db.query.contacts.findFirst({
        where: (c, { eq, and, or }) =>
          and(
            eq(c.tenantId, tenantId),
            or(
              input.sender.email ? eq(c.email, input.sender.email) : undefined,
              input.sender.phone ? eq(c.phone, input.sender.phone) : undefined,
            ),
          ),
      });
    }

    let contactId = existingContact?.id;
    let isNewContact = false;

    if (!contactId) {
      contactId = randomUUID();
      isNewContact = true;
      const contactName = input.sender.name || input.sender.socialId || 'New Inbound Prospect';

      await db.insert(contacts).values({
        id: contactId,
        tenantId,
        name: contactName,
        email: input.sender.email || null,
        phone: input.sender.phone || null,
        socialProfileIds: input.sender.socialId ? { [input.channel]: input.sender.socialId } : {},
        leadSource: input.channel,
        consentStatus: 'granted',
      });
    }

    // 2. Create Lead
    const leadId = randomUUID();
    await db.insert(leads).values({
      id: leadId,
      tenantId,
      contactId,
      status: 'new',
      lifecycleStage: 'lead',
      sourceChannel: input.channel,
      lastAgentAction: `Ingested by ${this.name}`,
      lastAgentActionAt: new Date(),
    });

    // 3. Create Conversation & Inbound Message if message payload present
    let conversationId: string | undefined;
    if (input.message) {
      conversationId = randomUUID();
      await db.insert(conversations).values({
        id: conversationId,
        tenantId,
        contactId,
        leadId,
        channel: input.channel,
        status: 'active',
        lastMessageAt: new Date(),
      });

      await db.insert(messages).values({
        id: randomUUID(),
        tenantId,
        conversationId,
        direction: 'inbound',
        content: input.message,
        channel: input.channel,
        senderType: 'contact',
        senderId: contactId,
        status: 'delivered',
        sentAt: new Date(),
      });
    }

    this.logger.log(`[Lead Intake Done] Contact=${contactId} Lead=${leadId} Conv=${conversationId || 'none'}`);

    return {
      contactId,
      leadId,
      conversationId,
      isNewContact,
      channel: input.channel,
      status: 'ingested',
    };
  }
}
