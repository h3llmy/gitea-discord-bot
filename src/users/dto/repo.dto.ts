import { StringOption } from 'necord';

export class RepoDto {
  @StringOption({ name: 'repo', description: 'owner/name', required: true })
  public readonly repo!: string;
}

export class RepoAddDto extends RepoDto {
  @StringOption({
    name: 'branch',
    description: 'Branch to report on (default: repo default branch)',
    required: false,
  })
  public readonly branch?: string;
}
