import { StringOption } from 'necord';

export class ConnectDto {
  @StringOption({
    name: 'login',
    description: 'Gitea username',
    required: true,
  })
  public readonly login!: string;

  @StringOption({
    name: 'token',
    description: 'Gitea access token',
    required: true,
  })
  public readonly giteaToken!: string;
}
