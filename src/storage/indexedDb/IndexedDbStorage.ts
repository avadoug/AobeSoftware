import Dexie, { type EntityTable } from 'dexie';
import { emptyState, type AppState, type CollectionName } from '../../domain/types';
import { createId } from '../../utils/id';
import type { Snapshot, StorageAdapter } from '../storage';

interface StoredRecord {
  key: string;
  collection: CollectionName;
  id: string;
  value: unknown;
}

interface StoredMeta {
  key: string;
  value: unknown;
}

interface StoredSnapshot extends Snapshot {
  id: string;
}

class WorkTrackDatabase extends Dexie {
  records!: EntityTable<StoredRecord, 'key'>;
  meta!: EntityTable<StoredMeta, 'key'>;
  snapshots!: EntityTable<StoredSnapshot, 'id'>;

  constructor(name = 'aobe-worktrack') {
    super(name);
    this.version(1).stores({
      records: '&key, collection, id',
      meta: '&key',
      snapshots: '&id, createdAt, reason',
    });
  }
}

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

export class IndexedDbStorage implements StorageAdapter {
  readonly kind = 'indexeddb' as const;
  private readonly db: WorkTrackDatabase;

  constructor(name?: string) {
    this.db = new WorkTrackDatabase(name);
  }

  async load(): Promise<AppState> {
    const state = emptyState();
    const preferences = await this.db.meta.get('preferences');
    if (preferences?.value)
      state.preferences = {
        ...state.preferences,
        ...(preferences.value as AppState['preferences']),
      };
    const records = await this.db.records.toArray();
    for (const record of records) {
      (state[record.collection] as unknown[]).push(record.value);
    }
    return state;
  }

  async save(state: AppState): Promise<void> {
    const records = collections.flatMap((collection) =>
      (state[collection] as Array<{ id: string }>).map((value) => ({
        key: `${collection}:${value.id}`,
        collection,
        id: value.id,
        value,
      })),
    );
    await this.db.transaction('rw', this.db.records, this.db.meta, async () => {
      await this.db.records.clear();
      if (records.length) await this.db.records.bulkPut(records);
      await this.db.meta.put({ key: 'preferences', value: state.preferences });
    });
  }

  async createSnapshot(state: AppState, reason: Snapshot['reason']): Promise<Snapshot> {
    const snapshot: Snapshot = {
      id: createId(),
      createdAt: new Date().toISOString(),
      reason,
      state: structuredClone(state),
    };
    await this.db.snapshots.put(snapshot);
    const snapshots = await this.db.snapshots.orderBy('createdAt').reverse().toArray();
    if (snapshots.length > 10)
      await this.db.snapshots.bulkDelete(snapshots.slice(10).map((item) => item.id));
    return snapshot;
  }

  async listSnapshots(): Promise<Array<Omit<Snapshot, 'state'>>> {
    const snapshots = await this.db.snapshots.orderBy('createdAt').reverse().toArray();
    return snapshots.map((snapshot) => ({
      id: snapshot.id,
      createdAt: snapshot.createdAt,
      reason: snapshot.reason,
    }));
  }

  async restoreSnapshot(id: string): Promise<AppState> {
    const snapshot = await this.db.snapshots.get(id);
    if (!snapshot) throw new Error('That local snapshot no longer exists.');
    await this.save(snapshot.state);
    return structuredClone(snapshot.state);
  }

  async clear(): Promise<void> {
    await this.db.transaction('rw', this.db.records, this.db.meta, this.db.snapshots, async () => {
      await this.db.records.clear();
      await this.db.meta.clear();
      await this.db.snapshots.clear();
    });
  }
}
