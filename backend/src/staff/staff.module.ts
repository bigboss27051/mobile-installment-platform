import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StaffBranchesController } from './staff-branches.controller';
import { StaffBranchesService } from './staff-branches.service';

@Module({
  imports: [PrismaModule],
  controllers: [StaffBranchesController],
  providers: [StaffBranchesService],
  exports: [StaffBranchesService],
})
export class StaffModule {}
