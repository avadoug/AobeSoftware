import { addDays, startOfWeek } from 'date-fns';
import { describe, expect, it } from 'vitest';
import {
  calculatePeriodTotals,
  elapsedMinutes,
  findShiftWarnings,
  payableMinutes,
  roundMoney,
  shiftPayBreakdown,
  tripDistance,
  tripReimbursementMinor,
  unpaidBreakMinutes,
  validateOdometer,
} from '../src/domain/calculations';
import {
  defaultPreferences,
  emptyState,
  type MileageTrip,
  type WorkShift,
} from '../src/domain/types';

function shift(overrides: Partial<WorkShift> = {}): WorkShift {
  return {
    id: crypto.randomUUID(),
    startAt: '2026-07-06T08:00:00.000Z',
    endAt: '2026-07-06T17:00:00.000Z',
    durationMinutes: 540,
    breaks: [],
    hourlyRateMinor: 2000,
    tags: [],
    source: 'manual',
    createdAt: '2026-07-06T08:00:00.000Z',
    updatedAt: '2026-07-06T17:00:00.000Z',
    ...overrides,
  };
}

function trip(overrides: Partial<MileageTrip> = {}): MileageTrip {
  return {
    id: crypto.randomUUID(),
    startedAt: '2026-07-06T08:00:00.000Z',
    endedAt: '2026-07-06T09:00:00.000Z',
    distance: 10,
    distanceUnit: 'mi',
    category: 'business',
    reimbursementRateMinor: 67,
    tags: [],
    source: 'manual',
    createdAt: '2026-07-06T08:00:00.000Z',
    updatedAt: '2026-07-06T09:00:00.000Z',
    ...overrides,
  };
}

describe('time and break calculations', () => {
  it('calculates midnight crossing from canonical timestamps', () => {
    expect(elapsedMinutes('2026-07-06T23:00:00-07:00', '2026-07-07T01:00:00-07:00')).toBe(120);
  });
  it('uses actual DST elapsed time rather than assuming a 24-hour day', () => {
    expect(elapsedMinutes('2026-03-08T01:30:00-07:00', '2026-03-08T03:30:00-06:00')).toBe(60);
  });
  it('deducts multiple unpaid breaks but retains paid breaks', () => {
    const value = shift({
      breaks: [
        { id: 'b1', shiftId: 's', durationMinutes: 30, paid: false, label: 'Lunch' },
        { id: 'b2', shiftId: 's', durationMinutes: 15, paid: true, label: 'Rest' },
        { id: 'b3', shiftId: 's', durationMinutes: 10, paid: false, label: 'Personal' },
      ],
    });
    expect(unpaidBreakMinutes(value)).toBe(40);
    expect(payableMinutes(value)).toBe(500);
  });
  it('supports a duration-only shift', () => {
    expect(
      payableMinutes(shift({ startAt: undefined, endAt: undefined, durationMinutes: 375 })),
    ).toBe(375);
  });
});

describe('pay calculations', () => {
  it('rounds minor-unit earnings safely', () => {
    expect(roundMoney(10.5)).toBe(11);
  });
  it('applies daily overtime and double time', () => {
    const preferences = {
      ...defaultPreferences,
      dailyOvertimeMinutes: 8 * 60,
      dailyDoubleTimeMinutes: 12 * 60,
      overtimeMultiplier: 1.5,
      doubleTimeMultiplier: 2,
    };
    const result = shiftPayBreakdown(
      shift({ endAt: '2026-07-06T21:00:00.000Z', durationMinutes: 780 }),
      preferences,
    );
    expect(result).toMatchObject({
      regularMinutes: 480,
      overtimeMinutes: 240,
      doubleTimeMinutes: 60,
      earningsMinor: 32000,
    });
  });
  it('applies weekly overtime across ordered shifts', () => {
    const state = emptyState();
    state.preferences.setupComplete = true;
    state.preferences.weekStartsOn = 1;
    state.preferences.weeklyOvertimeMinutes = 40 * 60;
    state.preferences.defaultHourlyRateMinor = 2000;
    const monday = startOfWeek(new Date('2026-07-08T12:00:00Z'), { weekStartsOn: 1 });
    state.shifts = Array.from({ length: 6 }, (_, index) => {
      const day = addDays(monday, index);
      return shift({
        id: `s${index}`,
        startAt: new Date(day.getTime() + 8 * 3600000).toISOString(),
        endAt: new Date(day.getTime() + 16 * 3600000).toISOString(),
        hourlyRateMinor: 2000,
      });
    });
    const totals = calculatePeriodTotals(state, monday, addDays(monday, 7));
    expect(totals.regularMinutes).toBe(40 * 60);
    expect(totals.overtimeMinutes).toBe(8 * 60);
    expect(totals.earningsMinor).toBe(104000);
  });
  it('preserves the historical rate attached to a shift', () => {
    const value = shift({
      hourlyRateMinor: 1750,
      startAt: undefined,
      endAt: undefined,
      durationMinutes: 120,
    });
    const result = shiftPayBreakdown(value, {
      ...defaultPreferences,
      defaultHourlyRateMinor: 3000,
    });
    expect(result.earningsMinor).toBe(3500);
  });
});

describe('mileage and validation', () => {
  it('calculates distance from odometers', () => {
    expect(
      tripDistance(trip({ startOdometer: 100.2, endOdometer: 118.7, distance: 0 })),
    ).toBeCloseTo(18.5);
  });
  it('includes business mileage and reimbursable costs', () => {
    expect(
      tripReimbursementMinor(
        trip({ distance: 10, tollsMinor: 250, parkingMinor: 500 }),
        defaultPreferences,
      ),
    ).toBe(1420);
  });
  it('does not treat personal travel as reimbursable business mileage', () => {
    expect(
      tripReimbursementMinor(trip({ category: 'personal', distance: 25 }), defaultPreferences),
    ).toBe(0);
  });
  it('warns about decreasing odometers', () => {
    expect(validateOdometer(90, 80, 100)).toHaveLength(2);
  });
  it('detects overlapping shifts and unusually long entries', () => {
    const existing = shift();
    const candidate = shift({
      id: 'candidate',
      startAt: '2026-07-06T16:00:00.000Z',
      endAt: '2026-07-08T17:00:00.000Z',
    });
    expect(findShiftWarnings(candidate, [existing])).toEqual(
      expect.arrayContaining([
        'This shift is longer than 24 hours.',
        'This shift overlaps another shift.',
      ]),
    );
  });
});
