import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  check(): { data: { status: 'ok' } } {
    return { data: { status: 'ok' } };
  }

  @Get('ready')
  async ready(): Promise<{ data: { status: 'ok'; postgres: 'up' } }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { data: { status: 'ok', postgres: 'up' } };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        postgres: 'down',
      });
    }
  }
}
