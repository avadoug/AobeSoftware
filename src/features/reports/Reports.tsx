import { Download, FileJson2, FileSpreadsheet, FileText, Printer, ReceiptText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAppStore } from '../../app/AppStore';
import { Button, EmptyState, Field, Input, Pill, Select, Toggle } from '../../components/ui';
import {
  calculatePeriodTotals,
  payableMinutes,
  tripDistance,
  tripReimbursementMinor,
} from '../../domain/calculations';
import { formatDate, formatDuration, formatMoney } from '../../utils/format';
import { createId } from '../../utils/id';
import { exportBackup } from '../../services/backup';
import {
  defaultReportOptions,
  exportCsv,
  exportPdf,
  exportPrintableHtml,
  exportXlsx,
  openPrintView,
  rangeForPreset,
  reportEntries,
  type ReportOptions,
  type ReportPreset,
} from '../../services/reporting';

export function Reports() {
  const { state, put, createSnapshot, updatePreferences } = useAppStore();
  const [preset, setPreset] = useState<ReportPreset>('this-week');
  const initial = rangeForPreset('this-week', state.preferences);
  const [customFrom, setCustomFrom] = useState(initial.from.toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(initial.to.toISOString().slice(0, 10));
  const [options, setOptions] = useState<ReportOptions>(defaultReportOptions);
  const [working, setWorking] = useState<string>();
  const [message, setMessage] = useState<string>();
  const range = useMemo(
    () =>
      rangeForPreset(preset, state.preferences, new Date(), {
        from: new Date(`${customFrom}T00:00:00`),
        to: new Date(`${customTo}T23:59:59.999`),
      }),
    [preset, state.preferences, customFrom, customTo],
  );
  const entries = useMemo(() => reportEntries(state, range), [state, range]);
  const totals = useMemo(() => calculatePeriodTotals(state, range.from, range.to), [state, range]);
  const run = async (label: string, action: () => Promise<boolean>) => {
    try {
      setWorking(label);
      setMessage(undefined);
      const saved = await action();
      if (saved) {
        setMessage(`${label} created successfully.`);
        const stamp = new Date().toISOString();
        put(
          'reports',
          {
            id: createId(),
            name: `${label} report`,
            from: range.from.toISOString(),
            to: range.to.toISOString(),
            generatedAt: stamp,
            createdAt: stamp,
            updatedAt: stamp,
          },
          'generated',
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${label} export failed.`);
    } finally {
      setWorking(undefined);
    }
  };
  const exportCompleteBackup = async () => {
    setWorking('Backup');
    await createSnapshot('manual');
    const saved = await exportBackup(state);
    if (saved) {
      updatePreferences({ lastBackupAt: new Date().toISOString() });
      setMessage('Complete backup created successfully.');
    }
    setWorking(undefined);
  };

  return (
    <div className="page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Payroll, reimbursement, or your own records</p>
          <h1>Reports</h1>
          <p>Choose a period, preview the totals, then export only what you need.</p>
        </div>
        <Button onClick={() => openPrintView(state, range)}>
          <Printer size={18} /> Print
        </Button>
      </header>
      <div className="report-layout">
        <aside className="card report-builder">
          <h2>Build your report</h2>
          <Field label="Report period">
            <Select
              value={preset}
              onChange={(event) => setPreset(event.target.value as ReportPreset)}
            >
              <option value="today">Today</option>
              <option value="this-week">This week</option>
              <option value="last-week">Last week</option>
              <option value="this-month">This month</option>
              <option value="last-month">Last month</option>
              <option value="current-pay-period">Current pay period (1–15 / 16–end)</option>
              <option value="previous-pay-period">Previous pay period</option>
              <option value="this-year">Current year</option>
              <option value="custom">Custom date range</option>
            </Select>
          </Field>
          {preset === 'custom' && (
            <div className="form-grid">
              <Field label="From">
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(event) => setCustomFrom(event.target.value)}
                />
              </Field>
              <Field label="To">
                <Input
                  type="date"
                  value={customTo}
                  onChange={(event) => setCustomTo(event.target.value)}
                />
              </Field>
            </div>
          )}
          <div className="report-period">
            <span>Selected period</span>
            <strong>
              {formatDate(range.from.toISOString(), state.preferences)} –{' '}
              {formatDate(range.to.toISOString(), state.preferences)}
            </strong>
          </div>
          <div className="section-divider" />
          <h3>Include</h3>
          <Toggle
            checked={options.includeShifts}
            onChange={(checked) => setOptions({ ...options, includeShifts: checked })}
            label="Detailed shifts"
          />
          <Toggle
            checked={options.includeBreaks}
            onChange={(checked) => setOptions({ ...options, includeBreaks: checked })}
            label="Break summary"
          />
          <Toggle
            checked={options.includeTrips}
            onChange={(checked) => setOptions({ ...options, includeTrips: checked })}
            label="Detailed trips"
          />
          <Toggle
            checked={options.includeExpenses}
            onChange={(checked) => setOptions({ ...options, includeExpenses: checked })}
            label="Expenses"
          />
          <Toggle
            checked={options.includeNotes}
            onChange={(checked) => setOptions({ ...options, includeNotes: checked })}
            label="Notes"
          />
          <Toggle
            checked={options.signature}
            onChange={(checked) => setOptions({ ...options, signature: checked })}
            label="Signature line"
          />
        </aside>
        <section className="report-preview">
          <div className="report-sheet">
            <div className="report-sheet__header">
              <div>
                <p className="eyebrow">Preview</p>
                <h2>Work and mileage report</h2>
                <span>
                  {state.preferences.displayName} ·{' '}
                  {formatDate(range.from.toISOString(), state.preferences)} –{' '}
                  {formatDate(range.to.toISOString(), state.preferences)}
                </span>
              </div>
              <Pill tone={entries.shifts.length || entries.trips.length ? 'success' : 'warning'}>
                {entries.shifts.length + entries.trips.length} records
              </Pill>
            </div>
            <div className="report-totals">
              <div>
                <span>Work hours</span>
                <strong>{formatDuration(totals.workMinutes)}</strong>
                <small>
                  {formatDuration(totals.overtimeMinutes + totals.doubleTimeMinutes)} overtime
                </small>
              </div>
              <div>
                <span>Work mileage</span>
                <strong>
                  {totals.mileage.toFixed(1)} {state.preferences.distanceUnit}
                </strong>
              </div>
              <div>
                <span>Est. earnings</span>
                <strong>{formatMoney(totals.earningsMinor, state.preferences)}</strong>
              </div>
              <div>
                <span>Est. reimbursement</span>
                <strong>
                  {formatMoney(totals.reimbursementMinor + totals.expenseMinor, state.preferences)}
                </strong>
              </div>
            </div>
            {!entries.shifts.length && !entries.trips.length ? (
              <EmptyState icon={<ReceiptText size={28} />} title="Nothing in this period">
                Choose another date range or add a shift or trip before exporting.
              </EmptyState>
            ) : (
              <>
                {options.includeShifts && entries.shifts.length > 0 && (
                  <div className="preview-section">
                    <h3>Shifts</h3>
                    <div className="preview-table">
                      <div className="preview-table__head">
                        <span>Date</span>
                        <span>Job</span>
                        <span>Payable</span>
                        <span>Est. amount</span>
                      </div>
                      {entries.shifts.slice(0, 8).map((item) => (
                        <div key={item.id}>
                          <span>
                            {formatDate(item.startAt ?? item.createdAt, state.preferences)}
                          </span>
                          <span>
                            {state.jobs.find((job) => job.id === item.jobId)?.name ?? '—'}
                          </span>
                          <span>{formatDuration(payableMinutes(item))}</span>
                          <span>
                            {formatMoney(
                              Math.round(
                                (payableMinutes(item) *
                                  (item.hourlyRateMinor ??
                                    state.preferences.defaultHourlyRateMinor)) /
                                  60,
                              ),
                              state.preferences,
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                    {entries.shifts.length > 8 && (
                      <small>+ {entries.shifts.length - 8} more shifts in export</small>
                    )}
                  </div>
                )}
                {options.includeTrips && entries.trips.length > 0 && (
                  <div className="preview-section">
                    <h3>Trips</h3>
                    <div className="preview-table">
                      <div className="preview-table__head">
                        <span>Date</span>
                        <span>Purpose</span>
                        <span>Distance</span>
                        <span>Reimbursement</span>
                      </div>
                      {entries.trips.slice(0, 8).map((item) => (
                        <div key={item.id}>
                          <span>
                            {formatDate(item.startedAt ?? item.createdAt, state.preferences)}
                          </span>
                          <span>{item.purpose || '—'}</span>
                          <span>
                            {tripDistance(item).toFixed(1)} {item.distanceUnit}
                          </span>
                          <span>
                            {formatMoney(
                              tripReimbursementMinor(item, state.preferences),
                              state.preferences,
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <p className="report-disclaimer">
              Amounts are estimates. Aobe WorkTrack is not a payroll processor and does not provide
              tax or legal advice.
            </p>
          </div>
          <div className="export-panel">
            <h2>Export</h2>
            {message && (
              <div className="alert" role="status">
                {message}
              </div>
            )}
            <div className="export-grid">
              <Button
                disabled={Boolean(working)}
                onClick={() => run('PDF', () => exportPdf(state, range, options))}
              >
                <FileText size={19} />
                <span>
                  <strong>PDF</strong>
                  <small>Polished, page-numbered report</small>
                </span>
              </Button>
              <Button
                disabled={Boolean(working)}
                onClick={() => run('XLSX', () => exportXlsx(state, range))}
              >
                <FileSpreadsheet size={19} />
                <span>
                  <strong>XLSX</strong>
                  <small>Separate worksheets</small>
                </span>
              </Button>
              <Button
                disabled={Boolean(working)}
                onClick={() =>
                  run('CSV', async () => {
                    const one = await exportCsv(state, range, 'shifts');
                    const two = await exportCsv(state, range, 'trips');
                    return one && two;
                  })
                }
              >
                <Download size={19} />
                <span>
                  <strong>CSV</strong>
                  <small>Shift and mileage files</small>
                </span>
              </Button>
              <Button
                disabled={Boolean(working)}
                onClick={() => run('HTML', () => exportPrintableHtml(state, range))}
              >
                <Printer size={19} />
                <span>
                  <strong>Printable HTML</strong>
                  <small>Open in any browser</small>
                </span>
              </Button>
              <Button disabled={Boolean(working)} onClick={exportCompleteBackup}>
                <FileJson2 size={19} />
                <span>
                  <strong>Complete backup</strong>
                  <small>Every record and setting</small>
                </span>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
