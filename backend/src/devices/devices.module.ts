import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { SandboxMdmAdapter } from './adapters/sandbox-mdm.adapter';
import { DeviceAgentController } from './device-agent.controller';
import { DeviceCheckInService } from './device-check-in.service';
import { DeviceCommandsService } from './device-commands.service';
import { FcmPushAdapter } from './fcm-push.adapter';
import { DeviceLifecycleController } from './device-lifecycle.controller';
import { DeviceLifecycleService } from './device-lifecycle.service';
import { DeviceLocationService } from './device-location.service';
import { DeviceRecoveryService } from './device-recovery.service';
import {
  EnrollmentController,
  EnrollmentDpcConfigController,
} from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { ShopSetupController } from './shop-setup.controller';
import { ShopSetupService } from './shop-setup.service';
import { DeviceLockApprovalService } from './device-lock-approval.service';
import { DevicePolicySettingsService } from './device-policy-settings.service';
import { OverdueLockCronService } from './overdue-lock-cron.service';
import { OverdueLockSystemActorService } from './overdue-lock-system-actor.service';
import { OverdueLockOrchestrator } from './overdue-lock.orchestrator';
import { PaymentUnlockOrchestrator } from './payment-unlock.orchestrator';
import { MDM_PROVIDER } from './ports/mdm-provider.port';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [
    ShopSetupController,
    EnrollmentDpcConfigController,
    EnrollmentController,
    DeviceAgentController,
    DeviceLifecycleController,
  ],
  providers: [
    EnrollmentService,
    ShopSetupService,
    DeviceCheckInService,
    DeviceLocationService,
    FcmPushAdapter,
    DeviceCommandsService,
    DeviceLifecycleService,
    DeviceRecoveryService,
    PaymentUnlockOrchestrator,
    DevicePolicySettingsService,
    DeviceLockApprovalService,
    OverdueLockOrchestrator,
    OverdueLockSystemActorService,
    OverdueLockCronService,
    { provide: MDM_PROVIDER, useClass: SandboxMdmAdapter },
  ],
  exports: [MDM_PROVIDER, PaymentUnlockOrchestrator],
})
export class DevicesModule {}
