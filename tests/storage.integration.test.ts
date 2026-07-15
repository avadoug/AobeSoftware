import { afterEach, describe, expect, it } from 'vitest';
import { IndexedDbStorage } from '../src/storage/indexedDb/IndexedDbStorage';
import { emptyState } from '../src/domain/types';
import { elapsedMinutes } from '../src/domain/calculations';

const names: string[] = [];
afterEach(async () => {
  for (const name of names.splice(0)) await indexedDB.deleteDatabase(name);
});

describe('IndexedDB integration', () => {
  it('recovers an active timer after a new adapter opens the database', async () => {
    const name = `test-recovery-${crypto.randomUUID()}`;
    names.push(name);
    const first = new IndexedDbStorage(name);
    const state = emptyState();
    state.preferences.setupComplete = true;
    state.shifts.push({
      id: 'active',
      startAt: new Date(Date.now() - 30 * 60000).toISOString(),
      durationMinutes: 0,
      breaks: [],
      tags: [],
      source: 'timer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await first.save(state);
    const second = new IndexedDbStorage(name);
    const recovered = await second.load();
    expect(recovered.shifts[0]?.id).toBe('active');
    expect(elapsedMinutes(recovered.shifts[0]?.startAt, undefined)).toBeGreaterThanOrEqual(29);
  });
  it('creates, lists, and restores a snapshot', async () => {
    const name = `test-snapshot-${crypto.randomUUID()}`;
    names.push(name);
    const storage = new IndexedDbStorage(name);
    const state = emptyState();
    state.preferences.displayName = 'Before';
    await storage.save(state);
    const snapshot = await storage.createSnapshot(state, 'manual');
    state.preferences.displayName = 'After';
    await storage.save(state);
    expect(await storage.listSnapshots()).toHaveLength(1);
    const restored = await storage.restoreSnapshot(snapshot.id);
    expect(restored.preferences.displayName).toBe('Before');
    expect((await storage.load()).preferences.displayName).toBe('Before');
  });
  it('clears records and settings', async () => {
    const name = `test-clear-${crypto.randomUUID()}`;
    names.push(name);
    const storage = new IndexedDbStorage(name);
    const state = emptyState();
    state.preferences.displayName = 'Stored';
    await storage.save(state);
    await storage.clear();
    expect((await storage.load()).preferences.displayName).toBe('Aobe');
  });
});
