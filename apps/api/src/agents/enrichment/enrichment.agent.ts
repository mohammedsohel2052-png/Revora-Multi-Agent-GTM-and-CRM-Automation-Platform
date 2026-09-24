import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentRunContext } from '../base.agent';
import { ToolRegistryService } from '../../tools/tool-registry.service';
import { db, companies, contacts } from '@revora/db';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface EnrichmentInput {
  contactId: string;
  email?: string;
  companyName?: string;
  domain?: string;
}

export interface EnrichmentResult {
  companyId?: string;
  companyName?: string;
  domain?: string;
  industry?: string;
  sizeEstimate?: string;
  location?: string;
  website?: string;
  isPersonalEmail: boolean;
}

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'protonmail.com',
  'aol.com',
  'mail.com',
]);

@Injectable()
export class EnrichmentAgent extends BaseAgent<EnrichmentInput, EnrichmentResult> {
  readonly name = 'Company Enrichment Agent';
  readonly role = 'enrichment';
  readonly autonomyLevel = 'autonomous' as const;
  readonly allowedTools = ['search_crm_contacts'];

  constructor(toolRegistry: ToolRegistryService) {
    super(toolRegistry);
  }

  async execute(input: EnrichmentInput, ctx: AgentRunContext): Promise<EnrichmentResult> {
    this.logger.log(`[Enrichment] Processing contact ${input.contactId} (${input.email || input.companyName || 'no identifier'})`);

    let extractedDomain = input.domain;
    let isPersonalEmail = false;

    if (!extractedDomain && input.email && input.email.includes('@')) {
      const parts = input.email.split('@');
      const domainCandidate = parts[1]?.toLowerCase().trim();
      if (domainCandidate && !FREE_EMAIL_DOMAINS.has(domainCandidate)) {
        extractedDomain = domainCandidate;
      } else {
        isPersonalEmail = true;
      }
    }

    // If no corporate domain and no company name, return early
    if (!extractedDomain && !input.companyName) {
      return { isPersonalEmail: true };
    }

    const tenantId = ctx.tenantId;

    // Check if company already exists under tenant
    let existingCompany: any = null;
    if (extractedDomain) {
      existingCompany = await db.query.companies.findFirst({
        where: (c, { eq, and }) =>
          and(eq(c.tenantId, tenantId), eq(c.domain, extractedDomain!)),
      });
    }

    let companyId = existingCompany?.id;
    let companyName = existingCompany?.name || input.companyName;
    let industry = existingCompany?.industry;
    let sizeEstimate = existingCompany?.sizeEstimate;
    let location = existingCompany?.location;
    let website = existingCompany?.website;

    if (!existingCompany) {
      companyId = randomUUID();

      // Derive company name from domain if not provided
      if (!companyName && extractedDomain) {
        const rawName = extractedDomain.split('.')[0] || 'Unknown';
        companyName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      }

      // Waterfall enrichment heuristics
      industry = industry || this.deriveIndustry(companyName || '', extractedDomain || '');
      sizeEstimate = sizeEstimate || '50-200';
      location = location || 'North America / Remote';
      website = website || (extractedDomain ? `https://${extractedDomain}` : undefined);

      await db.insert(companies).values({
        id: companyId,
        tenantId,
        name: companyName || 'Prospect Org',
        domain: extractedDomain || null,
        industry,
        sizeEstimate,
        location,
        website,
        enrichmentSource: 'waterfall_api',
        enrichmentFreshness: new Date(),
      });
    }

    // Link contact to company
    if (companyId) {
      await db
        .update(contacts)
        .set({
          companyId,
          updatedAt: new Date(),
        })
        .where(and(eq(contacts.id, input.contactId), eq(contacts.tenantId, tenantId)));
    }

    this.logger.log(`[Enrichment Done] Contact=${input.contactId} Company=${companyName} (${companyId}) Industry=${industry} Size=${sizeEstimate}`);

    return {
      companyId,
      companyName,
      domain: extractedDomain,
      industry,
      sizeEstimate,
      location,
      website,
      isPersonalEmail,
    };
  }

  private deriveIndustry(companyName: string, domain: string): string {
    const combined = `${companyName} ${domain}`.toLowerCase();
    if (combined.includes('ai') || combined.includes('cloud') || combined.includes('tech') || combined.includes('soft')) {
      return 'Enterprise Software & Cloud';
    }
    if (combined.includes('pay') || combined.includes('fin') || combined.includes('bank') || combined.includes('wealth')) {
      return 'Fintech & Payments';
    }
    if (combined.includes('health') || combined.includes('med') || combined.includes('care') || combined.includes('bio')) {
      return 'Healthcare & Life Sciences';
    }
    return 'B2B Professional Services';
  }
}
