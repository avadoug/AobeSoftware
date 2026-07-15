import { emptyState, type AppState, type CollectionName } from '../../domain/types';
import { createId } from '../../utils/id';
import type { Snapshot, StorageAdapter } from '../storage';

interface SqlRow {
  collection: CollectionName;
  data: string;
}

interface MetaRow {
  value: string;
}

interface SnapshotRow {
  id: string;
  created_at: string;
  reason: Snapshot['reason'];
  data?: string;
}

type DatabaseInstance = Awaited<ReturnType<typeof import('@tauri-apps/plugin-sql').default.load>>;
const collections: CollectionName[] = [
  'shifts',
  'trips',
  'vehicles',
  'jobs',
  'expenses',
  'notes',
  'presets',
  'reports',
  'audit',
];

export class SqliteStorage implements StorageAdapter {
  readonly kind = 'sqlite' as const;
  private database?: DatabaseInstance;

  private async db(): Promise<DatabaseInstance> {
    if (this.database) return this.database;
    const Database = (await import('@tauri-apps/plugin-sql')).default;
    const db = await Database.load('sqlite:aobe-worktrack.db');
    await db.execute(
      'CREATE TABLE IF NOT EXISTS records (collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(collection, id))',
    );
    await db.execute(
      'CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)',
    );
    await db.execute(
      'CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY NOT NULL, created_at TEXT NOT NULL, reason TEXT NOT NULL, data TEXT NOT NULL)',
    );
    this.database = db;
    return db;
  }

  async load(): Promise<AppState> {
    const db = await this.db();
    const state = emptyState();
    const preferences = await db.select<MetaRow[]>('SELECT value FROM meta WHERE key = $1', [
      'preferences',
    ]);
    if (preferences[0]?.value)
      state.preferences = { ...state.preferences, ...JSON.parse(preferences[0].value) };
    const records = await db.select<SqlRow[]>('SELECT collection, data FROM records');
    for (const row of records) {
      if (collections.includes(row.collection))
        (state[row.collection] as unknown[]).push(JSON.parse(row.data));
    }
    return state;
  }

  async save(state: AppState): Promise<void> {
    const db = await this.db();
    await db.execute('BEGIN IMMEDIATE');
    try {
      await db.execute('DELETE FROM records');
      for (const collection of collections) {
        for (const value of state[collection] as Array<{ id: string; updatedAt: string }>) {
          await db.execute(
            'INSERT INTO records (collection, id, data, updated_at) VALUES ($1, $2, $3, $4)',
            [collection, value.id, JSON.stringify(value), value.updatedAt],
          );
        }
      }
      await db.execute(
        'INSERT INTO meta (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        ['preferences', JSON.stringify(state.preferences)],
      );
      await db.execute('COMMIT');
    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }
  }

  async createSnapshot(state: AppState, reason: Snapshot['reason']): Promise<Snapshot> {
    const db = await this.db();
    const snapshot: Snapshot = {
      id: createId(),
      createdAt: new Date().toISOString(),
      reason,
      state: structuredClone(state),
    };
    await db.execute(
      'INSERT INTO snapshots (id, created_at, reason, data) VALUES ($1, $2, $3, $4)',
      [snapshot.id, snapshot.createdAt, reason, JSON.stringify(snapshot.state)],
    );
    await db.execute(
      'DELETE FROM snapshots WHERE id NOT IN (SELECT id FROM snapshots ORDER BY created_at DESC LIMIT 10)',
    );
    return snapshot;
  }

  async listSnapshots(): Promise<Array<Omit<Snapshot, 'state'>>> {
    const db = await this.db();
    return db
      .select<SnapshotRow[]>(
        'SELECT id, created_at, reason FROM snapshots ORDER BY created_at DESC',
      )
      .then((rows) =>
        rows.map((row) => ({ id: row.id, createdAt: row.created_at, reason: row.reason })),
      );
  }

  async restoreSnapshot(id: string): Promise<AppState> {
    const db = await this.db();
    const rows = await db.select<SnapshotRow[]>('SELECT data FROM snapshots WHERE id = $1', [id]);
    if (!rows[0]?.data) throw new Error('That local snapshot no longer exists.');
    const state = JSON.parse(rows[0].data) as AppState;
    await this.save(state);
    return state;
  }

  async clear(): Promise<void> {
    const db = await this.db();
    await db.execute('DELETE FROM records');
    await db.execute('DELETE FROM meta');
    await db.execute('DELETE FROM snapshots');
  }
}
