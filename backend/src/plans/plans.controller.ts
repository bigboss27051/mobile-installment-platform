import { Controller, Get, UseGuards } from '@nestjs/common';
import { InstallmentPlan } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/tenant/current-user.decorator';
import { TenantContext } from '../common/tenant/tenant-context';
import { PlansService } from './plans.service';

@Controller('installment-plans')
@UseGuards(JwtAuthGuard)
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  async list(@CurrentUser() user: TenantContext) {
    const plans = await this.plans.list(user);
    return { data: plans.map((plan) => this.serializePlan(plan)) };
  }

  private serializePlan(plan: InstallmentPlan) {
    return {
      ...plan,
      annualRate: plan.annualRate.toFixed(2),
    };
  }
}
