/** Minimal key-value store used for the locale and best scores. */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

/**
 * Create a store backed by localStorage, falling back to memory when storage is
 * unavailable (private mode, disabled cookies, quota errors).
 * @returns key-value store
 */
export function createStore(): KeyValueStore {
  const memory = new Map<string, string>();
  const storage = probeLocalStorage();
  return {
    get: (key) => (storage ? storage.getItem(key) : (memory.get(key) ?? null)),
    set: (key, value) => {
      memory.set(key, value);
      if (!storage) return;
      try {
        storage.setItem(key, value);
      } catch (err) {
        // Quota or security errors: keep the in-memory copy and surface the problem in the console.
        console.warn('Incident Dojo: could not persist to localStorage', err);
      }
    },
  };
}

function probeLocalStorage(): Storage | null {
  try {
    const s = window.localStorage;
    const probe = '__incident_dojo_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch (err) {
    console.warn('Incident Dojo: localStorage unavailable, using memory only', err);
    return null;
  }
}
