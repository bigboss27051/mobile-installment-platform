import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DeviceLifecycleController } from './device-lifecycle.controller';
import { DeviceLifecycleService } from './device-lifecycle.service';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';

@Module({
  imports: [PrismaModule],
  controllers: [EnrollmentController, DeviceLifecycleController],
  providers: [EnrollmentService, DeviceLifecycleService],
})
export class DevicesModule {}
