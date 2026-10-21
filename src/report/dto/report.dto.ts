import { StringOption } from 'necord';

export class ReportDto {
  @StringOption({
    name: 'date',
    description: 'Day to report (DD-MM-YYYY), defaults to today',
    required: false,
  })
  public readonly date?: string;

  @StringOption({
    name: 'from',
    description: 'Range start (DD-MM-YYYY)',
    required: false,
  })
  public readonly from?: string;

  @StringOption({
    name: 'to',
    description: 'Range end (DD-MM-YYYY), defaults to today',
    required: false,
  })
  public readonly to?: string;

  @StringOption({
    name: 'repo',
    description: 'Filter to one repo (owner/name), defaults to all',
    required: false,
    autocomplete: true,
  })
  public readonly repo?: string;

  @StringOption({
    name: 'branch',
    description:
      'Branch to report on (default: tracked branch, else default branch)',
    required: false,
  })
  public readonly branch?: string;
}
