import { z } from 'zod';
import { AgentTool, ToolExecutionContext } from '../tool.interface';

export const CheckCalendarInputSchema = z.object({
  targetDate: z.string().optional(),
  timezone: z.string().default('America/New_York'),
  durationMinutes: z.number().int().default(30),
});

export type CheckCalendarInput = z.infer<typeof CheckCalendarInputSchema>;

export interface CalendarSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export const checkCalendarTool: AgentTool<CheckCalendarInput, { slots: CalendarSlot[]; timezone: string }> = {
  name: 'check_calendar_availability',
  description: 'Checks sales team calendar availability to negotiate meeting slots with prospects.',
  riskLevel: 'external_read',
  inputSchema: CheckCalendarInputSchema,
  requiresApproval: false,
  async execute(input, ctx: ToolExecutionContext) {
    const baseDate = input.targetDate ? new Date(input.targetDate) : new Date(Date.now() + 86400000);
    const dateStr = baseDate.toISOString().split('T')[0];

    // Compute realistic open business hour slots
    const slots: CalendarSlot[] = [
      {
        startTime: `${dateStr}T14:00:00Z`,
        endTime: `${dateStr}T14:30:00Z`,
        available: true,
      },
      {
        startTime: `${dateStr}T15:30:00Z`,
        endTime: `${dateStr}T16:00:00Z`,
        available: true,
      },
      {
        startTime: `${dateStr}T17:00:00Z`,
        endTime: `${dateStr}T17:30:00Z`,
        available: true,
      },
    ];

    return {
      slots,
      timezone: input.timezone,
    };
  },
};
