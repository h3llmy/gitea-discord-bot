import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CryptoService } from '../shared/services/crypto.service.js';
import { UserRepoEntity } from './user-repo.entity.js';
import { UserEntity } from './user.entity.js';
import type { ICryptoService } from './users.types.js';
import type { IUsersService, UserRecord } from './users.types.js';

@Injectable()
export class UsersService implements IUsersService {
  public constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(UserRepoEntity)
    private readonly repos: Repository<UserRepoEntity>,
    @Inject(CryptoService) private readonly crypto: ICryptoService,
  ) {}

  async register(
    discordId: string,
    giteaLogin: string,
    giteaToken: string,
  ): Promise<void> {
    await this.users.save({
      discordId,
      giteaLogin,
      giteaTokenEnc: this.crypto.encrypt(giteaToken),
    });
  }

  async getUser(discordId: string): Promise<UserRecord | undefined> {
    const row = await this.users.findOneBy({ discordId });
    if (!row) return undefined;
    return {
      discordId: row.discordId,
      giteaLogin: row.giteaLogin,
      giteaToken: this.crypto.decrypt(row.giteaTokenEnc),
      repos: await this.listRepos(discordId),
    };
  }

  async addRepo(discordId: string, fullName: string): Promise<void> {
    if (!(await this.getUser(discordId))) {
      throw new Error('User not registered. Run /gitea connect first.');
    }
    await this.repos.save({ discordId, fullName }).catch(() => undefined);
  }

  async removeRepo(discordId: string, fullName: string): Promise<void> {
    await this.repos.delete({ discordId, fullName });
  }

  async listRepos(discordId: string): Promise<string[]> {
    const rows = await this.repos.find({
      where: { discordId },
      order: { fullName: 'ASC' },
    });
    return rows.map((r) => r.fullName);
  }

  async listAllUsers(): Promise<UserRecord[]> {
    const rows = await this.users.find();
    const out: UserRecord[] = [];
    for (const r of rows) {
      out.push({
        discordId: r.discordId,
        giteaLogin: r.giteaLogin,
        giteaToken: this.crypto.decrypt(r.giteaTokenEnc),
        repos: await this.listRepos(r.discordId),
      });
    }
    return out;
  }
}
