import { format, parseISO } from 'date-fns';
import type { Preferences } from '../domain/types';

export const inputDate = (date = new Date()): string => format(date, 'yyyy-MM-dd');
export const inputTime = (date = new Date()): string => format(date, 'HH:mm');

export function toLocalInput(iso?: string): string {
  if (!iso) return '';
  return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm");
}

export function fromLocalInput(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function formatDate(
  iso: string,
  preferences: Preferences,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(
    preferences.locale,
    options ?? { month: 'short', day: 'numeric', year: 'numeric' },
  ).format(new Date(iso));
}

export function formatTime(iso: string | undefined, preferences: Preferences): string {
  if (!iso) return 'No time';
  return new Intl.DateTimeFormat(preferences.locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: preferences.timeFormat === '12',
  }).format(new Date(iso));
}

export function formatDuration(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  if (!hours) return `${minutes}m`;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

export function formatClockDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => part.toString().padStart(2, '0')).join(':');
}

export function formatMoney(minor: number, preferences: Preferences): string {
  return new Intl.NumberFormat(preferences.locale, {
    style: 'currency',
    currency: preferences.currency,
  }).format((minor || 0) / 100);
}

export function moneyToMinor(value: string | number | undefined): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.round((parsed + Number.EPSILON) * 100) : 0;
}

export function minorToInput(value?: number): string {
  return ((value ?? 0) / 100).toFixed(2);
}

export function safeFileName(value: string): string {
  return (
    value
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100) || 'export'
  );
}
