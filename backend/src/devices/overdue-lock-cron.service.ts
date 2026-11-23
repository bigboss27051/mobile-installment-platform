import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PlatformRole } from '@prisma/client';
import { CronJob } from 'cron';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { bangkokTodayYmd } from './overdue-lock-policy';
import { OverdueLockOrchestrator } from './overdue-lock.orchestrator';
import { OverdueLockSystemActorService } from './overdue-lock-system-actor.service';

/** Fixed Postgres advisory lock key for overdue evaluate ticks (lab single-flight). */
export const OVERDUE_EVALUATE_ADVISORY_LOCK_KEY = 872314001;
const CRON_JOB_NAME = 'overdue-evaluate';

@Injectable()
export class OverdueLockCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OverdueLockCronService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly scheduler: SchedulerRegistry,
    private readonly prisma: PrismaService,
    private readonly actors: OverdueLockSystemActorService,
    private readonly orchestrator: OverdueLockOrchestrator,
  ) {}

  onModuleInit() {
    const expr = this.config.get<string>('OVERDUE_EVALUATE_CRON')?.trim();
    if (!expr) {
      this.logger.log(
        'OVERDUE_EVALUATE_CRON unset — overdue evaluate cron DISABLED',
      );
      return;
    }

    let job: CronJob;
    try {
      job = CronJob.from({
        cronTime: expr,
        onTick: () => {
          void this.tick();
        },
        start: false,
      });
    } catch (err) {
      this.logger.error(
        `OVERDUE_EVALUATE_CRON invalid expr="${expr}" — refusing to start`,
      );
      throw err;
    }

    this.scheduler.addCronJob(CRON_JOB_NAME, job);
    job.start();
    this.logger.log(`OVERDUE_EVALUATE_CRON ENABLED expr="${expr}"`);
  }

  onModuleDestroy() {
    try {
      const job = this.scheduler.getCronJob(CRON_JOB_NAME);
      job.stop();
      this.scheduler.deleteCronJob(CRON_JOB_NAME);
    } catch {
      // job was never registered
    }
  }

  /** Exposed for unit tests / manual lab trigger. */
  async tick(now: Date = new Date()): Promise<{
    ran: boolean;
    reason: string;
    tenants?: number;
  }> {
    const locked = await this.tryAdvisoryLock();
    if (!locked) {
      this.logger.warn(
        'overdue evaluate tick SKIP_LOCK (another instance holds advisory lock)',
      );
      return { ran: false, reason: 'SKIP_LOCK' };
    }

    this.logger.log('overdue evaluate tick START');
    try {
      const tenants = await this.prisma.tenant.findMany({
        select: {
          id: true,
          devicePolicySettings: {
            select: { autoEvaluateCronEnabled: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      let lockedDevices = 0;
      for (const tenant of tenants) {
        const cronEnabled =
          tenant.devicePolicySettings?.autoEvaluateCronEnabled ?? true;
        if (!cronEnabled) {
          this.logger.log(
            `overdue evaluate tenant=${tenant.id} SKIP_CRON_DISABLED`,
          );
          continue;
        }
        const actor = await this.actors.ensureForTenant(tenant.id);
        const ctx: TenantContext = {
          tenantId: tenant.id,
          userId: actor.id,
          role: actor.role as PlatformRole,
        };
        const ymd = bangkokTodayYmd(now);
        const hour = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Bangkok',
          hour: '2-digit',
          hour12: false,
        })
          .format(now)
          .padStart(2, '0');
        const idem = `cron:${tenant.id}:${ymd}:${hour}`;
        const summary = await this.orchestrator.evaluateTenant(
          ctx,
          'cron overdue-evaluate',
          idem,
          now,
        );
        lockedDevices += summary.locked.length;
        this.logger.log(
          `overdue evaluate tenant=${tenant.id} scanned=${summary.scannedBindings} locked=${summary.locked.length} skipped=${summary.skipped.length} replay=${summary.replay}`,
        );
      }
      this.logger.log(
        `overdue evaluate tick END tenants=${tenants.length} lockedDevices=${lockedDevices}`,
      );
      return { ran: true, reason: 'OK', tenants: tenants.length };
    } finally {
      await this.advisoryUnlock();
    }
  }

  private async tryAdvisoryLock(): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ ok: boolean }>>`
      SELECT pg_try_advisory_lock(${OVERDUE_EVALUATE_ADVISORY_LOCK_KEY}) AS ok
    `;
    return Boolean(rows[0]?.ok);
  }

  private async advisoryUnlock(): Promise<void> {
    await this.prisma.$queryRaw`
      SELECT pg_advisory_unlock(${OVERDUE_EVALUATE_ADVISORY_LOCK_KEY})
    `;
  }
}
