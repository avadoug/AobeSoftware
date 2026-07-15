import type { AppState } from '../domain/types';

export interface Snapshot {
  id: string;
  createdAt: string;
  reason: 'automatic' | 'before-import' | 'manual';
  state: AppState;
}

export interface StorageAdapter {
  readonly kind: 'indexeddb' | 'sqlite';
  load(): Promise<AppState>;
  save(state: AppState): Promise<void>;
  createSnapshot(state: AppState, reason: Snapshot['reason']): Promise<Snapshot>;
  listSnapshots(): Promise<Array<Omit<Snapshot, 'state'>>>;
  restoreSnapshot(id: string): Promise<AppState>;
  clear(): Promise<void>;
}
