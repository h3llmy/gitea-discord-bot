import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import type {
  CommitQuery,
  GiteaCommit,
  GiteaIssue,
  GiteaPull,
  IGiteaService,
  RepoWindow,
} from './gitea.types.js';

const MISSING_STATUSES = new Set([404, 409, 422]);

@Injectable()
export class GiteaService implements IGiteaService {
  private readonly pageSize = 50;
  private readonly maxPages = 50;

  public constructor(private readonly http: HttpService) {}

  private async fetch<T>(path: string, token: string): Promise<T> {
    const { data } = await firstValueFrom(
      this.http.get<T>(path, {
        headers: { Authorization: `token ${token}` },
      }),
    );
    return data;
  }

  private async get<T>(path: string, token: string): Promise<T> {
    try {
      return await this.fetch<T>(path, token);
    } catch (err) {
      if (err instanceof AxiosError) {
        throw new InternalServerErrorException(
          `Gitea ${err.response?.status} on ${path}`,
        );
      }
      throw new InternalServerErrorException(`Gitea request failed on ${path}`);
    }
  }

  /** Missing ref, empty repo or no access resolves to undefined. */
  private async getOptional<T>(
    path: string,
    token: string,
  ): Promise<T | undefined> {
    try {
      return await this.fetch<T>(path, token);
    } catch (err) {
      if (err instanceof AxiosError) {
        const status = err.response?.status;
        if (status !== undefined && MISSING_STATUSES.has(status))
          return undefined;
        throw new InternalServerErrorException(`Gitea ${status} on ${path}`);
      }
      throw new InternalServerErrorException(`Gitea request failed on ${path}`);
    }
  }

  private async getAll<T>(
    basePath: string,
    token: string,
    optional = false,
  ): Promise<T[]> {
    const out: T[] = [];
    const sep = basePath.includes('?') ? '&' : '?';
    for (let page = 1; page <= this.maxPages; page++) {
      const url = `${basePath}${sep}limit=${this.pageSize}&page=${page}`;
      const batch = optional
        ? await this.getOptional<T[]>(url, token)
        : await this.get<T[]>(url, token);
      if (!batch) return out;
      if (batch.length === 0) break;
      out.push(...batch);
      if (batch.length < this.pageSize) break;
    }
    return out;
  }

  async listPulls(
    repo: string,
    win: RepoWindow,
    token: string,
  ): Promise<GiteaPull[]> {
    const all = await this.getAll<GiteaPull>(
      `/repos/${repo}/pulls?state=all`,
      token,
    );
    return all.filter(
      (p) =>
        this.inWindow(p.created_at, win) ||
        (p.closed_at !== null && this.inWindow(p.closed_at, win)) ||
        (p.merged_at !== null && this.inWindow(p.merged_at, win)),
    );
  }

  /** Open pull requests, no date filter: used to find unmerged head branches. */
  async listOpenPulls(repo: string, token: string): Promise<GiteaPull[]> {
    return this.getAll<GiteaPull>(`/repos/${repo}/pulls?state=open`, token);
  }

  async listCommits(
    repo: string,
    win: RepoWindow,
    token: string,
    query: CommitQuery = {},
  ): Promise<GiteaCommit[]> {
    const params = new URLSearchParams({
      since: win.from.toISOString(),
      until: win.to.toISOString(),
      stat: 'false',
      files: 'false',
      verification: 'false',
    });
    if (query.ref) params.set('sha', query.ref);
    const all = await this.getAll<GiteaCommit>(
      `/repos/${repo}/commits?${params.toString()}`,
      token,
      query.optional === true,
    );
    return all.filter((c) => this.inWindow(c.created, win));
  }

  async listIssuesOnly(
    repo: string,
    win: RepoWindow,
    token: string,
  ): Promise<GiteaIssue[]> {
    const all = await this.getAll<GiteaIssue>(
      `/repos/${repo}/issues?state=all`,
      token,
    );
    return all
      .filter((i) => i.pull_request === undefined)
      .filter(
        (i) =>
          this.inWindow(i.created_at, win) ||
          (i.closed_at !== null && this.inWindow(i.closed_at, win)),
      );
  }

  private inWindow(iso: string, win: RepoWindow): boolean {
    const d = new Date(iso).getTime();
    return d >= win.from.getTime() && d < win.to.getTime();
  }
}
