import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
if (!globalThis.structuredClone)
  Object.defineProperty(globalThis, 'structuredClone', {
    value: (value: unknown) => JSON.parse(JSON.stringify(value)),
  });
