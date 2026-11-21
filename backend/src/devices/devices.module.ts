import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SandboxMdmAdapter } from './adapters/sandbox-mdm.adapter';
import { DeviceAgentController } from './device-agent.controller';
import { DeviceCheckInService } from './device-check-in.service';
import { DeviceCommandsService } from './device-commands.service';
import { DeviceLifecycleController } from './device-lifecycle.controller';
import { DeviceLifecycleService } from './device-lifecycle.service';
import { DeviceLocationService } from './device-location.service';
import { DeviceRecoveryService } from './device-recovery.service';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { PaymentUnlockOrchestrator } from './payment-unlock.orchestrator';
import { MDM_PROVIDER } from './ports/mdm-provider.port';

@Module({
  imports: [PrismaModule],
  controllers: [
    EnrollmentController,
    DeviceAgentController,
    DeviceLifecycleController,
  ],
  providers: [
    EnrollmentService,
    DeviceCheckInService,
    DeviceLocationService,
    DeviceCommandsService,
    DeviceLifecycleService,
    DeviceRecoveryService,
    PaymentUnlockOrchestrator,
    { provide: MDM_PROVIDER, useClass: SandboxMdmAdapter },
  ],
  exports: [MDM_PROVIDER, PaymentUnlockOrchestrator],
})
export class DevicesModule {}
