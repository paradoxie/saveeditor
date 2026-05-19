import { normalizeLang, type SiteLang } from '../i18n/utils';

const DB_NAME = 'saveeditor-online-upload-vault';
const DB_VERSION = 1;
const STORE_NAME = 'uploads';
const DEFAULT_TTL_MS = 1000 * 60 * 60;

export interface UploadTicket {
    token: string;
    name: string;
    size: number;
    type: string;
    lastModified: number;
    source: string;
    locale: SiteLang;
    createdAt: number;
}

interface StoredUploadRecord extends UploadTicket {
    file: Blob;
}

function canUseIndexedDb(): boolean {
    return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function createToken(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function openDatabase(): Promise<IDBDatabase> {
    if (!canUseIndexedDb()) {
        return Promise.reject(new Error('IndexedDB is unavailable in this browser context.'));
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'token' });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Failed to open upload vault.'));
    });
}

async function withStore<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
    const db = await openDatabase();

    return new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);

        let settled = false;
        const settle = (fn: () => void) => {
            if (settled) return;
            settled = true;
            fn();
        };

        transaction.oncomplete = () => {
            db.close();
        };
        transaction.onerror = () => {
            db.close();
            settle(() => reject(transaction.error || new Error('Upload vault transaction failed.')));
        };
        transaction.onabort = () => {
            db.close();
            settle(() => reject(transaction.error || new Error('Upload vault transaction aborted.')));
        };

        Promise.resolve(run(store))
            .then((value) => {
                settle(() => resolve(value));
            })
            .catch((error) => {
                try {
                    transaction.abort();
                } catch {
                    // Ignore abort failures; the original error is more useful.
                }
                settle(() => reject(error));
            });
    });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
    });
}

function toFile(record: StoredUploadRecord): File {
    if (record.file instanceof File) {
        return record.file;
    }
    return new File([record.file], record.name, {
        type: record.type,
        lastModified: record.lastModified,
    });
}

export async function pruneUploadVault(maxAgeMs = DEFAULT_TTL_MS): Promise<number> {
    if (!canUseIndexedDb()) return 0;

    return withStore('readwrite', async (store) => {
        const index = store.index('createdAt');
        const cutoff = Date.now() - maxAgeMs;
        let deleted = 0;

        await new Promise<void>((resolve, reject) => {
            const range = IDBKeyRange.upperBound(cutoff);
            const cursorRequest = index.openCursor(range);

            cursorRequest.onerror = () =>
                reject(cursorRequest.error || new Error('Failed to prune upload vault.'));

            cursorRequest.onsuccess = () => {
                const cursor = cursorRequest.result;
                if (!cursor) {
                    resolve();
                    return;
                }

                cursor.delete();
                deleted += 1;
                cursor.continue();
            };
        });

        return deleted;
    });
}

export async function createUploadTicket(
    file: File,
    options: { source: string; locale?: string | null }
): Promise<UploadTicket> {
    await pruneUploadVault();

    const ticket: UploadTicket = {
        token: createToken(),
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        source: options.source,
        locale: normalizeLang(options.locale),
        createdAt: Date.now(),
    };

    const record: StoredUploadRecord = {
        ...ticket,
        file,
    };

    await withStore('readwrite', async (store) => {
        await requestToPromise(store.put(record));
    });

    return ticket;
}

export async function getUploadTicket(token: string): Promise<UploadTicket | null> {
    if (!token || !canUseIndexedDb()) return null;

    return withStore('readonly', async (store) => {
        const record = await requestToPromise(store.get(token) as IDBRequest<StoredUploadRecord | undefined>);
        if (!record) return null;
        const { file: _file, ...ticket } = record;
        return ticket;
    });
}

export async function peekUploadFile(
    token: string
): Promise<{ ticket: UploadTicket; file: File } | null> {
    if (!token || !canUseIndexedDb()) return null;

    return withStore('readonly', async (store) => {
        const record = await requestToPromise(store.get(token) as IDBRequest<StoredUploadRecord | undefined>);
        if (!record) return null;
        const { file: _file, ...ticket } = record;
        return {
            ticket,
            file: toFile(record),
        };
    });
}

export async function consumeUploadFile(
    token: string
): Promise<{ ticket: UploadTicket; file: File } | null> {
    if (!token || !canUseIndexedDb()) return null;

    return withStore('readwrite', async (store) => {
        const record = await requestToPromise(store.get(token) as IDBRequest<StoredUploadRecord | undefined>);
        if (!record) return null;
        await requestToPromise(store.delete(token));
        const { file: _file, ...ticket } = record;
        return {
            ticket,
            file: toFile(record),
        };
    });
}

export async function deleteUploadTicket(token: string): Promise<void> {
    if (!token || !canUseIndexedDb()) return;

    await withStore('readwrite', async (store) => {
        await requestToPromise(store.delete(token));
    });
}
