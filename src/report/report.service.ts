import { Inject, Injectable } from '@nestjs/common';
import { ChannelType, Client, EmbedBuilder } from 'discord.js';
import { GiteaService } from '../gitea/gitea.service.js';
import type { IGiteaService } from '../gitea/gitea.types.js';
import { UsersService } from '../users/users.service.js';
import type { IUsersService, TrackedRepo } from '../users/users.types.js';
import type { RepoWindow } from '../gitea/gitea.types.js';
import type {
  ActivityCommit,
  IReportService,
  RepoDayActivity,
  ReportOptions,
} from './report.types.js';

@Injectable()
export class ReportService implements IReportService {
  private readonly maxPrBranches = 20;

  public constructor(
    private readonly client: Client,
    @Inject(GiteaService) private readonly gitea: IGiteaService,
    @Inject(UsersService) private readonly users: IUsersService,
  ) {}

  static dayKey(d: Date, tz: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  static resolveDay(raw: string | undefined, now: Date, tz: string): string {
    if (!raw) return ReportService.dayKey(now, tz);
    if (!/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
      throw new Error('Invalid date format, expected DD-MM-YYYY');
    }
    const [d, m, y] = raw.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (
      dt.getUTCFullYear() !== y ||
      dt.getUTCMonth() !== m - 1 ||
      dt.getUTCDate() !== d
    ) {
      throw new Error('Invalid date');
    }
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  static listDays(fromIso: string, toIso: string): string[] {
    if (fromIso > toIso) {
      throw new Error('Invalid range: from is after to');
    }
    const days: string[] = [];
    let cur = fromIso;
    for (let i = 0; i < 62; i++) {
      days.push(cur);
      if (cur === toIso) return days;
      cur = ReportService.shiftDay(cur, 1);
    }
    throw new Error('Invalid range: too long');
  }

  static resolveRange(
    date: string | undefined,
    from: string | undefined,
    to: string | undefined,
    now: Date,
    tz: string,
  ): string[] {
    if (from) {
      const startIso = ReportService.resolveDay(from, now, tz);
      const endIso = to
        ? ReportService.resolveDay(to, now, tz)
        : ReportService.dayKey(now, tz);
      const days = ReportService.listDays(startIso, endIso);
      if (days.length > 31) {
        throw new Error('Invalid range: max 31 days');
      }
      return days;
    }
    if (to) return [ReportService.resolveDay(to, now, tz)];
    return [ReportService.resolveDay(date, now, tz)];
  }

  private static tzOffsetMs(at: Date, tz: string): number {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = dtf.formatToParts(at);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';
    const asUTC = Date.UTC(
      Number(get('year')),
      Number(get('month')) - 1,
      Number(get('day')),
      Number(get('hour')) % 24,
      Number(get('minute')),
      Number(get('second')),
    );
    return asUTC - at.getTime();
  }

  private static wallToUtc(day: string, hm: string, tz: string): Date {
    const [y, m, d] = day.split('-').map(Number);
    const [h, min] = hm.split(':').map(Number);
    let guess = new Date(Date.UTC(y, m - 1, d, h, min, 0));
    for (let i = 0; i < 2; i++) {
      guess = new Date(
        Date.UTC(y, m - 1, d, h, min, 0) - ReportService.tzOffsetMs(guess, tz),
      );
    }
    return guess;
  }

  private static shiftDay(day: string, delta: number): string {
    const [y, m, d] = day.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + delta));
    return dt.toISOString().slice(0, 10);
  }

  static windowForDay(day: string, tz: string): RepoWindow {
    return {
      from: ReportService.wallToUtc(day, '00:00', tz),
      to: ReportService.wallToUtc(ReportService.shiftDay(day, 1), '00:00', tz),
    };
  }

  static yesterdayWindow(
    now: Date,
    tz: string,
  ): { day: string; win: RepoWindow } {
    const day = ReportService.shiftDay(ReportService.dayKey(now, tz), -1);
    return { day, win: ReportService.windowForDay(day, tz) };
  }

  private static chunkBullets(items: string[]): string[] {
    if (items.length === 0) return ['—'];
    const chunks: string[] = [];
    let cur: string[] = [];
    let len = 0;
    for (const item of items) {
      let line = `- ${item}`;
      if (line.length > 1024) line = `${line.slice(0, 1021)}...`;
      const add = line.length + (cur.length === 0 ? 0 : 1);
      if (len + add > 1024 && cur.length > 0) {
        chunks.push(cur.join('\n'));
        cur = [];
        len = 0;
      }
      cur.push(line);
      len += add;
    }
    chunks.push(cur.join('\n'));
    return chunks;
  }

  private static sectionFields(
    label: string,
    items: string[],
    totalCount: number,
  ): { name: string; value: string }[] {
    const chunks = ReportService.chunkBullets(items);
    if (chunks.length <= 1) {
      return [{ name: `${label} (${totalCount})`, value: chunks[0] }];
    }
    let n = 0;
    return chunks.map((value) => {
      const start = n + 1;
      n += value.split('\n').length;
      return { name: `${label} (${start}-${n})`, value };
    });
  }

  static formatDay(day: string): string {
    const [y, m, d] = day.split('-').map(Number);
    return `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${y}`;
  }

  static commitLine(c: ActivityCommit): string {
    const sha = c.sha.slice(0, 7);
    const subject = (c.commit?.message ?? '').split('\n')[0].trim();
    const author = c.commit?.author?.name || c.author?.login || '?';
    const branch = c.ref ? ` [${c.ref}]` : '';
    return `${sha} ${subject || '(no message)'} — ${author}${branch}`;
  }

  static buildEmbed(a: RepoDayActivity): EmbedBuilder {
    const opened = a.pulls.filter((p) => p.state === 'open');
    const merged = a.pulls.filter((p) => p.merged);
    const closed = a.pulls.filter((p) => p.state === 'closed' && !p.merged);
    const iOpen = a.issues.filter((i) => i.state === 'open');
    const iClosed = a.issues.filter((i) => i.state === 'closed');
    const embed = new EmbedBuilder()
      .setTitle(
        `Daily ${ReportService.formatDay(a.day)} — ${a.repo}${
          a.branch ? ` (${a.branch})` : ''
        }`,
      )
      .addFields(
        ...ReportService.sectionFields(
          'Commits',
          a.commits.map((c) => ReportService.commitLine(c)),
          a.commits.length,
        ),
        ...ReportService.sectionFields(
          'PRs opened',
          opened.map((p) => `#${p.number} ${p.title}`),
          opened.length,
        ),
        ...ReportService.sectionFields(
          'PRs merged',
          merged.map(
            (p) =>
              `#${p.number} ${p.title} (${p.head?.ref ?? '?'} → ${p.base?.ref ?? '?'})`,
          ),
          merged.length,
        ),
        ...ReportService.sectionFields(
          'PRs closed',
          closed.map((p) => `#${p.number} ${p.title}`),
          closed.length,
        ),
        ...ReportService.sectionFields(
          'Issues opened',
          iOpen.map((i) => `#${i.number} ${i.title}`),
          iOpen.length,
        ),
        ...ReportService.sectionFields(
          'Issues closed',
          iClosed.map((i) => `#${i.number} ${i.title}`),
          iClosed.length,
        ),
      )
      .setTimestamp(new Date());
    return embed;
  }

  /**
   * Commits of the primary branch plus commits still sitting on open pull
   * request branches, deduplicated by sha.
   */
  private async collectCommits(
    repo: string,
    win: RepoWindow,
    token: string,
    ref?: string,
  ): Promise<ActivityCommit[]> {
    const bySha = new Map<string, ActivityCommit>();
    const primary = await this.gitea.listCommits(
      repo,
      win,
      token,
      ref ? { ref, optional: true } : {},
    );
    for (const c of primary) bySha.set(c.sha, c);
    if (ref) return [...bySha.values()];

    const open = await this.gitea.listOpenPulls(repo, token);
    const heads = new Map<string, { repo: string; ref: string }>();
    for (const pr of open) {
      const head = pr.head;
      if (!head?.ref) continue;
      const headRepo = head.repo?.full_name ?? repo;
      const key = `${headRepo}#${head.ref}`;
      if (!heads.has(key)) heads.set(key, { repo: headRepo, ref: head.ref });
      if (heads.size >= this.maxPrBranches) break;
    }
    for (const [key, head] of heads) {
      const commits = await this.gitea.listCommits(head.repo, win, token, {
        ref: head.ref,
        optional: true,
      });
      for (const c of commits) {
        if (bySha.has(c.sha)) continue;
        bySha.set(c.sha, { ...c, ref: key });
      }
    }
    return [...bySha.values()];
  }

  async collectDay(
    day: string,
    repos: TrackedRepo[],
    token: string,
    login: string,
    opts: ReportOptions = {},
  ): Promise<RepoDayActivity[]> {
    const tz = process.env.REPORT_TZ ?? 'UTC';
    const win = ReportService.windowForDay(day, tz);
    const out: RepoDayActivity[] = [];
    for (const tracked of repos) {
      const repo = tracked.fullName;
      const ref = opts.branch ?? tracked.branch;
      const [commits, pulls, issues] = await Promise.all([
        this.collectCommits(repo, win, token, ref),
        this.gitea.listPulls(repo, win, token),
        this.gitea.listIssuesOnly(repo, win, token),
      ]);
      if (commits.length + pulls.length + issues.length === 0) continue;
      out.push({ repo, day, login, branch: ref, commits, pulls, issues });
    }
    return out;
  }

  async collectRange(
    days: string[],
    repos: TrackedRepo[],
    token: string,
    login: string,
    opts: ReportOptions = {},
  ): Promise<RepoDayActivity[]> {
    const out: RepoDayActivity[] = [];
    for (const day of days) {
      out.push(...(await this.collectDay(day, repos, token, login, opts)));
    }
    return out;
  }

  async sendDaily(now = new Date()): Promise<void> {
    const tz = process.env.REPORT_TZ ?? 'UTC';
    const channelId = process.env.REPORT_CHANNEL_ID ?? '';
    const { day } = ReportService.yesterdayWindow(now, tz);
    const channel = await this.client.channels.fetch(channelId);
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new Error('Report channel not a text channel');
    }

    const allUsers = await this.users.listAllUsers();
    if (allUsers.length === 0) {
      await channel.send(
        `Daily ${ReportService.formatDay(day)}: no users registered.`,
      );
      return;
    }

    let totalActivity = 0;
    for (const user of allUsers) {
      const activities = await this.collectDay(
        day,
        user.repos,
        user.giteaToken,
        user.giteaLogin,
      );
      if (activities.length === 0) continue;
      totalActivity += activities.length;
      for (const a of activities) {
        const embed = ReportService.buildEmbed(a);
        embed.setTitle(`${embed.data.title} (@${user.giteaLogin})`);
        await channel.send({ embeds: [embed] });
      }
    }
    if (totalActivity === 0) {
      await channel.send(
        `Daily ${ReportService.formatDay(day)}: no activity across all users.`,
      );
    }
  }
}
