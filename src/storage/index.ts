import type { StorageAdapter } from './storage';
import { IndexedDbStorage } from './indexedDb/IndexedDbStorage';

function runningInTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

let singleton: StorageAdapter | undefined;

export async function getStorage(): Promise<StorageAdapter> {
  if (singleton) return singleton;
  if (runningInTauri()) {
    const { SqliteStorage } = await import('./sqlite/SqliteStorage');
    singleton = new SqliteStorage();
  } else {
    singleton = new IndexedDbStorage();
  }
  return singleton;
}

export type { StorageAdapter, Snapshot } from './storage';
