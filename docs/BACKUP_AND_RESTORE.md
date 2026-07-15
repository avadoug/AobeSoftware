# Backup and Restore

## What a complete backup contains

The JSON package contains preferences, shifts and breaks, trips, vehicles, jobs, expenses, notes, presets, saved-report metadata, and audit events. It includes a format version, creation timestamp, and SHA-256 integrity value. It contains no executable code.

## Create a backup

1. Open **Settings > Backup & import**.
2. Select **Back Up Now**.
3. Choose a safe destination if the Windows file dialog appears, or keep the browser download.
4. Copy the file to storage outside the device or browser profile.

The app also retains up to ten automatic/manual local snapshots. Local snapshots help with recent mistakes but are stored beside the app data and do not protect against disk loss or cleared browser storage.

## Restore a downloaded backup

1. Open **Settings > Backup & import**.
2. Select **Choose backup file** and choose the `.json` file.
3. Review creation time and record counts.
4. Select **Restore backup**.

Before replacement, the current state is saved as a local `before-import` snapshot. An invalid, damaged, edited, oversized, or future-version package is rejected before data changes.

## Move between desktop and web

Create a backup in the source version and restore it in the destination version. Confirm the counts before restore. Attachments are not present in version 1.0, so all current backup data fits in JSON.

## Recovery priorities

1. Use the most recent downloaded complete backup.
2. If unavailable, use an automatic local snapshot in Settings.
3. If the app is still open with a failed export, do not clear storage; retry to another path.

Never edit the JSON manually. Editing changes its integrity hash and causes a safe rejection.
