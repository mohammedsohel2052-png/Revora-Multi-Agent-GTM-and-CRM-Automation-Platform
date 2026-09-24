import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { KnowledgeService, CreateKnowledgeDocumentDto } from './knowledge.service';

@ApiTags('knowledge')
@Controller('api/v1/knowledge')
@UseGuards(TenantGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get('documents')
  @ApiOperation({ summary: 'List all knowledge documents ingested for tenant' })
  async listDocuments(@CurrentTenant() tenantId: string) {
    return await this.knowledgeService.listDocuments(tenantId);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Ingest and embed a new knowledge document into pgvector chunks' })
  @ApiResponse({ status: 201, description: 'Document created and chunk embeddings generated' })
  async createDocument(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateKnowledgeDocumentDto,
  ) {
    return await this.knowledgeService.createDocument(tenantId, dto);
  }

  @Post('search')
  @ApiOperation({ summary: 'Perform tenant-isolated semantic RAG search across knowledge chunks' })
  async search(
    @CurrentTenant() tenantId: string,
    @Body() body: { query: string; limit?: number },
  ) {
    return await this.knowledgeService.search(tenantId, body.query, body.limit || 5);
  }
}
