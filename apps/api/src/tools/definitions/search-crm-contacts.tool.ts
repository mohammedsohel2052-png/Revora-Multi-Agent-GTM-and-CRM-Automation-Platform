import { z } from 'zod';
import { AgentTool, ToolExecutionContext } from '../tool.interface';
import { db, contacts } from '@revora/db';
import { eq, or, ilike, and } from 'drizzle-orm';

export const SearchCrmContactsInputSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(20).default(5),
});

export type SearchCrmContactsInput = z.infer<typeof SearchCrmContactsInputSchema>;

export const searchCrmContactsTool: AgentTool<SearchCrmContactsInput, any[]> = {
  name: 'search_crm_contacts',
  description: 'Search contacts by name, email, or company within the current workspace tenant.',
  riskLevel: 'read',
  inputSchema: SearchCrmContactsInputSchema,
  requiresApproval: false,
  async execute(input, ctx: ToolExecutionContext) {
    const results = await db.query.contacts.findMany({
      where: (c, { eq, and, or, ilike }) =>
        and(
          eq(c.tenantId, ctx.tenantId),
          or(
            ilike(c.name, `%${input.query}%`),
            ilike(c.email, `%${input.query}%`),
          ),
        ),
      limit: input.limit,
      with: {
        company: true,
      },
    });

    return results.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      jobTitle: r.jobTitle,
      company: r.company?.name || null,
      tags: r.tags,
    }));
  },
};
