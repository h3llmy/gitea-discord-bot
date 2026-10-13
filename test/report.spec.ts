import { describe, expect, it } from 'vitest';
import { ReportService } from '../src/report/report.service.js';
import type { RepoDayActivity } from '../src/report/report.types.js';

describe('dayKey', () => {
  it('extracts calendar day in tz', () => {
    expect(ReportService.dayKey(new Date('2026-10-12T01:00:00Z'), 'UTC')).toBe(
      '2026-10-12',
    );
    expect(
      ReportService.dayKey(
        new Date('2026-10-12T01:00:00Z'),
        'Asia/Ho_Chi_Minh',
      ),
    ).toBe('2026-10-12');
    expect(
      ReportService.dayKey(
        new Date('2026-10-12T16:00:00Z'),
        'Asia/Ho_Chi_Minh',
      ),
    ).toBe('2026-10-12');
    expect(
      ReportService.dayKey(
        new Date('2026-10-12T18:00:00Z'),
        'Asia/Ho_Chi_Minh',
      ),
    ).toBe('2026-10-13');
  });
});

describe('windowForDay', () => {
  it('covers full utc day', () => {
    const { from, to } = ReportService.windowForDay('2026-10-11', 'UTC');
    expect(from.toISOString()).toBe('2026-10-11T00:00:00.000Z');
    expect(to.toISOString()).toBe('2026-10-12T00:00:00.000Z');
  });

  it('shifts window for positive offset zone', () => {
    const { from, to } = ReportService.windowForDay(
      '2026-10-11',
      'Asia/Ho_Chi_Minh',
    );
    expect(from.toISOString()).toBe('2026-10-10T17:00:00.000Z');
    expect(to.toISOString()).toBe('2026-10-11T17:00:00.000Z');
  });
});

describe('yesterdayWindow', () => {
  it('returns prior calendar day window', () => {
    const { day, win } = ReportService.yesterdayWindow(
      new Date('2026-10-12T01:00:00Z'),
      'UTC',
    );
    expect(day).toBe('2026-10-11');
    expect(win.from.toISOString()).toBe('2026-10-11T00:00:00.000Z');
    expect(win.to.toISOString()).toBe('2026-10-12T00:00:00.000Z');
  });
});

describe('resolveDay', () => {
  it('defaults to today in tz', () => {
    expect(
      ReportService.resolveDay(
        undefined,
        new Date('2026-10-12T18:00:00Z'),
        'Asia/Ho_Chi_Minh',
      ),
    ).toBe('2026-10-13');
    expect(
      ReportService.resolveDay('', new Date('2026-10-12T01:00:00Z'), 'UTC'),
    ).toBe('2026-10-12');
  });

  it('passes through valid dates', () => {
    expect(ReportService.resolveDay('11-10-2026', new Date(), 'UTC')).toBe(
      '2026-10-11',
    );
  });

  it('rejects malformed and impossible dates', () => {
    for (const bad of [
      '2026-13-01',
      '2026-02-30',
      '2026-2-1',
      '01-13-2026',
      '30-02-2026',
      'garbage',
    ]) {
      expect(() => ReportService.resolveDay(bad, new Date(), 'UTC')).toThrow();
    }
  });
});

describe('listDays', () => {
  it('enumerates inclusive span', () => {
    expect(ReportService.listDays('2026-10-01', '2026-10-05')).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
    ]);
  });

  it('handles month and year rollover', () => {
    expect(ReportService.listDays('2026-12-30', '2027-01-02')).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
  });

  it('throws when from after to', () => {
    expect(() => ReportService.listDays('2026-10-05', '2026-10-01')).toThrow();
  });
});

describe('resolveRange', () => {
  const now = new Date('2026-10-15T02:00:00Z');

  it('falls back to single day when no from/to', () => {
    expect(ReportService.resolveRange(undefined, undefined, undefined, now, 'UTC'))
      .toEqual(['2026-10-15']);
    expect(ReportService.resolveRange('07-10-2026', undefined, undefined, now, 'UTC'))
      .toEqual(['2026-10-07']);
  });

  it('to-only is a single day', () => {
    expect(ReportService.resolveRange(undefined, undefined, '07-10-2026', now, 'UTC'))
      .toEqual(['2026-10-07']);
  });

  it('from-only fills through today', () => {
    expect(ReportService.resolveRange(undefined, '01-10-2026', undefined, now, 'UTC'))
      .toEqual([
        '2026-10-01',
        '2026-10-02',
        '2026-10-03',
        '2026-10-04',
        '2026-10-05',
        '2026-10-06',
        '2026-10-07',
        '2026-10-08',
        '2026-10-09',
        '2026-10-10',
        '2026-10-11',
        '2026-10-12',
        '2026-10-13',
        '2026-10-14',
        '2026-10-15',
      ]);
  });

  it('from and to enumerate inclusive range', () => {
    expect(ReportService.resolveRange(undefined, '01-10-2026', '03-10-2026', now, 'UTC'))
      .toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
  });

  it('from wins over conflicting date', () => {
    expect(ReportService.resolveRange('07-10-2026', '01-10-2026', '02-10-2026', now, 'UTC'))
      .toEqual(['2026-10-01', '2026-10-02']);
  });

  it('rejects from after to', () => {
    expect(() => ReportService.resolveRange(undefined, '05-10-2026', '01-10-2026', now, 'UTC')).toThrow();
  });

  it('rejects range longer than 31 days', () => {
    expect(() => ReportService.resolveRange(undefined, '01-09-2026', '02-10-2026', now, 'UTC')).toThrow(/max 31|Invalid range/i);
  });

  it('allows exactly 31 days', () => {
    const days = ReportService.resolveRange(undefined, '01-10-2026', '31-10-2026', now, 'UTC');
    expect(days).toHaveLength(31);
  });

  it('rejects malformed dates in range bounds', () => {
    expect(() => ReportService.resolveRange(undefined, 'garbage', '05-10-2026', now, 'UTC')).toThrow();
    expect(() => ReportService.resolveRange(undefined, '01-10-2026', '30-02-2026', now, 'UTC')).toThrow();
  });
});

describe('buildEmbed', () => {
  it('aggregates counts per bucket', () => {
    const a: RepoDayActivity = {
      repo: 'owner/repo',
      day: '2026-10-11',
      login: 'alice',
      commits: [
        {
          sha: 'a',
          author: { name: 'alice' },
          created: '2026-10-11T01:00:00Z',
        },
        { sha: 'b', author: { name: 'bob' }, created: '2026-10-11T02:00:00Z' },
      ],
      pulls: [
        {
          number: 1,
          title: 'open pr',
          state: 'open',
          merged: false,
          draft: false,
          created_at: '2026-10-11T01:00:00Z',
          closed_at: null,
          merged_at: null,
          user: { login: 'alice' },
          base: { ref: 'main', label: 'main' },
          head: { ref: 'feature/open', label: 'feature/open' },
        },
        {
          number: 2,
          title: 'merged pr',
          state: 'closed',
          merged: true,
          draft: false,
          created_at: '2026-10-10T01:00:00Z',
          closed_at: '2026-10-11T03:00:00Z',
          merged_at: '2026-10-11T03:00:00Z',
          user: { login: 'bob' },
          base: { ref: 'main', label: 'main' },
          head: { ref: 'feature/x', label: 'feature/x' },
        },
      ],
      issues: [
        {
          number: 7,
          title: 'bug',
          state: 'open',
          created_at: '2026-10-11T04:00:00Z',
          closed_at: null,
          user: { login: 'carol' },
        },
      ],
    };
    const json = ReportService.buildEmbed(a).toJSON();
    const names = (json.fields ?? []).map((f) => f.name);
    expect(names).toEqual([
      'Commits (2)',
      'PRs opened (1)',
      'PRs merged (1)',
      'PRs closed (0)',
      'Issues opened (1)',
      'Issues closed (0)',
    ]);
    const commitField = (json.fields ?? []).find(
      (f) => f.name === 'Commits (2)',
    );
    expect(commitField?.value).toBe('- 2 commits by alice');
    const mergedField = (json.fields ?? []).find(
      (f) => f.name === 'PRs merged (1)',
    );
    expect(mergedField?.value).toBe('- #2 merged pr (feature/x → main)');
  });

  it('lists all items as bullets instead of +N more', () => {
    const a: RepoDayActivity = {
      repo: 'owner/repo',
      day: '2026-10-11',
      login: 'alice',
      commits: [],
      pulls: Array.from({ length: 12 }, (_, i) => ({
        number: i + 1,
        title: `pr ${i + 1}`,
        state: 'open',
        merged: false,
        draft: false,
        created_at: '2026-10-11T01:00:00Z',
        closed_at: null,
        merged_at: null,
        user: { login: 'alice' },
        base: { ref: 'main', label: 'main' },
        head: { ref: `f${i}`, label: `f${i}` },
      })),
      issues: [],
    };
    const json = ReportService.buildEmbed(a).toJSON();
    const values = (json.fields ?? [])
      .filter((f) => f.name.startsWith('PRs opened'))
      .map((f) => f.value);
    expect(values.join('\n')).toContain('- #1 pr 1');
    expect(values.join('\n')).toContain('- #12 pr 12');
    expect(values.join('\n')).not.toContain('more');
  });

  it('splits long sections into continuation fields within 1024 chars', () => {
    const a: RepoDayActivity = {
      repo: 'owner/repo',
      day: '2026-10-11',
      login: 'alice',
      commits: [],
      pulls: Array.from({ length: 30 }, (_, i) => ({
        number: i + 1,
        title: `very long pull request title number ${i + 1} with details`,
        state: 'closed',
        merged: true,
        draft: false,
        created_at: '2026-10-11T01:00:00Z',
        closed_at: '2026-10-11T03:00:00Z',
        merged_at: '2026-10-11T03:00:00Z',
        user: { login: 'alice' },
        base: { ref: 'develop', label: 'develop' },
        head: { ref: `feature/very-long-branch-name-${i + 1}`, label: 'x' },
      })),
      issues: [],
    };
    const json = ReportService.buildEmbed(a).toJSON();
    const merged = (json.fields ?? []).filter((f) =>
      f.name.startsWith('PRs merged'),
    );
    expect(merged.length).toBeGreaterThan(1);
    expect(merged[0].name).toMatch(/PRs merged \(1-\d+\)/);
    for (const f of merged) expect(f.value.length).toBeLessThanOrEqual(1024);
    const all = merged.map((f) => f.value).join('\n');
    expect(all).toContain('- #1 ');
    expect(all).toContain('- #30 ');
  });
});
