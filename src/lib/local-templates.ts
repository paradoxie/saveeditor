const DB_NAME = 'saveeditor-local-templates';
const DB_VERSION = 1;
const TEMPLATE_STORE = 'templates';
const MAX_TEMPLATES = 20;
const MAX_TEMPLATE_FIELDS = 200;
const MAX_TEMPLATE_BYTES = 256 * 1024;

export interface LocalTemplateField {
    path: Array<string | number>;
    value: string | number | boolean | null;
}

export interface LocalTemplateRecord {
    id: string;
    name: string;
    format: string;
    editorSlug?: string;
    fields: LocalTemplateField[];
    createdAt: number;
    updatedAt: number;
}

export interface LocalTemplateInput {
    name: string;
    format: string;
    editorSlug?: string;
    fields: LocalTemplateField[];
}

function canUseIndexedDb(): boolean {
    return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function createId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `template-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function openDatabase(): Promise<IDBDatabase> {
    if (!canUseIndexedDb()) {
        return Promise.reject(new Error('IndexedDB is unavailable.'));
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(TEMPLATE_STORE)) {
                const store = db.createObjectStore(TEMPLATE_STORE, { keyPath: 'id' });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
                store.createIndex('scope', ['format', 'editorSlug'], { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Failed to open template database.'));
    });
}

async function withStore<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
    const db = await openDatabase();

    return new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(TEMPLATE_STORE, mode);
        const store = transaction.objectStore(TEMPLATE_STORE);
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
        transaction.onerror = () => settle(() => reject(transaction.error || new Error('Template transaction failed.')));
        transaction.onabort = () => settle(() => reject(transaction.error || new Error('Template transaction aborted.')));

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
                    // Preserve the original failure.
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

function notifyTemplatesChanged(): void {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('local-templates-changed'));
    }
}

function readAllTemplates(store: IDBObjectStore): Promise<LocalTemplateRecord[]> {
    return requestToPromise(store.getAll() as IDBRequest<LocalTemplateRecord[]>);
}

function normalizeFields(fields: LocalTemplateField[]): LocalTemplateField[] {
    return fields
        .filter((field) => field.path.length > 0 && field.path.length <= 12)
        .filter((field) => ['string', 'number', 'boolean'].includes(typeof field.value) || field.value === null)
        .slice(0, MAX_TEMPLATE_FIELDS);
}

export async function isLocalTemplatesAvailable(): Promise<boolean> {
    if (!canUseIndexedDb()) return false;

    try {
        const db = await openDatabase();
        db.close();
        return true;
    } catch {
        return false;
    }
}

export async function listLocalTemplates(format: string, editorSlug?: string): Promise<LocalTemplateRecord[]> {
    if (!canUseIndexedDb()) return [];

    try {
        return await withStore('readonly', async (store) => {
            const templates = await readAllTemplates(store);
            return templates
                .filter((item) => item.format === format && (item.editorSlug || '') === (editorSlug || ''))
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .slice(0, MAX_TEMPLATES);
        });
    } catch {
        return [];
    }
}

export async function saveLocalTemplate(input: LocalTemplateInput): Promise<LocalTemplateRecord | null> {
    if (!canUseIndexedDb()) return null;

    const fields = normalizeFields(input.fields);
    if (fields.length === 0) return null;

    const record: LocalTemplateRecord = {
        id: createId(),
        name: input.name.trim().slice(0, 80) || 'Template',
        format: input.format,
        editorSlug: input.editorSlug,
        fields,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    if (JSON.stringify(record).length > MAX_TEMPLATE_BYTES) return null;

    await withStore('readwrite', async (store) => {
        await requestToPromise(store.put(record));
        const templates = await readAllTemplates(store);
        const stale = templates
            .filter((item) => item.format === input.format && (item.editorSlug || '') === (input.editorSlug || ''))
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(MAX_TEMPLATES);

        for (const item of stale) {
            await requestToPromise(store.delete(item.id));
        }
    });

    notifyTemplatesChanged();
    return record;
}

export async function deleteLocalTemplate(id: string): Promise<void> {
    if (!id || !canUseIndexedDb()) return;

    await withStore('readwrite', async (store) => {
        await requestToPromise(store.delete(id));
    });
    notifyTemplatesChanged();
}
