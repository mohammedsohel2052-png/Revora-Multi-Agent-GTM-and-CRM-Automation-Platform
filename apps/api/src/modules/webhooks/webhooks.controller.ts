import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { InboundWebhookDto } from './dto/webhook-payload.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ApiTags, ApiOperation, ApiParam, ApiHeader } from '@nestjs/swagger';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @Post(':provider')
  @ApiOperation({ summary: 'Ingest raw inbound webhook with HMAC verification and idempotency' })
  @ApiParam({ name: 'provider', enum: ['instagram', 'email', 'whatsapp', 'form', 'website', 'stripe'] })
  async handleWebhook(
    @Param('provider') provider: 'instagram' | 'email' | 'whatsapp' | 'form' | 'website',
    @Body() dto: InboundWebhookDto,
    @Headers('x-hub-signature-256') metaSig?: string,
    @Headers('stripe-signature') stripeSig?: string,
  ) {
    const signature = metaSig || stripeSig;
    return await this.webhooksService.processInboundWebhook(
      provider,
      dto,
      dto.rawPayload || (dto as any),
      signature,
    );
  }

  @Get('events')
  @UseGuards(TenantGuard)
  @ApiHeader({ name: 'x-tenant-id', required: true })
  @ApiOperation({ summary: 'List recent ingested webhook events for tenant' })
  async listEvents(@CurrentTenant() tenantId: string) {
    return await this.webhooksService.listRecentEvents(tenantId);
  }
}
