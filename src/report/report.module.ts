import { Module } from '@nestjs/common';
import { GiteaModule } from '../gitea/gitea.module.js';
import { UsersModule } from '../users/users.module.js';
import { ReportCommands } from './report.commands.js';
import { ReportCron } from './report.cron.js';
import { ReportService } from './report.service.js';

@Module({
  imports: [GiteaModule, UsersModule],
  providers: [ReportService, ReportCron, ReportCommands],
  exports: [ReportService, ReportCron],
})
export class ReportModule {}
