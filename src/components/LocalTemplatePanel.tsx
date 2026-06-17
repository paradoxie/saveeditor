import React from 'react';
import { ui } from '../i18n/ui';
import {
    deleteLocalTemplate,
    isLocalTemplatesAvailable,
    listLocalTemplates,
    saveLocalTemplate,
    type LocalTemplateField,
    type LocalTemplateRecord
} from '../lib/local-templates';

interface LocalTemplatePanelProps {
    data: unknown;
    format: string;
    editorSlug?: string;
    readOnly?: boolean;
    onApply: (nextData: unknown) => void;
}

function cloneValue<T>(value: T): T {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
}

function getAtPath(root: any, path: Array<string | number>): unknown {
    let cursor = root;
    for (const segment of path) {
        if (cursor === null || typeof cursor !== 'object' || !(segment in cursor)) return undefined;
        cursor = cursor[segment as any];
    }
    return cursor;
}

function setAtPath(root: any, path: Array<string | number>, value: unknown): any {
    if (path.length === 0) return root;
    const nextRoot = cloneValue(root);
    let cursor = nextRoot;
    for (let i = 0; i < path.length - 1; i += 1) {
        const segment = path[i];
        if (cursor === null || typeof cursor !== 'object' || !(segment in cursor)) return root;
        cursor = cursor[segment as any];
    }
    const last = path[path.length - 1];
    if (cursor === null || typeof cursor !== 'object' || !(last in cursor)) return root;
    const current = cursor[last as any];
    if (current !== null && typeof current !== typeof value) return root;
    cursor[last as any] = value;
    return nextRoot;
}

function collectTemplateFields(root: unknown): LocalTemplateField[] {
    const fields: LocalTemplateField[] = [];

    const visit = (value: any, path: Array<string | number>, depth: number) => {
        if (fields.length >= 200 || depth > 8 || value === undefined) return;
        if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
            if (path.length > 0) fields.push({ path, value });
            return;
        }
        if (typeof value !== 'object') return;
        const entries = Array.isArray(value) ? value.map((item, index) => [index, item] as const) : Object.entries(value);
        for (const [key, child] of entries) {
            visit(child, [...path, key], depth + 1);
        }
    };

    visit(root, [], 0);
    return fields;
}

function applyTemplate(data: unknown, template: LocalTemplateRecord): unknown {
    let nextData = data;
    for (const field of template.fields) {
        if (getAtPath(nextData, field.path) !== undefined) {
            nextData = setAtPath(nextData, field.path, field.value);
        }
    }
    return nextData;
}

export default function LocalTemplatePanel({ data, format, editorSlug, readOnly = false, onApply }: LocalTemplatePanelProps) {
    const lang = typeof document !== 'undefined'
        ? (document.documentElement.getAttribute('lang') as keyof typeof ui) || 'en'
        : 'en';
    const t = (key: string) => (ui as any)[lang]?.[key] || (ui as any).en[key] || key;
    const [available, setAvailable] = React.useState(false);
    const [templates, setTemplates] = React.useState<LocalTemplateRecord[]>([]);
    const [name, setName] = React.useState('');
    const [open, setOpen] = React.useState(false);

    const refresh = React.useCallback(async () => {
        const nextAvailable = await isLocalTemplatesAvailable();
        setAvailable(nextAvailable);
        setTemplates(nextAvailable ? await listLocalTemplates(format, editorSlug) : []);
    }, [format, editorSlug]);

    React.useEffect(() => {
        refresh();
        window.addEventListener('local-templates-changed', refresh);
        return () => window.removeEventListener('local-templates-changed', refresh);
    }, [refresh]);

    const fields = React.useMemo(() => collectTemplateFields(data), [data]);

    const saveCurrent = async () => {
        const saved = await saveLocalTemplate({
            name: name || `${format} template`,
            format,
            editorSlug,
            fields,
        });
        if (saved) {
            recordFirstPartyEvent('template_save', { format, editorSlug });
            setName('');
            setOpen(false);
            await refresh();
        }
    };

    const remove = async (id: string) => {
        await deleteLocalTemplate(id);
        await refresh();
    };

    if (!available || readOnly || fields.length === 0) return null;

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="font-semibold text-slate-900">{t('localTemplates.title')}</p>
                    <p className="mt-1 text-slate-600">{t('localTemplates.desc')}</p>
                </div>
                <button
                    type="button"
                    onClick={() => setOpen((value) => !value)}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                    {t('localTemplates.save')}
                </button>
            </div>

            {open && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder={t('localTemplates.namePlaceholder')}
                    />
                    <button
                        type="button"
                        onClick={saveCurrent}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                        {t('localTemplates.confirmSave')}
                    </button>
                </div>
            )}

            {templates.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {templates.map((template) => (
                        <div key={template.id} className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                            <button
                                type="button"
                                onClick={() => {
                                    recordFirstPartyEvent('template_apply', { format, editorSlug });
                                    onApply(applyTemplate(data, template));
                                }}
                                className="px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                            >
                                {template.name}
                            </button>
                            <button
                                type="button"
                                onClick={() => remove(template.id)}
                                className="border-l border-slate-200 px-2 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                                aria-label={t('localTemplates.delete')}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function recordFirstPartyEvent(event: string, detail: Record<string, unknown>) {
    if (typeof navigator === 'undefined') return;
    const payload = JSON.stringify({
        event,
        path: typeof location !== 'undefined' ? location.pathname : '',
        detail,
        ts: Date.now(),
    });
    const body = new Blob([payload], { type: 'application/json' });
    if (typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon('/api/observe', body);
        return;
    }
    void fetch('/api/observe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
    }).catch(() => {});
}
