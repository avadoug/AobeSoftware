import { describe, expect, it } from 'vitest';
import { printableHtml, rangeForPreset, reportEntries } from '../src/services/reporting';
import { emptyState } from '../src/domain/types';
import { createXlsxWorkbook } from '../src/services/xlsxExport';
import { strFromU8, unzipSync } from 'fflate';

describe('reporting', () => {
  it('builds current and previous pay periods', () => {
    const state = emptyState();
    const current = rangeForPreset(
      'current-pay-period',
      state.preferences,
      new Date('2026-07-20T12:00:00'),
    );
    expect(current.from.getDate()).toBe(16);
    expect(current.to.getMonth()).toBe(6);
    const previous = rangeForPreset(
      'previous-pay-period',
      state.preferences,
      new Date('2026-07-10T12:00:00'),
    );
    expect(previous.from.getMonth()).toBe(5);
    expect(previous.from.getDate()).toBe(16);
  });
  it('keeps deleted records out of reports', () => {
    const state = emptyState();
    state.shifts.push({
      id: 'deleted',
      durationMinutes: 60,
      breaks: [],
      tags: [],
      source: 'manual',
      createdAt: '2026-07-05T00:00:00Z',
      updatedAt: '2026-07-05T00:00:00Z',
      deletedAt: '2026-07-06T00:00:00Z',
    });
    const entries = reportEntries(state, {
      from: new Date('2026-07-01'),
      to: new Date('2026-07-31'),
    });
    expect(entries.shifts).toHaveLength(0);
  });
  it('escapes user text in printable HTML', () => {
    const state = emptyState();
    state.preferences.displayName = '<script>alert(1)</script>';
    const html = printableHtml(state, { from: new Date('2026-07-01'), to: new Date('2026-07-31') });
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });
  it('creates a typed, multi-sheet XLSX without formulas or macros', async () => {
    const bytes = await createXlsxWorkbook([
      {
        name: 'Summary',
        rows: [{ Date: new Date('2026-07-09T12:00:00Z'), Hours: 8.5, Note: '=not-a-formula' }],
      },
      { name: 'Trips', rows: [{ Distance: 12.4 }] },
    ]);
    const files = unzipSync(bytes);
    expect(files['xl/worksheets/sheet1.xml']).toBeDefined();
    expect(files['xl/worksheets/sheet2.xml']).toBeDefined();
    const sheet = strFromU8(files['xl/worksheets/sheet1.xml']!);
    expect(sheet).toContain('s="1" t="n"');
    expect(sheet).toContain('<v>8.5</v>');
    expect(sheet).not.toContain('<f>');
    expect(Object.keys(files).some((name) => name.endsWith('.bin'))).toBe(false);
  });
});
