import { Inject, Injectable, UseInterceptors } from '@nestjs/common';
import { Context, Options, SlashCommand } from 'necord';
import type { SlashCommandContext } from 'necord';
import { ReportService } from './report.service.js';
import type { IReportService } from './report.types.js';
import { UsersService } from '../users/users.service.js';
import type { IUsersService } from '../users/users.types.js';
import { ReportDto } from './dto/report.dto.js';
import { ReportRepoAutocompleteInterceptor } from '../shared/interceptors/report-repo-autocomplete.interceptor.js';
import { MessageFlags } from 'discord.js';

@Injectable()
export class ReportCommands {
  public constructor(
    @Inject(ReportService) private readonly report: IReportService,
    @Inject(UsersService) private readonly users: IUsersService,
  ) {}

  @UseInterceptors(ReportRepoAutocompleteInterceptor)
  @SlashCommand({
    name: 'report',
    description: 'Generate daily Gitea report for your repos',
  })
  public async onReport(
    @Context() [interaction]: SlashCommandContext,
    @Options() { date, from, to, repo }: ReportDto,
  ): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const tz = process.env.REPORT_TZ ?? 'UTC';
    let days: string[];
    try {
      days = ReportService.resolveRange(date, from, to, new Date(), tz);
    } catch {
      await interaction.editReply(
        'Invalid date. Use DD-MM-YYYY. Max 31 days, from <= to.',
      );
      return;
    }
    const user = await this.users.getUser(interaction.user.id);
    if (!user || user.repos.length === 0) {
      await interaction.editReply('No repos tracked. Use /gitea add first.');
      return;
    }
    const repos = repo
      ? user.repos.filter((r) => r.toLowerCase() === repo.toLowerCase())
      : user.repos;
    if (repos.length === 0) {
      await interaction.editReply('Repo not tracked. Use /gitea list.');
      return;
    }
    const out = await this.report.collectRange(
      days,
      repos,
      user.giteaToken,
      user.giteaLogin,
    );
    if (out.length === 0) {
      const label =
        days.length === 1
          ? `Daily ${ReportService.formatDay(days[0])}`
          : `Daily ${ReportService.formatDay(days[0])} – ${ReportService.formatDay(days[days.length - 1])}`;
      await interaction.editReply(`${label}: no activity.`);
      return;
    }
    const embeds = out.map((a) => ReportService.buildEmbed(a));
    await interaction.editReply({ embeds: embeds.slice(0, 10) });
    for (let i = 10; i < embeds.length; i += 10) {
      await interaction.followUp({
        embeds: embeds.slice(i, i + 10),
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
