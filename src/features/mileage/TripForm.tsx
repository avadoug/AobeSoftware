import { useState, type FormEvent } from 'react';
import { useAppStore } from '../../app/AppStore';
import { Button, Field, Input, Select, Textarea } from '../../components/ui';
import { tripDistance, validateOdometer } from '../../domain/calculations';
import type { MileageTrip, TripCategory } from '../../domain/types';
import { fromLocalInput, minorToInput, moneyToMinor, toLocalInput } from '../../utils/format';
import { createId } from '../../utils/id';

export function TripForm({
  mode,
  initial,
  onDone,
}: {
  mode: 'start' | 'end' | 'manual' | 'edit';
  initial?: MileageTrip;
  onDone: () => void;
}) {
  const { state, put } = useAppStore();
  const recentVehicle = state.vehicles.find((item) => !item.archived && !item.deletedAt);
  const [startedAt, setStartedAt] = useState(
    toLocalInput(initial?.startedAt) || toLocalInput(new Date().toISOString()),
  );
  const [endedAt, setEndedAt] = useState(
    toLocalInput(initial?.endedAt) ||
      (mode === 'manual' ? toLocalInput(new Date().toISOString()) : ''),
  );
  const [vehicleId, setVehicleId] = useState(initial?.vehicleId ?? recentVehicle?.id ?? '');
  const vehicle = state.vehicles.find((item) => item.id === vehicleId);
  const [jobId, setJobId] = useState(initial?.jobId ?? '');
  const job = state.jobs.find((item) => item.id === jobId);
  const [purpose, setPurpose] = useState(initial?.purpose ?? '');
  const [category, setCategory] = useState<TripCategory>(initial?.category ?? 'business');
  const [startOdometer, setStartOdometer] = useState(
    initial?.startOdometer?.toString() ?? vehicle?.currentOdometer?.toString() ?? '',
  );
  const [endOdometer, setEndOdometer] = useState(initial?.endOdometer?.toString() ?? '');
  const [distance, setDistance] = useState(initial?.distance?.toString() ?? '');
  const [startLocation, setStartLocation] = useState(initial?.startLocation ?? '');
  const [destination, setDestination] = useState(initial?.destination ?? '');
  const [rate, setRate] = useState(
    minorToInput(
      initial?.reimbursementRateMinor ??
        job?.defaultMileageRateMinor ??
        vehicle?.defaultRateMinor ??
        state.preferences.defaultMileageRateMinor,
    ),
  );
  const [tolls, setTolls] = useState(minorToInput(initial?.tollsMinor));
  const [parking, setParking] = useState(minorToInput(initial?.parkingMinor));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [warning, setWarning] = useState<string>();
  const ending = mode === 'end' || mode === 'manual' || mode === 'edit';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const stamp = new Date().toISOString();
    const startReading = startOdometer === '' ? undefined : Number(startOdometer);
    const endReading = endOdometer === '' ? undefined : Number(endOdometer);
    const directDistance = distance === '' ? 0 : Number(distance);
    const trip: MileageTrip = {
      id: initial?.id ?? createId(),
      vehicleId: vehicleId || undefined,
      jobId: jobId || undefined,
      startedAt: fromLocalInput(startedAt),
      endedAt: ending ? (fromLocalInput(endedAt) ?? stamp) : undefined,
      startOdometer: startReading,
      endOdometer: endReading,
      distance:
        startReading !== undefined && endReading !== undefined
          ? Math.max(0, endReading - startReading)
          : Math.max(0, directDistance),
      distanceUnit: vehicle?.distanceUnit ?? state.preferences.distanceUnit,
      startLocation: startLocation.trim() || undefined,
      destination: destination.trim() || undefined,
      purpose: purpose.trim() || undefined,
      category,
      reimbursementRateMinor: moneyToMinor(rate),
      tollsMinor: moneyToMinor(tolls),
      parkingMinor: moneyToMinor(parking),
      notes: notes.trim() || undefined,
      tags: initial?.tags ?? [],
      source: mode === 'start' || mode === 'end' ? 'timer' : (initial?.source ?? 'manual'),
      createdAt: initial?.createdAt ?? stamp,
      updatedAt: stamp,
      deletedAt: initial?.deletedAt,
      demo: initial?.demo,
    };
    const warnings = validateOdometer(startReading, endReading, vehicle?.currentOdometer);
    if (ending && !trip.distance && !(startReading !== undefined && endReading !== undefined)) {
      setWarning('Enter an ending odometer or a total distance.');
      return;
    }
    if (!purpose.trim() && !warning) {
      setWarning('A trip purpose is recommended. Submit again to continue without one.');
      return;
    }
    if (warnings.length && warning !== warnings.join(' ')) {
      setWarning(`${warnings.join(' ')} Submit again to continue anyway.`);
      return;
    }
    put(
      'trips',
      trip,
      mode === 'start'
        ? 'started'
        : mode === 'end'
          ? 'ended'
          : mode === 'edit'
            ? 'edited'
            : 'added',
    );
    if (vehicle && endReading !== undefined && endReading >= (vehicle.currentOdometer ?? 0))
      put('vehicles', { ...vehicle, currentOdometer: endReading }, 'odometer-updated');
    onDone();
  };

  return (
    <form onSubmit={submit} className="stack">
      {warning && (
        <div className="alert alert--warning" role="alert">
          {warning}
        </div>
      )}
      <div className="form-grid">
        <Field label="Purpose" hint="Recommended">
          <Input
            autoFocus
            value={purpose}
            onChange={(event) => {
              setPurpose(event.target.value);
              setWarning(undefined);
            }}
            placeholder="Client meeting, supply pickup…"
          />
        </Field>
        <Field label="Category">
          <Select
            value={category}
            onChange={(event) => setCategory(event.target.value as TripCategory)}
          >
            <option value="business">Business</option>
            <option value="commuting">Commuting</option>
            <option value="personal">Personal</option>
            <option value="medical">Medical</option>
            <option value="charitable">Charitable</option>
            <option value="other">Other</option>
          </Select>
        </Field>
      </div>
      <div className="form-grid">
        <Field label="Vehicle">
          <Select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
            <option value="">No vehicle profile</option>
            {state.vehicles
              .filter((item) => !item.deletedAt && !item.archived)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nickname}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Job or project">
          <Select value={jobId} onChange={(event) => setJobId(event.target.value)}>
            <option value="">No profile</option>
            {state.jobs
              .filter((item) => !item.deletedAt && !item.archived)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </Select>
        </Field>
      </div>
      <div className="form-grid">
        <Field label="Start date and time">
          <Input
            type="datetime-local"
            value={startedAt}
            onChange={(event) => setStartedAt(event.target.value)}
            required
          />
        </Field>
        {ending && (
          <Field label="End date and time">
            <Input
              type="datetime-local"
              value={endedAt}
              onChange={(event) => setEndedAt(event.target.value)}
            />
          </Field>
        )}
      </div>
      <div className="form-grid">
        <Field label="Starting odometer" hint="Optional">
          <Input
            type="number"
            min="0"
            step="0.1"
            value={startOdometer}
            onChange={(event) => {
              setStartOdometer(event.target.value);
              setWarning(undefined);
            }}
          />
        </Field>
        {ending && (
          <Field label="Ending odometer">
            <Input
              type="number"
              min="0"
              step="0.1"
              value={endOdometer}
              onChange={(event) => {
                setEndOdometer(event.target.value);
                setWarning(undefined);
              }}
            />
          </Field>
        )}
      </div>
      {ending && (
        <div className="or-divider">
          <span>or</span>
        </div>
      )}
      {ending && (
        <Field
          label={`Total distance (${vehicle?.distanceUnit ?? state.preferences.distanceUnit})`}
          hint="Use this when odometer values are unavailable"
        >
          <Input
            type="number"
            min="0"
            step="0.1"
            value={distance}
            onChange={(event) => setDistance(event.target.value)}
            disabled={startOdometer !== '' && endOdometer !== ''}
          />
        </Field>
      )}
      <div className="form-grid">
        <Field label="Starting location" hint="Optional">
          <Input value={startLocation} onChange={(event) => setStartLocation(event.target.value)} />
        </Field>
        {ending && (
          <Field label="Destination" hint="Optional">
            <Input value={destination} onChange={(event) => setDestination(event.target.value)} />
          </Field>
        )}
      </div>
      {ending && (
        <div className="form-grid form-grid--three">
          <Field label="Rate per unit">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
            />
          </Field>
          <Field label="Tolls">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={tolls}
              onChange={(event) => setTolls(event.target.value)}
            />
          </Field>
          <Field label="Parking">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={parking}
              onChange={(event) => setParking(event.target.value)}
            />
          </Field>
        </div>
      )}
      {ending && startOdometer !== '' && endOdometer !== '' && (
        <div className="calculated-line">
          Calculated distance:{' '}
          <strong>
            {tripDistance({
              distance: 0,
              startOdometer: Number(startOdometer),
              endOdometer: Number(endOdometer),
            }).toFixed(1)}{' '}
            {vehicle?.distanceUnit ?? state.preferences.distanceUnit}
          </strong>
        </div>
      )}
      <Field label="Notes" hint="Optional">
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <div className="info-note">
        Tax and reimbursement treatment varies. This application records information but does not
        provide tax or legal advice.
      </div>
      <div className="dialog__actions">
        <Button type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {mode === 'start'
            ? 'Start trip'
            : mode === 'end'
              ? 'End trip'
              : mode === 'edit'
                ? 'Save changes'
                : 'Add trip'}
        </Button>
      </div>
    </form>
  );
}
