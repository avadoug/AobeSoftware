export const APP_CONFIG = {
  name: 'Aobe WorkTrack',
  shortName: 'WorkTrack',
  subtitle: 'Hours, mileage, and work records without the paperwork swamp.',
  version: '1.0.0',
  backupFormat: 'aobe-worktrack-backup',
  backupVersion: 1,
  maxImportBytes: 25 * 1024 * 1024,
  deletedRetentionDays: 30,
} as const;
