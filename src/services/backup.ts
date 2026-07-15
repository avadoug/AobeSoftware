import { z } from 'zod';
import { APP_CONFIG } from '../config';
import { defaultPreferences, type AppState } from '../domain/types';
import { saveText } from './files';

export interface BackupEnvelope {
  format: typeof APP_CONFIG.backupFormat;
  version: number;
  createdAt: string;
  checksum: string;
  data: AppState;
}

const entitySchema = z
  .object({ id: z.string().min(1), createdAt: z.string(), updatedAt: z.string() })
  .passthrough();
const stateSchema = z.object({
  preferences: z.object({ displayName: z.string() }).passthrough(),
  shifts: z.array(entitySchema),
  trips: z.array(entitySchema),
  vehicles: z.array(entitySchema),
  jobs: z.array(entitySchema),
  expenses: z.array(entitySchema),
  notes: z.array(entitySchema),
  presets: z.array(entitySchema),
  reports: z.array(entitySchema),
  audit: z.array(entitySchema),
});

async function sha256(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function createBackup(state: AppState): Promise<BackupEnvelope> {
  const data = structuredClone(state);
  return {
    format: APP_CONFIG.backupFormat,
    version: APP_CONFIG.backupVersion,
    createdAt: new Date().toISOString(),
    checksum: await sha256(JSON.stringify(data)),
    data,
  };
}

export async function exportBackup(state: AppState): Promise<boolean> {
  const backup = await createBackup(state);
  const date = backup.createdAt.slice(0, 10);
  return saveText(
    `Aobe-WorkTrack-Backup-${date}.json`,
    JSON.stringify(backup, null, 2),
    'application/json',
  );
}

export async function parseBackup(text: string): Promise<BackupEnvelope> {
  if (new TextEncoder().encode(text).byteLength > APP_CONFIG.maxImportBytes)
    throw new Error('This backup is larger than the 25 MB safety limit.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('This is not valid JSON. No data was changed.');
  }
  if (!parsed || typeof parsed !== 'object')
    throw new Error('This is not an Aobe WorkTrack backup.');
  const envelope = parsed as Partial<BackupEnvelope>;
  if (envelope.format !== APP_CONFIG.backupFormat || !envelope.data || !envelope.checksum)
    throw new Error('This is not an Aobe WorkTrack backup.');
  if ((envelope.version ?? 0) > APP_CONFIG.backupVersion)
    throw new Error('This backup was created by a newer version of Aobe WorkTrack.');
  const valid = stateSchema.safeParse(envelope.data);
  if (!valid.success)
    throw new Error('The backup is incomplete or has invalid records. No data was changed.');
  const calculated = await sha256(JSON.stringify(envelope.data));
  if (calculated !== envelope.checksum)
    throw new Error('The backup integrity check failed. The file may be damaged or altered.');
  return {
    format: APP_CONFIG.backupFormat,
    version: envelope.version ?? 1,
    createdAt: envelope.createdAt ?? new Date().toISOString(),
    checksum: envelope.checksum,
    data: {
      ...envelope.data,
      preferences: { ...defaultPreferences, ...envelope.data.preferences },
    } as AppState,
  };
}

export function backupCounts(state: AppState): Record<string, number> {
  return {
    shifts: state.shifts.length,
    trips: state.trips.length,
    vehicles: state.vehicles.length,
    jobs: state.jobs.length,
    expenses: state.expenses.length,
    notes: state.notes.length,
  };
}
