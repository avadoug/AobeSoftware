import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  addMonths,
} from 'date-fns';
import { BriefcaseBusiness, CarFront, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAppStore } from '../../app/AppStore';
import { Button, EmptyState, IconButton } from '../../components/ui';
import { payableMinutes, tripDistance } from '../../domain/calculations';
import { formatDuration, formatTime } from '../../utils/format';

export function CalendarView() {
  const { state } = useAppStore();
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), {
      weekStartsOn: state.preferences.weekStartsOn,
    });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: state.preferences.weekStartsOn });
    const days: Date[] = [];
    for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
    return days;
  }, [month, state.preferences.weekStartsOn]);
  const shiftsFor = (day: Date) =>
    state.shifts.filter(
      (item) => !item.deletedAt && isSameDay(new Date(item.startAt ?? item.createdAt), day),
    );
  const tripsFor = (day: Date) =>
    state.trips.filter(
      (item) => !item.deletedAt && isSameDay(new Date(item.startedAt ?? item.createdAt), day),
    );
  const selectedShifts = shiftsFor(selected);
  const selectedTrips = tripsFor(selected);
  const weekDays =
    state.preferences.weekStartsOn === 1
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return (
    <div className="page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Day, week, and month</p>
          <h1>Calendar</h1>
          <p>See work and mileage together, without spreadsheet clutter.</p>
        </div>
        <Button
          onClick={() => {
            setMonth(new Date());
            setSelected(new Date());
          }}
        >
          Today
        </Button>
      </header>
      <div className="calendar-layout">
        <section className="card calendar-card">
          <div className="calendar-toolbar">
            <IconButton label="Previous month" onClick={() => setMonth(subMonths(month, 1))}>
              <ChevronLeft />
            </IconButton>
            <h2>{format(month, 'MMMM yyyy')}</h2>
            <IconButton label="Next month" onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight />
            </IconButton>
          </div>
          <div className="calendar-grid calendar-grid--head">
            {weekDays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {grid.map((day) => {
              const shifts = shiftsFor(day);
              const trips = tripsFor(day);
              const minutes = shifts.reduce((sum, item) => sum + payableMinutes(item), 0);
              return (
                <button
                  key={day.toISOString()}
                  className={`calendar-day ${!isSameMonth(day, month) ? 'calendar-day--outside' : ''} ${isSameDay(day, selected) ? 'calendar-day--selected' : ''} ${isSameDay(day, new Date()) ? 'calendar-day--today' : ''}`}
                  onClick={() => setSelected(day)}
                  aria-label={`${format(day, 'MMMM d')}, ${formatDuration(minutes)}, ${trips.reduce((sum, item) => sum + tripDistance(item), 0).toFixed(1)} ${state.preferences.distanceUnit}`}
                >
                  <span>{format(day, 'd')}</span>
                  <div>
                    {minutes > 0 && <small>{formatDuration(minutes)}</small>}
                    {trips.length > 0 && (
                      <small>
                        <CarFront size={11} />{' '}
                        {trips.reduce((sum, item) => sum + tripDistance(item), 0).toFixed(0)}
                      </small>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
        <aside className="card day-detail">
          <p className="eyebrow">Selected day</p>
          <h2>{format(selected, 'EEEE, MMMM d')}</h2>
          {selectedShifts.length || selectedTrips.length ? (
            <div className="day-detail__list">
              {selectedShifts.map((item) => (
                <div key={item.id}>
                  <span className="activity-icon">
                    <BriefcaseBusiness size={17} />
                  </span>
                  <div>
                    <strong>
                      {state.jobs.find((job) => job.id === item.jobId)?.name ?? 'Work shift'}
                    </strong>
                    <small>
                      {formatTime(item.startAt, state.preferences)}–
                      {formatTime(item.endAt, state.preferences)} ·{' '}
                      {formatDuration(payableMinutes(item))}
                    </small>
                  </div>
                </div>
              ))}
              {selectedTrips.map((item) => (
                <div key={item.id}>
                  <span className="activity-icon activity-icon--trip">
                    <CarFront size={17} />
                  </span>
                  <div>
                    <strong>{item.purpose || 'Trip'}</strong>
                    <small>
                      {tripDistance(item).toFixed(1)} {item.distanceUnit} · {item.category}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<BriefcaseBusiness size={25} />} title="Nothing recorded">
              Shifts and trips for this date will appear here.
            </EmptyState>
          )}
        </aside>
      </div>
    </div>
  );
}
