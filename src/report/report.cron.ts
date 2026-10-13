import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReportService } from './report.service.js';
import type { IReportService } from './report.types.js';

@Injectable()
export class ReportCron {
  private readonly logger = new Logger(ReportCron.name);
  private ready = false;

  public constructor(
    @Inject(ReportService) private readonly report: IReportService,
  ) {}

  setReady(): void {
    this.ready = true;
  }

  @Cron(process.env.REPORT_CRON ?? '0 8 * * *', {
    name: 'daily-report',
    timeZone: process.env.REPORT_TZ ?? 'UTC',
  })
  async handleDailyReport(): Promise<void> {
    if (!this.ready) {
      this.logger.debug('Discord client not ready, skipping daily report');
      return;
    }
    try {
      await this.report.sendDaily();
    } catch (err) {
      this.logger.error(err);
    }
  }
}
