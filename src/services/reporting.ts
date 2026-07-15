import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import Papa from 'papaparse';
import {
  calculatePeriodTotals,
  inRange,
  payableMinutes,
  tripDistance,
  tripReimbursementMinor,
  unpaidBreakMinutes,
} from '../domain/calculations';
import type { AppState, MileageTrip, Preferences, WorkShift } from '../domain/types';
import { formatDate, formatDuration, formatMoney, formatTime } from '../utils/format';
import { protectSpreadsheetCell } from './csvImport';
import { saveFile, saveText } from './files';
import { createXlsxWorkbook } from './xlsxExport';

export type ReportPreset =
  | 'today'
  | 'this-week'
  | 'last-week'
  | 'this-month'
  | 'last-month'
  | 'current-pay-period'
  | 'previous-pay-period'
  | 'this-year'
  | 'custom';
export interface ReportRange {
  from: Date;
  to: Date;
}
export interface ReportOptions {
  includeShifts: boolean;
  includeBreaks: boolean;
  includeTrips: boolean;
  includeExpenses: boolean;
  includeNotes: boolean;
  signature: boolean;
}

export const defaultReportOptions: ReportOptions = {
  includeShifts: true,
  includeBreaks: true,
  includeTrips: true,
  includeExpenses: true,
  includeNotes: true,
  signature: false,
};

export function rangeForPreset(
  preset: ReportPreset,
  preferences: Preferences,
  now = new Date(),
  custom?: ReportRange,
): ReportRange {
  const week = { weekStartsOn: preferences.weekStartsOn } as const;
  if (preset === 'today') return { from: startOfDay(now), to: endOfDay(now) };
  if (preset === 'this-week') return { from: startOfWeek(now, week), to: endOfWeek(now, week) };
  if (preset === 'last-week') {
    const prior = subWeeks(now, 1);
    return { from: startOfWeek(prior, week), to: endOfWeek(prior, week) };
  }
  if (preset === 'this-month') return { from: startOfMonth(now), to: endOfMonth(now) };
  if (preset === 'last-month') {
    const prior = subMonths(now, 1);
    return { from: startOfMonth(prior), to: endOfMonth(prior) };
  }
  if (preset === 'current-pay-period') {
    const startsOn = now.getDate() <= 15 ? 1 : 16;
    return {
      from: startOfDay(new Date(now.getFullYear(), now.getMonth(), startsOn)),
      to:
        startsOn === 1
          ? endOfDay(new Date(now.getFullYear(), now.getMonth(), 15))
          : endOfMonth(now),
    };
  }
  if (preset === 'previous-pay-period') {
    if (now.getDate() > 15)
      return {
        from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 15)),
      };
    const prior = subMonths(now, 1);
    return {
      from: startOfDay(new Date(prior.getFullYear(), prior.getMonth(), 16)),
      to: endOfMonth(prior),
    };
  }
  if (preset === 'this-year')
    return {
      from: new Date(now.getFullYear(), 0, 1),
      to: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  return custom ?? { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
}

export function reportEntries(state: AppState, range: ReportRange) {
  return {
    shifts: state.shifts
      .filter(
        (item) => !item.deletedAt && inRange(item.startAt ?? item.createdAt, range.from, range.to),
      )
      .sort((a, b) => (a.startAt ?? a.createdAt).localeCompare(b.startAt ?? b.createdAt)),
    trips: state.trips
      .filter(
        (item) =>
          !item.deletedAt && inRange(item.startedAt ?? item.createdAt, range.from, range.to),
      )
      .sort((a, b) => (a.startedAt ?? a.createdAt).localeCompare(b.startedAt ?? b.createdAt)),
    expenses: state.expenses.filter(
      (item) => !item.deletedAt && inRange(item.occurredAt, range.from, range.to),
    ),
    notes: state.notes.filter(
      (item) => !item.deletedAt && inRange(item.date, range.from, range.to),
    ),
  };
}

function jobName(state: AppState, id?: string): string {
  return state.jobs.find((job) => job.id === id)?.name ?? '';
}
function vehicleName(state: AppState, id?: string): string {
  return state.vehicles.find((vehicle) => vehicle.id === id)?.nickname ?? '';
}
function periodText(range: ReportRange, preferences: Preferences): string {
  return `${formatDate(range.from.toISOString(), preferences)} – ${formatDate(range.to.toISOString(), preferences)}`;
}
function reportBaseName(range: ReportRange): string {
  return `Aobe-WorkTrack-${format(range.from, 'yyyy-MM-dd')}-to-${format(range.to, 'yyyy-MM-dd')}`;
}

function shiftRows(state: AppState, shifts: WorkShift[]) {
  return shifts.map((shift) => ({
    Date: shift.startAt ? new Date(shift.startAt) : new Date(shift.createdAt),
    Start: shift.startAt ? new Date(shift.startAt) : '',
    End: shift.endAt ? new Date(shift.endAt) : '',
    'Payable hours': payableMinutes(shift) / 60,
    'Unpaid break hours': unpaidBreakMinutes(shift) / 60,
    Job: protectSpreadsheetCell(jobName(state, shift.jobId)),
    'Hourly rate': (shift.hourlyRateMinor ?? state.preferences.defaultHourlyRateMinor) / 100,
    Notes: protectSpreadsheetCell(shift.notes ?? ''),
    Source: shift.source,
  }));
}

function tripRows(state: AppState, trips: MileageTrip[]) {
  return trips.map((trip) => ({
    Date: trip.startedAt ? new Date(trip.startedAt) : new Date(trip.createdAt),
    Vehicle: protectSpreadsheetCell(vehicleName(state, trip.vehicleId)),
    Purpose: protectSpreadsheetCell(trip.purpose ?? ''),
    Category: trip.category,
    Distance: tripDistance(trip),
    Unit: trip.distanceUnit,
    'Start odometer': trip.startOdometer ?? '',
    'End odometer': trip.endOdometer ?? '',
    'Rate per unit':
      (trip.reimbursementRateMinor ?? state.preferences.defaultMileageRateMinor) / 100,
    Tolls: (trip.tollsMinor ?? 0) / 100,
    Parking: (trip.parkingMinor ?? 0) / 100,
    Reimbursement: tripReimbursementMinor(trip, state.preferences) / 100,
    Notes: protectSpreadsheetCell(trip.notes ?? ''),
  }));
}

export async function exportCsv(
  state: AppState,
  range: ReportRange,
  type: 'shifts' | 'trips' = 'shifts',
): Promise<boolean> {
  const entries = reportEntries(state, range);
  const rows =
    type === 'shifts' ? shiftRows(state, entries.shifts) : tripRows(state, entries.trips);
  const csvRows = rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        value instanceof Date ? value.toISOString() : protectSpreadsheetCell(value),
      ]),
    ),
  );
  const csv = Papa.unparse(csvRows, { escapeFormulae: true });
  return saveText(`${reportBaseName(range)}-${type}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8');
}

export async function exportXlsx(state: AppState, range: ReportRange): Promise<boolean> {
  const entries = reportEntries(state, range);
  const totals = calculatePeriodTotals(state, range.from, range.to);
  const summary = [
    {
      Period: periodText(range, state.preferences),
      'Work hours': totals.workMinutes / 60,
      'Overtime hours': totals.overtimeMinutes / 60,
      'Double-time hours': totals.doubleTimeMinutes / 60,
      'Work mileage': totals.mileage,
      'Estimated earnings': totals.earningsMinor / 100,
      'Estimated reimbursement': totals.reimbursementMinor / 100,
    },
  ];
  const breaks = entries.shifts.flatMap((shift) =>
    shift.breaks.map((item) => ({
      'Shift date': shift.startAt ? new Date(shift.startAt) : new Date(shift.createdAt),
      Label: protectSpreadsheetCell(item.label ?? ''),
      Start: item.startAt ? new Date(item.startAt) : '',
      End: item.endAt ? new Date(item.endAt) : '',
      Minutes: item.durationMinutes,
      Paid: item.paid ? 'Yes' : 'No',
    })),
  );
  const expenseRows = entries.expenses.map((item) => ({
    Date: new Date(item.occurredAt),
    Type: item.kind,
    Amount: item.amountMinor / 100,
    Reimbursable: item.reimbursable ? 'Yes' : 'No',
    Notes: protectSpreadsheetCell(item.notes ?? ''),
  }));
  const vehicleRows = state.vehicles.map((item) => ({
    Nickname: protectSpreadsheetCell(item.nickname),
    Year: item.year ?? '',
    Make: protectSpreadsheetCell(item.make ?? ''),
    Model: protectSpreadsheetCell(item.model ?? ''),
    Odometer: item.currentOdometer ?? '',
    Unit: item.distanceUnit,
  }));
  const jobRows = state.jobs.map((item) => ({
    Name: protectSpreadsheetCell(item.name),
    Project: protectSpreadsheetCell(item.project ?? ''),
    'Hourly rate': (item.defaultHourlyRateMinor ?? 0) / 100,
  }));
  const output = await createXlsxWorkbook([
    { name: 'Summary', rows: summary },
    { name: 'Shifts', rows: shiftRows(state, entries.shifts) },
    { name: 'Breaks', rows: breaks },
    { name: 'Trips', rows: tripRows(state, entries.trips) },
    { name: 'Expenses', rows: expenseRows },
    { name: 'Vehicles', rows: vehicleRows },
    { name: 'Jobs', rows: jobRows },
  ]);
  return saveFile(
    `${reportBaseName(range)}.xlsx`,
    output,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
}

export async function exportPdf(
  state: AppState,
  range: ReportRange,
  options = defaultReportOptions,
): Promise<boolean> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const entries = reportEntries(state, range);
  const totals = calculatePeriodTotals(state, range.from, range.to);
  doc.setTextColor(23, 107, 91);
  doc.setFontSize(20);
  doc.text('Aobe WorkTrack Report', 40, 48);
  doc.setTextColor(39, 48, 44);
  doc.setFontSize(10);
  doc.text(state.preferences.displayName || 'Aobe', 40, 68);
  doc.text(periodText(range, state.preferences), 40, 83);
  autoTable(doc, {
    startY: 102,
    theme: 'grid',
    head: [['Work hours', 'Overtime', 'Mileage', 'Est. earnings', 'Est. reimbursement']],
    body: [
      [
        formatDuration(totals.workMinutes),
        formatDuration(totals.overtimeMinutes + totals.doubleTimeMinutes),
        `${totals.mileage.toFixed(1)} ${state.preferences.distanceUnit}`,
        formatMoney(totals.earningsMinor, state.preferences),
        formatMoney(totals.reimbursementMinor + totals.expenseMinor, state.preferences),
      ],
    ],
    styles: { fontSize: 9, cellPadding: 7 },
    headStyles: { fillColor: [23, 107, 91] },
  });
  let y = (doc as any).lastAutoTable.finalY + 18;
  if (options.includeShifts && entries.shifts.length) {
    doc.setFontSize(13);
    doc.text('Shifts', 40, y);
    autoTable(doc, {
      startY: y + 7,
      head: [['Date', 'Time', 'Job', 'Payable', 'Rate']],
      body: entries.shifts.map((item) => [
        formatDate(item.startAt ?? item.createdAt, state.preferences),
        `${formatTime(item.startAt, state.preferences)}–${formatTime(item.endAt, state.preferences)}`,
        jobName(state, item.jobId) || '—',
        formatDuration(payableMinutes(item)),
        formatMoney(
          item.hourlyRateMinor ?? state.preferences.defaultHourlyRateMinor,
          state.preferences,
        ),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [63, 80, 73] },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }
  if (options.includeTrips && entries.trips.length) {
    if (y > 680) {
      doc.addPage();
      y = 44;
    }
    doc.setFontSize(13);
    doc.text('Trips', 40, y);
    autoTable(doc, {
      startY: y + 7,
      head: [['Date', 'Purpose', 'Vehicle', 'Distance', 'Rate', 'Reimbursement']],
      body: entries.trips.map((item) => [
        formatDate(item.startedAt ?? item.createdAt, state.preferences),
        item.purpose || 'Not specified',
        vehicleName(state, item.vehicleId) || '—',
        `${tripDistance(item).toFixed(1)} ${item.distanceUnit}`,
        formatMoney(
          item.reimbursementRateMinor ?? state.preferences.defaultMileageRateMinor,
          state.preferences,
        ),
        formatMoney(tripReimbursementMinor(item, state.preferences), state.preferences),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [63, 80, 73] },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }
  if (options.signature) {
    if (y > 680) {
      doc.addPage();
      y = 80;
    }
    doc.line(40, y + 45, 260, y + 45);
    doc.text('Signature', 40, y + 60);
    doc.line(330, y + 45, 535, y + 45);
    doc.text('Date', 330, y + 60);
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Amounts are estimates. This report is not payroll, tax, or legal advice.', 40, 755);
    doc.text(`Page ${page} of ${pages}`, 510, 755, { align: 'right' });
  }
  return saveFile(
    `${reportBaseName(range)}.pdf`,
    new Uint8Array(doc.output('arraybuffer')),
    'application/pdf',
  );
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ??
      character,
  );
}

export function printableHtml(state: AppState, range: ReportRange): string {
  const entries = reportEntries(state, range);
  const totals = calculatePeriodTotals(state, range.from, range.to);
  const shiftBody = entries.shifts
    .map(
      (item) =>
        `<tr><td>${escapeHtml(formatDate(item.startAt ?? item.createdAt, state.preferences))}</td><td>${escapeHtml(`${formatTime(item.startAt, state.preferences)} – ${formatTime(item.endAt, state.preferences)}`)}</td><td>${escapeHtml(jobName(state, item.jobId))}</td><td>${escapeHtml(formatDuration(payableMinutes(item)))}</td></tr>`,
    )
    .join('');
  const tripBody = entries.trips
    .map(
      (item) =>
        `<tr><td>${escapeHtml(formatDate(item.startedAt ?? item.createdAt, state.preferences))}</td><td>${escapeHtml(item.purpose)}</td><td>${escapeHtml(`${tripDistance(item).toFixed(1)} ${item.distanceUnit}`)}</td><td>${escapeHtml(formatMoney(tripReimbursementMinor(item, state.preferences), state.preferences))}</td></tr>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(reportBaseName(range))}</title><style>body{font:14px system-ui;color:#27302c;margin:40px}h1{color:#176b5b;margin-bottom:4px}.summary{display:flex;gap:32px;border:1px solid #ccd5d0;padding:18px;margin:24px 0}.summary strong{display:block;font-size:18px}table{border-collapse:collapse;width:100%;margin:10px 0 28px}th,td{border-bottom:1px solid #ccd5d0;padding:8px;text-align:left}th{background:#eef3f0}@media print{body{margin:12mm}.no-print{display:none}thead{display:table-header-group}tr{break-inside:avoid}}@page{margin:14mm}</style></head><body><button class="no-print" onclick="window.print()">Print</button><h1>Aobe WorkTrack Report</h1><p>${escapeHtml(state.preferences.displayName)} · ${escapeHtml(periodText(range, state.preferences))}</p><div class="summary"><div>Work hours<strong>${escapeHtml(formatDuration(totals.workMinutes))}</strong></div><div>Work mileage<strong>${totals.mileage.toFixed(1)} ${escapeHtml(state.preferences.distanceUnit)}</strong></div><div>Est. earnings<strong>${escapeHtml(formatMoney(totals.earningsMinor, state.preferences))}</strong></div><div>Est. reimbursement<strong>${escapeHtml(formatMoney(totals.reimbursementMinor + totals.expenseMinor, state.preferences))}</strong></div></div><h2>Shifts</h2><table><thead><tr><th>Date</th><th>Time</th><th>Job</th><th>Payable</th></tr></thead><tbody>${shiftBody || '<tr><td colspan="4">No shifts in this period.</td></tr>'}</tbody></table><h2>Trips</h2><table><thead><tr><th>Date</th><th>Purpose</th><th>Distance</th><th>Reimbursement</th></tr></thead><tbody>${tripBody || '<tr><td colspan="4">No trips in this period.</td></tr>'}</tbody></table><p><small>Amounts are estimates. This report records information and is not payroll, tax, or legal advice.</small></p></body></html>`;
}

export async function exportPrintableHtml(state: AppState, range: ReportRange): Promise<boolean> {
  return saveText(
    `${reportBaseName(range)}.html`,
    printableHtml(state, range),
    'text/html;charset=utf-8',
  );
}

export function openPrintView(state: AppState, range: ReportRange): void {
  const blob = new Blob([printableHtml(state, range)], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (opened) setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
