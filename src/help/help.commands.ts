import { Injectable } from '@nestjs/common';
import { Context, SlashCommand } from 'necord';
import type { SlashCommandContext } from 'necord';
import { EmbedBuilder, MessageFlags } from 'discord.js';

@Injectable()
export class HelpCommands {
  @SlashCommand({
    name: 'help',
    description: 'Show bot command reference',
  })
  public async onHelp(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<void> {
    const embed = new EmbedBuilder().setTitle('MLS Bot Commands').addFields(
      {
        name: 'Gitea setup',
        value: [
          '- /gitea connect `login` `token` — link Gitea account (login = username, token = personal access token)',
          '- /gitea add `repo` — track repo (`owner/repo`)',
          '- /gitea remove `repo` — untrack repo',
          '- /gitea list — list tracked repos',
        ].join('\n'),
      },
      {
        name: 'Reports',
        value:
          '- /report `[date]` `[from]` `[to]` `[repo]` — daily or range activity (DD-MM-YYYY, max 31 days)',
      },
      {
        name: 'Help',
        value: '- /help — this message',
      },
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  }
}
