import React from 'react';
import { ui } from '../../i18n/ui';

interface GenericInspectorProps {
    data: any;
    supportHref: string;
    canSave: boolean;
    warnings?: string[];
}

interface Row {
    path: string;
    type: string;
    value: string;
}

export default function GenericInspector({ data, supportHref, canSave, warnings = [] }: GenericInspectorProps) {
    const lang = typeof document !== 'undefined'
        ? (document.documentElement.getAttribute('lang') as keyof typeof ui) || 'en'
        : 'en';
    const t = (key: string) => (ui as any)[lang]?.[key] || (ui as any).en[key] || key;
    const [query, setQuery] = React.useState('');
    const rows = React.useMemo(() => flattenRows(data?.data ?? data?._summary ?? data), [data]);
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
        ? rows.filter((row) => `${row.path} ${row.type} ${row.value}`.toLowerCase().includes(normalizedQuery))
        : rows;
    const readOnly = data?._readOnly !== false || !canSave;

    return (
        <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
                <p className="font-semibold">
                    {data?._format || t('editor.genericInspectorFallback')} · {readOnly ? t('editor.genericInspectorReadOnly') : t('editor.genericInspectorEditable')}
                </p>
                <p className="mt-1 text-slate-600">{readOnly ? t('editor.genericInspectorBody') : t('editor.genericInspectorEditableBody')}</p>
                {warnings.length > 0 && (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600">
                        {warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                        ))}
                    </ul>
                )}
                {readOnly && (
                    <a href={supportHref} className="mt-3 inline-flex rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100">
                        {t('editor.genericInspectorSample')}
                    </a>
                )}
            </div>

            <input
                className="w-full rounded-lg border border-slate-300 p-3 text-sm"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('editor.genericInspectorSearch')}
            />

            <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="sticky top-0 bg-white">
                        <tr>
                            <th className="px-3 py-2 text-left font-semibold text-slate-700">{t('editor.genericInspectorPath')}</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-700">{t('editor.genericInspectorType')}</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-700">{t('editor.genericInspectorValue')}</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-700">{t('editor.genericInspectorCopy')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {filtered.slice(0, 500).map((row) => (
                            <tr key={row.path}>
                                <td className="max-w-xs break-all px-3 py-2 font-mono text-xs text-slate-700">{row.path}</td>
                                <td className="px-3 py-2 text-slate-600">{row.type}</td>
                                <td className="max-w-md break-all px-3 py-2 text-slate-700">{row.value}</td>
                                <td className="px-3 py-2">
                                    <button
                                        type="button"
                                        className="rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                        onClick={() => void navigator.clipboard?.writeText(row.path)}
                                    >
                                        {t('editor.genericInspectorPath')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function flattenRows(input: unknown): Row[] {
    const rows: Row[] = [];
    const stack: Array<{ value: unknown; path: string }> = [{ value: input, path: '$' }];
    const visited = new WeakSet<object>();

    while (stack.length > 0 && rows.length < 2000) {
        const current = stack.pop();
        if (!current) break;
        const { value, path } = current;

        if (!value || typeof value !== 'object') {
            rows.push({ path, type: value === null ? 'null' : typeof value, value: String(value) });
            continue;
        }

        if (visited.has(value)) continue;
        visited.add(value);

        const entries = Array.isArray(value)
            ? value.map((item, index) => [String(index), item] as const)
            : Object.entries(value as Record<string, unknown>);

        rows.push({ path, type: Array.isArray(value) ? `array(${value.length})` : 'object', value: `${entries.length} children` });
        for (let index = entries.length - 1; index >= 0; index -= 1) {
            const [key, child] = entries[index];
            stack.push({ value: child, path: Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}` });
        }
    }

    return rows;
}
