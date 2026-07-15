import { addDays, setHours, setMinutes, startOfWeek, subDays } from 'date-fns';
import type {
  AppState,
  Expense,
  Job,
  MileageTrip,
  SavedReport,
  Vehicle,
  WorkShift,
} from '../domain/types';
import { createId } from '../utils/id';

const isoAt = (date: Date, hours: number, minutes = 0) =>
  setMinutes(setHours(date, hours), minutes).toISOString();

export function withDemoData(state: AppState, now = new Date()): AppState {
  const stamp = now.toISOString();
  const job1: Job = {
    id: createId(),
    name: 'Canyon Office',
    project: 'Operations',
    defaultHourlyRateMinor: 2250,
    defaultMileageRateMinor: 67,
    commonLocation: 'Downtown',
    tags: ['regular'],
    color: '#176b5b',
    favorite: true,
    archived: false,
    createdAt: stamp,
    updatedAt: stamp,
    demo: true,
  };
  const job2: Job = {
    id: createId(),
    name: 'Desert Community Center',
    project: 'Events',
    defaultHourlyRateMinor: 2800,
    defaultMileageRateMinor: 65,
    tags: ['events'],
    color: '#b86b25',
    favorite: false,
    archived: false,
    createdAt: stamp,
    updatedAt: stamp,
    demo: true,
  };
  const vehicle1: Vehicle = {
    id: createId(),
    nickname: 'Blue Honda',
    year: 2017,
    make: 'Honda',
    model: 'Civic',
    currentOdometer: 84312,
    distanceUnit: 'mi',
    defaultRateMinor: 67,
    archived: false,
    createdAt: stamp,
    updatedAt: stamp,
    demo: true,
  };
  const vehicle2: Vehicle = {
    id: createId(),
    nickname: 'Family SUV',
    year: 2021,
    make: 'Subaru',
    model: 'Forester',
    currentOdometer: 32110,
    distanceUnit: 'mi',
    defaultRateMinor: 65,
    archived: false,
    createdAt: stamp,
    updatedAt: stamp,
    demo: true,
  };
  const week = startOfWeek(now, { weekStartsOn: state.preferences.weekStartsOn });
  const shifts: WorkShift[] = Array.from({ length: 6 }, (_, index) => {
    const day = addDays(week, index);
    const startAt = isoAt(day, 8, index % 2 ? 15 : 0);
    const endAt = isoAt(day, index === 5 ? 14 : 17, index % 2 ? 0 : 30);
    const id = createId();
    return {
      id,
      jobId: index === 5 ? job2.id : job1.id,
      startAt,
      endAt,
      durationMinutes: Math.round(
        (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000,
      ),
      breaks: [
        {
          id: createId(),
          shiftId: id,
          startAt: isoAt(day, 12),
          endAt: isoAt(day, 12, 30),
          durationMinutes: 30,
          paid: false,
          label: 'Lunch',
        },
      ],
      hourlyRateMinor: index === 5 ? 2800 : 2250,
      notes: index === 2 ? 'Inventory and end-of-day notes' : undefined,
      tags: index === 5 ? ['events'] : ['regular'],
      source: 'manual',
      createdAt: stamp,
      updatedAt: stamp,
      demo: true,
    };
  });
  const tripDays = [subDays(now, 1), subDays(now, 3), subDays(now, 5), subDays(now, 7)];
  const trips: MileageTrip[] = tripDays.map((day, index) => ({
    id: createId(),
    vehicleId: index === 3 ? vehicle2.id : vehicle1.id,
    jobId: index < 3 ? job1.id : undefined,
    startedAt: isoAt(day, 7, 30),
    endedAt: isoAt(day, 8),
    startOdometer: 84200 + index * 25,
    endOdometer: 84218 + index * 25,
    distance: 18,
    distanceUnit: 'mi',
    startLocation: 'Home',
    destination: index === 3 ? 'Trailhead' : 'Canyon Office',
    purpose:
      index === 3 ? 'Weekend outing' : ['Supply pickup', 'Client meeting', 'Training'][index],
    category: index === 3 ? 'personal' : 'business',
    reimbursementRateMinor: 67,
    tollsMinor: index === 1 ? 450 : 0,
    parkingMinor: index === 2 ? 800 : 0,
    tags: [],
    source: 'manual',
    createdAt: stamp,
    updatedAt: stamp,
    demo: true,
  }));
  const expenses: Expense[] = [
    {
      id: createId(),
      occurredAt: subDays(now, 2).toISOString(),
      kind: 'supplies',
      amountMinor: 1845,
      reimbursable: true,
      jobId: job1.id,
      notes: 'Label paper and pens',
      createdAt: stamp,
      updatedAt: stamp,
      demo: true,
    },
  ];
  const report: SavedReport = {
    id: createId(),
    name: 'Example weekly record',
    from: week.toISOString(),
    to: addDays(week, 6).toISOString(),
    generatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
    demo: true,
  };
  return {
    ...state,
    preferences: { ...state.preferences, demoMode: true },
    jobs: [job1, job2, ...state.jobs],
    vehicles: [vehicle1, vehicle2, ...state.vehicles],
    shifts: [...shifts, ...state.shifts],
    trips: [...trips, ...state.trips],
    expenses: [...expenses, ...state.expenses],
    reports: [report, ...state.reports],
  };
}

export function withoutDemoData(state: AppState): AppState {
  return {
    ...state,
    preferences: { ...state.preferences, demoMode: false },
    shifts: state.shifts.filter((item) => !item.demo),
    trips: state.trips.filter((item) => !item.demo),
    vehicles: state.vehicles.filter((item) => !item.demo),
    jobs: state.jobs.filter((item) => !item.demo),
    expenses: state.expenses.filter((item) => !item.demo),
    notes: state.notes.filter((item) => !item.demo),
    presets: state.presets.filter((item) => !item.demo),
    reports: state.reports.filter((item) => !item.demo),
    audit: state.audit.filter((item) => !item.demo),
  };
}
