import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import type {
  GiteaCommit,
  GiteaIssue,
  GiteaPull,
  IGiteaService,
  RepoWindow,
} from './gitea.types.js';

@Injectable()
export class GiteaService implements IGiteaService {
  private readonly pageSize = 50;
  private readonly maxPages = 50;

  public constructor(private readonly http: HttpService) {}

  private async get<T>(path: string, token: string): Promise<T> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<T>(path, {
          headers: { Authorization: `token ${token}` },
        }),
      );
      return data;
    } catch (err) {
      if (err instanceof AxiosError) {
        throw new InternalServerErrorException(
          `Gitea ${err.response?.status} on ${path}`,
        );
      }
      throw new InternalServerErrorException(`Gitea request failed on ${path}`);
    }
  }

  private async getAll<T>(basePath: string, token: string): Promise<T[]> {
    const out: T[] = [];
    const sep = basePath.includes('?') ? '&' : '?';
    for (let page = 1; page <= this.maxPages; page++) {
      const batch = await this.get<T[]>(
        `${basePath}${sep}limit=${this.pageSize}&page=${page}`,
        token,
      );
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

  async listCommits(
    repo: string,
    win: RepoWindow,
    token: string,
  ): Promise<GiteaCommit[]> {
    const all = await this.getAll<GiteaCommit>(`/repos/${repo}/commits`, token);
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
