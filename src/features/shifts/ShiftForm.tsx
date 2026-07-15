import { useMemo, useState, type FormEvent } from 'react';
import { useAppStore } from '../../app/AppStore';
import { Button, Field, Input, Select, Textarea } from '../../components/ui';
import { findShiftWarnings } from '../../domain/calculations';
import type { WorkBreak, WorkShift } from '../../domain/types';
import { fromLocalInput, minorToInput, moneyToMinor, toLocalInput } from '../../utils/format';
import { createId } from '../../utils/id';

export function ShiftForm({
  mode,
  initial,
  onDone,
}: {
  mode: 'start' | 'manual' | 'edit';
  initial?: WorkShift;
  onDone: () => void;
}) {
  const { state, put } = useAppStore();
  const now = new Date();
  const recentJob = state.jobs.find((item) => !item.archived && !item.deletedAt);
  const [startAt, setStartAt] = useState(
    toLocalInput(initial?.startAt) || (mode === 'start' ? toLocalInput(now.toISOString()) : ''),
  );
  const [endAt, setEndAt] = useState(toLocalInput(initial?.endAt));
  const [durationHours, setDurationHours] = useState(
    initial && !initial.startAt ? (initial.durationMinutes / 60).toString() : '',
  );
  const [breakMinutes, setBreakMinutes] = useState(
    initial
      ? String(
          initial.breaks
            .filter((item) => !item.paid)
            .reduce((sum, item) => sum + item.durationMinutes, 0),
        )
      : '0',
  );
  const [jobId, setJobId] = useState(initial?.jobId ?? recentJob?.id ?? '');
  const selectedJob = state.jobs.find((item) => item.id === jobId);
  const [rate, setRate] = useState(
    minorToInput(
      initial?.hourlyRateMinor ??
        selectedJob?.defaultHourlyRateMinor ??
        state.preferences.defaultHourlyRateMinor,
    ),
  );
  const [flatAmount, setFlatAmount] = useState(
    initial?.flatAmountMinor !== undefined ? minorToInput(initial.flatAmountMinor) : '',
  );
  const [bonus, setBonus] = useState(
    initial?.bonusesMinor !== undefined ? minorToInput(initial.bonusesMinor) : '',
  );
  const [tips, setTips] = useState(
    initial?.tipsMinor !== undefined ? minorToInput(initial.tipsMinor) : '',
  );
  const [adjustment, setAdjustment] = useState(
    initial?.adjustmentMinor !== undefined ? minorToInput(initial.adjustmentMinor) : '',
  );
  const [location, setLocation] = useState(initial?.location ?? selectedJob?.commonLocation ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? selectedJob?.tags.join(', ') ?? '');
  const [warning, setWarning] = useState<string>();
  const isDurationOnly = mode !== 'start' && !startAt;
  const title = useMemo(
    () =>
      mode === 'start' ? 'Start work' : mode === 'edit' ? 'Edit shift' : 'Add completed shift',
    [mode],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const stamp = new Date().toISOString();
    const shiftId = initial?.id ?? createId();
    const manualBreak =
      Number(breakMinutes) > 0
        ? [
            {
              id: initial?.breaks.find((item) => !item.startAt)?.id ?? createId(),
              shiftId,
              durationMinutes: Math.max(0, Number(breakMinutes)),
              paid: false,
              label: 'Break',
            } satisfies WorkBreak,
          ]
        : [];
    const retainedTimedBreaks = initial?.breaks.filter((item) => item.startAt) ?? [];
    const shift: WorkShift = {
      id: shiftId,
      jobId: jobId || undefined,
      startAt: fromLocalInput(startAt),
      endAt: mode === 'start' ? undefined : fromLocalInput(endAt),
      durationMinutes: isDurationOnly
        ? Math.max(0, Math.round(Number(durationHours) * 60))
        : (initial?.durationMinutes ?? 0),
      breaks: [...retainedTimedBreaks, ...manualBreak],
      hourlyRateMinor: moneyToMinor(rate),
      flatAmountMinor: flatAmount ? moneyToMinor(flatAmount) : undefined,
      bonusesMinor: bonus ? moneyToMinor(bonus) : undefined,
      tipsMinor: tips ? moneyToMinor(tips) : undefined,
      adjustmentMinor: adjustment ? moneyToMinor(adjustment) : undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      tags: tags
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      source: mode === 'start' ? 'timer' : (initial?.source ?? 'manual'),
      createdAt: initial?.createdAt ?? stamp,
      updatedAt: stamp,
      deletedAt: initial?.deletedAt,
      demo: initial?.demo,
    };
    const warnings = findShiftWarnings(shift, state.shifts);
    if (!shift.startAt && !shift.durationMinutes) {
      setWarning('Enter a start time or a duration.');
      return;
    }
    if (mode !== 'start' && shift.startAt && !shift.endAt) {
      setWarning('Add an end time, or clear both times and enter a duration.');
      return;
    }
    if (warnings.length && warning !== warnings.join(' ')) {
      setWarning(`${warnings.join(' ')} Submit again to continue anyway.`);
      return;
    }
    put('shifts', shift, mode === 'start' ? 'started' : mode === 'edit' ? 'edited' : 'added');
    onDone();
  };

  return (
    <form onSubmit={submit} className="stack">
      {warning && (
        <div className="alert alert--warning" role="alert">
          {warning}
        </div>
      )}
      {mode !== 'start' && (
        <p className="form-help">
          Use start and end times, or leave both blank and enter total hours.
        </p>
      )}
      <div className="form-grid">
        <Field label="Start date and time">
          <Input
            type="datetime-local"
            value={startAt}
            onChange={(event) => {
              setStartAt(event.target.value);
              setWarning(undefined);
            }}
            required={mode === 'start'}
          />
        </Field>
        {mode !== 'start' && (
          <Field label="End date and time">
            <Input
              type="datetime-local"
              value={endAt}
              onChange={(event) => {
                setEndAt(event.target.value);
                setWarning(undefined);
              }}
              disabled={!startAt}
            />
          </Field>
        )}
      </div>
      {mode !== 'start' && (
        <details className="advanced-fields">
          <summary>Additional pay (optional)</summary>
          <p>
            Use a flat amount instead of hourly pay, or add bonuses, tips, and manual adjustments.
          </p>
          <div className="form-grid form-grid--three">
            <Field label="Flat shift amount">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={flatAmount}
                onChange={(event) => setFlatAmount(event.target.value)}
              />
            </Field>
            <Field label="Bonus">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={bonus}
                onChange={(event) => setBonus(event.target.value)}
              />
            </Field>
            <Field label="Tips">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={tips}
                onChange={(event) => setTips(event.target.value)}
              />
            </Field>
            <Field label="Adjustment">
              <Input
                type="number"
                step="0.01"
                value={adjustment}
                onChange={(event) => setAdjustment(event.target.value)}
              />
            </Field>
          </div>
        </details>
      )}
      {mode !== 'start' && !startAt && (
        <Field label="Total hours">
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={durationHours}
            onChange={(event) => setDurationHours(event.target.value)}
          />
        </Field>
      )}
      <div className="form-grid">
        <Field label="Job or client">
          <Select value={jobId} onChange={(event) => setJobId(event.target.value)}>
            <option value="">No profile</option>
            {state.jobs
              .filter((item) => !item.deletedAt && !item.archived)
              .map((job) => (
                <option key={job.id} value={job.id}>
                  {job.name}
                  {job.project ? ` — ${job.project}` : ''}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Hourly rate">
          <Input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
          />
        </Field>
      </div>
      {mode !== 'start' && (
        <Field label="Unpaid break minutes">
          <Input
            type="number"
            min="0"
            step="1"
            value={breakMinutes}
            onChange={(event) => setBreakMinutes(event.target.value)}
          />
        </Field>
      )}
      <Field label="Work location" hint="Optional">
        <Input value={location} onChange={(event) => setLocation(event.target.value)} />
      </Field>
      <Field label="Tags" hint="Separate with commas">
        <Input value={tags} onChange={(event) => setTags(event.target.value)} />
      </Field>
      <Field label="Note" hint="Optional">
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <div className="dialog__actions">
        <Button type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {title}
        </Button>
      </div>
    </form>
  );
}
