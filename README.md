# mls-bot

Discord bot that posts daily Gitea activity reports.

## Setup

```bash
bun install
cp .env.example .env
# fill .env (see below)
bun run start:dev
```

## Docker

```bash
cp .env.example .env   # fill it
docker compose up -d --build
docker compose logs -f bot
```

SQLite lives in named volume `bot-data`. Stop with `docker compose down`.

## Environment

| Var | Required | Notes |
| --- | --- | --- |
| `DISCORD_TOKEN` | yes | Bot token from Discord Developer Portal |
| `GITEA_BASE_URL` | yes | e.g. `https://gitea.example.com` |
| `REPORT_CHANNEL_ID` | for daily posts | Channel to post auto reports into |
| `REPORT_CRON` | no | Cron schedule, default `0 8 * * *` |
| `REPORT_TZ` | no | Timezone for day boundaries, default `UTC` |
| `DB_PATH` | no | SQLite path, default `data/bot.sqlite` |
| `ENCRYPTION_KEY` | yes | 64 hex chars. Generate: `openssl rand -hex 32` |

Note: `REPORT_CHANNEL_ID` only needed for the scheduled daily report; `/report` works without it.

## Commands

### `/gitea connect <login> <token>`

Link your Gitea account. Token stored encrypted. Ephemeral reply, so only you see it.

### `/gitea add <repo> [branch]`

Track a repo, format `owner/name`. Optional `branch` pins the repo to that branch; without it
the repo default branch is used. Re-adding an already tracked repo updates its branch.

### `/gitea remove <repo>`

Stop tracking a repo.

### `/gitea list`

List your tracked repos, with the pinned branch when set.

### `/report [date] [from] [to] [repo] [branch]`

Report activity: commits, PRs (opened/merged/closed), issues (opened/closed).

- `date` — one day, format `DD-MM-YYYY`. Omit for today.
- `from` + `to` — day range, same format. `to` defaults to today.
  `from` takes precedence over `date` when both present.
- `repo` — pick one (`owner/name`) via autocomplete. Omit for all tracked repos.
- `branch` — report one branch only. Omit to use the tracked branch (or the repo default
  branch) plus the branches of open pull requests.

Examples:

```
/report 07-10-2026
/report from:01-10-2026 to:07-10-2026
/report from:01-10-2026
/report from:01-10-2026 to:07-10-2026 repo:owner/name
/report 07-10-2026 branch:develop
```

Limits: max 31 days per range, `from` must be <= `to`. One embed per day per repo.

Commits are listed with sha, subject and author. Commits are dated by committer date, so a
branch merged later still shows up on the day it was committed. When no branch is pinned, the
commits of open pull request branches are included too and tagged with their branch.

## Daily report

Cron job runs `sendDaily()` per `REPORT_CRON` in `REPORT_TZ`, reports yesterday, posts to
`REPORT_CHANNEL_ID`, fan-outs over all registered users.

## Scripts

```bash
bun run start:dev   # watch mode
bun run build       # build to dist/
bun run start:prod  # run built app
bun run test        # vitest
bun run lint        # oxlint
```

## How it works

```
src/
  users/   Discord user <-> Gitea account, encrypted token storage (SQLite via TypeORM)
  gitea/   Gitea API client, time-window filtering
  report/  report command, embeds, cron
```

Day math: input `DD-MM-YYYY` parses to internal ISO `YYYY-MM-DD`; windows computed from
`REPORT_TZ` midnight to midnight, converted to UTC via `Intl.DateTimeFormat`.
