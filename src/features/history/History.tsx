import {
  ArchiveRestore,
  BriefcaseBusiness,
  CarFront,
  ChevronDown,
  Clock3,
  Filter,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAppStore } from '../../app/AppStore';
import { Button, Dialog, EmptyState, IconButton, Input, Pill, Select } from '../../components/ui';
import {
  payableMinutes,
  shiftEarningsMinor,
  tripDistance,
  tripReimbursementMinor,
} from '../../domain/calculations';
import type { MileageTrip, WorkShift } from '../../domain/types';
import { formatDate, formatDuration, formatMoney, formatTime } from '../../utils/format';
import { ShiftForm } from '../shifts/ShiftForm';
import { TripForm } from '../mileage/TripForm';

type HistoryItem = { type: 'shift'; value: WorkShift } | { type: 'trip'; value: MileageTrip };

export function History() {
  const { state, softDelete, restore, removePermanently } = useAppStore();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | 'shift' | 'trip'>('all');
  const [sort, setSort] = useState<'newest' | 'hours' | 'distance' | 'amount'>('newest');
  const [showDeleted, setShowDeleted] = useState(false);
  const [editing, setEditing] = useState<HistoryItem>();
  const [undo, setUndo] = useState<{ type: 'shifts' | 'trips'; id: string; label: string }>();
  const items = useMemo(() => {
    const normalized = query.toLowerCase();
    const combined: HistoryItem[] = [
      ...state.shifts.map((value) => ({ type: 'shift' as const, value })),
      ...state.trips.map((value) => ({ type: 'trip' as const, value })),
    ];
    return combined
      .filter(
        (item) =>
          Boolean(item.value.deletedAt) === showDeleted && (type === 'all' || item.type === type),
      )
      .filter((item) => {
        const job = state.jobs.find((entry) => entry.id === item.value.jobId)?.name ?? '';
        const text =
          item.type === 'shift'
            ? `${job} ${item.value.notes ?? ''} ${item.value.tags.join(' ')}`
            : `${job} ${item.value.purpose ?? ''} ${item.value.destination ?? ''} ${item.value.notes ?? ''} ${item.value.tags.join(' ')}`;
        return text.toLowerCase().includes(normalized);
      })
      .sort((a, b) => {
        if (sort === 'hours')
          return (
            (b.type === 'shift' ? payableMinutes(b.value) : 0) -
            (a.type === 'shift' ? payableMinutes(a.value) : 0)
          );
        if (sort === 'distance')
          return (
            (b.type === 'trip' ? tripDistance(b.value) : 0) -
            (a.type === 'trip' ? tripDistance(a.value) : 0)
          );
        if (sort === 'amount')
          return (
            (b.type === 'shift'
              ? shiftEarningsMinor(b.value, state.preferences)
              : tripReimbursementMinor(b.value, state.preferences)) -
            (a.type === 'shift'
              ? shiftEarningsMinor(a.value, state.preferences)
              : tripReimbursementMinor(a.value, state.preferences))
          );
        const aDate =
          a.type === 'shift'
            ? (a.value.startAt ?? a.value.createdAt)
            : (a.value.startedAt ?? a.value.createdAt);
        const bDate =
          b.type === 'shift'
            ? (b.value.startAt ?? b.value.createdAt)
            : (b.value.startedAt ?? b.value.createdAt);
        return bDate.localeCompare(aDate);
      });
  }, [state, query, type, sort, showDeleted]);

  const deleteItem = (item: HistoryItem) => {
    const collection = item.type === 'shift' ? 'shifts' : 'trips';
    softDelete(collection, item.value.id);
    setUndo({
      type: collection,
      id: item.value.id,
      label:
        item.type === 'shift'
          ? 'Shift moved to Recently Deleted.'
          : 'Trip moved to Recently Deleted.',
    });
    window.setTimeout(() => setUndo(undefined), 6000);
  };

  return (
    <div className="page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Your records</p>
          <h1>History</h1>
          <p>Search, review, correct, or restore your work records.</p>
        </div>
        <Button
          variant={showDeleted ? 'secondary' : 'ghost'}
          onClick={() => setShowDeleted((value) => !value)}
        >
          <Trash2 size={17} /> {showDeleted ? 'Back to history' : 'Recently deleted'}
        </Button>
      </header>
      <div className="filter-bar">
        <label className="search-box">
          <Search size={18} />
          <span className="sr-only">Search history</span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search job, purpose, notes, or tags"
          />
        </label>
        <label className="compact-select">
          <Filter size={17} />
          <span className="sr-only">Entry type</span>
          <Select value={type} onChange={(event) => setType(event.target.value as typeof type)}>
            <option value="all">All entries</option>
            <option value="shift">Shifts</option>
            <option value="trip">Trips</option>
          </Select>
        </label>
        <label className="compact-select">
          <ChevronDown size={17} />
          <span className="sr-only">Sort records</span>
          <Select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
            <option value="newest">Newest first</option>
            <option value="hours">Most hours</option>
            <option value="distance">Most distance</option>
            <option value="amount">Highest amount</option>
          </Select>
        </label>
      </div>
      {items.length ? (
        <div className="history-list">
          {items.map((item) =>
            item.type === 'shift' ? (
              <article className="history-row" key={item.value.id}>
                <span className="history-row__icon">
                  <BriefcaseBusiness size={20} />
                </span>
                <div className="history-row__main">
                  <div>
                    <strong>
                      {state.jobs.find((job) => job.id === item.value.jobId)?.name ?? 'Work shift'}
                    </strong>
                    {!item.value.endAt && item.value.startAt && <Pill tone="warning">Active</Pill>}
                    {item.value.demo && <Pill tone="info">Demo</Pill>}
                  </div>
                  <span>
                    {formatDate(item.value.startAt ?? item.value.createdAt, state.preferences)} ·{' '}
                    {formatTime(item.value.startAt, state.preferences)}–
                    {formatTime(item.value.endAt, state.preferences)}
                  </span>
                  {item.value.notes && <small>{item.value.notes}</small>}
                </div>
                <div className="history-row__numbers">
                  <strong>{formatDuration(payableMinutes(item.value))}</strong>
                  <span>
                    {formatMoney(
                      shiftEarningsMinor(item.value, state.preferences),
                      state.preferences,
                    )}
                  </span>
                </div>
                <div className="history-row__actions">
                  {showDeleted ? (
                    <>
                      <IconButton
                        label="Restore shift"
                        onClick={() => restore('shifts', item.value.id)}
                      >
                        <ArchiveRestore size={18} />
                      </IconButton>
                      <IconButton
                        label="Delete shift permanently"
                        onClick={() =>
                          window.confirm('Permanently delete this shift? This cannot be undone.') &&
                          removePermanently('shifts', item.value.id)
                        }
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <IconButton label="Edit shift" onClick={() => setEditing(item)}>
                        <Pencil size={18} />
                      </IconButton>
                      <IconButton label="Delete shift" onClick={() => deleteItem(item)}>
                        <Trash2 size={18} />
                      </IconButton>
                    </>
                  )}
                </div>
              </article>
            ) : (
              <article className="history-row" key={item.value.id}>
                <span className="history-row__icon history-row__icon--trip">
                  <CarFront size={20} />
                </span>
                <div className="history-row__main">
                  <div>
                    <strong>{item.value.purpose || 'Trip without a purpose'}</strong>
                    <Pill tone={item.value.category === 'business' ? 'success' : 'neutral'}>
                      {item.value.category}
                    </Pill>
                    {!item.value.endedAt && item.value.startedAt && (
                      <Pill tone="warning">Active</Pill>
                    )}
                    {item.value.demo && <Pill tone="info">Demo</Pill>}
                  </div>
                  <span>
                    {formatDate(item.value.startedAt ?? item.value.createdAt, state.preferences)} ·{' '}
                    {state.vehicles.find((vehicle) => vehicle.id === item.value.vehicleId)
                      ?.nickname ?? 'No vehicle'}
                  </span>
                  {item.value.notes && <small>{item.value.notes}</small>}
                </div>
                <div className="history-row__numbers">
                  <strong>
                    {tripDistance(item.value).toFixed(1)} {item.value.distanceUnit}
                  </strong>
                  <span>
                    {formatMoney(
                      tripReimbursementMinor(item.value, state.preferences),
                      state.preferences,
                    )}
                  </span>
                </div>
                <div className="history-row__actions">
                  {showDeleted ? (
                    <>
                      <IconButton
                        label="Restore trip"
                        onClick={() => restore('trips', item.value.id)}
                      >
                        <ArchiveRestore size={18} />
                      </IconButton>
                      <IconButton
                        label="Delete trip permanently"
                        onClick={() =>
                          window.confirm('Permanently delete this trip? This cannot be undone.') &&
                          removePermanently('trips', item.value.id)
                        }
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <IconButton label="Edit trip" onClick={() => setEditing(item)}>
                        <Pencil size={18} />
                      </IconButton>
                      <IconButton label="Delete trip" onClick={() => deleteItem(item)}>
                        <Trash2 size={18} />
                      </IconButton>
                    </>
                  )}
                </div>
              </article>
            ),
          )}
        </div>
      ) : (
        <EmptyState
          icon={<Clock3 size={28} />}
          title={showDeleted ? 'Recently Deleted is empty' : 'No records match'}
        >
          {showDeleted
            ? 'Deleted shifts and trips will remain here until you permanently remove them.'
            : 'Try a different search or filter. New shifts and trips appear here automatically.'}
        </EmptyState>
      )}
      {undo && (
        <div className="undo-toast" role="status">
          <span>{undo.label}</span>
          <Button
            variant="ghost"
            onClick={() => {
              restore(undo.type, undo.id);
              setUndo(undefined);
            }}
          >
            Undo
          </Button>
        </div>
      )}
      <Dialog
        open={editing?.type === 'shift'}
        title="Edit shift"
        onClose={() => setEditing(undefined)}
        wide
      >
        {editing?.type === 'shift' && (
          <ShiftForm mode="edit" initial={editing.value} onDone={() => setEditing(undefined)} />
        )}
      </Dialog>
      <Dialog
        open={editing?.type === 'trip'}
        title="Edit trip"
        onClose={() => setEditing(undefined)}
        wide
      >
        {editing?.type === 'trip' && (
          <TripForm mode="edit" initial={editing.value} onDone={() => setEditing(undefined)} />
        )}
      </Dialog>
    </div>
  );
}
