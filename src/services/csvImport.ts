import Papa from 'papaparse';
import type { AppState, MileageTrip, WorkShift } from '../domain/types';
import { moneyToMinor } from '../utils/format';
import { createId } from '../utils/id';

export type ImportKind = 'shifts' | 'trips';
export interface ImportPreview<T> {
  rows: T[];
  warnings: string[];
  duplicates: number;
  columns: string[];
}

export function protectSpreadsheetCell(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trimStart();
  return /^[=+\-@]/.test(trimmed) ? `'${value}` : value;
}

function normalized(record: Record<string, string>, ...names: string[]): string | undefined {
  const entry = Object.entries(record).find(([key]) =>
    names.includes(
      key
        .trim()
        .toLowerCase()
        .replace(/[ _-]+/g, ''),
    ),
  );
  return entry?.[1]?.trim() || undefined;
}

function parseDateTime(dateValue?: string, timeValue?: string): string | undefined {
  if (!dateValue) return undefined;
  const combined = timeValue ? `${dateValue} ${timeValue}` : dateValue;
  const date = new Date(combined);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function parseNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value.replace(/[$,]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function previewCsv(
  text: string,
  kind: ImportKind,
  state: AppState,
): ImportPreview<WorkShift | MileageTrip> {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transform: (value) => value.replace(/\0/g, ''),
  });
  const warnings = parsed.errors.map(
    (error) => `Row ${error.row === undefined ? '?' : error.row + 2}: ${error.message}`,
  );
  const now = new Date().toISOString();
  const rows: Array<WorkShift | MileageTrip> = [];
  let duplicates = 0;
  for (const [index, record] of parsed.data.entries()) {
    if (kind === 'shifts') {
      const date = normalized(record, 'date', 'workdate');
      const startAt =
        parseDateTime(date, normalized(record, 'start', 'starttime')) ??
        parseDateTime(normalized(record, 'startat'));
      const endAt =
        parseDateTime(date, normalized(record, 'end', 'endtime')) ??
        parseDateTime(normalized(record, 'endat'));
      const duration = parseNumber(normalized(record, 'durationminutes', 'minutes', 'hours')) ?? 0;
      if (!startAt && !duration)
        warnings.push(`Row ${index + 2}: Add a start date/time or duration.`);
      const shift: WorkShift = {
        id: createId(),
        startAt,
        endAt,
        durationMinutes: normalized(record, 'hours')
          ? Math.round(duration * 60)
          : Math.round(duration),
        breaks: [],
        hourlyRateMinor: moneyToMinor(normalized(record, 'hourlyrate', 'rate')),
        notes: normalized(record, 'notes', 'note'),
        tags: [],
        source: 'import',
        createdAt: now,
        updatedAt: now,
      };
      if (
        state.shifts.some(
          (item) =>
            item.startAt === shift.startAt &&
            item.endAt === shift.endAt &&
            item.durationMinutes === shift.durationMinutes,
        )
      )
        duplicates += 1;
      else if (startAt || duration) rows.push(shift);
    } else {
      const date = normalized(record, 'date', 'tripdate');
      const startedAt =
        parseDateTime(date, normalized(record, 'start', 'starttime')) ??
        parseDateTime(normalized(record, 'startedat'));
      const distance = parseNumber(normalized(record, 'distance', 'miles', 'kilometers')) ?? 0;
      const trip: MileageTrip = {
        id: createId(),
        startedAt: startedAt ?? parseDateTime(date),
        startOdometer: parseNumber(normalized(record, 'startodometer', 'startingodometer')),
        endOdometer: parseNumber(normalized(record, 'endodometer', 'endingodometer')),
        distance,
        distanceUnit:
          normalized(record, 'unit', 'distanceunit')?.toLowerCase() === 'km'
            ? 'km'
            : state.preferences.distanceUnit,
        purpose: normalized(record, 'purpose', 'reason'),
        category:
          (normalized(record, 'category')?.toLowerCase() as MileageTrip['category']) || 'business',
        reimbursementRateMinor: moneyToMinor(normalized(record, 'rate', 'reimbursementrate')),
        tollsMinor: moneyToMinor(normalized(record, 'tolls')),
        parkingMinor: moneyToMinor(normalized(record, 'parking')),
        notes: normalized(record, 'notes', 'note'),
        tags: [],
        source: 'import',
        createdAt: now,
        updatedAt: now,
      };
      if (!trip.distance && trip.startOdometer === undefined)
        warnings.push(`Row ${index + 2}: Add distance or odometer values.`);
      if (
        state.trips.some(
          (item) =>
            item.startedAt === trip.startedAt &&
            item.distance === trip.distance &&
            item.purpose === trip.purpose,
        )
      )
        duplicates += 1;
      else if (trip.distance || trip.startOdometer !== undefined) rows.push(trip);
    }
  }
  return { rows, warnings, duplicates, columns: parsed.meta.fields ?? [] };
}
