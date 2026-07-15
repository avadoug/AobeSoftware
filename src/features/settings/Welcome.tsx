import { useState, type FormEvent } from 'react';
import { APP_CONFIG } from '../../config';
import { useAppStore } from '../../app/AppStore';
import { Button, Field, Input, Select } from '../../components/ui';
import { moneyToMinor } from '../../utils/format';

export function Welcome() {
  const { state, updatePreferences } = useAppStore();
  const [name, setName] = useState(state.preferences.displayName);
  const [hourlyRate, setHourlyRate] = useState('');
  const [mileageRate, setMileageRate] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [currency, setCurrency] = useState(state.preferences.currency);
  const [weekStartsOn, setWeekStartsOn] = useState<'0' | '1'>(
    String(state.preferences.weekStartsOn) as '0' | '1',
  );
  const [timeFormat, setTimeFormat] = useState<'12' | '24'>(state.preferences.timeFormat);
  const [distanceUnit, setDistanceUnit] = useState<'mi' | 'km'>(state.preferences.distanceUnit);

  const complete = (event?: FormEvent) => {
    event?.preventDefault();
    updatePreferences({
      setupComplete: true,
      displayName: name.trim() || 'Aobe',
      defaultHourlyRateMinor: moneyToMinor(hourlyRate),
      defaultMileageRateMinor: moneyToMinor(mileageRate),
      currency,
      weekStartsOn: Number(weekStartsOn) as 0 | 1,
      timeFormat,
      distanceUnit,
    });
  };

  return (
    <main className="welcome-shell">
      <section className="welcome-card">
        <div className="brand-mark" aria-hidden="true">
          ✓
        </div>
        <p className="eyebrow">Welcome to</p>
        <h1>{APP_CONFIG.name}</h1>
        <p className="welcome-card__subtitle">{APP_CONFIG.subtitle}</p>
        <div className="privacy-note">
          <strong>Your records stay on this device.</strong>
          <span>No account, tracking, or internet connection is required.</span>
        </div>
        <form onSubmit={complete}>
          <Field label="What should we call you?">
            <Input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Aobe"
            />
          </Field>
          {showOptions && (
            <div className="setup-options">
              <div className="form-grid">
                <Field label="Usual hourly rate" hint="Optional">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={hourlyRate}
                    onChange={(event) => setHourlyRate(event.target.value)}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Mileage rate per unit" hint="Optional and editable">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={mileageRate}
                    onChange={(event) => setMileageRate(event.target.value)}
                    placeholder="0.00"
                  />
                </Field>
              </div>
              <div className="form-grid">
                <Field label="Currency">
                  <Select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                    <option value="USD">USD — US dollar</option>
                    <option value="CAD">CAD — Canadian dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — Pound sterling</option>
                    <option value="AUD">AUD — Australian dollar</option>
                  </Select>
                </Field>
                <Field label="Distance">
                  <Select
                    value={distanceUnit}
                    onChange={(event) => setDistanceUnit(event.target.value as 'mi' | 'km')}
                  >
                    <option value="mi">Miles</option>
                    <option value="km">Kilometers</option>
                  </Select>
                </Field>
              </div>
              <div className="form-grid">
                <Field label="Week starts">
                  <Select
                    value={weekStartsOn}
                    onChange={(event) => setWeekStartsOn(event.target.value as '0' | '1')}
                  >
                    <option value="1">Monday</option>
                    <option value="0">Sunday</option>
                  </Select>
                </Field>
                <Field label="Time display">
                  <Select
                    value={timeFormat}
                    onChange={(event) => setTimeFormat(event.target.value as '12' | '24')}
                  >
                    <option value="12">12-hour</option>
                    <option value="24">24-hour</option>
                  </Select>
                </Field>
              </div>
            </div>
          )}
          <div className="welcome-actions">
            <Button type="submit" variant="primary">
              Start tracking
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowOptions((value) => !value)}>
              {showOptions ? 'Hide optional settings' : 'Set optional defaults'}
            </Button>
          </div>
          <button type="button" className="text-button" onClick={() => complete()}>
            Skip Setup and Start Tracking
          </button>
        </form>
      </section>
    </main>
  );
}
