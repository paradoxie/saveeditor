import React, { useState } from 'react';
import { appendUploadToken } from '../lib/ingest';
import { ui } from '../i18n/ui';
import { localizePath } from '../i18n/utils';
import JsonEditor from './JsonEditor';
import BeforeAfterDiffWizard from './editors/BeforeAfterDiffWizard';
import RpgMakerEditor from './editors/RpgMakerEditor';
import GenericInspector from './editors/GenericInspector';
import QuickFieldEditor from './editors/QuickFieldEditor';
import { getLocalRetentionEnabled, saveLocalHistoryRecord, setLocalRetentionEnabled } from '../lib/local-retention';
import LocalTemplatePanel from './LocalTemplatePanel';
import { parseSaveFileSafe } from '../lib/parseSaveFile';
import { buildRejectedSupportPackFromFile, supportPackMailto } from '../lib/supportPack';
import type {
    PalworldInsightNote,
    PalworldParseResult,
    PalworldQuickField
} from '../lib/parsers/palworld';
import type { UnrealParseResult } from '../lib/parsers/unreal';
import { type ParserCapability, type SupportPackSummary } from '../lib/parsers/types';

interface SaveEditorProps {
    file: File;
    onBack: () => void;
    editorSlug?: string;
    uploadToken?: string;
}

type UnrealFamilyResult = UnrealParseResult | PalworldParseResult;

export default function SaveEditor({ file, onBack, editorSlug, uploadToken }: SaveEditorProps) {
    const lang = typeof window !== 'undefined'
        ? (document.documentElement.getAttribute('lang') as keyof typeof ui) || 'en'
        : 'en';
    const t = (key: string) => (ui as any)[lang]?.[key] || (ui as any).en[key] || key;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [format, setFormat] = useState<string>('unknown');
    const [capabilities, setCapabilities] = useState<ParserCapability | null>(null);
    const [activeTab, setActiveTab] = useState<'quick' | 'advanced'>('quick');
    const [isAdvancedLoading, setIsAdvancedLoading] = useState(false);
    const [advancedTool, setAdvancedTool] = useState<'editor' | 'diff'>('editor');
    const [experimentalEnabled, setExperimentalEnabled] = useState(false);
    const [errorAdvice, setErrorAdvice] = useState<string[]>([]);
    const [supportPack, setSupportPack] = useState<SupportPackSummary | null>(null);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [downloadNotice, setDownloadNotice] = useState<'bookmark' | 'historyPrompt' | null>(null);
    const [pendingHistoryBlob, setPendingHistoryBlob] = useState<Blob | null>(null);
    const [showSponsorPrompt, setShowSponsorPrompt] = useState(false);
    const contactHref = localizePath('/contact', lang);
    const sponsorHref = import.meta.env.PUBLIC_SPONSOR_URL || '';

    React.useEffect(() => {
        const parseFile = async () => {
            try {
                setLoading(true);
                setError(null);
                setErrorAdvice([]);
                setCapabilities(null);
                setSupportPack(null);
                setWarnings([]);

                // File size validation (50MB limit)
                const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
                if (file.size > MAX_FILE_SIZE) {
                    setSupportPack(await buildRejectedSupportPackFromFile({
                        file,
                        parserPath: editorSlug || 'upload',
                        failureStage: 'file_size_limit',
                        reasonCode: 'file_too_large',
                        format: file.name.split('.').pop()?.toLowerCase() || 'unknown',
                    }));
                    setError('File too large. Maximum file size is 50MB. Please try a smaller save file.');
                    setLoading(false);
                    return;
                }

                const ext = file.name.split('.').pop()?.toLowerCase();
                const { outcome, uiFormat } = await parseSaveFileSafe(file, editorSlug);
                setFormat(uiFormat);
                setSupportPack(outcome.diagnostics?.supportPack || null);
                setCapabilities(outcome.capabilities);
                setWarnings(outcome.warnings || []);

                if (!outcome.capabilities.canView) {
                    const reasonMessage =
                        outcome.reason ||
                        t('editor.parseError');
                    setError(`${t('editor.parseError')}: ${reasonMessage}`);
                    setErrorAdvice(buildErrorAdvice(ext, reasonMessage, t, outcome.reasonCode));
                    setData(null);
                    setLoading(false);
                    return;
                }

                setData(outcome.data);
                setLoading(false);
            } catch (err: any) {
                console.error(err);
                const ext = file.name.split('.').pop()?.toLowerCase();
                setSupportPack(await buildRejectedSupportPackFromFile({
                    file,
                    parserPath: editorSlug || 'editor',
                    failureStage: 'exception',
                    reasonCode: 'parse_failed',
                    format: ext ? `.${ext}` : 'unknown',
                }));
                setError(`${t('editor.parseError')}: ${err.message}`);
                setErrorAdvice(buildErrorAdvice(ext, err?.message || '', t, 'parse_failed'));
                setLoading(false);
            }
        };

        parseFile();
    }, [file, editorSlug]);

    const handleDownload = async () => {
        if (!data) return;
        if (!capabilities?.canSave) {
            alert('Saving is disabled for this file mode.');
            return;
        }

        if (capabilities.requiresExperimental && !experimentalEnabled) {
            if (format === 'renpy') {
                alert(t('editor.renpyExperimentalAlert'));
            } else {
                alert(t('editor.unrealExperimentalAlert'));
            }
            return;
        }

        if (capabilities.requiresExperimental) {
            const confirmed = window.confirm(
                "Guarded export may be incompatible with this save. Please confirm you've created a backup before continuing."
            );
            if (!confirmed) return;
        }

        try {
            let blob: Blob;
            if (format === 'unity') {
                const { buildUnity } = await import('../lib/parsers/unity');
                blob = await buildUnity(file, data);
            } else if (format === 'unreal') {
                const { buildUnreal } = await import('../lib/parsers/unreal');
                blob = await buildUnreal(file, data);
            } else if (format === 'palworld') {
                const { buildPalworld } = await import('../lib/parsers/palworld');
                blob = await buildPalworld(file, data);
            } else if (format.startsWith('naninovel')) {
                const { buildNaniNovel } = await import('../lib/parsers/naninovel');
                blob = await buildNaniNovel(file, data, format as any);
            } else if (format === 'renpy') {
                const { buildRenpy } = await import('../lib/parsers/renpy');
                blob = await buildRenpy(file, data);
            } else if (format === 'rpgmaker' || format === 'rpgmaker-ruby-marshal' || format === 'rpgmaker-2000-2003-lsd') {
                const { buildRPGMakerMV } = await import('../lib/parsers/rpgmaker');
                blob = await buildRPGMakerMV(file, data);
            } else if (format.startsWith('generic')) {
                const { buildGeneric } = await import('../lib/parsers/generic');
                blob = await buildGeneric(file, data);
            } else {
                // Gamemaker / Raw
                const { buildGamemaker } = await import('../lib/parsers/gamemaker');
                blob = await buildGamemaker(file, { type: format, data });
            }

            downloadBlob(await buildDownloadPackage(file, blob), `${file.name}.edited-with-backup.zip`);
            recordFirstPartyEvent('download', { format, editorSlug });
            if (sponsorHref && typeof localStorage !== 'undefined' && localStorage.getItem('saveeditor-sponsor-dismissed') !== '1') {
                setShowSponsorPrompt(true);
            }
            setPendingHistoryBlob(blob);
            setDownloadNotice('bookmark');

            void (async () => {
                try {
                    const historyEnabled = await getLocalRetentionEnabled();
                    if (!historyEnabled) {
                        setDownloadNotice('historyPrompt');
                        return;
                    }

                    await saveLocalHistoryRecord({
                        fileName: file.name,
                        format,
                        editorSlug,
                        originalFile: file,
                        editedBlob: blob,
                    });
                    setPendingHistoryBlob(null);
                } catch {
                    // Local history is optional; download must remain the reliable path.
                }
            })();
        } catch (err: any) {
            alert('Failed to build save file: ' + err.message);
        }
    };

    const enableLocalHistory = async () => {
        try {
            await setLocalRetentionEnabled(true);
            recordFirstPartyEvent('local_history_enable', { format, editorSlug });
            if (pendingHistoryBlob) {
                await saveLocalHistoryRecord({
                    fileName: file.name,
                    format,
                    editorSlug,
                    originalFile: file,
                    editedBlob: pendingHistoryBlob,
                });
                setPendingHistoryBlob(null);
            }
        } finally {
            setDownloadNotice('bookmark');
        }
    };

    const handleDataChange = (newData: any) => {
        if ((format === 'unreal' || format === 'palworld') && data?.jsonView !== undefined) {
            setData((prev: any) => ({
                ...prev,
                jsonView: newData,
            }));
            return;
        }
        if (format.startsWith('generic') && data?._format) {
            setData((prev: any) => ({
                ...prev,
                data: newData,
            }));
            return;
        }
        setData(newData);
    };

    const openAdvancedTools = (tool: 'editor' | 'diff' = 'editor') => {
        setAdvancedTool(tool);
        if (activeTab !== 'advanced') {
            setIsAdvancedLoading(true);
            setActiveTab('advanced');
            // Delay rendering to allow loading state to show
            setTimeout(() => setIsAdvancedLoading(false), 100);
        }
    };

    if (loading) {
        return (
            <div className="text-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">{t('editor.parsing')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-12 max-w-2xl mx-auto">
                {/* Error Icon and Message */}
                <div className="bg-red-50 border border-red-200 rounded-2xl p-8 mb-8">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-red-800 mb-2">{t('editor.parseError')}</h3>
                    <p className="text-red-600 mb-4">{error}</p>
                    {errorAdvice.length > 0 && (
                        <ul className="text-sm text-red-700 text-left list-disc list-inside space-y-1 mb-4">
                            {errorAdvice.map((tip, idx) => (
                                <li key={idx}>{tip}</li>
                            ))}
                        </ul>
                    )}
                    <button
                        onClick={onBack}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        {t('editor.tryAnotherAll')}
                    </button>
                </div>

                {/* Feedback Card */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 text-left">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-blue-900 mb-1">{t('editor.feedbackTitle')}</h4>
                            <p className="text-blue-700 text-sm mb-3">{t('editor.feedbackDesc')}</p>
                            <a
                                href={supportPack ? supportPackMailto(supportPack) : contactHref}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {t('editor.contactUs')}
                            </a>
                            {supportPack && (
                                <div className="mt-4 rounded-lg border border-blue-200 bg-white/80 p-3 text-xs text-blue-900">
                                    <p><strong>Reason:</strong> {supportPack.reasonCode}</p>
                                    <p><strong>Parser:</strong> {supportPack.parserPath}</p>
                                    <p><strong>Capability:</strong> {supportPack.capability}</p>
                                    <p><strong>Content:</strong> {supportPack.contentClass}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const isRaw = format === 'raw';
    const isRenpy = format === 'renpy';
    const isUnrealFamily = format === 'unreal' || format === 'palworld';
    const isPalworld = format === 'palworld';
    const unrealData = (isUnrealFamily ? data : null) as UnrealFamilyResult | null;
    const palworldData = (format === 'palworld' ? data : null) as PalworldParseResult | null;
    const unrealMode = unrealData?.mode;
    const isUnrealPartial = isUnrealFamily && unrealMode === 'partial';
    const isUnrealCompressedUnsupported = isUnrealFamily && unrealMode === 'unsupported_compressed';
    const isUnrealSaveSupported = isUnrealFamily && !!capabilities?.canSave;
    const isUnrealExperimentalRequired = isUnrealFamily && !!capabilities?.requiresExperimental;
    const showUnrealLimitedSupport =
        isUnrealFamily && (isUnrealPartial || isUnrealCompressedUnsupported || !isUnrealSaveSupported);
    const palworldQuickFields = (palworldData?._palworld?.quickFields ?? []).filter((field) => field.confidence === 'high');
    const palworldRole = palworldData?._palworld?.fileRole ?? 'unknown';
    const palworldNotes = palworldData?._palworld?.notes ?? [];
    const palworldPalsSummary = palworldData?._palworld?.palsSummary;
    const unrealReason = isUnrealFamily ? getUnrealReasonText(unrealData, t) : '';
    const isSaveDisabled =
        !capabilities?.canSave ||
        (!!capabilities?.requiresExperimental && !experimentalEnabled);
    const isReadOnly = !capabilities?.canEdit;
    const editorData = isUnrealFamily
        ? unrealData?.jsonView
        : format.startsWith('generic') && data?._format
          ? data.data
          : data;
    const genericCanEdit = format.startsWith('generic') ? buildGenericCanEdit(data) : undefined;
    const showQuickEdit =
        isPalworld ||
        format === 'rpgmaker' ||
        format === 'rpgmaker-ruby-marshal' ||
        format === 'rpgmaker-2000-2003-lsd' ||
        format === 'renpy' ||
        format.startsWith('generic') ||
        format === 'unity' ||
        format === 'json' ||
        format === 'raw' ||
        format === 'naninovel-nson' ||
        format === 'naninovel-json' ||
        format === 'naninovel-base64' ||
        format === 'naninovel-gzip' ||
        format === 'naninovel-zlib' ||
        format === 'naninovel-base64-gzip';
    const savWorkflowCopy = getSavWorkflowCopy(lang);
    const savAlternate =
        file.name.toLowerCase().endsWith('.sav') && editorSlug === 'palworld'
            ? {
                  href: appendUploadToken(localizePath('/editor/unreal', lang), uploadToken),
                  label: savWorkflowCopy.generic,
              }
            : file.name.toLowerCase().endsWith('.sav') && editorSlug === 'unreal'
              ? {
                    href: appendUploadToken(localizePath('/editor/palworld', lang), uploadToken),
                    label: savWorkflowCopy.palworld,
                }
              : null;

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-primary-100 p-2 rounded-lg">
                        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">{file.name}</h3>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded uppercase font-mono">{format}</span>
                            <span className="text-green-600 font-medium flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                {t('editor.clientSideSecure')}
                            </span>
                            <span className="text-blue-600 font-medium flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                                {t('editor.maxFileSize')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    {!isRaw && (
                        <div className="flex bg-white border border-gray-200 rounded-lg p-1 text-sm shadow-sm">
                            {showQuickEdit && (
                                <button
                                    onClick={() => setActiveTab('quick')}
                                    className={`px-4 py-1.5 rounded-md transition-all font-medium ${activeTab === 'quick' ? 'bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                                >
                                    Quick Edit
                                </button>
                            )}
                            <button
                                onClick={() => openAdvancedTools('editor')}
                                className={`px-4 py-1.5 rounded-md transition-all font-medium ${activeTab === 'advanced' ? 'bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                            >
                                {showQuickEdit ? 'Advanced' : 'Editor'}
                            </button>
                        </div>
                    )}
                    <button
                        onClick={onBack}
                        className="text-sm text-gray-500 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Close File"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {downloadNotice && (
                <div className="border-b border-blue-100 bg-blue-50 px-6 py-4 text-sm text-blue-900">
                    <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p>
                            {downloadNotice === 'historyPrompt'
                                ? t('localHistory.downloadPrompt')
                                : t('localHistory.bookmarkPrompt')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {downloadNotice === 'historyPrompt' && (
                                <button
                                    type="button"
                                    onClick={enableLocalHistory}
                                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                                >
                                    {t('localHistory.enable')}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setDownloadNotice(null)}
                                className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                            >
                                {t('localHistory.dismiss')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSponsorPrompt && (
                <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-4 text-sm text-emerald-950">
                    <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p>{t('sponsor.prompt')}</p>
                        <div className="flex flex-wrap gap-2">
                            <a
                                href={sponsorHref}
                                target={sponsorHref.startsWith('http') ? '_blank' : undefined}
                                rel={sponsorHref.startsWith('http') ? 'noopener noreferrer' : undefined}
                                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                                onClick={() => recordFirstPartyEvent('sponsor_click', { format, editorSlug })}
                            >
                                {t('sponsor.action')}
                            </a>
                            <button
                                type="button"
                                onClick={() => {
                                    localStorage.setItem('saveeditor-sponsor-dismissed', '1');
                                    setShowSponsorPrompt(false);
                                }}
                                className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                            >
                                {t('sponsor.dismiss')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6 space-y-6">
                <LocalTemplatePanel
                    data={editorData}
                    format={format}
                    editorSlug={editorSlug}
                    readOnly={isReadOnly}
                    onApply={handleDataChange}
                />

                {/* Format-specific warnings */}
                {format === 'renpy' && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <strong>{t('editor.renpyExperimentalTitle')}:</strong> {t('editor.renpyExperimentalBody')}
                        </div>
                    </div>
                )}
                {format === 'rpgmaker-ruby-marshal' && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <strong>Limited Ruby Marshal editing:</strong> RPG Maker XP/VX/VX Ace exports are enabled for common fields only. Structural changes are blocked to avoid unsafe rewrites.
                        </div>
                    </div>
                )}
                {showUnrealLimitedSupport && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="space-y-2">
                            <p><strong>{t('editor.unrealLimitedSupportTitle')}:</strong> {t('editor.unrealLimitedSupportBody')}</p>
                            <p className="text-red-700 font-medium mt-2">
                                {t('editor.unrealLimitedSupportAction')}
                            </p>
                        </div>
                    </div>
                )}
                {isUnrealPartial && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm">
                        <strong>{t('editor.unrealReadOnlyTitle')}:</strong> {t('editor.unrealPartialBody')}
                    </div>
                )}
                {isUnrealCompressedUnsupported && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm">
                        <strong>{t('editor.unrealReadOnlyTitle')}:</strong> {t('editor.unrealCompressedBody')}
                    </div>
                )}
                {isUnrealFamily && !isUnrealPartial && !isUnrealSaveSupported && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm">
                        <strong>{t('editor.unrealReadOnlyTitle')}:</strong> {t('editor.unrealReadOnlyBody')}
                    </div>
                )}
                {isUnrealFamily && unrealReason && (
                    <div className="bg-slate-50 border border-slate-200 text-slate-800 p-4 rounded-lg text-sm">
                        <strong>{t('editor.unrealParseDetailTitle')}:</strong> {unrealReason}
                    </div>
                )}
                {savAlternate && (
                    <div className="bg-cyan-50 border border-cyan-200 text-cyan-900 p-4 rounded-lg text-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <strong>{savWorkflowCopy.title}</strong> {savWorkflowCopy.body}
                        </div>
                        <a
                            href={savAlternate.href}
                            className="inline-flex items-center justify-center rounded-lg border border-cyan-300 bg-white px-4 py-2 text-sm font-medium text-cyan-800 hover:bg-cyan-100 transition-colors"
                        >
                            {savAlternate.label}
                        </a>
                    </div>
                )}
                {isUnrealFamily && isUnrealSaveSupported && isUnrealExperimentalRequired && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-sm">
                        <label className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                className="mt-1"
                                checked={experimentalEnabled}
                                onChange={(e) => setExperimentalEnabled(e.target.checked)}
                            />
                            <span>
                                <strong>{t('editor.enableExperimental')}</strong> ({t('editor.enableExperimentalNote')}). {t('editor.enableExperimentalHelp')}
                            </span>
                        </label>
                    </div>
                )}

                {isRaw ? (
                    <div className="space-y-4">
                        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-sm">
                            <strong>{t('editor.rawModeTitle')}:</strong> {t('editor.rawModeBody')}
                        </div>
                        <textarea
                            className="w-full h-[500px] font-mono text-sm p-4 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            value={typeof data === 'string' ? data : ''}
                            readOnly={isReadOnly}
                            onChange={(e) => setData(e.target.value)}
                        />
                    </div>
                ) : (
                    <>
                        {activeTab === 'quick' && showQuickEdit ? (
                            format === 'rpgmaker' || format === 'rpgmaker-ruby-marshal' || format === 'rpgmaker-2000-2003-lsd' ? (
                                <RpgMakerEditor data={data} onChange={handleDataChange} readOnly={isReadOnly} />
                            ) : format === 'palworld' ? (
                                <div className="space-y-5">
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-900">
                                        <p className="font-semibold">{t('editor.palworldQuickTitle')}</p>
                                        <p className="mt-1 text-indigo-700">{t('editor.palworldQuickDesc')}</p>
                                        <p className="mt-1 text-indigo-700">{t('editor.palworldDedicatedBoundary')}</p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className="inline-flex items-center rounded-full bg-white px-3 py-1 border border-indigo-200 text-xs font-medium">
                                                {t('editor.palworldRoleLabel')}: {getPalworldRoleLabel(palworldRole, t)}
                                            </span>
                                            <span className="inline-flex items-center rounded-full bg-white px-3 py-1 border border-indigo-200 text-xs font-medium">
                                                {t('editor.palworldFieldCountLabel')}: {palworldQuickFields.length}
                                            </span>
                                            {palworldPalsSummary && (
                                                <span className="inline-flex items-center rounded-full bg-white px-3 py-1 border border-indigo-200 text-xs font-medium">
                                                    {t('editor.palworldPalsCandidates')}: {palworldPalsSummary.candidateCount}
                                                </span>
                                            )}
                                            {isReadOnly && (
                                                <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-900 px-3 py-1 border border-amber-200 text-xs font-medium">
                                                    {t('editor.palworldQuickReadOnly')}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {palworldQuickFields.length === 0 ? (
                                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
                                            <p className="font-medium">{t('editor.palworldQuickEmpty')}</p>
                                            {palworldNotes.length > 0 && (
                                                <ul className="mt-2 list-disc list-inside text-gray-600 space-y-1">
                                                    {palworldNotes.map((note, idx) => (
                                                        <li key={idx}>{getPalworldNoteText(note, t)}</li>
                                                    ))}
                                                </ul>
                                            )}
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                                                    onClick={() => openAdvancedTools('diff')}
                                                >
                                                    Open diff wizard
                                                </button>
                                                <a
                                                    className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                                                    href={supportPack ? supportPackMailto(supportPack) : contactHref}
                                                >
                                                    Send anonymized support pack
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {palworldPalsSummary?.candidates?.length ? (
                                                <section className="rounded-xl border border-slate-200 bg-white p-4">
                                                    <p className="mb-3 text-sm font-semibold text-slate-900">{t('editor.palworldPalsCandidates')}</p>
                                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                        {palworldPalsSummary.candidates.map((pal) => (
                                                            <div key={pal.path.join('.')} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <span className="font-medium text-slate-900">{pal.label}</span>
                                                                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                                                                        pal.confidence === 'high'
                                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                                                    }`}>
                                                                        {getPalworldConfidenceLabel(pal.confidence, t)}
                                                                    </span>
                                                                </div>
                                                                {typeof pal.level === 'number' && <p className="mt-1 text-slate-600">Level: {pal.level}</p>}
                                                                <p className="mt-1 break-all font-mono text-xs text-slate-500">{pal.path.join('.')}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </section>
                                            ) : null}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {palworldQuickFields.map((field) => {
                                                    const currentValue = getNumericValueAtPath(editorData, field.path) ?? field.value;
                                                    return (
                                                        <div
                                                            key={field.path.join('.')}
                                                            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <p className="font-semibold text-gray-900">
                                                                    {getPalworldFieldLabel(field.id, t)}
                                                                </p>
                                                                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                                                                    field.confidence === 'high'
                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                                }`}>
                                                                    {getPalworldConfidenceLabel(field.confidence, t)}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 mb-2 font-mono break-all">
                                                                {field.path.join('.')}
                                                            </p>
                                                            <input
                                                                type="number"
                                                                className="block w-full rounded-lg border border-gray-300 bg-white shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2.5"
                                                                value={currentValue}
                                                                readOnly={isReadOnly}
                                                                onChange={(event) => {
                                                                    const nextValue = Number(event.target.value);
                                                                    if (!Number.isFinite(nextValue) || !editorData) return;
                                                                    const updated = setValueAtPath(editorData, field.path, nextValue);
                                                                    handleDataChange(updated);
                                                                }}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : format.startsWith('generic') ? (
                                <GenericInspector
                                    data={data}
                                    supportHref={supportPack ? supportPackMailto(supportPack) : contactHref}
                                    canSave={!!capabilities?.canSave}
                                    warnings={warnings}
                                    onChange={format === 'generic-nrbf' ? handleDataChange : undefined}
                                />
                            ) : (
                                <QuickFieldEditor
                                    data={editorData}
                                    onChange={handleDataChange}
                                    readOnly={isReadOnly}
                                    canEditPath={isRenpy ? (path) => path[0] === 'persistent' : undefined}
                                    allowItemAdd={!isRenpy}
                                    presetSlug={getPresetSlugForFormat(format, editorSlug)}
                                    supportHref={supportPack ? supportPackMailto(supportPack) : contactHref}
                                    onOpenDiffWizard={() => openAdvancedTools('diff')}
                                />
                            )
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm">
                                    <strong>{t('editor.advancedModeTitle')}:</strong> {t('editor.advancedModeBody')}
                                </div>
                                <div className="flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm">
                                    <button
                                        type="button"
                                        className={`rounded-md px-3 py-1.5 font-semibold ${advancedTool === 'editor' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                                        onClick={() => setAdvancedTool('editor')}
                                    >
                                        JSON editor
                                    </button>
                                    <button
                                        type="button"
                                        className={`rounded-md px-3 py-1.5 font-semibold ${advancedTool === 'diff' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                                        onClick={() => setAdvancedTool('diff')}
                                    >
                                        Diff wizard
                                    </button>
                                </div>
                                {isAdvancedLoading ? (
                                    <div className="flex flex-col items-center justify-center py-16 space-y-4">
                                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
                                        <p className="text-gray-500 text-sm">{t('editor.loadingJson')}</p>
                                        <p className="text-gray-400 text-xs">{t('editor.loadingLargeFile')}</p>
                                    </div>
                                ) : advancedTool === 'editor' ? (
                                    editorData && (
                                        <JsonEditor
                                            data={editorData}
                                            onChange={handleDataChange}
                                            readOnly={isReadOnly}
                                            canEdit={isRenpy ? canEditRenpy : genericCanEdit}
                                        />
                                    )
                                ) : (
                                    editorData && <BeforeAfterDiffWizard currentFile={file} editorSlug={editorSlug} />
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Feedback Card - Always visible at bottom of editor */}
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-t border-slate-200 px-6 py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
                    <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                        <span className="text-slate-600">
                            <span className="font-medium text-slate-800">问题反馈</span> · Have feedback? · ご意見は? · 피드백?
                        </span>
                    </div>
                    <a
                        href={supportPack ? supportPackMailto(supportPack) : contactHref}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Contact / 联系 / 連絡 / 연락
                    </a>
                </div>
            </div>

            {/* Floating Download Button - Centered */}
            {/* Some formats have limited saving support (Ren'Py limited, Unreal guarded) */}
            {!isSaveDisabled && (
            <button
                onClick={handleDownload}
                className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white py-3 px-8 rounded-full hover:bg-primary-700 transition-all font-medium flex items-center shadow-lg hover:shadow-xl z-50"
                title={t('editor.downloadTitle')}
            >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                {t('editor.download')}
            </button>
            )}
        </div>
    );
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

function recordFirstPartyEvent(event: string, detail: Record<string, unknown> = {}) {
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

async function buildDownloadPackage(originalFile: File, editedBlob: Blob): Promise<Blob> {
    const { zipSync } = await import('fflate');
    const archive = zipSync({
        [`${originalFile.name}.backup`]: new Uint8Array(await originalFile.arrayBuffer()),
        [originalFile.name]: new Uint8Array(await editedBlob.arrayBuffer()),
    });
    const archiveBuffer = new ArrayBuffer(archive.byteLength);
    new Uint8Array(archiveBuffer).set(archive);
    return new Blob([archiveBuffer], { type: 'application/zip' });
}

function canEditRenpy(path: Array<string | number>, value: any, action: 'edit' | 'add' | 'delete'): boolean {
    if (action === 'delete') return false;
    if (path.length === 0) return false;

    // Only allow edits under "persistent" and only for primitive values.
    if (path[0] !== 'persistent') return false;

    const isPrimitive =
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean';

    return isPrimitive;
}

function buildGenericCanEdit(data: any) {
    if (!data?._format) return undefined;
    if (data._format === '.NET BinaryFormatter / NRBF') return canEditGenericNrbf(data.data);
    if (data._format === 'SQLite database') return canEditGenericSqlite;
    if (data._format === 'ZIP container') return canEditGenericZip;
    if (String(data._format).includes('XML text') || String(data._format).includes('Plain text')) return canEditGenericText;
    if (['Godot / INI-style CFG', 'TOML', 'Properties / CONF'].includes(data._format)) {
        return (_path: Array<string | number>, _value: any, action: 'edit' | 'add' | 'delete') => action !== 'delete';
    }
    return undefined;
}

function canEditGenericNrbf(root: unknown) {
    return (path: Array<string | number>, _value: any, action: 'edit' | 'add' | 'delete') => {
        if (action !== 'edit' || path.length === 0) return false;
        let current: any = root;
        for (const segment of path) {
            if (!current || typeof current !== 'object' || !(segment in current)) return false;
            current = current[segment];
        }
        return current !== null && typeof current !== 'object';
    };
}

function canEditGenericZip(path: Array<string | number>, _value: any, action: 'edit' | 'add' | 'delete'): boolean {
    if (path[0] !== 'entries' || typeof path[1] !== 'string') return false;
    if (path.length <= 2 && action !== 'edit') return false;
    return true;
}

function canEditGenericText(path: Array<string | number>, _value: any, action: 'edit' | 'add' | 'delete'): boolean {
    return action === 'edit' && path.length === 1 && path[0] === 'text';
}

function canEditGenericSqlite(path: Array<string | number>, _value: any, action: 'edit' | 'add' | 'delete'): boolean {
    if (action !== 'edit') return false;
    if (path.includes('__rowid') || path.includes('columns') || path.includes('rowLimit') || path.includes('hasRowId')) {
        return false;
    }
    return (
        path.length === 5 &&
        path[0] === 'tables' &&
        typeof path[1] === 'string' &&
        path[2] === 'rows' &&
        typeof path[3] === 'number' &&
        typeof path[4] === 'string'
    );
}

function getSavWorkflowCopy(lang: string) {
    const copy = {
        en: {
            title: 'Need another .sav workflow?',
            body: 'This file can also be opened in the alternate `.sav` editor.',
            palworld: 'Try the Palworld workflow',
            generic: 'Try the generic Unreal workflow',
        },
        ja: {
            title: '別の .sav ワークフローを試しますか？',
            body: 'このファイルはもう一方の `.sav` エディタでも開けます。',
            palworld: 'Palworld ワークフローを試す',
            generic: '汎用 Unreal ワークフローを試す',
        },
        pt: {
            title: 'Precisa de outro fluxo para .sav?',
            body: 'Este arquivo também pode ser aberto no editor `.sav` alternativo.',
            palworld: 'Abrir no fluxo Palworld',
            generic: 'Abrir no fluxo Unreal genérico',
        },
        ko: {
            title: '다른 .sav 워크플로우가 필요하신가요?',
            body: '이 파일은 다른 `.sav` 에디터에서도 열 수 있습니다.',
            palworld: 'Palworld 워크플로우로 열기',
            generic: '일반 Unreal 워크플로우로 열기',
        },
        'zh-cn': {
            title: '需要切换其他 .sav 工作流吗？',
            body: '这个文件也可以在另一个 `.sav` 编辑器中打开。',
            palworld: '切换到 Palworld 工作流',
            generic: '切换到通用 Unreal 工作流',
        },
        es: {
            title: '¿Necesitas otro flujo para .sav?',
            body: 'Este archivo también puede abrirse en el editor `.sav` alternativo.',
            palworld: 'Probar el flujo de Palworld',
            generic: 'Probar el flujo genérico de Unreal',
        },
        ru: {
            title: 'Нужен другой сценарий для .sav?',
            body: 'Этот файл можно открыть и в альтернативном редакторе `.sav`.',
            palworld: 'Открыть сценарий Palworld',
            generic: 'Открыть общий сценарий Unreal',
        },
    } as const;

    return copy[(lang in copy ? lang : 'en') as keyof typeof copy];
}

function getPresetSlugForFormat(format: string, editorSlug?: string): string | undefined {
    if (editorSlug === 'palworld' || format === 'palworld') return 'palworld';
    if (format === 'renpy') return 'renpy-engine';
    if (format === 'unity') return 'unity-engine';
    if (format === 'raw') return 'gamemaker-engine';
    return undefined;
}

function getPalworldRoleLabel(role: string, t: (key: string) => string): string {
    if (role === 'player') return t('editor.palworldRolePlayer');
    if (role === 'world') return t('editor.palworldRoleWorld');
    return t('editor.palworldRoleUnknown');
}

function getPalworldFieldLabel(id: PalworldQuickField['id'], t: (key: string) => string): string {
    if (id === 'gold') return t('editor.palworldFieldGold');
    if (id === 'goldItem') return t('editor.palworldFieldGoldItem');
    if (id === 'techPoints') return t('editor.palworldFieldTechPoints');
    if (id === 'playerLevel') return t('editor.palworldFieldLevel');
    if (id === 'hp') return t('editor.palworldFieldHp');
    if (id === 'inventoryItem') return t('editor.palworldFieldInventoryItem');
    return t('editor.palworldFieldStamina');
}

function getPalworldConfidenceLabel(
    confidence: PalworldQuickField['confidence'],
    t: (key: string) => string
): string {
    if (confidence === 'high') return t('editor.palworldConfidenceHigh');
    return t('editor.palworldConfidenceMedium');
}

function getPalworldNoteText(note: PalworldInsightNote, t: (key: string) => string): string {
    if (note === 'read_only') return t('editor.palworldNoteReadOnly');
    if (note === 'world_file_limited') return t('editor.palworldNoteWorldLimited');
    if (note === 'heuristic_quick_fields') return t('editor.palworldNoteHeuristic');
    if (note === 'quick_fields_ambiguous') return t('editor.palworldNoteAmbiguous');
    if (note === 'quick_scan_limited') return t('editor.palworldNoteScanLimited');
    return t('editor.palworldNoteNoQuickFields');
}

function replaceTokens(template: string, values: Record<string, string>): string {
    return Object.entries(values).reduce(
        (output, [key, value]) => output.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
        template
    );
}

function getUnrealReasonText(
    data: UnrealFamilyResult | null,
    t: (key: string) => string
): string {
    if (!data) return '';

    const compression = data.reasonMeta?.compression ?? data.compression ?? 'unknown';
    const parseError = data.reasonMeta?.parserError;
    const maxBytes = data.reasonMeta?.maxDecompressedBytes;
    const maxMb = maxBytes ? Math.round((maxBytes / (1024 * 1024)) * 10) / 10 : null;

    switch (data.reasonCode) {
        case 'standard_gvas':
            return '';
        case 'compressed_readonly':
            return replaceTokens(t('editor.unrealReasonCompressedReadonly'), { compression });
        case 'compressed_repackable':
            return replaceTokens(t('editor.unrealReasonCompressedRepackable'), { compression });
        case 'gvas_parse_failed': {
            const base = t('editor.unrealReasonGvasParseFailed');
            return parseError ? `${base} (${parseError})` : base;
        }
        case 'decompression_limit':
            return replaceTokens(t('editor.unrealReasonDecompressionLimit'), {
                compression,
                maxMb: maxMb ? `${maxMb}` : '64',
            });
        case 'unsupported_container':
            return replaceTokens(t('editor.unrealReasonUnsupportedContainer'), { compression });
        case 'decompression_failed':
            return replaceTokens(t('editor.unrealReasonDecompressionFailed'), { compression });
        case 'not_gvas':
            return t('editor.unrealReasonNotGvas');
        default:
            return data.reason || '';
    }
}

function getNumericValueAtPath(data: unknown, path: Array<string | number>): number | null {
    let cursor: any = data;
    for (const segment of path) {
        if (cursor === null || cursor === undefined) return null;
        cursor = cursor[segment as any];
    }
    return typeof cursor === 'number' && Number.isFinite(cursor) ? cursor : null;
}

function cloneContainer(value: unknown): any {
    if (Array.isArray(value)) return [...value];
    if (value && typeof value === 'object') return { ...(value as Record<string, unknown>) };
    return undefined;
}

function setValueAtPath(root: unknown, path: Array<string | number>, nextValue: number): unknown {
    if (path.length === 0) return root;
    const clonedRoot = cloneContainer(root);
    if (!clonedRoot) return root;

    let cursor: any = clonedRoot;
    for (let i = 0; i < path.length - 1; i++) {
        const segment = path[i];
        const originalNext = cursor?.[segment as any];
        const clonedNext = cloneContainer(originalNext);
        if (!clonedNext) return root;
        cursor[segment as any] = clonedNext;
        cursor = clonedNext;
    }

    const lastSegment = path[path.length - 1];
    cursor[lastSegment as any] = nextValue;
    return clonedRoot;
}

function buildErrorAdvice(
    ext: string | undefined,
    message: string,
    t: (key: string) => string,
    reasonCode?: string
): string[] {
    const advice: string[] = [t('editor.advice.generic1'), t('editor.advice.generic2')];

    if (reasonCode === 'unsupported_binary_plist') {
        advice.unshift(t('editor.unityReasonBinaryPlist'));
    }

    if (reasonCode === 'unsupported_binary_playerprefs') {
        advice.unshift(t('editor.unityReasonBinaryPlayerPrefs'));
    }

    if (reasonCode === 'likely_encrypted_container') {
        advice.unshift(t('editor.naninovelReasonLikelyEncrypted'));
    }

    if (reasonCode === 'unsupported_naninovel_wrapper') {
        advice.unshift(t('editor.naninovelReasonUnsupportedWrapper'));
    }

    if (reasonCode === 'unsupported_ruby_marshal' || ext === 'rvdata2' || ext === 'rvdata' || ext === 'rxdata') {
        advice.unshift('RPG Maker XP/VX/VX Ace Ruby Marshal files support limited editing when the structure is standard.');
        advice.unshift('Unsupported custom Ruby objects or structural edits are blocked before export.');
    }

    if (ext === 'sav') {
        advice.unshift(t('editor.advice.unreal1'));
        advice.push(t('editor.advice.unreal2'));
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('not a standard unreal gvas')) {
            advice.unshift(t('editor.unrealNotGvasBody'));
        }
        if (lowerMessage.includes('compressed')) {
            advice.unshift(t('editor.unrealCompressedBody'));
        }
    }

    if (ext === 'save') {
        advice.unshift(t('editor.advice.renpy1'));
        advice.push(t('editor.advice.renpy2'));
    }

    if (ext === 'xml' || ext === 'plist') {
        advice.unshift(t('editor.advice.unity1'));
    }
    if (message.toLowerCase().includes('binary')) {
        advice.unshift(t('editor.advice.unityBinary'));
    }

    if (message.toLowerCase().includes('unsupported')) {
        advice.push(t('editor.advice.unsupported'));
    }

    return advice;
}
