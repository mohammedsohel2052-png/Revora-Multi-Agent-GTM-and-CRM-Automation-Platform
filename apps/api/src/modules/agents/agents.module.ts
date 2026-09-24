import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { LeadIntakeAgent } from '../../agents/lead-intake/lead-intake.agent';
import { IdentityResolutionAgent } from '../../agents/identity-resolution/identity-resolution.agent';
import { EnrichmentAgent } from '../../agents/enrichment/enrichment.agent';
import { QualificationAgent } from '../../agents/qualification/qualification.agent';
import { ConversationAgent } from '../../agents/conversation/conversation.agent';
import { BookingAgent } from '../../agents/booking/booking.agent';
import { HumanHandoffAgent } from '../../agents/human-handoff/human-handoff.agent';
import { SupervisorAgent } from '../../agents/supervisor.agent';
import { ToolsModule } from '../../tools/tools.module';

@Module({
  imports: [ToolsModule],
  controllers: [AgentsController],
  providers: [
    AgentsService,
    LeadIntakeAgent,
    IdentityResolutionAgent,
    EnrichmentAgent,
    QualificationAgent,
    ConversationAgent,
    BookingAgent,
    HumanHandoffAgent,
    SupervisorAgent,
  ],
  exports: [
    AgentsService,
    SupervisorAgent,
    LeadIntakeAgent,
    IdentityResolutionAgent,
    EnrichmentAgent,
    QualificationAgent,
    ConversationAgent,
    BookingAgent,
    HumanHandoffAgent,
  ],
})
export class AgentsModule {}
