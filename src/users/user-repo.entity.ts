import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from './user.entity.js';

@Entity({ name: 'user_repos' })
@Unique(['discordId', 'fullName'])
export class UserRepoEntity {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id!: number;

  @Column({ type: 'text', name: 'discord_id' })
  discordId!: string;

  @Column({ type: 'text', name: 'full_name' })
  fullName!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'discord_id' })
  user!: UserEntity;
}
