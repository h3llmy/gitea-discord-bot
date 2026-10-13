import type {
  GiteaCommit,
  GiteaIssue,
  GiteaPull,
} from '../gitea/gitea.types.js';

export type RepoDayActivity = {
  repo: string;
  day: string;
  login: string;
  commits: GiteaCommit[];
  pulls: GiteaPull[];
  issues: GiteaIssue[];
};

export interface IReportService {
  collectDay(
    day: string,
    repos: string[],
    token: string,
    login: string,
  ): Promise<RepoDayActivity[]>;
  collectRange(
    days: string[],
    repos: string[],
    token: string,
    login: string,
  ): Promise<RepoDayActivity[]>;
  sendDaily(now?: Date): Promise<void>;
}
