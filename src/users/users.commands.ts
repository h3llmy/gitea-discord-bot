import { Inject, Injectable } from '@nestjs/common';
import {
  Context,
  createCommandGroupDecorator,
  Options,
  Subcommand,
} from 'necord';
import type { SlashCommandContext } from 'necord';
import { UsersService } from './users.service.js';
import type { IUsersService } from './users.types.js';
import { ConnectDto } from './dto/connect.dto.js';
import { RepoDto } from './dto/repo.dto.js';
import { MessageFlags } from 'discord.js';

export const GiteaCommandDecorator = createCommandGroupDecorator({
  name: 'gitea',
  description: 'Gitea configuration',
});

@GiteaCommandDecorator()
@Injectable()
export class UsersCommands {
  public constructor(
    @Inject(UsersService) private readonly users: IUsersService,
  ) {}

  @Subcommand({
    name: 'connect',
    description: 'Link your Gitea account',
  })
  public async onConnect(
    @Context() [interaction]: SlashCommandContext,
    @Options() { login, giteaToken }: ConnectDto,
  ): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await this.users.register(interaction.user.id, login, giteaToken);
    await interaction.editReply(`Gitea account linked: ${login}`);
  }

  @Subcommand({
    name: 'add',
    description: 'Add a repo to track',
  })
  public async onAdd(
    @Context() [interaction]: SlashCommandContext,
    @Options() { repo }: RepoDto,
  ): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await this.users.addRepo(interaction.user.id, repo);
      await interaction.editReply(`Tracking ${repo}`);
    } catch (e) {
      await interaction.editReply((e as Error).message);
    }
  }

  @Subcommand({
    name: 'remove',
    description: 'Remove a tracked repo',
  })
  public async onRemove(
    @Context() [interaction]: SlashCommandContext,
    @Options() { repo }: RepoDto,
  ): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await this.users.removeRepo(interaction.user.id, repo);
    await interaction.editReply(`Removed ${repo}`);
  }

  @Subcommand({
    name: 'list',
    description: 'List your tracked repos',
  })
  public async onList(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const repos = await this.users.listRepos(interaction.user.id);
    if (repos.length === 0) {
      await interaction.editReply('No repos tracked. Use /gitea add');
      return;
    }
    await interaction.editReply(`Tracked:\n- ${repos.join('\n- ')}`);
  }
}
