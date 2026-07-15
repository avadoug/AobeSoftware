export type Id = string;
export type MoneyMinor = number;
export type DistanceUnit = 'mi' | 'km';
export type TripCategory =
  'business' | 'commuting' | 'personal' | 'medical' | 'charitable' | 'other';
export type EntrySource = 'timer' | 'manual' | 'import';

export interface Entity {
  id: Id;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  demo?: boolean;
}

export interface WorkBreak {
  id: Id;
  shiftId: Id;
  startAt?: string;
  endAt?: string;
  durationMinutes: number;
  paid: boolean;
  label?: string;
}

export interface WorkShift extends Entity {
  jobId?: Id;
  projectId?: Id;
  startAt?: string;
  endAt?: string;
  durationMinutes: number;
  breaks: WorkBreak[];
  hourlyRateMinor?: MoneyMinor;
  flatAmountMinor?: MoneyMinor;
  bonusesMinor?: MoneyMinor;
  tipsMinor?: MoneyMinor;
  adjustmentMinor?: MoneyMinor;
  location?: string;
  notes?: string;
  tags: string[];
  source: EntrySource;
}

export interface MileageTrip extends Entity {
  vehicleId?: Id;
  jobId?: Id;
  projectId?: Id;
  startedAt?: string;
  endedAt?: string;
  startOdometer?: number;
  endOdometer?: number;
  distance: number;
  distanceUnit: DistanceUnit;
  startLocation?: string;
  destination?: string;
  purpose?: string;
  category: TripCategory;
  reimbursementRateMinor?: MoneyMinor;
  tollsMinor?: MoneyMinor;
  parkingMinor?: MoneyMinor;
  otherExpenseMinor?: MoneyMinor;
  notes?: string;
  tags: string[];
  source: EntrySource | 'gps';
  route?: Array<{ latitude: number; longitude: number; recordedAt: string }>;
}

export interface Vehicle extends Entity {
  nickname: string;
  year?: number;
  make?: string;
  model?: string;
  licensePlate?: string;
  currentOdometer?: number;
  distanceUnit: DistanceUnit;
  defaultRateMinor?: MoneyMinor;
  archived: boolean;
  notes?: string;
}

export interface Job extends Entity {
  name: string;
  project?: string;
  defaultHourlyRateMinor?: MoneyMinor;
  defaultMileageRateMinor?: MoneyMinor;
  commonLocation?: string;
  tags: string[];
  color: string;
  favorite: boolean;
  archived: boolean;
  notes?: string;
}

export interface Expense extends Entity {
  occurredAt: string;
  kind: 'parking' | 'toll' | 'supplies' | 'meal' | 'other';
  amountMinor: MoneyMinor;
  reimbursable: boolean;
  jobId?: Id;
  tripId?: Id;
  notes?: string;
}

export interface DayNote extends Entity {
  date: string;
  text: string;
}

export interface ShiftPreset extends Entity {
  name: string;
  durationMinutes?: number;
  breakMinutes?: number;
  jobId?: Id;
  hourlyRateMinor?: MoneyMinor;
  tags: string[];
  notesTemplate?: string;
}

export interface SavedReport extends Entity {
  name: string;
  from: string;
  to: string;
  generatedAt: string;
}

export interface AuditEvent extends Entity {
  action: string;
  entityType: string;
  entityId?: Id;
  detail?: string;
}

export interface Preferences {
  setupComplete: boolean;
  displayName: string;
  currency: string;
  locale: string;
  defaultHourlyRateMinor: MoneyMinor;
  defaultMileageRateMinor: MoneyMinor;
  weekStartsOn: 0 | 1;
  timeFormat: '12' | '24';
  distanceUnit: DistanceUnit;
  theme: 'system' | 'light' | 'dark';
  contrast: 'normal' | 'high';
  textScale: 'small' | 'normal' | 'large';
  reducedMotion: boolean;
  dailyOvertimeMinutes?: number;
  dailyDoubleTimeMinutes?: number;
  weeklyOvertimeMinutes?: number;
  overtimeMultiplier: number;
  doubleTimeMultiplier: number;
  notificationsEnabled: boolean;
  backupReminderDays: number;
  lastBackupAt?: string;
  lastAutoSnapshotDate?: string;
  demoMode: boolean;
}

export interface AppState {
  preferences: Preferences;
  shifts: WorkShift[];
  trips: MileageTrip[];
  vehicles: Vehicle[];
  jobs: Job[];
  expenses: Expense[];
  notes: DayNote[];
  presets: ShiftPreset[];
  reports: SavedReport[];
  audit: AuditEvent[];
}

export type CollectionName = Exclude<keyof AppState, 'preferences'>;

export const defaultPreferences: Preferences = {
  setupComplete: false,
  displayName: 'Aobe',
  currency: 'USD',
  locale: navigator.language || 'en-US',
  defaultHourlyRateMinor: 0,
  defaultMileageRateMinor: 0,
  weekStartsOn: 1,
  timeFormat: '12',
  distanceUnit: 'mi',
  theme: 'system',
  contrast: 'normal',
  textScale: 'normal',
  reducedMotion: false,
  overtimeMultiplier: 1.5,
  doubleTimeMultiplier: 2,
  notificationsEnabled: false,
  backupReminderDays: 7,
  demoMode: false,
};

export const emptyState = (): AppState => ({
  preferences: { ...defaultPreferences },
  shifts: [],
  trips: [],
  vehicles: [],
  jobs: [],
  expenses: [],
  notes: [],
  presets: [],
  reports: [],
  audit: [],
});
