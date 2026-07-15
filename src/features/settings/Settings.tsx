import {
  Bell,
  CheckCircle2,
  Database,
  Download,
  FileUp,
  HardDrive,
  Info,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useAppStore } from '../../app/AppStore';
import { Button, Dialog, Field, Input, Pill, Select, Toggle } from '../../components/ui';
import type { AppState } from '../../domain/types';
import { APP_CONFIG } from '../../config';
import {
  backupCounts,
  exportBackup,
  parseBackup,
  type BackupEnvelope,
} from '../../services/backup';
import { previewCsv, type ImportKind, type ImportPreview } from '../../services/csvImport';
import { withDemoData, withoutDemoData } from '../../services/demo';
import { formatDate, minorToInput, moneyToMinor } from '../../utils/format';
import type { MileageTrip, WorkShift } from '../../domain/types';
import type { Snapshot } from '../../storage';

type SettingsSection = 'general' | 'appearance' | 'reminders' | 'backup' | 'privacy';

export function Settings() {
  const {
    state,
    storageKind,
    updatePreferences,
    replaceState,
    createSnapshot,
    listSnapshots,
    restoreSnapshot,
    clearAll,
  } = useAppStore();
  const [section, setSection] = useState<SettingsSection>('general');
  const [message, setMessage] = useState<string>();
  const [snapshots, setSnapshots] = useState<Array<Omit<Snapshot, 'state'>>>([]);
  const [backupPreview, setBackupPreview] = useState<BackupEnvelope>();
  const [csvKind, setCsvKind] = useState<ImportKind>('shifts');
  const [csvPreview, setCsvPreview] = useState<ImportPreview<WorkShift | MileageTrip>>();
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (section === 'backup') void listSnapshots().then(setSnapshots);
  }, [section, listSnapshots]);

  const backupNow = async () => {
    try {
      setMessage(undefined);
      await createSnapshot('manual');
      const saved = await exportBackup(state);
      if (saved) {
        updatePreferences({ lastBackupAt: new Date().toISOString() });
        setMessage('Backup saved. Keep a copy somewhere outside this browser or computer.');
        setSnapshots(await listSnapshots());
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Backup failed.');
    }
  };
  const loadBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const envelope = await parseBackup(await file.text());
      setBackupPreview(envelope);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Backup could not be read.');
    }
  };
  const restoreBackup = async () => {
    if (!backupPreview) return;
    await createSnapshot('before-import');
    replaceState(backupPreview.data);
    setBackupPreview(undefined);
    setMessage(
      'Backup restored. The data that was here before restore is available as a local snapshot.',
    );
  };
  const loadCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > APP_CONFIG.maxImportBytes) {
      setMessage('That CSV file is larger than the 25 MB safety limit.');
      return;
    }
    const preview = previewCsv(await file.text(), csvKind, state);
    setCsvPreview(preview);
  };
  const importCsv = async () => {
    if (!csvPreview) return;
    await createSnapshot('before-import');
    const next: AppState =
      csvKind === 'shifts'
        ? { ...state, shifts: [...(csvPreview.rows as WorkShift[]), ...state.shifts] }
        : { ...state, trips: [...(csvPreview.rows as MileageTrip[]), ...state.trips] };
    replaceState(next);
    setMessage(
      `${csvPreview.rows.length} ${csvKind} imported. ${csvPreview.duplicates} likely duplicates were skipped.`,
    );
    setCsvPreview(undefined);
  };
  const enableNotifications = async (enabled: boolean) => {
    if (!enabled) {
      updatePreferences({ notificationsEnabled: false });
      return;
    }
    if (!('Notification' in window)) {
      setMessage('Notifications are not supported in this browser. Tracking still works normally.');
      return;
    }
    const permission = await Notification.requestPermission();
    updatePreferences({ notificationsEnabled: permission === 'granted' });
    if (permission !== 'granted')
      setMessage('Notification permission was not granted. Tracking still works normally.');
  };
  const doDeleteAll = async () => {
    if (deleteText !== 'DELETE ALL DATA') return;
    await clearAll();
    setDeleteDialog(false);
    window.location.reload();
  };

  return (
    <div className="page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Make it yours</p>
          <h1>Settings</h1>
          <p>Defaults help with quick entry; every value can still be changed per record.</p>
        </div>
        <Pill tone="success">
          <ShieldCheck size={14} /> Local {storageKind === 'sqlite' ? 'SQLite' : 'IndexedDB'}
        </Pill>
      </header>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          <button
            className={section === 'general' ? 'active' : ''}
            onClick={() => setSection('general')}
          >
            <Info size={18} /> General
          </button>
          <button
            className={section === 'appearance' ? 'active' : ''}
            onClick={() => setSection('appearance')}
          >
            <Sun size={18} /> Appearance
          </button>
          <button
            className={section === 'reminders' ? 'active' : ''}
            onClick={() => setSection('reminders')}
          >
            <Bell size={18} /> Reminders
          </button>
          <button
            className={section === 'backup' ? 'active' : ''}
            onClick={() => setSection('backup')}
          >
            <HardDrive size={18} /> Backup & import
          </button>
          <button
            className={section === 'privacy' ? 'active' : ''}
            onClick={() => setSection('privacy')}
          >
            <ShieldCheck size={18} /> Privacy & data
          </button>
        </nav>
        <section className="settings-content">
          {message && (
            <div className="alert" role="status">
              <CheckCircle2 size={18} /> {message}
            </div>
          )}
          {section === 'general' && (
            <div className="settings-section">
              <div>
                <h2>General</h2>
                <p>Used as defaults for new records, not as retroactive changes to old records.</p>
              </div>
              <div className="settings-group">
                <Field label="Display name">
                  <Input
                    value={state.preferences.displayName}
                    onChange={(event) => updatePreferences({ displayName: event.target.value })}
                  />
                </Field>
                <div className="form-grid">
                  <Field label="Default hourly rate">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={minorToInput(state.preferences.defaultHourlyRateMinor)}
                      onChange={(event) =>
                        updatePreferences({
                          defaultHourlyRateMinor: moneyToMinor(event.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label={`Default mileage rate per ${state.preferences.distanceUnit}`}>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={minorToInput(state.preferences.defaultMileageRateMinor)}
                      onChange={(event) =>
                        updatePreferences({
                          defaultMileageRateMinor: moneyToMinor(event.target.value),
                        })
                      }
                    />
                  </Field>
                </div>
                <div className="form-grid">
                  <Field label="Currency">
                    <Select
                      value={state.preferences.currency}
                      onChange={(event) => updatePreferences({ currency: event.target.value })}
                    >
                      <option value="USD">USD — US dollar</option>
                      <option value="CAD">CAD — Canadian dollar</option>
                      <option value="EUR">EUR — Euro</option>
                      <option value="GBP">GBP — Pound sterling</option>
                      <option value="AUD">AUD — Australian dollar</option>
                    </Select>
                  </Field>
                  <Field label="Distance unit">
                    <Select
                      value={state.preferences.distanceUnit}
                      onChange={(event) =>
                        updatePreferences({ distanceUnit: event.target.value as 'mi' | 'km' })
                      }
                    >
                      <option value="mi">Miles</option>
                      <option value="km">Kilometers</option>
                    </Select>
                  </Field>
                </div>
                <div className="form-grid">
                  <Field label="Week starts on">
                    <Select
                      value={state.preferences.weekStartsOn}
                      onChange={(event) =>
                        updatePreferences({ weekStartsOn: Number(event.target.value) as 0 | 1 })
                      }
                    >
                      <option value="1">Monday</option>
                      <option value="0">Sunday</option>
                    </Select>
                  </Field>
                  <Field label="Time format">
                    <Select
                      value={state.preferences.timeFormat}
                      onChange={(event) =>
                        updatePreferences({ timeFormat: event.target.value as '12' | '24' })
                      }
                    >
                      <option value="12">12-hour</option>
                      <option value="24">24-hour</option>
                    </Select>
                  </Field>
                </div>
              </div>
              <div className="settings-group">
                <h3>Overtime estimates</h3>
                <p>
                  Optional. Overtime calculations are estimates and do not replace employer payroll
                  rules.
                </p>
                <div className="form-grid form-grid--three">
                  <Field label="Daily overtime after hours">
                    <Input
                      type="number"
                      min="0"
                      step="0.25"
                      value={(state.preferences.dailyOvertimeMinutes ?? 0) / 60 || ''}
                      onChange={(event) =>
                        updatePreferences({
                          dailyOvertimeMinutes: event.target.value
                            ? Math.round(Number(event.target.value) * 60)
                            : undefined,
                        })
                      }
                    />
                  </Field>
                  <Field label="Weekly overtime after hours">
                    <Input
                      type="number"
                      min="0"
                      step="0.25"
                      value={(state.preferences.weeklyOvertimeMinutes ?? 0) / 60 || ''}
                      onChange={(event) =>
                        updatePreferences({
                          weeklyOvertimeMinutes: event.target.value
                            ? Math.round(Number(event.target.value) * 60)
                            : undefined,
                        })
                      }
                    />
                  </Field>
                  <Field label="Overtime multiplier">
                    <Input
                      type="number"
                      min="1"
                      step="0.1"
                      value={state.preferences.overtimeMultiplier}
                      onChange={(event) =>
                        updatePreferences({ overtimeMultiplier: Number(event.target.value) || 1.5 })
                      }
                    />
                  </Field>
                  <Field label="Daily double time after hours">
                    <Input
                      type="number"
                      min="0"
                      step="0.25"
                      value={(state.preferences.dailyDoubleTimeMinutes ?? 0) / 60 || ''}
                      onChange={(event) =>
                        updatePreferences({
                          dailyDoubleTimeMinutes: event.target.value
                            ? Math.round(Number(event.target.value) * 60)
                            : undefined,
                        })
                      }
                    />
                  </Field>
                  <Field label="Double-time multiplier">
                    <Input
                      type="number"
                      min="1"
                      step="0.1"
                      value={state.preferences.doubleTimeMultiplier}
                      onChange={(event) =>
                        updatePreferences({ doubleTimeMultiplier: Number(event.target.value) || 2 })
                      }
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}
          {section === 'appearance' && (
            <div className="settings-section">
              <div>
                <h2>Appearance & accessibility</h2>
                <p>Choose the combination that is most comfortable to read.</p>
              </div>
              <div className="theme-options">
                <button
                  className={state.preferences.theme === 'system' ? 'active' : ''}
                  onClick={() => updatePreferences({ theme: 'system' })}
                >
                  <span>
                    <Sun size={20} />
                    <Moon size={20} />
                  </span>
                  <strong>System</strong>
                  <small>Follow this device</small>
                </button>
                <button
                  className={state.preferences.theme === 'light' ? 'active' : ''}
                  onClick={() => updatePreferences({ theme: 'light' })}
                >
                  <Sun size={23} />
                  <strong>Light</strong>
                  <small>Light all the time</small>
                </button>
                <button
                  className={state.preferences.theme === 'dark' ? 'active' : ''}
                  onClick={() => updatePreferences({ theme: 'dark' })}
                >
                  <Moon size={23} />
                  <strong>Dark</strong>
                  <small>Dark all the time</small>
                </button>
              </div>
              <div className="settings-group">
                <Field label="Text size">
                  <Select
                    value={state.preferences.textScale}
                    onChange={(event) =>
                      updatePreferences({
                        textScale: event.target.value as 'small' | 'normal' | 'large',
                      })
                    }
                  >
                    <option value="small">Compact</option>
                    <option value="normal">Comfortable</option>
                    <option value="large">Large</option>
                  </Select>
                </Field>
                <Toggle
                  checked={state.preferences.contrast === 'high'}
                  onChange={(checked) =>
                    updatePreferences({ contrast: checked ? 'high' : 'normal' })
                  }
                  label="High contrast"
                  description="Strengthens borders and text contrast."
                />
                <Toggle
                  checked={state.preferences.reducedMotion}
                  onChange={(checked) => updatePreferences({ reducedMotion: checked })}
                  label="Reduce motion"
                  description="Limits decorative transitions and animation."
                />
              </div>
            </div>
          )}
          {section === 'reminders' && (
            <div className="settings-section">
              <div>
                <h2>Local reminders</h2>
                <p>
                  Permission is requested only if you turn reminders on. No cloud server is
                  involved.
                </p>
              </div>
              <div className="settings-group">
                <Toggle
                  checked={state.preferences.notificationsEnabled}
                  onChange={enableNotifications}
                  label="Allow local notifications"
                  description="For active shifts, breaks, trips, and backup reminders where the operating system permits."
                />
                <Field label="Backup reminder after days">
                  <Input
                    type="number"
                    min="1"
                    max="90"
                    value={state.preferences.backupReminderDays}
                    onChange={(event) =>
                      updatePreferences({
                        backupReminderDays: Math.max(1, Number(event.target.value) || 7),
                      })
                    }
                  />
                </Field>
                <div className="info-note">
                  Browsers and Windows may pause notifications when the application is closed.
                  Reminders are helpful extras; they are not required for accurate timers.
                </div>
              </div>
            </div>
          )}
          {section === 'backup' && (
            <div className="settings-section">
              <div>
                <h2>Backup & restore</h2>
                <p>Browser data is not cloud-synced. Keep a downloaded backup somewhere safe.</p>
              </div>
              <div className="backup-hero">
                <Database size={28} />
                <div>
                  <strong>
                    {state.shifts.length + state.trips.length + state.expenses.length} tracked
                    records
                  </strong>
                  <span>
                    {state.preferences.lastBackupAt
                      ? `Last exported ${formatDate(state.preferences.lastBackupAt, state.preferences)}`
                      : 'No exported backup recorded yet'}
                  </span>
                </div>
                <Button variant="primary" onClick={backupNow}>
                  <Download size={18} /> Back Up Now
                </Button>
              </div>
              <div className="settings-group">
                <h3>Restore complete backup</h3>
                <p>
                  A restore preview appears before anything changes. A local safety snapshot is
                  created first.
                </p>
                <input
                  ref={fileRef}
                  className="sr-only"
                  type="file"
                  accept="application/json,.json"
                  onChange={loadBackup}
                />
                <Button onClick={() => fileRef.current?.click()}>
                  <Upload size={18} /> Choose backup file
                </Button>
              </div>
              <div className="settings-group">
                <h3>Import CSV</h3>
                <p>
                  Import completed shifts or mileage from another tool. Formula-like cells are
                  treated as text.
                </p>
                <div className="inline-fields">
                  <Select
                    value={csvKind}
                    onChange={(event) => setCsvKind(event.target.value as ImportKind)}
                  >
                    <option value="shifts">Shift data</option>
                    <option value="trips">Mileage data</option>
                  </Select>
                  <input
                    ref={csvRef}
                    className="sr-only"
                    type="file"
                    accept="text/csv,.csv"
                    onChange={loadCsv}
                  />
                  <Button onClick={() => csvRef.current?.click()}>
                    <FileUp size={18} /> Choose CSV
                  </Button>
                </div>
              </div>
              <div className="settings-group">
                <h3>Automatic local snapshots</h3>
                <p>
                  Up to 10 recent snapshots are retained inside this device’s local database. They
                  are not a replacement for downloaded backups.
                </p>
                {snapshots.length ? (
                  <div className="snapshot-list">
                    {snapshots.map((item) => (
                      <div key={item.id}>
                        <span>
                          <strong>
                            {formatDate(item.createdAt, state.preferences, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </strong>
                          <small>{item.reason.replace('-', ' ')}</small>
                        </span>
                        <Button
                          variant="ghost"
                          onClick={async () => {
                            if (
                              window.confirm(
                                'Restore this snapshot? A current backup is recommended first.',
                              )
                            ) {
                              await restoreSnapshot(item.id);
                              setMessage('Local snapshot restored.');
                            }
                          }}
                        >
                          <RotateCcw size={16} /> Restore
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">
                    Snapshots appear after you have records or create a backup.
                  </p>
                )}
              </div>
            </div>
          )}
          {section === 'privacy' && (
            <div className="settings-section">
              <div>
                <h2>Privacy & data</h2>
                <p>Aobe WorkTrack is local-first by design.</p>
              </div>
              <div className="privacy-grid">
                <div>
                  <ShieldCheck size={22} />
                  <strong>No account</strong>
                  <span>No sign-in, API key, analytics, ads, or telemetry.</span>
                </div>
                <div>
                  <HardDrive size={22} />
                  <strong>Stored locally</strong>
                  <span>
                    {storageKind === 'sqlite'
                      ? 'Desktop records use a private SQLite database in the Windows app-data folder.'
                      : 'Browser records use IndexedDB for this site and browser profile.'}
                  </span>
                </div>
                <div>
                  <Moon size={22} />
                  <strong>No silent location</strong>
                  <span>GPS is not collected. Trips use manual distance or odometers.</span>
                </div>
                <div>
                  <Download size={22} />
                  <strong>You control copies</strong>
                  <span>Backups and exports happen only when you request them.</span>
                </div>
              </div>
              <div className="info-note">
                Clearing browser site data can erase the web version’s records. Export a complete
                backup first. Desktop and web data do not automatically sync.
              </div>
              <div className="settings-group">
                <h3>Demonstration data</h3>
                <p>
                  Try the application with clearly labeled fake records. Demo data stays separate
                  and can be removed together.
                </p>
                {state.preferences.demoMode ? (
                  <Button
                    onClick={() => {
                      if (window.confirm('Remove all records labeled Demo?'))
                        replaceState(withoutDemoData(state));
                    }}
                  >
                    Remove Demo Data
                  </Button>
                ) : (
                  <Button onClick={() => replaceState(withDemoData(state))}>Load Demo Data</Button>
                )}
              </div>
              <div className="danger-zone">
                <div>
                  <h3>Delete all local data</h3>
                  <p>
                    Permanently removes records, settings, and local snapshots from this app on this
                    device.
                  </p>
                </div>
                <Button variant="danger" onClick={() => setDeleteDialog(true)}>
                  <Trash2 size={18} /> Delete All Data
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
      <Dialog
        open={Boolean(backupPreview)}
        title="Review restore"
        description="Nothing changes until you confirm."
        onClose={() => setBackupPreview(undefined)}
      >
        {backupPreview && (
          <div className="stack">
            <div className="backup-preview">
              <p>
                Created{' '}
                <strong>
                  {formatDate(backupPreview.createdAt, state.preferences, {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  })}
                </strong>
              </p>
              {Object.entries(backupCounts(backupPreview.data)).map(([label, count]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
            <div className="alert alert--warning">
              Restoring replaces the current records and settings. A safety snapshot will be created
              first.
            </div>
            <div className="dialog__actions">
              <Button onClick={() => setBackupPreview(undefined)}>Cancel</Button>
              <Button variant="primary" onClick={restoreBackup}>
                Restore backup
              </Button>
            </div>
          </div>
        )}
      </Dialog>
      <Dialog
        open={Boolean(csvPreview)}
        title="Review CSV import"
        description="Valid rows are imported; likely duplicates are skipped."
        onClose={() => setCsvPreview(undefined)}
      >
        {csvPreview && (
          <div className="stack">
            <div className="import-summary">
              <div>
                <span>Detected columns</span>
                <strong>{csvPreview.columns.length}</strong>
              </div>
              <div>
                <span>Valid new rows</span>
                <strong>{csvPreview.rows.length}</strong>
              </div>
              <div>
                <span>Likely duplicates</span>
                <strong>{csvPreview.duplicates}</strong>
              </div>
              <div>
                <span>Warnings</span>
                <strong>{csvPreview.warnings.length}</strong>
              </div>
            </div>
            {csvPreview.warnings.length > 0 && (
              <div className="warning-list" role="alert">
                {csvPreview.warnings.slice(0, 8).map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            )}
            <div className="dialog__actions">
              <Button onClick={() => setCsvPreview(undefined)}>Cancel</Button>
              <Button variant="primary" disabled={!csvPreview.rows.length} onClick={importCsv}>
                Import {csvPreview.rows.length} rows
              </Button>
            </div>
          </div>
        )}
      </Dialog>
      <Dialog
        open={deleteDialog}
        title="Delete all local data?"
        description="This cannot be undone."
        onClose={() => setDeleteDialog(false)}
      >
        <div className="stack">
          <div className="alert alert--warning">
            Export a complete backup first if you may need these records later.
          </div>
          <Field label="Type “DELETE ALL DATA” to confirm">
            <Input
              autoFocus
              value={deleteText}
              onChange={(event) => setDeleteText(event.target.value)}
            />
          </Field>
          <div className="dialog__actions">
            <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={deleteText !== 'DELETE ALL DATA'}
              onClick={doDeleteAll}
            >
              Permanently delete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
