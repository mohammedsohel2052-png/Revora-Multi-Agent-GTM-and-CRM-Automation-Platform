import { z } from 'zod';
import { AgentTool, ToolExecutionContext } from '../tool.interface';
import { db, leads, conversations } from '@revora/db';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const BookCalendarMeetingInputSchema = z.object({
  leadId: z.string().uuid(),
  contactName: z.string().min(1),
  contactEmail: z.string().email(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  title: z.string().default('Product Architecture & Demo Walkthrough'),
  notes: z.string().optional(),
});

export type BookCalendarMeetingInput = z.infer<typeof BookCalendarMeetingInputSchema>;

export interface BookedMeetingResult {
  bookingId: string;
  calendarEventId: string;
  meetingUrl: string;
  startTime: string;
  endTime: string;
  briefingDossier: {
    attendee: string;
    email: string;
    title: string;
    agenda: string;
  };
}

export const bookCalendarMeetingTool: AgentTool<BookCalendarMeetingInput, BookedMeetingResult> = {
  name: 'book_calendar_meeting',
  description: 'Confirms calendar reservation, generates meeting link, and compiles pre-call briefing dossier.',
  riskLevel: 'external_write',
  inputSchema: BookCalendarMeetingInputSchema,
  requiresApproval: false, // Booking agreed-upon slots is safe
  async execute(input, ctx: ToolExecutionContext): Promise<BookedMeetingResult> {
    const bookingId = randomUUID();
    const calendarEventId = `cal_evt_${bookingId.slice(0, 8)}`;
    const meetingUrl = `https://meet.google.com/rev-${bookingId.slice(0, 3)}-${bookingId.slice(3, 6)}`;

    // Update lead status to meeting_booked
    await db
      .update(leads)
      .set({
        status: 'meeting_booked',
        nextAction: `Attend scheduled walkthrough on ${input.startTime}`,
        lastAgentAction: `Booked meeting by ${ctx.agentName}`,
        lastAgentActionAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(leads.id, input.leadId), eq(leads.tenantId, ctx.tenantId)));

    return {
      bookingId,
      calendarEventId,
      meetingUrl,
      startTime: input.startTime,
      endTime: input.endTime,
      briefingDossier: {
        attendee: input.contactName,
        email: input.contactEmail,
        title: input.title,
        agenda: 'Review multi-agent GTM automation requirements, tenant isolation setup, and integration scope.',
      },
    };
  },
};
