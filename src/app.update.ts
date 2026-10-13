import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'discord.js';
import { Context, Once } from 'necord';
import type { ContextOf } from 'necord';
import { ReportCron } from './report/report.cron.js';

@Injectable()
export class AppUpdate {
  private readonly logger = new Logger(AppUpdate.name);

  public constructor(
    private readonly client: Client,
    private readonly reportCron: ReportCron,
  ) {}

  @Once('clientReady')
  public onReady(@Context() [client]: ContextOf<'clientReady'>): void {
    this.logger.log(`Bot logged in as ${client.user.username}`);
    this.reportCron.setReady();
  }

  @Once('error')
  public onError(@Context() [error]: ContextOf<'error'>): void {
    this.logger.error(error);
  }
}
