import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { db, tenants, memberships, agents } from '@revora/db';
import { eq } from 'drizzle-orm';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  async createTenant(dto: CreateTenantDto, ownerUserId?: string) {
    // Check if slug already exists
    const existing = await db.query.tenants.findFirst({
      where: (t, { eq }) => eq(t.slug, dto.slug),
    });

    if (existing) {
      throw new ConflictException(`Workspace with slug "${dto.slug}" already exists`);
    }

    const tenantId = randomUUID();

    const [created] = await db
      .insert(tenants)
      .values({
        id: tenantId,
        name: dto.name,
        slug: dto.slug,
        plan: dto.plan || 'free',
      })
      .returning();

    // If owner user specified, add membership
    if (ownerUserId) {
      await db.insert(memberships).values({
        tenantId: created.id,
        userId: ownerUserId,
        role: 'workspace_owner',
      });
    }

    // Bootstrap default agent team for this tenant
    await this.seedDefaultAgents(created.id);

    this.logger.log(`Created workspace "${created.name}" (${created.id})`);
    return created;
  }

  async getTenantById(id: string) {
    const tenant = await db.query.tenants.findFirst({
      where: (t, { eq }) => eq(t.id, id),
    });

    if (!tenant) {
      throw new NotFoundException(`Workspace "${id}" not found`);
    }

    return tenant;
  }

  async getTenantBySlug(slug: string) {
    const tenant = await db.query.tenants.findFirst({
      where: (t, { eq }) => eq(t.slug, slug),
    });

    if (!tenant) {
      throw new NotFoundException(`Workspace with slug "${slug}" not found`);
    }

    return tenant;
  }

  private async seedDefaultAgents(tenantId: string) {
    const defaultAgents = [
      {
        name: 'Lead Intake Agent',
        role: 'intake',
        description: 'Ingests, normalizes, and validates inbound leads across all channels.',
        version: '1.0.0',
        modelProvider: 'openai',
        modelName: 'gpt-4o-mini',
        systemInstructions: 'You are the Lead Intake Agent. Validate and normalize raw inbound events.',
        autonomyLevel: 'autonomous' as const,
      },
      {
        name: 'Qualification Agent',
        role: 'qualification',
        description: 'Scores ICP fit and intent using deterministic rubrics and transparent explanations.',
        version: '1.0.0',
        modelProvider: 'openai',
        modelName: 'gpt-4o',
        systemInstructions: 'You are the Qualification Agent. Score leads strictly on evidence and ICP criteria.',
        autonomyLevel: 'supervised' as const,
      },
      {
        name: 'Conversation Agent',
        role: 'conversation',
        description: 'Handles 1:1 multi-turn inbound conversations with strict guardrails and tone matching.',
        version: '1.0.0',
        modelProvider: 'openai',
        modelName: 'gpt-4o',
        systemInstructions: 'You are the Conversation Agent. Engage prospects warmly and guide them to booking.',
        autonomyLevel: 'supervised' as const,
      },
      {
        name: 'Meeting Booking Agent',
        role: 'booking',
        description: 'Negotiates slots, confirms calendar invites, and prepares pre-call briefs.',
        version: '1.0.0',
        modelProvider: 'openai',
        modelName: 'gpt-4o-mini',
        systemInstructions: 'You are the Meeting Booking Agent. Coordinate attendee availability and calendar events.',
        autonomyLevel: 'supervised' as const,
      },
    ];

    for (const agent of defaultAgents) {
      await db.insert(agents).values({
        tenantId,
        ...agent,
      });
    }
  }
}
