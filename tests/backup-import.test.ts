import { describe, expect, it } from 'vitest';
import { createBackup, parseBackup } from '../src/services/backup';
import { previewCsv, protectSpreadsheetCell } from '../src/services/csvImport';
import { emptyState } from '../src/domain/types';

describe('backup integrity', () => {
  it('serializes and restores a complete state', async () => {
    const state = emptyState();
    state.preferences.displayName = 'Aobe';
    state.jobs.push({
      id: 'j1',
      name: 'Job',
      tags: [],
      color: '#000',
      favorite: false,
      archived: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    const backup = await createBackup(state);
    const restored = await parseBackup(JSON.stringify(backup));
    expect(restored.data.jobs[0]?.name).toBe('Job');
    expect(restored.checksum).toBe(backup.checksum);
  });
  it('rejects a modified backup', async () => {
    const backup = await createBackup(emptyState());
    backup.data.preferences.displayName = 'Changed after hashing';
    await expect(parseBackup(JSON.stringify(backup))).rejects.toThrow('integrity check failed');
  });
});

describe('safe CSV import', () => {
  it.each(['=2+2', '+SUM(A1:A2)', '-1+1', '@evil'])(
    'protects formula-like content: %s',
    (value) => {
      expect(protectSpreadsheetCell(value)).toBe(`'${value}`);
    },
  );
  it('maps shift columns and skips likely duplicates', () => {
    const state = emptyState();
    const first = previewCsv(
      'Date,Start,End,Hours,Notes\n2026-07-07,08:00,16:00,8,Regular',
      'shifts',
      state,
    );
    expect(first.rows).toHaveLength(1);
    const imported = first.rows[0]!;
    state.shifts.push(imported as any);
    const second = previewCsv(
      'Date,Start,End,Hours,Notes\n2026-07-07,08:00,16:00,8,Regular',
      'shifts',
      state,
    );
    expect(second.rows).toHaveLength(0);
    expect(second.duplicates).toBe(1);
  });
  it('validates mileage rows with missing distance information', () => {
    const preview = previewCsv('Date,Purpose\n2026-07-07,Client visit', 'trips', emptyState());
    expect(preview.rows).toHaveLength(0);
    expect(preview.warnings.join(' ')).toContain('distance or odometer');
  });
});
