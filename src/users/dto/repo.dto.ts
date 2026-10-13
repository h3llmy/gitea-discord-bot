import { StringOption } from 'necord';

export class RepoDto {
  @StringOption({ name: 'repo', description: 'owner/name', required: true })
  public readonly repo!: string;
}
