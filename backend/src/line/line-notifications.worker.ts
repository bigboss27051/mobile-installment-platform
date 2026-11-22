import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { LineNotificationsService } from './line-notifications.service';

@Injectable()
export class LineNotificationsWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LineNotificationsWorker.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly line: LineNotificationsService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.tick(), 30_000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async tick(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      await this.line.enqueueScheduledReminders();
      await this.line.dispatchPendingNotifications();
    } catch (error) {
      this.logger.error(
        'LINE notification worker tick failed.',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }
}
