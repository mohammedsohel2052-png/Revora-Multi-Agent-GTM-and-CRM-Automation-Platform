import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentRunContext } from '../base.agent';
import { ToolRegistryService } from '../../tools/tool-registry.service';
import { QualificationOutput } from '@revora/shared';

export interface QualificationInput {
  leadId: string;
  contactName?: string;
  email?: string;
  jobTitle?: string;
  companyName?: string;
  companySize?: string;
  industry?: string;
  messageText?: string;
  buyingSignals?: string[];
}

@Injectable()
export class QualificationAgent extends BaseAgent<QualificationInput, QualificationOutput> {
  readonly name = 'Qualification Agent';
  readonly role = 'qualification';
  readonly autonomyLevel = 'supervised' as const;
  readonly allowedTools = ['update_lead_qualification'];

  constructor(toolRegistry: ToolRegistryService) {
    super(toolRegistry);
  }

  async execute(input: QualificationInput, ctx: AgentRunContext): Promise<QualificationOutput> {
    this.logger.log(`[Qualification] Evaluating lead ${input.leadId} (${input.contactName || 'unknown'})`);

    const reasons: string[] = [];
    const missingInfo: string[] = [];

    // 1. Evaluate ICP Fit Score (Deterministic Matrix)
    let icpScore = 40; // Base score

    // Job Title / Role Seniority
    const title = (input.jobTitle || '').toLowerCase();
    if (
      title.includes('vp') ||
      title.includes('director') ||
      title.includes('chief') ||
      title.includes('head') ||
      title.includes('founder') ||
      title.includes('owner') ||
      title.includes('ceo') ||
      title.includes('cro')
    ) {
      icpScore += 25;
      reasons.push(`High seniority role match: "${input.jobTitle || 'Executive'}"`);
    } else if (title.includes('manager') || title.includes('lead')) {
      icpScore += 15;
      reasons.push(`Mid-level management role: "${input.jobTitle}"`);
    } else if (title) {
      icpScore += 5;
    } else {
      missingInfo.push('Job title/role unknown');
    }

    // Company Headcount / Size
    const size = (input.companySize || '').toLowerCase();
    if (size.includes('50-200') || size.includes('200-500') || size.includes('500+') || size.includes('enterprise')) {
      icpScore += 20;
      reasons.push(`Company size aligns with target mid-market/enterprise ICP (${input.companySize})`);
    } else if (size.includes('10-50') || size.includes('medium')) {
      icpScore += 10;
      reasons.push(`Growth-stage company size (${input.companySize})`);
    } else if (size) {
      icpScore += 5;
    } else {
      missingInfo.push('Company employee headcount unknown');
    }

    // Industry Fit
    const industry = (input.industry || '').toLowerCase();
    const highFitIndustries = ['software', 'saas', 'fintech', 'technology', 'b2b', 'ai', 'cloud'];
    if (highFitIndustries.some((ind) => industry.includes(ind))) {
      icpScore += 15;
      reasons.push(`Target industry match: ${input.industry}`);
    } else if (industry) {
      icpScore += 5;
    }

    icpScore = Math.min(100, icpScore);

    // 2. Evaluate Intent Score
    let intentScore = 30; // Base baseline
    const msg = (input.messageText || '').toLowerCase();

    // Check message intent signals
    if (msg.includes('demo') || msg.includes('book') || msg.includes('schedule') || msg.includes('call')) {
      intentScore += 30;
      reasons.push('Prospect explicitly requested demo or call walkthrough');
    }

    if (msg.includes('pricing') || msg.includes('quote') || msg.includes('cost') || msg.includes('tiers')) {
      intentScore += 25;
      reasons.push('Active commercial evaluation: inquired about pricing');
    }

    if (msg.includes('timeline') || msg.includes('asap') || msg.includes('urgently') || msg.includes('this week')) {
      intentScore += 20;
      reasons.push('High urgency timeline expressed in message');
    }

    if (input.buyingSignals && input.buyingSignals.length > 0) {
      intentScore += input.buyingSignals.length * 10;
      reasons.push(`Detected buying signals: ${input.buyingSignals.join(', ')}`);
    }

    intentScore = Math.min(100, intentScore);

    // 3. Status & Recommendation
    let status: 'qualified' | 'unqualified' | 'pending' | 'nurture' = 'pending';
    let nextAction: 'book_meeting' | 'send_outreach' | 'nurture' | 'handoff' | 'disqualify' = 'nurture';

    if (icpScore >= 75 && intentScore >= 60) {
      status = 'qualified';
      nextAction = 'book_meeting';
    } else if (icpScore >= 60) {
      status = 'qualified';
      nextAction = 'send_outreach';
    } else if (icpScore < 45 && intentScore < 40) {
      status = 'unqualified';
      nextAction = 'disqualify';
    } else {
      status = 'nurture';
      nextAction = 'nurture';
    }

    const output: QualificationOutput = {
      icp_fit_score: icpScore,
      intent_score: intentScore,
      qualification_status: status,
      reasons,
      missing_information: missingInfo,
      recommended_next_action: nextAction,
      confidence: 0.92,
    };

    // 4. Save to Lead Record via Tool
    await this.callTool('update_lead_qualification', {
      leadId: input.leadId,
      qualification: output,
    }, ctx);

    this.logger.log(`[Qualification Complete] Lead=${input.leadId} ICP=${icpScore}% Intent=${intentScore}% Status=${status}`);
    return output;
  }
}
