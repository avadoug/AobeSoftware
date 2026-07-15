# Privacy

Aobe WorkTrack is local-first. No account is required. Production includes no analytics, advertising, telemetry, crash-reporting service, tracking pixel, or remote database. Ordinary use makes no request containing a name, hours, mileage, locations, notes, or device details.

## Storage locations

The web/PWA uses IndexedDB for the exact site origin and browser profile. Browser settings, private mode, storage pressure, or clearing site data may remove it. It is not automatically cloud-synced.

The Windows version uses `aobe-worktrack.db` in the Tauri per-user application-data directory. Attachments are not supported in version 1.0. Uninstall/upgrade behavior should be verified for each signed installer release; ordinary upgrades are designed to preserve app data.

## Backups and exports

Files are created only after the user requests them. A backup contains all current records and preferences plus an integrity hash. Anyone with the unencrypted backup can read it, so store it according to the sensitivity of work records.

## Location and notifications

Version 1.0 does not collect GPS. Mileage uses manual odometers or direct distance. This avoids inconsistent background tracking and silent location retention. A future GPS feature must remain disabled by default, visibly consented, immediately stoppable, deletable, and optional.

Notifications require an explicit user toggle and browser/operating-system permission. Denial does not reduce tracking functionality.

## Delete and control

Individual shifts/trips use Recently Deleted with restore. **Delete All Data** requires typing `DELETE ALL DATA` and removes the local database state/snapshots for that app and device. Export a complete backup first if records may be needed.

Tax and reimbursement treatment varies. The application records information but does not provide payroll, tax, or legal advice.
