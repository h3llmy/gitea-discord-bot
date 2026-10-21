export type GiteaCommitIdentity = {
  name?: string;
  email?: string;
  date?: string;
};

export type GiteaCommit = {
  sha: string;
  created: string;
  html_url?: string;
  commit?: {
    message?: string;
    author?: GiteaCommitIdentity | null;
    committer?: GiteaCommitIdentity | null;
  } | null;
  /** Gitea user resolved from the author email, null when unknown. */
  author?: { login?: string; full_name?: string } | null;
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
  head: {
    ref: string;
    label: string;
    sha?: string;
    /** null when the head repo was deleted. */
    repo?: { full_name: string } | null;
  } | null;
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

export interface CommitQuery {
  /** Branch/tag/sha to list commits from. Defaults to the repo default branch. */
  ref?: string;
  /** Missing ref or no access resolves to an empty list instead of throwing. */
  optional?: boolean;
}

export interface IGiteaService {
  listPulls(repo: string, win: RepoWindow, token: string): Promise<GiteaPull[]>;
  listCommits(
    repo: string,
    win: RepoWindow,
    token: string,
    query?: CommitQuery,
  ): Promise<GiteaCommit[]>;
  listOpenPulls(repo: string, token: string): Promise<GiteaPull[]>;
  listIssuesOnly(
    repo: string,
    win: RepoWindow,
    token: string,
  ): Promise<GiteaIssue[]>;
}
