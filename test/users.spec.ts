import { randomBytes } from 'node:crypto';
import { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CryptoService } from '../src/shared/services/crypto.service.js';
import { UserRepoEntity } from '../src/users/user-repo.entity.js';
import { UserEntity } from '../src/users/user.entity.js';
import { UsersService } from '../src/users/users.service.js';
import type { ConfigService } from '@nestjs/config';

const key = randomBytes(32);
process.env.ENCRYPTION_KEY = key.toString('hex');

function makeCrypto(): CryptoService {
  const config = {
    get: (k: string) =>
      k === 'ENCRYPTION_KEY' ? key.toString('hex') : undefined,
    getOrThrow: (k: string) => {
      if (k === 'ENCRYPTION_KEY') return key.toString('hex');
      throw new Error(`Missing ${k}`);
    },
  } as ConfigService;
  return new CryptoService(config);
}

describe('crypto', () => {
  it('round-trips', () => {
    const crypto = makeCrypto();
    const enc = crypto.encrypt('secret-token');
    expect(enc).not.toContain('secret-token');
    expect(crypto.decrypt(enc)).toBe('secret-token');
  });

  it('wrong key fails', () => {
    const crypto = makeCrypto();
    const enc = crypto.encrypt('secret-token');
    const otherConfig = {
      get: (k: string) =>
        k === 'ENCRYPTION_KEY' ? randomBytes(32).toString('hex') : undefined,
      getOrThrow: (k: string) => {
        if (k === 'ENCRYPTION_KEY') return randomBytes(32).toString('hex');
        throw new Error(`Missing ${k}`);
      },
    } as ConfigService;
    const other = new CryptoService(otherConfig);
    expect(() => other.decrypt(enc)).toThrow();
  });
});

describe('users', () => {
  let ds: DataSource;
  let svc: UsersService;

  beforeEach(async () => {
    ds = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [UserEntity, UserRepoEntity],
      synchronize: true,
    });
    await ds.initialize();
    const userRepo = ds.getRepository(UserEntity);
    const repoRepo = ds.getRepository(UserRepoEntity);
    svc = new UsersService(userRepo, repoRepo, makeCrypto());
  });

  afterEach(async () => {
    if (ds.isInitialized) {
      await ds.destroy();
    }
  });

  it('registers and reads back decrypted token', async () => {
    await svc.register('u1', 'alice', 'tok123');
    const u = await svc.getUser('u1');
    expect(u?.giteaLogin).toBe('alice');
    expect(u?.giteaToken).toBe('tok123');
    expect(u?.repos).toEqual([]);
  });

  it('re-register overwrites', async () => {
    await svc.register('u1', 'alice', 'old');
    await svc.register('u1', 'alice2', 'new');
    const u = await svc.getUser('u1');
    expect(u?.giteaLogin).toBe('alice2');
    expect(u?.giteaToken).toBe('new');
  });

  it('adds lists removes repos', async () => {
    await svc.register('u1', 'alice', 'tok');
    await svc.addRepo('u1', 'owner/b');
    await svc.addRepo('u1', 'owner/a');
    await svc.addRepo('u1', 'owner/a');
    expect(await svc.listRepos('u1')).toEqual([
      { fullName: 'owner/a' },
      { fullName: 'owner/b' },
    ]);
    await svc.removeRepo('u1', 'owner/a');
    expect(await svc.listRepos('u1')).toEqual([{ fullName: 'owner/b' }]);
  });

  it('stores the tracked branch and updates it on re-add', async () => {
    await svc.register('u1', 'alice', 'tok');
    await svc.addRepo('u1', 'owner/a', 'develop');
    expect(await svc.listRepos('u1')).toEqual([
      { fullName: 'owner/a', branch: 'develop' },
    ]);
    await svc.addRepo('u1', 'owner/a', 'release');
    expect(await svc.listRepos('u1')).toEqual([
      { fullName: 'owner/a', branch: 'release' },
    ]);
  });

  it('addRepo without registration throws', async () => {
    await expect(svc.addRepo('ghost', 'owner/r')).rejects.toThrow();
  });

  it('listAllUsers returns decrypted users with repos', async () => {
    await svc.register('u1', 'alice', 'tok1');
    await svc.addRepo('u1', 'owner/r1');
    await svc.register('u2', 'bob', 'tok2');
    const all = await svc.listAllUsers();
    expect(all).toHaveLength(2);
    expect(all.find((u) => u.discordId === 'u1')).toMatchObject({
      giteaLogin: 'alice',
      giteaToken: 'tok1',
      repos: [{ fullName: 'owner/r1' }],
    });
  });
});
