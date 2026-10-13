import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryColumn({ type: 'text', name: 'discord_id' })
  discordId!: string;

  @Column({ type: 'text', name: 'gitea_login' })
  giteaLogin!: string;

  @Column({ type: 'text', name: 'gitea_token_enc' })
  giteaTokenEnc!: string;

  @Column({
    type: 'text',
    name: 'created_at',
    default: () => "datetime('now')",
  })
  createdAt!: string;
}
