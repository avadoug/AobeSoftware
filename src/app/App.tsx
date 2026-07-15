import {
  BriefcaseBusiness,
  CalendarDays,
  CarFront,
  CirclePlus,
  Clock3,
  FileText,
  History as HistoryIcon,
  MoreHorizontal,
  Plus,
  Settings as SettingsIcon,
  StickyNote,
  WalletCards,
  X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useAppStore } from './AppStore';
import { APP_CONFIG } from '../config';
import { Button, Dialog, Field, Input, Textarea } from '../components/ui';
import { Welcome } from '../features/settings/Welcome';
import { Dashboard } from '../features/dashboard/Dashboard';
import { CalendarView } from '../features/calendar/CalendarView';
import { History } from '../features/history/History';
import { Reports } from '../features/reports/Reports';
import { Jobs } from '../features/jobs/Jobs';
import { Vehicles } from '../features/vehicles/Vehicles';
import { Settings } from '../features/settings/Settings';
import { ShiftForm } from '../features/shifts/ShiftForm';
import { TripForm } from '../features/mileage/TripForm';
import { ExpenseForm } from '../features/expenses/ExpenseForm';
import { createId } from '../utils/id';
import { inputDate } from '../utils/format';

type Page = 'today' | 'calendar' | 'history' | 'reports' | 'jobs' | 'vehicles' | 'settings';
type QuickForm = 'shift' | 'trip' | 'expense' | 'note' | null;

const navItems: Array<{ id: Page; label: string; icon: typeof Clock3 }> = [
  { id: 'today', label: 'Today', icon: Clock3 },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'history', label: 'History', icon: HistoryIcon },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'jobs', label: 'Jobs', icon: BriefcaseBusiness },
  { id: 'vehicles', label: 'Vehicles', icon: CarFront },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

function NoteForm({ onDone }: { onDone: () => void }) {
  const { put } = useAppStore();
  const [date, setDate] = useState(inputDate());
  const [text, setText] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const stamp = new Date().toISOString();
    put(
      'notes',
      {
        id: createId(),
        date: new Date(`${date}T12:00`).toISOString(),
        text: text.trim(),
        createdAt: stamp,
        updatedAt: stamp,
      },
      'added',
    );
    onDone();
  };
  return (
    <form onSubmit={submit} className="stack">
      <Field label="Date">
        <Input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
      </Field>
      <Field label="Note">
        <Textarea
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="What would you like to remember?"
          required
        />
      </Field>
      <div className="dialog__actions">
        <Button type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Add note
        </Button>
      </div>
    </form>
  );
}

function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<QuickForm>(null);
  useEffect(() => {
    if (!open) setForm(null);
  }, [open]);
  const close = () => {
    setForm(null);
    onClose();
  };
  if (form === 'shift')
    return (
      <Dialog open={open} title="Add completed shift" onClose={close} wide>
        <ShiftForm mode="manual" onDone={close} />
      </Dialog>
    );
  if (form === 'trip')
    return (
      <Dialog open={open} title="Add completed trip" onClose={close} wide>
        <TripForm mode="manual" onDone={close} />
      </Dialog>
    );
  if (form === 'expense')
    return (
      <Dialog open={open} title="Add expense" onClose={close}>
        <ExpenseForm onDone={close} />
      </Dialog>
    );
  if (form === 'note')
    return (
      <Dialog open={open} title="Add note" onClose={close}>
        <NoteForm onDone={close} />
      </Dialog>
    );
  return (
    <Dialog
      open={open}
      title="Quick Add"
      description="Ctrl + N opens this panel any time."
      onClose={close}
    >
      <div className="quick-add-grid">
        <button onClick={() => setForm('shift')}>
          <BriefcaseBusiness />
          <span>
            <strong>Completed shift</strong>
            <small>Hours, break, job, and rate</small>
          </span>
        </button>
        <button onClick={() => setForm('trip')}>
          <CarFront />
          <span>
            <strong>Completed trip</strong>
            <small>Distance, purpose, and costs</small>
          </span>
        </button>
        <button onClick={() => setForm('expense')}>
          <WalletCards />
          <span>
            <strong>Expense</strong>
            <small>Parking, tolls, or supplies</small>
          </span>
        </button>
        <button onClick={() => setForm('note')}>
          <StickyNote />
          <span>
            <strong>Note</strong>
            <small>Keep a dated reminder</small>
          </span>
        </button>
      </div>
    </Dialog>
  );
}

function PageContent({ page, navigate }: { page: Page; navigate: (page: Page) => void }) {
  if (page === 'today') return <Dashboard onOpenReports={() => navigate('reports')} />;
  if (page === 'calendar') return <CalendarView />;
  if (page === 'history') return <History />;
  if (page === 'reports') return <Reports />;
  if (page === 'jobs') return <Jobs />;
  if (page === 'vehicles') return <Vehicles />;
  return <Settings />;
}

export function App() {
  const { state, ready, error } = useAppStore();
  const [page, setPage] = useState<Page>('today');
  const [quickAdd, setQuickAdd] = useState(false);
  const [mobileMore, setMobileMore] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) window.setInterval(() => void registration.update(), 60 * 60 * 1000);
    },
  });
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.theme = state.preferences.theme;
    html.dataset.contrast = state.preferences.contrast;
    html.dataset.textScale = state.preferences.textScale;
    html.dataset.reducedMotion = String(state.preferences.reducedMotion);
  }, [state.preferences]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setQuickAdd(true);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  const navigate = (next: Page) => {
    setPage(next);
    setMobileMore(false);
    window.scrollTo({ top: 0, behavior: state.preferences.reducedMotion ? 'auto' : 'smooth' });
  };
  if (!ready)
    return (
      <main className="loading-screen">
        <div className="brand-mark">✓</div>
        <h1>{APP_CONFIG.name}</h1>
        <p>Opening your local records…</p>
      </main>
    );
  if (error)
    return (
      <main className="loading-screen">
        <div className="error-mark">!</div>
        <h1>Your local data could not be opened</h1>
        <p>{error}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </main>
    );
  if (!state.preferences.setupComplete) return <Welcome />;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span>✓</span>
          <div>
            <strong>{APP_CONFIG.name}</strong>
            <small>Local & private</small>
          </div>
        </div>
        <nav aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={page === item.id ? 'active' : ''}
                onClick={() => navigate(item.id)}
                aria-current={page === item.id ? 'page' : undefined}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar__footer">
          <Button variant="primary" onClick={() => setQuickAdd(true)}>
            <Plus size={18} /> Quick Add <kbd>Ctrl N</kbd>
          </Button>
          <p>
            <span className="privacy-dot" /> Data stays on this device
          </p>
        </div>
      </aside>
      <main className="content" id="main-content">
        <PageContent page={page} navigate={navigate} />
      </main>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        <button className={page === 'today' ? 'active' : ''} onClick={() => navigate('today')}>
          <Clock3 />
          <span>Today</span>
        </button>
        <button
          className={page === 'calendar' ? 'active' : ''}
          onClick={() => navigate('calendar')}
        >
          <CalendarDays />
          <span>Calendar</span>
        </button>
        <button
          className="bottom-nav__add"
          onClick={() => setQuickAdd(true)}
          aria-label="Quick add"
        >
          <CirclePlus />
          <span>Add</span>
        </button>
        <button className={page === 'history' ? 'active' : ''} onClick={() => navigate('history')}>
          <HistoryIcon />
          <span>History</span>
        </button>
        <button
          className={['reports', 'jobs', 'vehicles', 'settings'].includes(page) ? 'active' : ''}
          onClick={() => setMobileMore(true)}
        >
          <MoreHorizontal />
          <span>More</span>
        </button>
      </nav>
      {mobileMore && (
        <div className="mobile-more-backdrop" onClick={() => setMobileMore(false)}>
          <section className="mobile-more" onClick={(event) => event.stopPropagation()}>
            <header>
              <h2>More</h2>
              <button aria-label="Close" onClick={() => setMobileMore(false)}>
                <X />
              </button>
            </header>
            {navItems.slice(3).map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => navigate(item.id)}>
                  <Icon />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </section>
        </div>
      )}
      <QuickAdd open={quickAdd} onClose={() => setQuickAdd(false)} />
      {needRefresh && (
        <div className="update-toast" role="status">
          <div>
            <strong>Update ready</strong>
            <span>Reload to use the latest version. Your local records are safe.</span>
          </div>
          <Button variant="primary" onClick={() => void updateServiceWorker(true)}>
            Update
          </Button>
          <button aria-label="Dismiss update" onClick={() => setNeedRefresh(false)}>
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
