export type GiteaCommit = {
  sha: string;
  author: { name: string } | null;
  created: string;
};

export type GiteaPull = {
  number: number;
  title: string;
  state: string;
  merged: boolean;
  draft: boolean;
  created_at: string;
  closed_at: string | null;
  merged_at: string | null;
  user: { login: string } | null;
  base: { ref: string; label: string } | null;
  head: { ref: string; label: string } | null;
};

export type GiteaIssue = {
  number: number;
  title: string;
  state: string;
  created_at: string;
  closed_at: string | null;
  user: { login: string } | null;
  pull_request?: unknown;
};

export interface RepoWindow {
  from: Date;
  to: Date;
}

export interface IGiteaService {
  listPulls(repo: string, win: RepoWindow, token: string): Promise<GiteaPull[]>;
  listCommits(
    repo: string,
    win: RepoWindow,
    token: string,
  ): Promise<GiteaCommit[]>;
  listIssuesOnly(
    repo: string,
    win: RepoWindow,
    token: string,
  ): Promise<GiteaIssue[]>;
}
