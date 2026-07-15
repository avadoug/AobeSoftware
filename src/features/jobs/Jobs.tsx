import { BriefcaseBusiness, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAppStore } from '../../app/AppStore';
import {
  Button,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  Input,
  Textarea,
  Toggle,
} from '../../components/ui';
import type { Job } from '../../domain/types';
import { formatMoney, minorToInput, moneyToMinor } from '../../utils/format';
import { createId } from '../../utils/id';

function JobForm({ initial, onDone }: { initial?: Job; onDone: () => void }) {
  const { put } = useAppStore();
  const [name, setName] = useState(initial?.name ?? '');
  const [project, setProject] = useState(initial?.project ?? '');
  const [rate, setRate] = useState(minorToInput(initial?.defaultHourlyRateMinor));
  const [mileageRate, setMileageRate] = useState(minorToInput(initial?.defaultMileageRateMinor));
  const [location, setLocation] = useState(initial?.commonLocation ?? '');
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '');
  const [favorite, setFavorite] = useState(initial?.favorite ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const stamp = new Date().toISOString();
    put(
      'jobs',
      {
        id: initial?.id ?? createId(),
        name: name.trim(),
        project: project.trim() || undefined,
        defaultHourlyRateMinor: moneyToMinor(rate),
        defaultMileageRateMinor: moneyToMinor(mileageRate),
        commonLocation: location.trim() || undefined,
        tags: tags
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        color: initial?.color ?? '#176b5b',
        favorite,
        archived: initial?.archived ?? false,
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
      <Field label="Employer, client, or job name">
        <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} required />
      </Field>
      <div className="form-grid">
        <Field label="Project or assignment" hint="Optional">
          <Input value={project} onChange={(event) => setProject(event.target.value)} />
        </Field>
        <Field label="Common work location" hint="Optional">
          <Input value={location} onChange={(event) => setLocation(event.target.value)} />
        </Field>
      </div>
      <div className="form-grid">
        <Field label="Default hourly rate">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
          />
        </Field>
        <Field label="Default mileage rate">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={mileageRate}
            onChange={(event) => setMileageRate(event.target.value)}
          />
        </Field>
      </div>
      <Field label="Default tags" hint="Separate with commas">
        <Input value={tags} onChange={(event) => setTags(event.target.value)} />
      </Field>
      <Toggle
        checked={favorite}
        onChange={setFavorite}
        label="Favorite profile"
        description="Favorites appear first during quick entry."
      />
      <Field label="Notes" hint="Optional">
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <div className="dialog__actions">
        <Button type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {initial ? 'Save changes' : 'Add job'}
        </Button>
      </div>
    </form>
  );
}

export function Jobs() {
  const { state, softDelete } = useAppStore();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Job>();
  const jobs = state.jobs
    .filter((item) => !item.deletedAt)
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));
  return (
    <div className="page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Reusable defaults</p>
          <h1>Jobs & clients</h1>
          <p>Profiles speed up entry, but they are never required.</p>
        </div>
        <Button variant="primary" onClick={() => setDialog(true)}>
          <Plus size={18} /> Add job
        </Button>
      </header>
      {jobs.length ? (
        <div className="profile-grid">
          {jobs.map((job) => (
            <article className="profile-card" key={job.id}>
              <div className="profile-card__icon" style={{ color: job.color }}>
                <BriefcaseBusiness size={24} />
              </div>
              <div className="profile-card__body">
                <div>
                  <h2>{job.name}</h2>
                  {job.favorite && <Star size={16} fill="currentColor" aria-label="Favorite" />}
                </div>
                {job.project && <p>{job.project}</p>}
                <dl>
                  <div>
                    <dt>Hourly rate</dt>
                    <dd>{formatMoney(job.defaultHourlyRateMinor ?? 0, state.preferences)}/hr</dd>
                  </div>
                  <div>
                    <dt>Mileage rate</dt>
                    <dd>
                      {formatMoney(job.defaultMileageRateMinor ?? 0, state.preferences)}/
                      {state.preferences.distanceUnit}
                    </dd>
                  </div>
                </dl>
                {job.commonLocation && (
                  <span className="profile-location">
                    <MapPin size={15} /> {job.commonLocation}
                  </span>
                )}
                {job.tags.length > 0 && (
                  <div className="tag-list">
                    {job.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="profile-card__actions">
                <IconButton label={`Edit ${job.name}`} onClick={() => setEditing(job)}>
                  <Pencil size={18} />
                </IconButton>
                <IconButton
                  label={`Delete ${job.name}`}
                  onClick={() =>
                    window.confirm(
                      `Move ${job.name} to Recently Deleted? Existing records keep their information.`,
                    ) && softDelete('jobs', job.id)
                  }
                >
                  <Trash2 size={18} />
                </IconButton>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={<BriefcaseBusiness size={28} />} title="No job profiles yet">
          Add a profile to reuse rates, locations, and tags. You can still track without one.
        </EmptyState>
      )}
      <Dialog open={dialog} title="Add job or client" onClose={() => setDialog(false)} wide>
        <JobForm onDone={() => setDialog(false)} />
      </Dialog>
      <Dialog
        open={Boolean(editing)}
        title="Edit job or client"
        onClose={() => setEditing(undefined)}
        wide
      >
        {editing && <JobForm initial={editing} onDone={() => setEditing(undefined)} />}
      </Dialog>
    </div>
  );
}
