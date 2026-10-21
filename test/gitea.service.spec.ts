import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { AxiosError } from 'axios';
import type { HttpService } from '@nestjs/axios';
import { GiteaService } from '../src/gitea/gitea.service.js';
import type { GiteaCommit, GiteaPull } from '../src/gitea/gitea.types.js';

type Reply = unknown[] | Error;

function makeService(replies: Reply[]): {
  svc: GiteaService;
  calls: string[];
} {
  const calls: string[] = [];
  let i = 0;
  const http = {
    get: vi.fn((path: string) => {
      calls.push(path);
      const reply = replies[i++] ?? [];
      if (reply instanceof Error) throw reply;
      return of({ data: reply });
    }),
  } as unknown as HttpService;
  return { svc: new GiteaService(http), calls };
}

function axiosError(status: number): AxiosError {
  return new AxiosError('boom', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: 'err',
    data: null,
    headers: {},
    config: { headers: {} as never },
  });
}

const win = {
  from: new Date('2026-10-11T00:00:00.000Z'),
  to: new Date('2026-10-12T00:00:00.000Z'),
};

function commit(sha: string, created: string): GiteaCommit {
  return { sha, created };
}

describe('listCommits', () => {
  it('filters the date window server side', async () => {
    const { svc, calls } = makeService([[]]);
    await svc.listCommits('owner/repo', win, 'tok');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('/repos/owner/repo/commits?');
    expect(calls[0]).toContain('since=2026-10-11T00%3A00%3A00.000Z');
    expect(calls[0]).toContain('until=2026-10-12T00%3A00%3A00.000Z');
    expect(calls[0]).toContain('stat=false');
    expect(calls[0]).toContain('files=false');
    expect(calls[0]).toContain('verification=false');
  });

  it('passes the requested ref as sha', async () => {
    const { svc, calls } = makeService([[]]);
    await svc.listCommits('owner/repo', win, 'tok', { ref: 'feature/x' });
    expect(calls[0]).toContain('sha=feature%2Fx');
  });

  it('omits sha for the default branch', async () => {
    const { svc, calls } = makeService([[]]);
    await svc.listCommits('owner/repo', win, 'tok');
    expect(calls[0]).not.toContain('sha=');
  });

  it('keeps the client side window filter', async () => {
    const { svc } = makeService([
      [
        commit('a', '2026-10-11T05:00:00.000Z'),
        commit('b', '2026-10-10T23:00:00.000Z'),
        commit('c', '2026-10-12T00:00:00.000Z'),
      ],
    ]);
    const out = await svc.listCommits('owner/repo', win, 'tok');
    expect(out.map((c) => c.sha)).toEqual(['a']);
  });

  it('returns empty for a missing ref in optional mode', async () => {
    const { svc } = makeService([axiosError(404)]);
    await expect(
      svc.listCommits('owner/repo', win, 'tok', {
        ref: 'gone',
        optional: true,
      }),
    ).resolves.toEqual([]);
  });

  it('throws for a missing ref in strict mode', async () => {
    const { svc } = makeService([axiosError(404)]);
    await expect(
      svc.listCommits('owner/repo', win, 'tok', { ref: 'gone' }),
    ).rejects.toThrow(/Gitea 404/);
  });

  it('paginates until a short page', async () => {
    const full = Array.from({ length: 50 }, (_, i) =>
      commit(`s${i}`, '2026-10-11T05:00:00.000Z'),
    );
    const { svc, calls } = makeService([
      [...full],
      [commit('last', '2026-10-11T05:00:00.000Z')],
    ]);
    const out = await svc.listCommits('owner/repo', win, 'tok');
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain('page=1');
    expect(calls[1]).toContain('page=2');
    expect(out).toHaveLength(51);
  });
});

describe('listOpenPulls', () => {
  it('asks for open pulls without a date filter', async () => {
    const { svc, calls } = makeService([[]]);
    await svc.listOpenPulls('owner/repo', 'tok');
    expect(calls[0]).toContain('/repos/owner/repo/pulls?state=open');
    expect(calls[0]).not.toContain('since=');
  });

  it('returns the open pulls', async () => {
    const pr = {
      number: 1,
      title: 'pr',
      state: 'open',
      merged: false,
      draft: false,
      created_at: '2026-10-11T01:00:00.000Z',
      closed_at: null,
      merged_at: null,
      user: { login: 'alice' },
      base: { ref: 'main', label: 'main' },
      head: { ref: 'feature/x', label: 'feature/x' },
    } as GiteaPull;
    const { svc } = makeService([[pr]]);
    expect(await svc.listOpenPulls('owner/repo', 'tok')).toEqual([pr]);
  });
});
