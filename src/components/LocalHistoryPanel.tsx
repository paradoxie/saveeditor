import React from 'react';
import { ui } from '../i18n/ui';
import {
    clearLocalHistory,
    createHistoryFile,
    deleteLocalHistoryRecord,
    getLocalHistoryRecord,
    getLocalRetentionEnabled,
    isLocalRetentionAvailable,
    listLocalHistory,
    setLocalRetentionEnabled,
    type LocalHistorySummary
} from '../lib/local-retention';

interface LocalHistoryPanelProps {
    onFileSelect: (file: File) => void;
}

function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
    const mb = bytes / 1024 / 1024;
    if (mb >= 1) return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function historyDownloadName(fileName: string, variant: 'original' | 'edited'): string {
    const suffix = variant === 'original' ? 'backup' : 'edited';
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex <= 0) return `${fileName}.${suffix}`;
    return `${fileName.slice(0, dotIndex)}.${suffix}${fileName.slice(dotIndex)}`;
}

export default function LocalHistoryPanel({ onFileSelect }: LocalHistoryPanelProps) {
    const lang = typeof document !== 'undefined'
        ? (document.documentElement.getAttribute('lang') as keyof typeof ui) || 'en'
        : 'en';
    const t = (key: string) => (ui as any)[lang]?.[key] || (ui as any).en[key] || key;
    const [available, setAvailable] = React.useState(false);
    const [enabled, setEnabled] = React.useState(false);
    const [history, setHistory] = React.useState<LocalHistorySummary[]>([]);
    const [loading, setLoading] = React.useState(true);

    const refresh = React.useCallback(async () => {
        try {
            const nextAvailable = await isLocalRetentionAvailable();
            setAvailable(nextAvailable);
            if (!nextAvailable) {
                setEnabled(false);
                setHistory([]);
                setLoading(false);
                return;
            }
            const nextEnabled = await getLocalRetentionEnabled();
            setEnabled(nextEnabled);
            setHistory(nextEnabled ? await listLocalHistory() : []);
            setLoading(false);
        } catch {
            setAvailable(false);
            setEnabled(false);
            setHistory([]);
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        refresh();
        window.addEventListener('local-retention-changed', refresh);
        return () => window.removeEventListener('local-retention-changed', refresh);
    }, [refresh]);

    const enableHistory = async () => {
        try {
            await setLocalRetentionEnabled(true);
            await refresh();
        } catch {
            setAvailable(false);
        }
    };

    const disableAndClear = async () => {
        try {
            await setLocalRetentionEnabled(false);
            await refresh();
        } catch {
            setAvailable(false);
        }
    };

    const loadRecord = async (id: string, variant: 'original' | 'edited') => {
        try {
            const record = await getLocalHistoryRecord(id);
            if (!record) return;
            onFileSelect(createHistoryFile(record, variant));
        } catch {
            await refresh();
        }
    };

    const downloadRecord = async (item: LocalHistorySummary, variant: 'original' | 'edited') => {
        try {
            const record = await getLocalHistoryRecord(item.id);
            if (!record) return;
            const blob = variant === 'original' ? record.originalBlob : record.editedBlob;
            downloadBlob(blob, historyDownloadName(record.fileName, variant));
        } catch {
            await refresh();
        }
    };

    const deleteRecord = async (id: string) => {
        try {
            await deleteLocalHistoryRecord(id);
            await refresh();
        } catch {
            setAvailable(false);
        }
    };

    const clearAll = async () => {
        try {
            await clearLocalHistory();
            await refresh();
        } catch {
            setAvailable(false);
        }
    };

    if (loading || !available) return null;

    if (!enabled) {
        return (
            <section className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="font-semibold">{t('localHistory.title')}</p>
                        <p className="mt-1 text-blue-700">{t('localHistory.optInDesc')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={enableHistory}
                        className="inline-flex justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                        {t('localHistory.enable')}
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="font-semibold text-slate-900">{t('localHistory.title')}</p>
                    <p className="mt-1 text-sm text-slate-600">
                        {history.length > 0 ? t('localHistory.recent') : t('localHistory.empty')}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {history.length > 0 && (
                        <button
                            type="button"
                            onClick={clearAll}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            {t('localHistory.clear')}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={disableAndClear}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                        {t('localHistory.disable')}
                    </button>
                </div>
            </div>

            {history.length > 0 && (
                <div className="mt-4 space-y-3">
                    {history.map((item) => (
                        <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900">{item.fileName}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {item.format} · {formatBytes(item.size)} · {new Date(item.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button type="button" className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700" onClick={() => loadRecord(item.id, 'edited')}>
                                        {t('localHistory.loadEdited')}
                                    </button>
                                    <details className="relative">
                                        <summary className="cursor-pointer list-none rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">
                                            {t('localHistory.more')}
                                        </summary>
                                        <div className="absolute right-0 z-10 mt-2 flex w-44 flex-col rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                                            <button type="button" className="rounded-md px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100" onClick={() => loadRecord(item.id, 'original')}>
                                                {t('localHistory.loadOriginal')}
                                            </button>
                                            <button type="button" className="rounded-md px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100" onClick={() => downloadRecord(item, 'original')}>
                                                {t('localHistory.downloadOriginal')}
                                            </button>
                                            <button type="button" className="rounded-md px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100" onClick={() => downloadRecord(item, 'edited')}>
                                                {t('localHistory.downloadEdited')}
                                            </button>
                                            <button type="button" className="rounded-md px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50" onClick={() => deleteRecord(item.id)}>
                                                {t('localHistory.delete')}
                                            </button>
                                        </div>
                                    </details>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
