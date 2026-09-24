import { Module } from '@nestjs/common';
import { ConversationSlaService } from './conversation-sla.service';

@Module({
  providers: [ConversationSlaService],
  exports: [ConversationSlaService],
})
export class WorkflowsModule {}
