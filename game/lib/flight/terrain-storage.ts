// Disposable, device-local acceleration data. Seeded generation is authoritative.
// Both terrain workers share transactional LRU limits; no save data lives here.
export const TERRAIN_DATABASE = 'void-terrain-v1';
export const TERRAIN_STORAGE_BYTES = 32 * 1024 * 1024;
export const TERRAIN_STORAGE_ENTRIES = 48;
export const TERRAIN_REVISION = 9;
export type MeshMetadata = {
  key: string;
  signature: string;
  observer: number[];
  bytes: number;
  used: number;
};
export class TerrainStorage {
  stats = {
    hits: 0,
    misses: 0,
    writes: 0,
    errors: 0,
    bytes: 0,
    entries: 0,
    available: true,
  };
  private connection?: Promise<IDBDatabase | null>;
  private factory?: IDBFactory;
  constructor(factory?: IDBFactory) {
    try {
      this.factory = factory ?? globalThis.indexedDB;
    } catch {
      this.fail();
    }
  }
  private fail() {
    this.stats.errors++;
    this.stats.available = false;
  }
  private open(): Promise<IDBDatabase | null> {
    if (!this.stats.available) return Promise.resolve(null);
    if (this.connection) return this.connection;
    this.connection = new Promise((resolve) => {
      if (!this.factory) {
        this.fail();
        resolve(null);
        return;
      }
      let done = false;
      const finish = (db: IDBDatabase | null) => {
        if (done) {
          db?.close();
          return;
        }
        done = true;
        clearTimeout(timer);
        resolve(db);
      };
      const timer = setTimeout(() => {
        this.fail();
        finish(null);
      }, 1500);
      try {
        const request = this.factory.open(TERRAIN_DATABASE, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          db.createObjectStore('metadata', { keyPath: 'key' });
          db.createObjectStore('meshes');
        };
        request.onsuccess = () => {
          request.result.onversionchange = () => {
            request.result.close();
            this.stats.available = false;
          };
          finish(request.result);
        };
        request.onerror = request.onblocked = () => {
          this.fail();
          finish(null);
        };
      } catch {
        this.fail();
        finish(null);
      }
    });
    return this.connection;
  }
  private async transaction<T>(
    mode: IDBTransactionMode,
    work: (tx: IDBTransaction, result: (v: T) => void) => void,
  ): Promise<T | undefined> {
    const db = await this.open();
    if (!db) return undefined;
    return new Promise((resolve) => {
      let value: T | undefined,
        settled = false;
      const finish = (failed = false) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (failed) this.fail();
        resolve(failed ? undefined : value);
      };
      let tx: IDBTransaction;
      const timer = setTimeout(() => {
        try {
          tx?.abort();
        } catch {
          /* already closed */
        }
        finish(true);
      }, 1500);
      try {
        tx = db.transaction(['metadata', 'meshes'], mode);
        tx.oncomplete = () => finish();
        tx.onerror = tx.onabort = () => finish(true);
        work(tx, (v) => {
          value = v;
        });
      } catch {
        finish(true);
      }
    });
  }
  async read<T>(
    signature: string,
    compatible: (observer: number[]) => boolean,
    validate: (payload: unknown) => payload is T,
  ): Promise<{ payload: T; observer: number[] } | null> {
    const records = await this.transaction<MeshMetadata[]>(
      'readonly',
      (tx, result) => {
        const request = tx.objectStore('metadata').getAll();
        request.onsuccess = () => result(request.result);
      },
    );
    if (records && !records.every(validMetadata)) {
      await this.clear();
      this.stats.misses++;
      return null;
    }
    if (records) {
      this.stats.entries = records.length;
      this.stats.bytes = records.reduce((sum, e) => sum + e.bytes, 0);
      for (const meta of records.sort((a, b) => b.used - a.used)) {
        if (
          meta.signature !== signature ||
          !Array.isArray(meta.observer) ||
          meta.observer.length !== 3 ||
          !meta.observer.every(Number.isFinite) ||
          !compatible(meta.observer)
        )
          continue;
        const payload = await this.transaction<unknown>(
          'readonly',
          (tx, result) => {
            const request = tx.objectStore('meshes').get(meta.key);
            request.onsuccess = () => result(request.result);
          },
        );
        if (!validate(payload) || payloadBytes(payload) !== meta.bytes) {
          await this.remove(meta.key);
          continue;
        }
        await this.transaction('readwrite', (tx) => {
          const store = tx.objectStore('metadata'),
            request = store.get(meta.key);
          request.onsuccess = () => {
            if (request.result)
              store.put({ ...request.result, used: Date.now() });
          };
        });
        this.stats.hits++;
        return { payload, observer: meta.observer };
      }
    }
    this.stats.misses++;
    return null;
  }
  private async clear() {
    await this.transaction('readwrite', (tx) => {
      tx.objectStore('metadata').clear();
      tx.objectStore('meshes').clear();
    });
    this.stats.bytes = 0;
    this.stats.entries = 0;
  }
  async remove(key: string) {
    await this.transaction('readwrite', (tx) => {
      tx.objectStore('metadata').delete(key);
      tx.objectStore('meshes').delete(key);
    });
  }
  async write(
    signature: string,
    observer: number[],
    payload: unknown,
    bytes: number,
  ) {
    if (
      bytes > TERRAIN_STORAGE_BYTES ||
      bytes <= 0 ||
      bytes !== payloadBytes(payload)
    )
      return;
    const key = JSON.stringify([signature, observer]);
    const stored = await this.transaction<boolean>(
      'readwrite',
      (tx, result) => {
        const metadata = tx.objectStore('metadata'),
          meshes = tx.objectStore('meshes');
        const request = metadata.getAll();
        request.onsuccess = () => {
          if (!(request.result as MeshMetadata[]).every(validMetadata)) {
            metadata.clear();
            meshes.clear();
            request.result.length = 0;
          }
          const records = (request.result as MeshMetadata[])
            .filter((e) => e.key !== key)
            .sort((a, b) => a.used - b.used);
          let total = records.reduce((sum, e) => sum + e.bytes, 0);
          while (
            records.length &&
            (total + bytes > TERRAIN_STORAGE_BYTES ||
              records.length >= TERRAIN_STORAGE_ENTRIES)
          ) {
            const oldest = records.shift()!;
            total -= oldest.bytes;
            metadata.delete(oldest.key);
            meshes.delete(oldest.key);
          }
          metadata.put({
            key,
            signature,
            observer,
            bytes,
            used: Date.now(),
          } satisfies MeshMetadata);
          meshes.put(payload, key);
          this.stats.bytes = total + bytes;
          this.stats.entries = records.length + 1;
          result(true);
        };
      },
    );
    if (stored) this.stats.writes++;
  }
}

function validMetadata(e: MeshMetadata) {
  return (
    !!e &&
    typeof e.key === 'string' &&
    typeof e.signature === 'string' &&
    Number.isInteger(e.bytes) &&
    e.bytes > 0 &&
    e.bytes <= TERRAIN_STORAGE_BYTES &&
    Number.isFinite(e.used) &&
    Array.isArray(e.observer) &&
    e.observer.length === 3 &&
    e.observer.every(Number.isFinite)
  );
}
export function payloadBytes(payload: unknown) {
  if (!payload || typeof payload !== 'object') return 0;
  return Object.values(payload).reduce<number>(
    (sum, v) => sum + (ArrayBuffer.isView(v) ? v.byteLength : 0),
    0,
  );
}
