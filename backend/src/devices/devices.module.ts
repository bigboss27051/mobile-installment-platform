import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SandboxMdmAdapter } from './adapters/sandbox-mdm.adapter';
import { DeviceAgentController } from './device-agent.controller';
import { DeviceCheckInService } from './device-check-in.service';
import { DeviceCommandsService } from './device-commands.service';
import { DeviceLifecycleController } from './device-lifecycle.controller';
import { DeviceLifecycleService } from './device-lifecycle.service';
import { DeviceRecoveryService } from './device-recovery.service';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
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
    DeviceCommandsService,
    DeviceLifecycleService,
    DeviceRecoveryService,
    { provide: MDM_PROVIDER, useClass: SandboxMdmAdapter },
  ],
  exports: [MDM_PROVIDER],
})
export class DevicesModule {}
