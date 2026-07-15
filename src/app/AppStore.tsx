import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  emptyState,
  type AppState,
  type AuditEvent,
  type CollectionName,
  type Entity,
} from '../domain/types';
import { getStorage, type Snapshot, type StorageAdapter } from '../storage';
import { createId } from '../utils/id';
import { inputDate } from '../utils/format';

interface StoreValue {
  state: AppState;
  ready: boolean;
  storageKind: StorageAdapter['kind'];
  error?: string;
  replaceState: (next: AppState) => void;
  updatePreferences: (updates: Partial<AppState['preferences']>) => void;
  put: <T extends Entity>(collection: CollectionName, value: T, auditAction?: string) => void;
  softDelete: (collection: CollectionName, id: string) => void;
  restore: (collection: CollectionName, id: string) => void;
  removePermanently: (collection: CollectionName, id: string) => void;
  createSnapshot: (reason: Snapshot['reason']) => Promise<Snapshot>;
  listSnapshots: () => Promise<Array<Omit<Snapshot, 'state'>>>;
  restoreSnapshot: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  flush: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | undefined>(undefined);

export function AppStoreProvider({
  children,
  adapter,
}: {
  children: ReactNode;
  adapter?: StorageAdapter;
}) {
  const [state, setState] = useState<AppState>(emptyState);
  const stateRef = useRef(state);
  const [ready, setReady] = useState(false);
  const [storageKind, setStorageKind] = useState<StorageAdapter['kind']>('indexeddb');
  const [error, setError] = useState<string>();
  const adapterRef = useRef<StorageAdapter | undefined>(undefined);
  const writeQueue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const selected = adapter ?? (await getStorage());
        adapterRef.current = selected;
        setStorageKind(selected.kind);
        const loaded = await selected.load();
        const today = inputDate();
        if (
          loaded.preferences.lastAutoSnapshotDate !== today &&
          (loaded.shifts.length || loaded.trips.length)
        ) {
          await selected.createSnapshot(loaded, 'automatic');
          loaded.preferences.lastAutoSnapshotDate = today;
          await selected.save(loaded);
        }
        if (active) {
          stateRef.current = loaded;
          setState(loaded);
          setReady(true);
        }
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : 'The local database could not be opened.',
          );
          setReady(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [adapter]);

  const queueSave = useCallback((next: AppState) => {
    stateRef.current = next;
    setState(next);
    const selected = adapterRef.current;
    if (selected) {
      writeQueue.current = writeQueue.current
        .then(() => selected.save(next))
        .catch((cause) =>
          setError(cause instanceof Error ? cause.message : 'Changes could not be saved.'),
        );
    }
  }, []);

  const replaceState = useCallback(
    (next: AppState) => queueSave(structuredClone(next)),
    [queueSave],
  );

  const updatePreferences = useCallback(
    (updates: Partial<AppState['preferences']>) => {
      queueSave({
        ...stateRef.current,
        preferences: { ...stateRef.current.preferences, ...updates },
      });
    },
    [queueSave],
  );

  const put = useCallback(
    <T extends Entity>(collection: CollectionName, value: T, auditAction = 'saved') => {
      const current = stateRef.current;
      const now = new Date().toISOString();
      const list = current[collection] as unknown as T[];
      const stored = { ...value, updatedAt: now, createdAt: value.createdAt || now };
      const nextList = list.some((item) => item.id === value.id)
        ? list.map((item) => (item.id === value.id ? stored : item))
        : [stored, ...list];
      const event: AuditEvent = {
        id: createId(),
        action: auditAction,
        entityType: collection,
        entityId: value.id,
        createdAt: now,
        updatedAt: now,
      };
      queueSave({
        ...current,
        [collection]: nextList,
        audit: [event, ...current.audit].slice(0, 500),
      });
    },
    [queueSave],
  );

  const mutateDeletion = useCallback(
    (collection: CollectionName, id: string, action: 'delete' | 'restore' | 'permanent') => {
      const current = stateRef.current;
      const list = current[collection] as unknown as Entity[];
      const nextList =
        action === 'permanent'
          ? list.filter((item) => item.id !== id)
          : list.map((item) =>
              item.id === id
                ? {
                    ...item,
                    updatedAt: new Date().toISOString(),
                    deletedAt: action === 'delete' ? new Date().toISOString() : undefined,
                  }
                : item,
            );
      queueSave({ ...current, [collection]: nextList });
    },
    [queueSave],
  );

  const createSnapshot = useCallback(async (reason: Snapshot['reason']) => {
    if (!adapterRef.current) throw new Error('Storage is not ready.');
    return adapterRef.current.createSnapshot(stateRef.current, reason);
  }, []);

  const listSnapshots = useCallback(async () => adapterRef.current?.listSnapshots() ?? [], []);
  const restoreSnapshot = useCallback(async (id: string) => {
    if (!adapterRef.current) throw new Error('Storage is not ready.');
    const restored = await adapterRef.current.restoreSnapshot(id);
    stateRef.current = restored;
    setState(restored);
  }, []);

  const clearAll = useCallback(async () => {
    if (!adapterRef.current) return;
    await adapterRef.current.clear();
    const next = emptyState();
    stateRef.current = next;
    setState(next);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      ready,
      storageKind,
      error,
      replaceState,
      updatePreferences,
      put,
      softDelete: (collection, id) => mutateDeletion(collection, id, 'delete'),
      restore: (collection, id) => mutateDeletion(collection, id, 'restore'),
      removePermanently: (collection, id) => mutateDeletion(collection, id, 'permanent'),
      createSnapshot,
      listSnapshots,
      restoreSnapshot,
      clearAll,
      flush: () => writeQueue.current,
    }),
    [
      state,
      ready,
      storageKind,
      error,
      replaceState,
      updatePreferences,
      put,
      mutateDeletion,
      createSnapshot,
      listSnapshots,
      restoreSnapshot,
      clearAll,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useAppStore must be used inside AppStoreProvider.');
  return value;
}
