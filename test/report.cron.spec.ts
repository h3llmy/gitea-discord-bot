import { describe, expect, it } from 'vitest';
import { ReportCron } from '../src/report/report.cron.js';
import type { IReportService } from '../src/report/report.types.js';

describe('ReportCron', () => {
  function makeCron(sendDailyMock = async () => undefined): {
    cron: ReportCron;
    calls: { count: number };
  } {
    const calls = { count: 0 };
    const reportService: IReportService = {
      collectDay: async () => [],
      collectRange: async () => [],
      sendDaily: async () => {
        calls.count += 1;
        await sendDailyMock();
      },
    };
    return {
      cron: new ReportCron(reportService),
      calls,
    };
  }

  it('skips when not ready', async () => {
    const { cron, calls } = makeCron();
    await cron.handleDailyReport();
    expect(calls.count).toBe(0);
  });

  it('triggers sendDaily once ready', async () => {
    const { cron, calls } = makeCron();
    cron.setReady();
    await cron.handleDailyReport();
    expect(calls.count).toBe(1);
  });
});
