import { ToolRegistryService } from '../../apps/api/src/tools/tool-registry.service';
import { AgentTool } from '../../apps/api/src/tools/tool.interface';
import { z } from 'zod';
import { randomUUID } from 'crypto';

describe('Integration Test: Failure Recovery, Retries, and Error Bounding', () => {
  let toolRegistry: ToolRegistryService;
  let mockAudit: any;
  const tenantId = 'tenant_failure_recovery';

  beforeEach(() => {
    mockAudit = {
      record: jest.fn().mockResolvedValue('audit-fail-1'),
    };
    toolRegistry = new ToolRegistryService(mockAudit);
  });

  it('safely catches third-party provider failure, logs audit event, and returns error without crashing', async () => {
    let attempts = 0;
    const flakeyTool: AgentTool<{ endpoint: string }, { result: string }> = {
      name: 'flakey_crm_provider',
      description: 'Simulates a flakey CRM endpoint that fails before recovering',
      riskLevel: 'read',
      inputSchema: z.object({ endpoint: z.string() }),
      async execute(input) {
        attempts++;
        if (attempts < 2) {
          throw new Error('503 Service Unavailable: CRM rate limit reached');
        }
        return { result: `Success on attempt ${attempts}` };
      },
    };

    toolRegistry.registerTool(flakeyTool);

    const ctx = {
      tenantId,
      agentId: 'test_agent',
      agentName: 'TestAgent',
      traceId: 'tr_flakey_1',
    };

    // First attempt fails safely
    const failResult = await toolRegistry.executeTool('flakey_crm_provider', { endpoint: 'api.hubspot.com' }, ctx);
    expect(failResult.success).toBe(false);
    expect(failResult.error).toContain('503 Service Unavailable');
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        result: 'error',
        errorMessage: expect.stringContaining('503 Service Unavailable'),
      }),
    );

    // Second attempt recovers safely
    const successResult = await toolRegistry.executeTool('flakey_crm_provider', { endpoint: 'api.hubspot.com' }, ctx);
    expect(successResult.success).toBe(true);
    expect(successResult.data).toEqual({ result: 'Success on attempt 2' });
  });

  it('rejects malformed inputs and prevents malformed data from reaching underlying tools', async () => {
    const ctx = {
      tenantId,
      agentId: 'test_agent',
      agentName: 'TestAgent',
      traceId: 'tr_schema_err',
    };

    // search_crm_contacts requires query: string
    const result = await toolRegistry.executeTool('search_crm_contacts', { invalidProp: 123 }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Input validation failed');
  });
});
