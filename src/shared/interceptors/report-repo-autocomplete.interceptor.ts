import { Inject, Injectable } from '@nestjs/common';
import { AutocompleteInterceptor } from 'necord';
import type { IUsersService } from '../../users/users.types.js';
import { UsersService } from '../../users/users.service.js';
import { AutocompleteInteraction } from 'discord.js';

@Injectable()
export class ReportRepoAutocompleteInterceptor extends AutocompleteInterceptor {
  public constructor(
    @Inject(UsersService) private readonly users: IUsersService,
  ) {
    super();
  }

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name !== 'repo') return;
    const repos = await this.users.listRepos(interaction.user.id);
    const q = String(focused.value).toLowerCase();
    await interaction.respond(
      repos
        .filter((r) => r.toLowerCase().includes(q))
        .slice(0, 25)
        .map((r) => ({ name: r, value: r })),
    );
  }
}
