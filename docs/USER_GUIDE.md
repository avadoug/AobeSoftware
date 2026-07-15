# Aobe WorkTrack User Guide

## Start in under a minute

Open Aobe WorkTrack. Enter your name or select **Skip Setup and Start Tracking**. Rates and other defaults are optional and can be added later in Settings.

The Today page always shows the actions that make sense now. If nothing is active, **Start work** and **Start trip** are visible. If work is running, the timer and **Start break** / **End work** actions replace them.

## Record a normal workday

1. Select **Start work**.
2. Optionally choose a job, location, rate, tags, or note. Select **Start work** again.
3. For a break, select **Start break**, name it, and choose paid or unpaid.
4. Select **End break** when you return.
5. Select **End work** when the shift finishes.

The timer survives minimization, refresh, sleep, and ordinary restart. Aobe WorkTrack stores the real start time and recalculates elapsed time when it reopens.

If a break is still active at the end of a shift, the app warns you and can close the break at the same time. Paid breaks stay in payable time; unpaid breaks are deducted.

## Add or correct hours manually

Use **Add manual entry** on Today, or **Quick Add** / **Add** and choose **Completed shift**.

- Enter start and end times for a timed record.
- For a duration-only record, leave both times blank and enter total hours.
- Add unpaid break minutes, a job, rate, location, tags, and notes as needed.
- Work that ends after midnight uses the next date in the end field.

Open History and use the pencil button to correct a shift. Unusual overlaps or very long shifts show a warning but can be kept after review.

## Record mileage

Add a vehicle under Vehicles if you want odometer checks and automatic current-odometer updates. A vehicle is helpful, not required.

1. On Today, select **Start trip**.
2. Add a purpose, category, job, vehicle, and optional starting odometer/location.
3. At the destination, select **End trip**.
4. Enter the ending odometer or direct distance. Add destination, tolls, parking, and notes if useful.

Business is the only category included in mileage reimbursement estimates. Commuting and personal travel are not silently treated as deductible. Exact rates remain attached to past trips when defaults change.

GPS is not collected. Manual odometer and distance entry works offline and avoids background-location privacy problems.

## Jobs, clients, and vehicles

Profiles save repeated values. A job can remember the project, work location, hourly and mileage rates, tags, and notes. A vehicle can remember its description, distance unit, odometer, and rate.

Deleting a profile does not delete old shifts or trips. Those records retain their stored values and references.

## Calendar and History

Calendar shows hours and trip indicators in a month grid. Select a date to read the day's entries.

History searches job names, purposes, destinations, notes, and tags. Filter shifts/trips and sort by date, hours, distance, or amount. The trash button moves an entry to Recently Deleted and briefly offers Undo. Recently Deleted supports restore and carefully confirmed permanent removal.

## Reports and printing

Open Reports and choose Today, a week/month/pay period/year, or a custom range. Turn detailed sections and the signature line on or off. The preview shows the same selected records and totals used for export.

- PDF is best for sending or filing a finished report.
- XLSX contains separate sheets and typed dates/numbers.
- CSV creates separate shift and mileage files.
- Printable HTML works in any current browser.
- Print opens a clean view without navigation and edit controls.

All earnings and reimbursement amounts are estimates. Aobe WorkTrack is not payroll, tax, or legal advice.

## Back up and restore

Open **Settings > Backup & import** and select **Back Up Now**. Store the downloaded JSON file somewhere separate from the app, such as an encrypted backup drive or a cloud folder you control.

To restore, choose the JSON file and review its record counts. The integrity check and structure validation happen before the Restore button is enabled. A local safety snapshot is created before replacement.

Browser-only data is not cloud-synced. Clearing site data may remove it. Desktop and web records are separate unless you move a backup between them.

## Import CSV

Choose Shift data or Mileage data, then select a CSV. A preview shows detected columns, valid rows, duplicates, and warnings. Importing creates a safety snapshot. Cells that resemble spreadsheet formulas are handled as text.

Typical shift headers include Date, Start, End, Hours, Duration Minutes, Hourly Rate, and Notes. Typical mileage headers include Date, Distance, Miles, Start Odometer, End Odometer, Purpose, Category, Rate, Tolls, Parking, and Notes.

## Demo, appearance, and reminders

**Settings > Privacy & data > Load Demo Data** adds clearly labeled fake jobs, vehicles, shifts, breaks, trips, expenses, and a report. **Remove Demo Data** removes only those fake records.

Appearance supports system/light/dark themes, text size, high contrast, and reduced motion. All essential actions work from a keyboard. On desktop, `Ctrl+N` opens Quick Add.

Notifications are optional. The app explains the request before using browser/Windows permission and remains fully useful if permission is denied.
