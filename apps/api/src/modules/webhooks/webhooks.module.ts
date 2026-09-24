import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { StripeWebhookService } from './stripe-webhook.service';
import { AgentsModule } from '../agents/agents.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AgentsModule, AuditModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, StripeWebhookService],
  exports: [WebhooksService, StripeWebhookService],
})
export class WebhooksModule {}
