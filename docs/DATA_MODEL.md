# Data Model

All entities use collision-resistant UUIDs plus ISO `createdAt` and `updatedAt` timestamps. Important records support `deletedAt` soft deletion. Money is stored as integer minor units (for USD, cents). Timestamps are canonical ISO instants; display uses the user's locale/time preference.

## Main records

- `WorkShift`: optional job/project, start/end or duration, multiple `WorkBreak` values, historical rate or flat amount, bonuses/tips/adjustment, location, notes, tags, and source.
- `WorkBreak`: shift ID, optional start/end or duration, paid flag, and label.
- `MileageTrip`: vehicle/job/project, start/end, odometers or distance, unit, locations, purpose/category, historical rate, tolls/parking/other cost, notes, tags, source, and optional route shape reserved for future consent-based GPS.
- `Vehicle`: nickname/details, optional plate, current odometer, unit, rate, archived flag, and notes.
- `Job`: employer/client name, project, rates, location, tags, color, favorite/archived flags, and notes.
- `Expense`, `DayNote`, `ShiftPreset`, `SavedReport`, and `AuditEvent` support related workflows.
- `Preferences`: setup, locale, currency, rates, week/time/distance, appearance/accessibility, overtime, notifications, backup, and demo state.

## Storage adapters

The `StorageAdapter` contract loads/saves `AppState`, creates/lists/restores snapshots, and clears data. IndexedDB stores typed records by collection and metadata separately. SQLite stores collection/id/JSON records and metadata with parameterized statements inside a transaction. SQLite snapshots are also parameterized JSON state rows.

The generic SQLite record layout permits compatible state migrations without coupling React to SQL. A future schema version can migrate individual collection JSON while retaining stable entity IDs.

## Calculation invariants

- Elapsed minutes come from instant differences, so midnight, DST, sleep, and restart work correctly.
- Unpaid breaks reduce payable minutes; paid breaks do not.
- Daily overtime/double-time and sequential weekly overtime are calculated in the domain layer.
- Historical shift/trip rates override later defaults.
- Only business trips contribute mileage reimbursement by default.
- Odometer distance never becomes negative without a warning/override path.
