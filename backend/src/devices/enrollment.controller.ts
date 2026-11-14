import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/tenant/current-user.decorator';
import { TenantContext } from '../common/tenant/tenant-context';
import { CreateEnrollmentSessionDto } from './dto/create-enrollment-session.dto';
import { EnrollmentService } from './enrollment.service';

@Controller('devices/enrollment-sessions')
@UseGuards(JwtAuthGuard)
export class EnrollmentController {
  constructor(private readonly enrollment: EnrollmentService) {}

  @Post()
  async create(
    @Body() dto: CreateEnrollmentSessionDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentUser() user: TenantContext,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('Idempotency-Key header is required.');
    }
    const session = await this.enrollment.create(user, dto, idempotencyKey);
    return { data: session };
  }

  @Get(':id')
  async getById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: TenantContext,
  ) {
    const session = await this.enrollment.getById(user, id);
    return { data: session };
  }

  @Post(':id/qr')
  async qr(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: TenantContext,
  ) {
    const qr = await this.enrollment.materializeQr(user, id);
    return { data: qr };
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: TenantContext,
  ) {
    const session = await this.enrollment.cancel(user, id);
    return { data: session };
  }
}
