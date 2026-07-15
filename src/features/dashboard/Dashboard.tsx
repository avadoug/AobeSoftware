import { addDays, endOfDay, endOfWeek, format, startOfDay, startOfWeek } from 'date-fns';
import {
  BriefcaseBusiness,
  CalendarClock,
  CarFront,
  Coffee,
  DollarSign,
  Gauge,
  Play,
  Square,
  WalletCards,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAppStore } from '../../app/AppStore';
import { Button, Dialog, Field, Input, Pill, Select, StatCard } from '../../components/ui';
import {
  calculatePeriodTotals,
  elapsedMinutes,
  payableMinutes,
  tripDistance,
} from '../../domain/calculations';
import type { WorkBreak, WorkShift } from '../../domain/types';
import {
  formatClockDuration,
  formatDate,
  formatDuration,
  formatMoney,
  formatTime,
} from '../../utils/format';
import { createId } from '../../utils/id';
import { ShiftForm } from '../shifts/ShiftForm';
import { TripForm } from '../mileage/TripForm';

type EntryDialog = 'start-shift' | 'manual-shift' | 'start-trip' | 'end-trip' | null;

function useNow(active: boolean): Date {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

function BreakForm({ onDone }: { onDone: (label: string, paid: boolean) => void }) {
  const [label, setLabel] = useState('Break');
  const [paid, setPaid] = useState('unpaid');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onDone(label.trim() || 'Break', paid === 'paid');
  };
  return (
    <form onSubmit={submit} className="stack">
      <Field label="Break label">
        <Input autoFocus value={label} onChange={(event) => setLabel(event.target.value)} />
      </Field>
      <Field label="Pay treatment">
        <Select value={paid} onChange={(event) => setPaid(event.target.value)}>
          <option value="unpaid">Unpaid break</option>
          <option value="paid">Paid break</option>
        </Select>
      </Field>
      <div className="dialog__actions">
        <Button type="submit" variant="primary">
          Start break
        </Button>
      </div>
    </form>
  );
}

export function Dashboard({ onOpenReports }: { onOpenReports: () => void }) {
  const { state, put } = useAppStore();
  const [dialog, setDialog] = useState<EntryDialog>(null);
  const [breakDialog, setBreakDialog] = useState(false);
  const activeShift = state.shifts.find((item) => !item.deletedAt && item.startAt && !item.endAt);
  const activeBreak = activeShift?.breaks.find((item) => item.startAt && !item.endAt);
  const activeTrip = state.trips.find((item) => !item.deletedAt && item.startedAt && !item.endedAt);
  const now = useNow(Boolean(activeShift || activeTrip));
  const today = useMemo(
    () => calculatePeriodTotals(state, startOfDay(now), endOfDay(now), now),
    [state, now],
  );
  const weekRange = useMemo(
    () => ({
      from: startOfWeek(now, { weekStartsOn: state.preferences.weekStartsOn }),
      to: endOfWeek(now, { weekStartsOn: state.preferences.weekStartsOn }),
    }),
    [now, state.preferences.weekStartsOn],
  );
  const week = useMemo(
    () => calculatePeriodTotals(state, weekRange.from, weekRange.to, now),
    [state, weekRange, now],
  );
  const recent = useMemo(
    () =>
      [
        ...state.shifts
          .filter((item) => !item.deletedAt)
          .map((item) => ({ type: 'shift' as const, at: item.startAt ?? item.createdAt, item })),
        ...state.trips
          .filter((item) => !item.deletedAt)
          .map((item) => ({ type: 'trip' as const, at: item.startedAt ?? item.createdAt, item })),
      ]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 5),
    [state.shifts, state.trips],
  );
  const daily = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const day = addDays(weekRange.from, index);
        return {
          day,
          total: calculatePeriodTotals(state, startOfDay(day), endOfDay(day), now).workMinutes,
        };
      }),
    [state, weekRange.from, now],
  );
  const maxDaily = Math.max(...daily.map((item) => item.total), 1);

  const startBreak = (label: string, paid: boolean) => {
    if (!activeShift) return;
    const stamp = new Date().toISOString();
    const item: WorkBreak = {
      id: createId(),
      shiftId: activeShift.id,
      startAt: stamp,
      durationMinutes: 0,
      paid,
      label,
    };
    put('shifts', { ...activeShift, breaks: [...activeShift.breaks, item] }, 'break-started');
    setBreakDialog(false);
  };
  const endBreak = () => {
    if (!activeShift || !activeBreak) return;
    const stamp = new Date().toISOString();
    put(
      'shifts',
      {
        ...activeShift,
        breaks: activeShift.breaks.map((item) =>
          item.id === activeBreak.id
            ? { ...item, endAt: stamp, durationMinutes: elapsedMinutes(item.startAt, stamp) }
            : item,
        ),
      },
      'break-ended',
    );
  };
  const endShift = () => {
    if (!activeShift) return;
    if (
      (activeBreak || activeTrip) &&
      !window.confirm(
        `${activeBreak ? 'A break' : 'A trip'} is still active. End the shift anyway?${activeBreak ? ' The active break will also end.' : ''}`,
      )
    )
      return;
    const stamp = new Date().toISOString();
    const breaks = activeBreak
      ? activeShift.breaks.map((item) =>
          item.id === activeBreak.id
            ? { ...item, endAt: stamp, durationMinutes: elapsedMinutes(item.startAt, stamp) }
            : item,
        )
      : activeShift.breaks;
    const completed: WorkShift = {
      ...activeShift,
      endAt: stamp,
      durationMinutes: elapsedMinutes(activeShift.startAt, stamp),
      breaks,
    };
    put('shifts', completed, 'ended');
  };

  return (
    <div className="page dashboard-page">
      <header className="page-heading dashboard-heading">
        <div>
          <p className="eyebrow">{format(now, 'EEEE')}</p>
          <h1>{format(now, 'MMMM d, yyyy')}</h1>
          <p>
            {activeShift
              ? activeBreak
                ? 'You’re on a break.'
                : 'Work is in progress.'
              : 'Ready when you are.'}
          </p>
        </div>
        <Button onClick={onOpenReports}>
          <CalendarClock size={18} /> Generate report
        </Button>
      </header>
      {(activeShift || activeTrip) && (
        <section className="live-panel" aria-live="polite">
          {activeShift && (
            <div className="live-panel__section">
              <div className="live-panel__status">
                <span className={`status-dot ${activeBreak ? 'status-dot--pause' : ''}`} />
                <div>
                  <span>{activeBreak ? (activeBreak.label ?? 'Break') : 'Working now'}</span>
                  <small>
                    {state.jobs.find((item) => item.id === activeShift.jobId)?.name ??
                      'No job selected'}{' '}
                    · started {formatTime(activeShift.startAt, state.preferences)}
                  </small>
                </div>
              </div>
              <strong className="live-timer">
                {formatClockDuration(
                  now.getTime() - new Date(activeBreak?.startAt ?? activeShift.startAt!).getTime(),
                )}
              </strong>
              <div className="live-panel__actions">
                {activeBreak ? (
                  <Button variant="primary" onClick={endBreak}>
                    <Play size={18} /> End break
                  </Button>
                ) : (
                  <>
                    <Button onClick={() => setBreakDialog(true)}>
                      <Coffee size={18} /> Start break
                    </Button>
                    <Button variant="primary" onClick={endShift}>
                      <Square size={17} /> End work
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
          {activeTrip && (
            <div className="live-panel__section">
              <div className="live-panel__status">
                <span className="status-dot status-dot--trip" />
                <div>
                  <span>Trip in progress</span>
                  <small>
                    {activeTrip.purpose || 'Purpose not entered'} · started{' '}
                    {formatTime(activeTrip.startedAt, state.preferences)}
                  </small>
                </div>
              </div>
              <strong className="live-timer">
                {formatClockDuration(now.getTime() - new Date(activeTrip.startedAt!).getTime())}
              </strong>
              <Button variant="primary" onClick={() => setDialog('end-trip')}>
                <Square size={17} /> End trip
              </Button>
            </div>
          )}
        </section>
      )}
      {!activeShift && !activeTrip && (
        <section className="start-panel">
          <div>
            <span className="start-panel__icon">
              <BriefcaseBusiness size={24} />
            </span>
            <div>
              <h2>What are you starting?</h2>
              <p>Start a live timer now, or add something you already completed.</p>
            </div>
          </div>
          <div className="start-panel__actions">
            <Button variant="primary" onClick={() => setDialog('start-shift')}>
              <Play size={18} fill="currentColor" /> Start work
            </Button>
            <Button onClick={() => setDialog('start-trip')}>
              <CarFront size={18} /> Start trip
            </Button>
            <Button variant="ghost" onClick={() => setDialog('manual-shift')}>
              Add manual entry
            </Button>
          </div>
        </section>
      )}
      {!activeShift && activeTrip && (
        <div className="secondary-action">
          <Button variant="primary" onClick={() => setDialog('start-shift')}>
            <Play size={18} /> Start work
          </Button>
        </div>
      )}
      {activeShift && !activeTrip && (
        <div className="secondary-action">
          <Button onClick={() => setDialog('start-trip')}>
            <CarFront size={18} /> Start trip
          </Button>
        </div>
      )}
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">At a glance</p>
            <h2>Today</h2>
          </div>
          {today.unfinished > 0 && <Pill tone="warning">{today.unfinished} unfinished</Pill>}
        </div>
        <div className="stats-grid">
          <StatCard
            label="Hours worked"
            value={formatDuration(today.workMinutes)}
            detail={`${formatDuration(today.unpaidBreakMinutes)} unpaid break`}
            icon={<BriefcaseBusiness size={19} />}
          />
          <StatCard
            label="Work mileage"
            value={`${today.mileage.toFixed(1)} ${state.preferences.distanceUnit}`}
            detail={`${state.trips.filter((item) => !item.deletedAt && item.category === 'business' && item.startedAt && new Date(item.startedAt).toDateString() === now.toDateString()).length} business trips`}
            icon={<Gauge size={19} />}
          />
          <StatCard
            label="Est. earnings"
            value={formatMoney(today.earningsMinor, state.preferences)}
            detail="Before taxes"
            icon={<DollarSign size={19} />}
          />
          <StatCard
            label="Est. reimbursement"
            value={formatMoney(today.reimbursementMinor + today.expenseMinor, state.preferences)}
            detail="Mileage and expenses"
            icon={<WalletCards size={19} />}
          />
        </div>
      </section>
      <div className="dashboard-lower">
        <section className="card weekly-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Current week</p>
              <h2>{formatDuration(week.workMinutes)} worked</h2>
            </div>
            <span>
              {formatDuration(week.overtimeMinutes + week.doubleTimeMinutes)} overtime ·{' '}
              {week.mileage.toFixed(1)} {state.preferences.distanceUnit}
            </span>
          </div>
          <div
            className="weekly-bars"
            role="img"
            aria-label={`Weekly hours: ${daily.map((item) => `${format(item.day, 'EEEE')} ${formatDuration(item.total)}`).join(', ')}`}
          >
            {daily.map((item) => (
              <div className="weekly-bar" key={item.day.toISOString()}>
                <div className="weekly-bar__track">
                  <span style={{ height: `${Math.max(4, (item.total / maxDaily) * 100)}%` }} />
                </div>
                <small>{format(item.day, 'EEEEE')}</small>
              </div>
            ))}
          </div>
          <p className="text-equivalent">
            Best day:{' '}
            {format(
              daily.reduce((best, item) => (item.total > best.total ? item : best), daily[0]!).day,
              'EEEE',
            )}{' '}
            · {formatDuration(Math.max(...daily.map((item) => item.total)))}
          </p>
        </section>
        <section className="card activity-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Latest</p>
              <h2>Recent activity</h2>
            </div>
          </div>
          {recent.length ? (
            <ul className="activity-list">
              {recent.map(({ type, item }) =>
                type === 'shift' ? (
                  <li key={item.id}>
                    <span className="activity-icon">
                      <BriefcaseBusiness size={17} />
                    </span>
                    <div>
                      <strong>
                        {state.jobs.find((job) => job.id === item.jobId)?.name ?? 'Work shift'}
                      </strong>
                      <small>
                        {formatDate(item.startAt ?? item.createdAt, state.preferences)} ·{' '}
                        {formatDuration(payableMinutes(item))}
                      </small>
                    </div>
                    <span>{formatTime(item.startAt, state.preferences)}</span>
                  </li>
                ) : (
                  <li key={item.id}>
                    <span className="activity-icon activity-icon--trip">
                      <CarFront size={17} />
                    </span>
                    <div>
                      <strong>{item.purpose || 'Trip'}</strong>
                      <small>
                        {formatDate(item.startedAt ?? item.createdAt, state.preferences)} ·{' '}
                        {tripDistance(item).toFixed(1)} {item.distanceUnit}
                      </small>
                    </div>
                    <span>{item.category}</span>
                  </li>
                ),
              )}
            </ul>
          ) : (
            <div className="empty-inline">Your completed shifts and trips will appear here.</div>
          )}
        </section>
      </div>
      <Dialog
        open={dialog === 'start-shift'}
        title="Start work"
        description="Optional details can be changed later."
        onClose={() => setDialog(null)}
      >
        <ShiftForm mode="start" onDone={() => setDialog(null)} />
      </Dialog>
      <Dialog
        open={dialog === 'manual-shift'}
        title="Add completed shift"
        onClose={() => setDialog(null)}
        wide
      >
        <ShiftForm mode="manual" onDone={() => setDialog(null)} />
      </Dialog>
      <Dialog
        open={dialog === 'start-trip'}
        title="Start trip"
        description="GPS is not required. Record an odometer now or add distance when you finish."
        onClose={() => setDialog(null)}
        wide
      >
        <TripForm mode="start" onDone={() => setDialog(null)} />
      </Dialog>
      <Dialog
        open={dialog === 'end-trip'}
        title="End trip"
        description="Add an ending odometer or total distance."
        onClose={() => setDialog(null)}
        wide
      >
        {activeTrip && <TripForm mode="end" initial={activeTrip} onDone={() => setDialog(null)} />}
      </Dialog>
      <Dialog open={breakDialog} title="Start break" onClose={() => setBreakDialog(false)}>
        <BreakForm onDone={startBreak} />
      </Dialog>
    </div>
  );
}
