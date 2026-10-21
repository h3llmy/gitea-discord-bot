import type {
  GiteaCommit,
  GiteaIssue,
  GiteaPull,
} from '../gitea/gitea.types.js';
import type { TrackedRepo } from '../users/users.types.js';

export type ActivityCommit = GiteaCommit & {
  /** Branch the commit was found on, set for commits outside the primary branch. */
  ref?: string;
};

export type RepoDayActivity = {
  repo: string;
  day: string;
  login: string;
  /** Branch reported on, undefined means the repo default branch. */
  branch?: string;
  commits: ActivityCommit[];
  pulls: GiteaPull[];
  issues: GiteaIssue[];
};

export interface ReportOptions {
  /** Explicit branch override applied to every repo in the report. */
  branch?: string;
}

export interface IReportService {
  collectDay(
    day: string,
    repos: TrackedRepo[],
    token: string,
    login: string,
    opts?: ReportOptions,
  ): Promise<RepoDayActivity[]>;
  collectRange(
    days: string[],
    repos: TrackedRepo[],
    token: string,
    login: string,
    opts?: ReportOptions,
  ): Promise<RepoDayActivity[]>;
  sendDaily(now?: Date): Promise<void>;
}
