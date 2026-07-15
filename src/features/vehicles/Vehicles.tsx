import { CarFront, Gauge, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAppStore } from '../../app/AppStore';
import {
  Button,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  Input,
  Select,
  Textarea,
  Toggle,
} from '../../components/ui';
import type { DistanceUnit, Vehicle } from '../../domain/types';
import { formatMoney, minorToInput, moneyToMinor } from '../../utils/format';
import { createId } from '../../utils/id';

function VehicleForm({ initial, onDone }: { initial?: Vehicle; onDone: () => void }) {
  const { state, put } = useAppStore();
  const [nickname, setNickname] = useState(initial?.nickname ?? '');
  const [year, setYear] = useState(initial?.year?.toString() ?? '');
  const [make, setMake] = useState(initial?.make ?? '');
  const [model, setModel] = useState(initial?.model ?? '');
  const [plate, setPlate] = useState(initial?.licensePlate ?? '');
  const [odometer, setOdometer] = useState(initial?.currentOdometer?.toString() ?? '');
  const [unit, setUnit] = useState<DistanceUnit>(
    initial?.distanceUnit ?? state.preferences.distanceUnit,
  );
  const [rate, setRate] = useState(
    minorToInput(initial?.defaultRateMinor ?? state.preferences.defaultMileageRateMinor),
  );
  const [archived, setArchived] = useState(initial?.archived ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const stamp = new Date().toISOString();
    put(
      'vehicles',
      {
        id: initial?.id ?? createId(),
        nickname: nickname.trim(),
        year: year ? Number(year) : undefined,
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        licensePlate: plate.trim() || undefined,
        currentOdometer: odometer ? Number(odometer) : undefined,
        distanceUnit: unit,
        defaultRateMinor: moneyToMinor(rate),
        archived,
        notes: notes.trim() || undefined,
        createdAt: initial?.createdAt ?? stamp,
        updatedAt: stamp,
        demo: initial?.demo,
      },
      initial ? 'edited' : 'added',
    );
    onDone();
  };
  return (
    <form onSubmit={submit} className="stack">
      <Field label="Vehicle nickname">
        <Input
          autoFocus
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="Blue Honda"
          required
        />
      </Field>
      <div className="form-grid form-grid--three">
        <Field label="Year">
          <Input
            type="number"
            min="1900"
            max="2100"
            value={year}
            onChange={(event) => setYear(event.target.value)}
          />
        </Field>
        <Field label="Make">
          <Input value={make} onChange={(event) => setMake(event.target.value)} />
        </Field>
        <Field label="Model">
          <Input value={model} onChange={(event) => setModel(event.target.value)} />
        </Field>
      </div>
      <div className="form-grid">
        <Field label="License plate" hint="Optional">
          <Input
            value={plate}
            onChange={(event) => setPlate(event.target.value)}
            autoComplete="off"
          />
        </Field>
        <Field label="Current odometer">
          <Input
            type="number"
            min="0"
            step="0.1"
            value={odometer}
            onChange={(event) => setOdometer(event.target.value)}
          />
        </Field>
      </div>
      <div className="form-grid">
        <Field label="Distance unit">
          <Select value={unit} onChange={(event) => setUnit(event.target.value as DistanceUnit)}>
            <option value="mi">Miles</option>
            <option value="km">Kilometers</option>
          </Select>
        </Field>
        <Field label="Default reimbursement rate">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
          />
        </Field>
      </div>
      {initial && (
        <Toggle
          checked={archived}
          onChange={setArchived}
          label="Archive this vehicle"
          description="Hide it from new entries while preserving its trip history."
        />
      )}
      <Field label="Notes" hint="Optional">
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <div className="dialog__actions">
        <Button type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {initial ? 'Save changes' : 'Add vehicle'}
        </Button>
      </div>
    </form>
  );
}

export function Vehicles() {
  const { state, softDelete } = useAppStore();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Vehicle>();
  const vehicles = state.vehicles
    .filter((item) => !item.deletedAt)
    .sort(
      (a, b) => Number(a.archived) - Number(b.archived) || a.nickname.localeCompare(b.nickname),
    );
  return (
    <div className="page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Mileage defaults</p>
          <h1>Vehicles</h1>
          <p>Keep odometers and reimbursement rates consistent across trips.</p>
        </div>
        <Button variant="primary" onClick={() => setDialog(true)}>
          <Plus size={18} /> Add vehicle
        </Button>
      </header>
      {vehicles.length ? (
        <div className="profile-grid">
          {vehicles.map((vehicle) => (
            <article
              className={`profile-card ${vehicle.archived ? 'profile-card--archived' : ''}`}
              key={vehicle.id}
            >
              <div className="profile-card__icon profile-card__icon--car">
                <CarFront size={26} />
              </div>
              <div className="profile-card__body">
                <div>
                  <h2>{vehicle.nickname}</h2>
                  {vehicle.archived && <span className="muted-label">Archived</span>}
                </div>
                <p>
                  {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') ||
                    'Vehicle details not added'}
                </p>
                <dl>
                  <div>
                    <dt>Current odometer</dt>
                    <dd>
                      {vehicle.currentOdometer?.toLocaleString() ?? '—'} {vehicle.distanceUnit}
                    </dd>
                  </div>
                  <div>
                    <dt>Default rate</dt>
                    <dd>
                      {formatMoney(vehicle.defaultRateMinor ?? 0, state.preferences)}/
                      {vehicle.distanceUnit}
                    </dd>
                  </div>
                </dl>
                <span className="profile-location">
                  <Gauge size={15} />{' '}
                  {
                    state.trips.filter((trip) => trip.vehicleId === vehicle.id && !trip.deletedAt)
                      .length
                  }{' '}
                  recorded trips
                </span>
              </div>
              <div className="profile-card__actions">
                <IconButton label={`Edit ${vehicle.nickname}`} onClick={() => setEditing(vehicle)}>
                  <Pencil size={18} />
                </IconButton>
                <IconButton
                  label={`Delete ${vehicle.nickname}`}
                  onClick={() =>
                    window.confirm(
                      `Move ${vehicle.nickname} to Recently Deleted? Existing trips will remain.`,
                    ) && softDelete('vehicles', vehicle.id)
                  }
                >
                  <Trash2 size={18} />
                </IconButton>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={<CarFront size={30} />} title="No vehicles yet">
          Add a vehicle for odometer checks and faster trip entry.
        </EmptyState>
      )}
      <Dialog open={dialog} title="Add vehicle" onClose={() => setDialog(false)} wide>
        <VehicleForm onDone={() => setDialog(false)} />
      </Dialog>
      <Dialog
        open={Boolean(editing)}
        title="Edit vehicle"
        onClose={() => setEditing(undefined)}
        wide
      >
        {editing && <VehicleForm initial={editing} onDone={() => setEditing(undefined)} />}
      </Dialog>
    </div>
  );
}
