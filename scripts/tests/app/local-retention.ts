import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { readFileSync } from 'node:fs';

type RequestLike<T = unknown> = {
    result?: T;
    error?: Error;
    onsuccess?: () => void;
    onerror?: () => void;
    onupgradeneeded?: () => void;
};

class FakeTransaction {
    oncomplete?: () => void;
    onerror?: () => void;
    onabort?: () => void;
    error?: Error;
    private pending = 0;
    private aborted = false;

    constructor(private stores: Map<string, FakeObjectStore>, private storeName: string) {}

    objectStore() {
        return this.stores.get(this.storeName)!;
    }

    request<T>(work: () => T): RequestLike<T> {
        const request: RequestLike<T> = {};
        this.pending += 1;
        setTimeout(() => {
            if (this.aborted) return;
            try {
                request.result = work();
                request.onsuccess?.();
            } catch (error: any) {
                request.error = error;
                this.error = error;
                request.onerror?.();
                this.onerror?.();
            } finally {
                this.pending -= 1;
                setTimeout(() => {
                    if (!this.aborted && this.pending === 0) this.oncomplete?.();
                }, 0);
            }
        }, 0);
        return request;
    }

    abort() {
        this.aborted = true;
        this.onabort?.();
    }
}

class FakeObjectStore {
    private data = new Map<string, any>();

    constructor(private transaction?: FakeTransaction) {}

    bind(transaction: FakeTransaction) {
        const store = new FakeObjectStore(transaction);
        store.data = this.data;
        return store;
    }

    createIndex() {}

    get(key: string) {
        return this.transaction!.request(() => this.data.get(key));
    }

    put(value: any, key?: string) {
        return this.transaction!.request(() => {
            this.data.set(key || value.id, value);
            return key || value.id;
        });
    }

    delete(key: string) {
        return this.transaction!.request(() => {
            this.data.delete(key);
            return undefined;
        });
    }

    clear() {
        return this.transaction!.request(() => {
            this.data.clear();
            return undefined;
        });
    }

    getAll() {
        return this.transaction!.request(() => Array.from(this.data.values()));
    }
}

class FakeDatabase {
    stores = new Map<string, FakeObjectStore>();
    objectStoreNames = {
        contains: (name: string) => this.stores.has(name),
    };

    createObjectStore(name: string) {
        const store = new FakeObjectStore();
        this.stores.set(name, store);
        return store;
    }

    transaction(storeName: string) {
        const transaction = new FakeTransaction(this.stores, storeName);
        this.stores.set(storeName, this.stores.get(storeName)!.bind(transaction));
        return transaction;
    }

    close() {}
}

class FakeIndexedDB {
    db = new FakeDatabase();

    open() {
        const request: RequestLike<FakeDatabase> = {};
        setTimeout(() => {
            request.result = this.db;
            request.onupgradeneeded?.();
            request.onsuccess?.();
        }, 0);
        return request;
    }
}

class BrokenIndexedDB {
    open() {
        const request: RequestLike = {};
        setTimeout(() => {
            request.error = new Error('blocked');
            request.onerror?.();
        }, 0);
        return request;
    }
}

function read(path: string): string {
    return readFileSync(new URL(path, import.meta.url), 'utf8');
}

(globalThis as any).window = { dispatchEvent() {} };
(globalThis as any).CustomEvent = class CustomEvent {
    constructor(public type: string) {}
};
(globalThis as any).indexedDB = new FakeIndexedDB();

const retention = await import('../../../src/lib/local-retention.ts');

assert.equal(await retention.isLocalRetentionAvailable(), true);
assert.equal(await retention.getLocalRetentionEnabled(), false);

const original = new File(['original'], 'slot01.sav', { type: 'application/octet-stream' });
const edited = new Blob(['edited'], { type: 'application/octet-stream' });

assert.equal(await retention.saveLocalHistoryRecord({
    fileName: original.name,
    format: 'unreal',
    editorSlug: 'unreal',
    originalFile: original,
    editedBlob: edited,
}), null);

await retention.setLocalRetentionEnabled(true);
assert.equal(await retention.getLocalRetentionEnabled(), true);

const first = await retention.saveLocalHistoryRecord({
    fileName: original.name,
    format: 'unreal',
    editorSlug: 'unreal',
    originalFile: original,
    editedBlob: edited,
});
assert.ok(first?.id);
assert.equal((await retention.listLocalHistory()).length, 1);

const loaded = await retention.getLocalHistoryRecord(first!.id);
assert.equal(loaded?.fileName, 'slot01.sav');
assert.equal(retention.createHistoryFile(loaded!, 'edited').name, 'slot01.sav');

for (let i = 0; i < 12; i += 1) {
    await retention.saveLocalHistoryRecord({
        fileName: `slot-${i}.sav`,
        format: 'unreal',
        originalFile: new File([String(i)], `slot-${i}.sav`),
        editedBlob: new Blob([`edited-${i}`]),
    });
}
const pruned = await retention.listLocalHistory();
assert.equal(pruned.length, 10);
assert.equal(pruned.some((item) => item.fileName === 'slot01.sav'), false);

await retention.deleteLocalHistoryRecord(pruned[0].id);
assert.equal((await retention.listLocalHistory()).length, 9);

await retention.clearLocalHistory();
assert.equal((await retention.listLocalHistory()).length, 0);

const tooLarge = { name: 'large.sav', size: retention.MAX_LOCAL_HISTORY_RECORD_BYTES + 1 } as File;
assert.equal(await retention.saveLocalHistoryRecord({
    fileName: tooLarge.name,
    format: 'unreal',
    originalFile: tooLarge,
    editedBlob: new Blob(['edited']),
}), null);
assert.equal((await retention.listLocalHistory()).length, 0);

await retention.setLocalRetentionEnabled(false);
assert.equal(await retention.getLocalRetentionEnabled(), false);

(globalThis as any).indexedDB = new BrokenIndexedDB();
assert.equal(await retention.isLocalRetentionAvailable(), false);
assert.equal(await retention.getLocalRetentionEnabled(), false);
assert.equal(await retention.saveLocalHistoryRecord({
    fileName: original.name,
    format: 'unreal',
    originalFile: original,
    editedBlob: edited,
}), null);

const panelSource = read('../../../src/components/LocalHistoryPanel.tsx');
assert.match(panelSource, /await isLocalRetentionAvailable\(\)/);
assert.match(panelSource, /historyDownloadName/);
assert.match(panelSource, /createHistoryFile/);

const saveEditorSource = read('../../../src/components/SaveEditor.tsx');
assert.match(saveEditorSource, /pendingHistoryBlob/);
assert.match(saveEditorSource, /saveLocalHistoryRecord/);
assert.match(saveEditorSource, /const sponsorHref = import\.meta\.env\.PUBLIC_SPONSOR_URL \|\| ''/);
assert.match(saveEditorSource, /if \(sponsorHref &&/);

const templates = await import('../../../src/lib/local-templates.ts');
(globalThis as any).indexedDB = new FakeIndexedDB();
assert.equal(await templates.isLocalTemplatesAvailable(), true);
const savedTemplate = await templates.saveLocalTemplate({
    name: 'Gold max',
    format: 'unreal',
    editorSlug: 'unreal',
    fields: [{ path: ['player', 'gold'], value: 99999 }],
});
assert.ok(savedTemplate?.id);
assert.equal((await templates.listLocalTemplates('unreal', 'unreal')).length, 1);
await templates.deleteLocalTemplate(savedTemplate!.id);
assert.equal((await templates.listLocalTemplates('unreal', 'unreal')).length, 0);

const templatePanelSource = read('../../../src/components/LocalTemplatePanel.tsx');
assert.match(templatePanelSource, /collectTemplateFields/);
assert.match(templatePanelSource, /applyTemplate/);
assert.match(templatePanelSource, /template_save/);
assert.match(templatePanelSource, /template_apply/);

const baseLayoutSource = read('../../../src/layouts/BaseLayout.astro');
assert.match(baseLayoutSource, /serviceWorker\.register\('\/sw\.js'\)/);
assert.match(baseLayoutSource, /\/site\.webmanifest/);
assert.match(baseLayoutSource, /event: 'pageview'/);

const observeSource = read('../../../src/pages/api/observe.ts');
assert.match(observeSource, /first_party_observation/);
assert.match(observeSource, /contentLength > 4096/);

const swSource = read('../../../public/sw.js');
assert.match(swSource, /CACHE_NAME/);
assert.match(swSource, /\/api\//);

console.log('Local retention suite passed.');
