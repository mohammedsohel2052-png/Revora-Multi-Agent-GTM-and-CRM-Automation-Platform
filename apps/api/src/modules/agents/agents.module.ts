import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { LeadIntakeAgent } from '../../agents/lead-intake/lead-intake.agent';
import { QualificationAgent } from '../../agents/qualification/qualification.agent';
import { ConversationAgent } from '../../agents/conversation/conversation.agent';
import { SupervisorAgent } from '../../agents/supervisor.agent';
import { ToolsModule } from '../../tools/tools.module';

@Module({
  imports: [ToolsModule],
  controllers: [AgentsController],
  providers: [
    AgentsService,
    LeadIntakeAgent,
    QualificationAgent,
    ConversationAgent,
    SupervisorAgent,
  ],
  exports: [
    AgentsService,
    SupervisorAgent,
    LeadIntakeAgent,
    QualificationAgent,
    ConversationAgent,
  ],
})
export class AgentsModule {}
