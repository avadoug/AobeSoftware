import { endOfWeek, format, isWithinInterval, startOfWeek } from 'date-fns';
import type { AppState, MileageTrip, Preferences, WorkBreak, WorkShift } from './types';

export function elapsedMinutes(startAt?: string, endAt?: string, now = new Date()): number {
  if (!startAt) return 0;
  const start = new Date(startAt).getTime();
  const end = endAt ? new Date(endAt).getTime() : now.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round((end - start) / 60_000);
}

export function breakMinutes(workBreak: WorkBreak, now = new Date()): number {
  return workBreak.startAt
    ? elapsedMinutes(workBreak.startAt, workBreak.endAt, now)
    : Math.max(0, workBreak.durationMinutes);
}

export function shiftElapsedMinutes(shift: WorkShift, now = new Date()): number {
  return shift.startAt
    ? elapsedMinutes(shift.startAt, shift.endAt, now)
    : Math.max(0, shift.durationMinutes);
}

export function unpaidBreakMinutes(shift: WorkShift, now = new Date()): number {
  return shift.breaks
    .filter((item) => !item.paid)
    .reduce((sum, item) => sum + breakMinutes(item, now), 0);
}

export function paidBreakMinutes(shift: WorkShift, now = new Date()): number {
  return shift.breaks
    .filter((item) => item.paid)
    .reduce((sum, item) => sum + breakMinutes(item, now), 0);
}

export function payableMinutes(shift: WorkShift, now = new Date()): number {
  return Math.max(0, shiftElapsedMinutes(shift, now) - unpaidBreakMinutes(shift, now));
}

export interface ShiftPayBreakdown {
  regularMinutes: number;
  overtimeMinutes: number;
  doubleTimeMinutes: number;
  earningsMinor: number;
}

export function shiftPayBreakdown(
  shift: WorkShift,
  preferences: Preferences,
  now = new Date(),
  weeklyOvertimeMinutes = 0,
): ShiftPayBreakdown {
  const extras = (shift.bonusesMinor ?? 0) + (shift.tipsMinor ?? 0) + (shift.adjustmentMinor ?? 0);
  const minutes = payableMinutes(shift, now);
  if (shift.flatAmountMinor !== undefined)
    return {
      regularMinutes: minutes,
      overtimeMinutes: 0,
      doubleTimeMinutes: 0,
      earningsMinor: shift.flatAmountMinor + extras,
    };
  const rate = shift.hourlyRateMinor ?? preferences.defaultHourlyRateMinor;
  const doubleStart = preferences.dailyDoubleTimeMinutes;
  const dailyOvertimeStart = preferences.dailyOvertimeMinutes;
  const doubleTimeMinutes = doubleStart ? Math.max(0, minutes - doubleStart) : 0;
  const dailyOvertimeMinutes = dailyOvertimeStart
    ? Math.max(0, Math.min(minutes, doubleStart ?? Number.POSITIVE_INFINITY) - dailyOvertimeStart)
    : 0;
  const regularBeforeWeekly = Math.max(0, minutes - dailyOvertimeMinutes - doubleTimeMinutes);
  const weeklyOvertimeStart = preferences.weeklyOvertimeMinutes;
  const weeklyMinutes = weeklyOvertimeStart
    ? Math.max(
        0,
        Math.min(
          regularBeforeWeekly,
          weeklyOvertimeMinutes + regularBeforeWeekly - weeklyOvertimeStart,
        ),
      )
    : 0;
  const overtimeMinutes = dailyOvertimeMinutes + weeklyMinutes;
  const regularMinutes = Math.max(0, minutes - overtimeMinutes - doubleTimeMinutes);
  const regularPay = Math.round((regularMinutes * rate) / 60);
  const overtimePay = Math.round((overtimeMinutes * rate * preferences.overtimeMultiplier) / 60);
  const doublePay = Math.round((doubleTimeMinutes * rate * preferences.doubleTimeMultiplier) / 60);
  return {
    regularMinutes,
    overtimeMinutes,
    doubleTimeMinutes,
    earningsMinor: regularPay + overtimePay + doublePay + extras,
  };
}

export function shiftEarningsMinor(
  shift: WorkShift,
  preferences: Preferences,
  now = new Date(),
): number {
  return shiftPayBreakdown(shift, preferences, now).earningsMinor;
}

export function tripDistance(
  trip: Pick<MileageTrip, 'distance' | 'startOdometer' | 'endOdometer'>,
): number {
  if (trip.startOdometer !== undefined && trip.endOdometer !== undefined) {
    return Math.max(0, trip.endOdometer - trip.startOdometer);
  }
  return Math.max(0, trip.distance || 0);
}

export function tripReimbursementMinor(trip: MileageTrip, preferences: Preferences): number {
  if (trip.category !== 'business') return 0;
  const mileage = Math.round(
    tripDistance(trip) * (trip.reimbursementRateMinor ?? preferences.defaultMileageRateMinor),
  );
  return (
    mileage + (trip.tollsMinor ?? 0) + (trip.parkingMinor ?? 0) + (trip.otherExpenseMinor ?? 0)
  );
}

function entryDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function inRange(value: string | undefined, from: Date, to: Date): boolean {
  const date = entryDate(value);
  return date ? isWithinInterval(date, { start: from, end: to }) : false;
}

export interface PeriodTotals {
  workMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  doubleTimeMinutes: number;
  unpaidBreakMinutes: number;
  paidBreakMinutes: number;
  mileage: number;
  earningsMinor: number;
  reimbursementMinor: number;
  expenseMinor: number;
  unfinished: number;
}

export function calculatePeriodTotals(
  state: AppState,
  from: Date,
  to: Date,
  now = new Date(),
): PeriodTotals {
  const shifts = state.shifts
    .filter((shift) => !shift.deletedAt && inRange(shift.startAt ?? shift.createdAt, from, to))
    .sort((a, b) => (a.startAt ?? a.createdAt).localeCompare(b.startAt ?? b.createdAt));
  const trips = state.trips.filter(
    (trip) => !trip.deletedAt && inRange(trip.startedAt ?? trip.createdAt, from, to),
  );
  const expenses = state.expenses.filter(
    (expense) => !expense.deletedAt && inRange(expense.occurredAt, from, to),
  );
  let activeWeek = '';
  let weeklyRegularMinutes = 0;
  const pay = shifts.reduce(
    (total, shift) => {
      const shiftDate = new Date(shift.startAt ?? shift.createdAt);
      const weekKey = format(
        startOfWeek(shiftDate, { weekStartsOn: state.preferences.weekStartsOn }),
        'yyyy-MM-dd',
      );
      if (weekKey !== activeWeek) {
        activeWeek = weekKey;
        weeklyRegularMinutes = 0;
      }
      const breakdown = shiftPayBreakdown(shift, state.preferences, now, weeklyRegularMinutes);
      weeklyRegularMinutes += breakdown.regularMinutes;
      return {
        regularMinutes: total.regularMinutes + breakdown.regularMinutes,
        overtimeMinutes: total.overtimeMinutes + breakdown.overtimeMinutes,
        doubleTimeMinutes: total.doubleTimeMinutes + breakdown.doubleTimeMinutes,
        earningsMinor: total.earningsMinor + breakdown.earningsMinor,
      };
    },
    { regularMinutes: 0, overtimeMinutes: 0, doubleTimeMinutes: 0, earningsMinor: 0 },
  );
  return {
    workMinutes: shifts.reduce((sum, shift) => sum + payableMinutes(shift, now), 0),
    regularMinutes: pay.regularMinutes,
    overtimeMinutes: pay.overtimeMinutes,
    doubleTimeMinutes: pay.doubleTimeMinutes,
    unpaidBreakMinutes: shifts.reduce((sum, shift) => sum + unpaidBreakMinutes(shift, now), 0),
    paidBreakMinutes: shifts.reduce((sum, shift) => sum + paidBreakMinutes(shift, now), 0),
    mileage: trips
      .filter((trip) => trip.category === 'business')
      .reduce((sum, trip) => sum + tripDistance(trip), 0),
    earningsMinor: pay.earningsMinor,
    reimbursementMinor: trips.reduce(
      (sum, trip) => sum + tripReimbursementMinor(trip, state.preferences),
      0,
    ),
    expenseMinor: expenses
      .filter((expense) => expense.reimbursable)
      .reduce((sum, expense) => sum + expense.amountMinor, 0),
    unfinished:
      shifts.filter((shift) => !shift.endAt && shift.startAt).length +
      trips.filter((trip) => !trip.endedAt && trip.startedAt).length,
  };
}

export function currentWeekTotals(state: AppState, now = new Date()): PeriodTotals {
  const options = { weekStartsOn: state.preferences.weekStartsOn } as const;
  return calculatePeriodTotals(state, startOfWeek(now, options), endOfWeek(now, options), now);
}

export function validateOdometer(start?: number, end?: number, previous?: number): string[] {
  const warnings: string[] = [];
  if (start !== undefined && end !== undefined && end < start)
    warnings.push('The ending odometer is lower than the starting odometer.');
  if (previous !== undefined && start !== undefined && start < previous)
    warnings.push('The starting odometer is lower than the vehicle’s previous reading.');
  return warnings;
}

export function intervalsOverlap(
  aStart?: string,
  aEnd?: string,
  bStart?: string,
  bEnd?: string,
): boolean {
  if (!aStart || !bStart) return false;
  const a0 = new Date(aStart).getTime();
  const a1 = aEnd ? new Date(aEnd).getTime() : Number.POSITIVE_INFINITY;
  const b0 = new Date(bStart).getTime();
  const b1 = bEnd ? new Date(bEnd).getTime() : Number.POSITIVE_INFINITY;
  return a0 < b1 && b0 < a1;
}

export function findShiftWarnings(shift: WorkShift, existing: WorkShift[]): string[] {
  const warnings: string[] = [];
  if (shift.startAt && shift.endAt && new Date(shift.endAt) < new Date(shift.startAt))
    warnings.push('The end time is before the start time.');
  if (shiftElapsedMinutes(shift) > 24 * 60) warnings.push('This shift is longer than 24 hours.');
  if (
    existing.some(
      (item) =>
        item.id !== shift.id &&
        !item.deletedAt &&
        intervalsOverlap(shift.startAt, shift.endAt, item.startAt, item.endAt),
    )
  )
    warnings.push('This shift overlaps another shift.');
  return warnings;
}

export function roundMoney(value: number): number {
  return Math.round(value + Number.EPSILON);
}
