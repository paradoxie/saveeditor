const DB_NAME = 'saveeditor-local-retention';
const DB_VERSION = 1;
const SETTINGS_STORE = 'settings';
const HISTORY_STORE = 'history';
const RETENTION_ENABLED_KEY = 'retentionEnabled';
const MAX_HISTORY_ITEMS = 10;
export const MAX_LOCAL_HISTORY_RECORD_BYTES = 50 * 1024 * 1024;

export interface LocalHistoryRecord {
    id: string;
    fileName: string;
    format: string;
    editorSlug?: string;
    originalBlob: Blob;
    editedBlob: Blob;
    createdAt: number;
    size: number;
}

export interface LocalHistorySummary {
    id: string;
    fileName: string;
    format: string;
    editorSlug?: string;
    createdAt: number;
    size: number;
}

export interface LocalHistoryInput {
    fileName: string;
    format: string;
    editorSlug?: string;
    originalFile: File;
    editedBlob: Blob;
}

function canUseIndexedDb(): boolean {
    return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function createId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `history-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function openDatabase(): Promise<IDBDatabase> {
    if (!canUseIndexedDb()) {
        return Promise.reject(new Error('IndexedDB is unavailable in this browser context.'));
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
                db.createObjectStore(SETTINGS_STORE);
            }
            if (!db.objectStoreNames.contains(HISTORY_STORE)) {
                const store = db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Failed to open local retention database.'));
    });
}

async function withStore<T>(
    storeName: string,
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
    const db = await openDatabase();

    return new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        let settled = false;
        let completed = false;
        let hasValue = false;
        let value: T;

        const settle = (fn: () => void) => {
            if (settled) return;
            settled = true;
            db.close();
            fn();
        };

        transaction.oncomplete = () => {
            completed = true;
            if (hasValue) settle(() => resolve(value));
        };
        transaction.onerror = () => {
            settle(() => reject(transaction.error || new Error('Local retention transaction failed.')));
        };
        transaction.onabort = () => {
            settle(() => reject(transaction.error || new Error('Local retention transaction aborted.')));
        };

        Promise.resolve(run(store))
            .then((nextValue) => {
                value = nextValue;
                hasValue = true;
                if (completed) settle(() => resolve(value));
            })
            .catch((error) => {
                try {
                    transaction.abort();
                } catch {
                    // Keep the original error; abort can fail after the transaction is done.
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

function notifyRetentionChanged(): void {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('local-retention-changed'));
    }
}

function summarize(record: LocalHistoryRecord): LocalHistorySummary {
    const { originalBlob: _originalBlob, editedBlob: _editedBlob, ...summary } = record;
    return summary;
}

export async function isLocalRetentionAvailable(): Promise<boolean> {
    if (!canUseIndexedDb()) return false;

    try {
        const db = await openDatabase();
        db.close();
        return true;
    } catch {
        return false;
    }
}

export async function getLocalRetentionEnabled(): Promise<boolean> {
    if (!canUseIndexedDb()) return false;

    try {
        return await withStore(SETTINGS_STORE, 'readonly', async (store) => {
            const value = await requestToPromise(store.get(RETENTION_ENABLED_KEY));
            return value === true;
        });
    } catch {
        return false;
    }
}

export async function setLocalRetentionEnabled(enabled: boolean): Promise<void> {
    if (!canUseIndexedDb()) return;

    await withStore(SETTINGS_STORE, 'readwrite', async (store) => {
        await requestToPromise(store.put(enabled, RETENTION_ENABLED_KEY));
    });

    if (!enabled) {
        await clearLocalHistory();
        return;
    }

    notifyRetentionChanged();
}

export async function saveLocalHistoryRecord(input: LocalHistoryInput): Promise<LocalHistorySummary | null> {
    if (!canUseIndexedDb()) return null;
    if (!(await getLocalRetentionEnabled())) return null;

    const totalSize = input.originalFile.size + input.editedBlob.size;
    if (totalSize > MAX_LOCAL_HISTORY_RECORD_BYTES) return null;

    const record: LocalHistoryRecord = {
        id: createId(),
        fileName: input.fileName,
        format: input.format,
        editorSlug: input.editorSlug,
        originalBlob: input.originalFile,
        editedBlob: input.editedBlob,
        createdAt: Date.now(),
        size: totalSize,
    };

    await withStore(HISTORY_STORE, 'readwrite', async (store) => {
        await requestToPromise(store.put(record));
        await pruneHistoryStore(store);
    });

    notifyRetentionChanged();
    return summarize(record);
}

async function pruneHistoryStore(store: IDBObjectStore): Promise<void> {
    const records = await readAllHistoryRecords(store);
    const stale = records
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(MAX_HISTORY_ITEMS);

    for (const record of stale) {
        await requestToPromise(store.delete(record.id));
    }
}

function readAllHistoryRecords(store: IDBObjectStore): Promise<LocalHistoryRecord[]> {
    if (typeof store.getAll === 'function') {
        return requestToPromise(store.getAll() as IDBRequest<LocalHistoryRecord[]>);
    }

    return new Promise((resolve, reject) => {
        const records: LocalHistoryRecord[] = [];
        const cursorRequest = store.openCursor();
        cursorRequest.onerror = () => reject(cursorRequest.error || new Error('Failed to read local history.'));
        cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (!cursor) {
                resolve(records);
                return;
            }
            records.push(cursor.value as LocalHistoryRecord);
            cursor.continue();
        };
    });
}

export async function listLocalHistory(): Promise<LocalHistorySummary[]> {
    if (!canUseIndexedDb()) return [];

    try {
        return await withStore(HISTORY_STORE, 'readonly', async (store) => {
            const records = await readAllHistoryRecords(store);
            return records
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, MAX_HISTORY_ITEMS)
                .map(summarize);
        });
    } catch {
        return [];
    }
}

export async function getLocalHistoryRecord(id: string): Promise<LocalHistoryRecord | null> {
    if (!id || !canUseIndexedDb()) return null;

    return withStore(HISTORY_STORE, 'readonly', async (store) => {
        return (await requestToPromise(store.get(id) as IDBRequest<LocalHistoryRecord | undefined>)) || null;
    });
}

export async function deleteLocalHistoryRecord(id: string): Promise<void> {
    if (!id || !canUseIndexedDb()) return;

    await withStore(HISTORY_STORE, 'readwrite', async (store) => {
        await requestToPromise(store.delete(id));
    });
    notifyRetentionChanged();
}

export async function clearLocalHistory(): Promise<void> {
    if (!canUseIndexedDb()) return;

    await withStore(HISTORY_STORE, 'readwrite', async (store) => {
        await requestToPromise(store.clear());
    });
    notifyRetentionChanged();
}

export function createHistoryFile(
    record: LocalHistoryRecord,
    variant: 'original' | 'edited'
): File {
    const blob = variant === 'original' ? record.originalBlob : record.editedBlob;
    return new File([blob], record.fileName, {
        type: blob.type || 'application/octet-stream',
        lastModified: record.createdAt,
    });
}
