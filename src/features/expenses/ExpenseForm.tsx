import { useState, type FormEvent } from 'react';
import { useAppStore } from '../../app/AppStore';
import { Button, Field, Input, Select, Textarea, Toggle } from '../../components/ui';
import type { Expense } from '../../domain/types';
import { inputDate, moneyToMinor } from '../../utils/format';
import { createId } from '../../utils/id';

export function ExpenseForm({ onDone }: { onDone: () => void }) {
  const { state, put } = useAppStore();
  const [date, setDate] = useState(inputDate());
  const [kind, setKind] = useState<Expense['kind']>('parking');
  const [amount, setAmount] = useState('');
  const [jobId, setJobId] = useState('');
  const [reimbursable, setReimbursable] = useState(true);
  const [notes, setNotes] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const stamp = new Date().toISOString();
    put(
      'expenses',
      {
        id: createId(),
        occurredAt: new Date(`${date}T12:00`).toISOString(),
        kind,
        amountMinor: moneyToMinor(amount),
        reimbursable,
        jobId: jobId || undefined,
        notes: notes.trim() || undefined,
        createdAt: stamp,
        updatedAt: stamp,
      },
      'added',
    );
    onDone();
  };
  return (
    <form onSubmit={submit} className="stack">
      <div className="form-grid">
        <Field label="Date">
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </Field>
        <Field label="Type">
          <Select value={kind} onChange={(event) => setKind(event.target.value as Expense['kind'])}>
            <option value="parking">Parking</option>
            <option value="toll">Toll</option>
            <option value="supplies">Supplies</option>
            <option value="meal">Meal</option>
            <option value="other">Other</option>
          </Select>
        </Field>
      </div>
      <Field label="Amount">
        <Input
          autoFocus
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
      </Field>
      <Field label="Job or client">
        <Select value={jobId} onChange={(event) => setJobId(event.target.value)}>
          <option value="">No profile</option>
          {state.jobs
            .filter((item) => !item.deletedAt)
            .map((job) => (
              <option key={job.id} value={job.id}>
                {job.name}
              </option>
            ))}
        </Select>
      </Field>
      <Toggle
        checked={reimbursable}
        onChange={setReimbursable}
        label="Reimbursable"
        description="Include this expense in reimbursement totals."
      />
      <Field label="Note" hint="Optional">
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <div className="dialog__actions">
        <Button type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Add expense
        </Button>
      </div>
    </form>
  );
}
