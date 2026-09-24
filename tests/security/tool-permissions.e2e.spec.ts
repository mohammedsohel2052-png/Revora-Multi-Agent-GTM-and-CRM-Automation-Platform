import { BaseAgent, AgentRunContext } from '../../apps/api/src/agents/base.agent';
import { ToolRegistryService } from '../../apps/api/src/tools/tool-registry.service';
import { randomUUID } from 'crypto';

class ReadOnlyResearchAgent extends BaseAgent<{ query: string }, { result: string }> {
  readonly name = 'research_agent';
  readonly role = 'Read-Only Researcher';
  readonly autonomyLevel = 'supervised' as const;
  readonly allowedTools = ['search_crm_contacts', 'search_knowledge_base'];

  async execute(input: { query: string }, ctx: AgentRunContext) {
    // Attempt to invoke a write tool not in allowedTools
    await this.callTool('update_lead_qualification', { leadId: 'lead-1', score: 99 }, ctx);
    return { result: 'completed' };
  }
}

describe('Security Test: Agent Tool Permissions & Sandboxed Execution', () => {
  let toolRegistry: ToolRegistryService;
  let mockAudit: any;

  beforeEach(() => {
    mockAudit = { record: jest.fn().mockResolvedValue('audit-tool-perm') };
    toolRegistry = new ToolRegistryService(mockAudit);
  });

  it('prevents agent from executing tools outside its explicitly allowed permissions whitelist', async () => {
    const agent = new ReadOnlyResearchAgent(toolRegistry);
    const ctx: AgentRunContext = {
      tenantId: 'tenant_tool_sec',
      traceId: 'tr_tool_sec_1',
    };

    await expect(agent.execute({ query: 'test' }, ctx)).rejects.toThrow(
      'Agent "research_agent" is not permitted to execute tool "update_lead_qualification"',
    );
  });

  it('requires human approval for tools classified as financial or external_write with risk gates', () => {
    const financialTool = toolRegistry.getTool('create_checkout_session');
    expect(financialTool).toBeDefined();
    expect(financialTool?.riskLevel).toBe('financial');

    // If amount exceeds $5000 threshold, approval is strictly required
    const requiresApproval = (financialTool?.requiresApproval as Function)({
      leadId: randomUUID(),
      contactId: randomUUID(),
      tier: 'enterprise',
      amount: 12000,
    });
    expect(requiresApproval).toBe(true);
  });
});
