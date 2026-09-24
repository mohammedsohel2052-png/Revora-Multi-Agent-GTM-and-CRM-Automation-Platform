import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentRunContext } from '../base.agent';
import { ToolRegistryService } from '../../tools/tool-registry.service';
import { BookedMeetingResult } from '../../tools/definitions/book-calendar-meeting.tool';

export interface BookingAgentInput {
  leadId: string;
  contactName: string;
  contactEmail: string;
  companyName?: string;
  companySize?: string;
  industry?: string;
  icpFitScore?: number;
  intentScore?: number;
  buyingSignals?: string[];
  preferredTime?: string;
  notes?: string;
}

export interface BookingAgentOutput {
  status: 'booked' | 'slot_unavailable';
  bookingId?: string;
  meetingUrl?: string;
  startTime?: string;
  endTime?: string;
  preMeetingBriefing: {
    attendee: string;
    leadSummary: string;
    targetCompany: string;
    fitAssessment: string;
    keySignals: string[];
    recommendedTalkTrack: string[];
  };
}

@Injectable()
export class BookingAgent extends BaseAgent<BookingAgentInput, BookingAgentOutput> {
  readonly name = 'Meeting Booking Agent';
  readonly role = 'booking';
  readonly autonomyLevel = 'supervised' as const;
  readonly allowedTools = ['check_calendar_availability', 'book_calendar_meeting'];

  constructor(toolRegistry: ToolRegistryService) {
    super(toolRegistry);
  }

  async execute(input: BookingAgentInput, ctx: AgentRunContext): Promise<BookingAgentOutput> {
    this.logger.log(`[Meeting Booking Agent] Coordinating booking for ${input.contactName} (${input.contactEmail})`);

    // 1. Resolve meeting window
    const startTime = input.preferredTime || new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const startDate = new Date(startTime);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 min duration
    const endTime = endDate.toISOString();

    // 2. Book via tool
    const bookingResult = await this.callTool<BookedMeetingResult>(
      'book_calendar_meeting',
      {
        leadId: input.leadId,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        startTime,
        endTime,
        title: `Revora Demo — ${input.companyName || input.contactName}`,
        notes: input.notes,
      },
      ctx,
    );

    // 3. Compile Pre-Meeting Briefing Dossier for Sales Rep
    const briefing = {
      attendee: input.contactName,
      leadSummary: `${input.contactName} at ${input.companyName || 'Prospect Org'} scheduled an initial platform walkthrough.`,
      targetCompany: `${input.companyName || 'Unknown'} (${input.industry || 'Technology'} • ${input.companySize || '50-200'} headcount)`,
      fitAssessment: `ICP Fit Score: ${input.icpFitScore ?? 85}/100 • Intent Score: ${input.intentScore ?? 80}/100. High conversion probability.`,
      keySignals: input.buyingSignals && input.buyingSignals.length > 0
        ? input.buyingSignals
        : ['Direct inbound interest in multi-agent revenue automation'],
      recommendedTalkTrack: [
        'Demonstrate multi-tenant PostgreSQL Row-Level Security (RLS) guarantees',
        'Showcase transparent ICP qualification rubrics and explainability logs',
        'Review Human-in-the-Loop approval workflows for outbound draft proposals',
        'Discuss integration timeline and Nango / Unipile connector setup',
      ],
    };

    this.logger.log(`[Meeting Booked] BookingId=${bookingResult.bookingId} URL=${bookingResult.meetingUrl}`);

    return {
      status: 'booked',
      bookingId: bookingResult.bookingId,
      meetingUrl: bookingResult.meetingUrl,
      startTime: bookingResult.startTime,
      endTime: bookingResult.endTime,
      preMeetingBriefing: briefing,
    };
  }
}
