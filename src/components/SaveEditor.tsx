import React, { useState } from 'react';
import { ui } from '../i18n/ui';
import JsonEditor from './JsonEditor';
import RpgMakerEditor from './editors/RpgMakerEditor';
import { buildRPGMakerMV } from '../lib/parsers/rpgmaker';

interface SaveEditorProps {
    file: File;
    onBack: () => void;
}

export default function SaveEditor({ file, onBack }: SaveEditorProps) {
    const lang = typeof window !== 'undefined'
        ? (document.documentElement.getAttribute('lang') as keyof typeof ui) || 'en'
        : 'en';
    const t = (key: keyof typeof ui['en']) => ui[lang]?.[key] || ui.en[key];
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [format, setFormat] = useState<string>('unknown');
    const [activeTab, setActiveTab] = useState<'quick' | 'advanced'>('quick');
    const [isAdvancedLoading, setIsAdvancedLoading] = useState(false);
    const [experimentalEnabled, setExperimentalEnabled] = useState(false);
    const [errorAdvice, setErrorAdvice] = useState<string[]>([]);

    // Simulate parsing (in real app, this would call the API or use client-side parser directly)
    React.useEffect(() => {
        const parseFile = async () => {
            try {
                setLoading(true);
                setErrorAdvice([]);

                // File size validation (50MB limit)
                const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
                if (file.size > MAX_FILE_SIZE) {
                    setError('File too large. Maximum file size is 50MB. Please try a smaller save file.');
                    setLoading(false);
                    return;
                }

                const ext = file.name.split('.').pop()?.toLowerCase();

                let parsed;
                if (ext === 'save') {
                    const { parseRenpy } = await import('../lib/parsers/renpy');
                    parsed = await parseRenpy(file);
                    setFormat('renpy');
                } else if (['xml', 'plist', 'prefs'].includes(ext || '')) {
                    const { parseUnity } = await import('../lib/parsers/unity');
                    parsed = await parseUnity(file);
                    setFormat('unity');
                } else if (ext === 'sav') {
                    // Check if it's Unreal (GVAS) or generic
                    try {
                        const { parseUnreal } = await import('../lib/parsers/unreal');
                        parsed = await parseUnreal(file);
                        setFormat('unreal');
                    } catch (e) {
                        // If Unreal parsing fails or it's not GVAS, fall back to generic
                        console.log("Not a GVAS file or parsing failed, falling back to generic");
                        const { parseGamemaker } = await import('../lib/parsers/gamemaker');
                        const result = await parseGamemaker(file);
                        parsed = result.data;
                        setFormat(result.type);
                    }
                } else if (ext === 'nson') {
                    const { parseNaniNovel } = await import('../lib/parsers/naninovel');
                    const result = await parseNaniNovel(file);
                    parsed = result.data;
                    setFormat(result.type);
                } else if (ext === 'rpgsave' || ext === 'rvdata2' || ext === 'rmmzsave') {
                    const { parseRPGMakerMV } = await import('../lib/parsers/rpgmaker');
                    parsed = await parseRPGMakerMV(file);
                    setFormat('rpgmaker');
                } else {
                    // Fallback to Gamemaker / Generic
                    const { parseGamemaker } = await import('../lib/parsers/gamemaker');
                    const result = await parseGamemaker(file);
                    parsed = result.data;
                    setFormat(result.type); // 'json', 'ini', or 'raw'
                }

                setData(parsed);
                setLoading(false);
            } catch (err: any) {
                console.error(err);
                const ext = file.name.split('.').pop()?.toLowerCase();
                setError(`${t('editor.parseError')}: ${err.message}`);
                setErrorAdvice(buildErrorAdvice(ext, err?.message || '', t));
                setLoading(false);
            }
        };

        parseFile();
    }, [file]);

    const handleDownload = async () => {
        if (!data) return;

        if (format === 'renpy' && !experimentalEnabled) {
            alert(t('editor.renpyExperimentalAlert'));
            return;
        }

        try {
            let blob;
            if (format === 'unity') {
                const { buildUnity } = await import('../lib/parsers/unity');
                blob = await buildUnity(file, data);
            } else if (format === 'unreal') {
                const { buildUnreal } = await import('../lib/parsers/unreal');
                blob = await buildUnreal(file, data);
            } else if (format.startsWith('naninovel')) {
                const { buildNaniNovel } = await import('../lib/parsers/naninovel');
                blob = await buildNaniNovel(file, data, format as any);
            } else if (format === 'renpy') {
                const { buildRenpy } = await import('../lib/parsers/renpy');
                blob = await buildRenpy(file, data);
            } else if (format === 'rpgmaker') {
                blob = await buildRPGMakerMV(file, data);
            } else {
                // Gamemaker / Raw
                const { buildGamemaker } = await import('../lib/parsers/gamemaker');
                blob = await buildGamemaker(file, { type: format, data: data });
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err: any) {
            alert('Failed to build save file: ' + err.message);
        }
    };

    const handleDataChange = (newData: any) => {
        setData(newData);
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
                                href="/contact"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {t('editor.contactUs')}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const isRaw = format === 'raw';
    const isRenpy = format === 'renpy';
    const isUnrealPartial = format === 'unreal' && data?._unrealParseStatus === 'partial';
    const isUnrealSaveSupported = format === 'unreal' && typeof data?.serialize === 'function';
    const isSaveDisabled =
        (isRenpy && !experimentalEnabled) ||
        (format === 'unreal' && (!isUnrealSaveSupported || !experimentalEnabled)) ||
        isUnrealPartial;
    const isReadOnly = isUnrealPartial || (format === 'unreal' && !isUnrealSaveSupported);
    const showQuickEdit = format === 'rpgmaker' || (format === 'json' && data?.gold !== undefined);

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
                                onClick={() => {
                                    if (activeTab !== 'advanced') {
                                        setIsAdvancedLoading(true);
                                        setActiveTab('advanced');
                                        // Delay rendering to allow loading state to show
                                        setTimeout(() => setIsAdvancedLoading(false), 100);
                                    }
                                }}
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

            <div className="p-6 space-y-6">
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
                {format === 'unreal' && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="space-y-2">
                            <p><strong>Limited Support / 支持受限 / 제한된 지원 / サポート制限:</strong></p>
                            <p>
                                <strong>EN:</strong> Unreal Engine GVAS save files use a complex binary format that varies between games.
                                Basic viewing may work, but saving is not reliable. Each game defines its own unique save structure.
                            </p>
                            <p>
                                <strong>中文:</strong> 虚幻引擎 GVAS 存档使用复杂的二进制格式，每个游戏的格式都不同。
                                基本查看可能有效，但保存功能不可靠。每个游戏都有独特的存档结构。
                            </p>
                            <p>
                                <strong>日本語:</strong> Unreal Engine の GVAS セーブファイルは、ゲームごとに異なる複雑なバイナリ形式を使用しています。
                                基本的な閲覧は可能ですが、保存機能は信頼性がありません。
                            </p>
                            <p>
                                <strong>한국어:</strong> 언리얼 엔진 GVAS 세이브 파일은 게임마다 다른 복잡한 바이너리 형식을 사용합니다.
                                기본 보기는 작동할 수 있지만 저장은 신뢰할 수 없습니다.
                            </p>
                            <p className="text-red-700 font-medium mt-2">
                                💡 We recommend using dedicated tools like UESaveEditor for Unreal games.
                            </p>
                        </div>
                    </div>
                )}
                {isUnrealPartial && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm">
                        <strong>{t('editor.unrealReadOnlyTitle')}:</strong> {t('editor.unrealPartialBody')}
                    </div>
                )}
                {format === 'unreal' && !isUnrealPartial && !isUnrealSaveSupported && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm">
                        <strong>{t('editor.unrealReadOnlyTitle')}:</strong> {t('editor.unrealReadOnlyBody')}
                    </div>
                )}
                {(format === 'renpy' || (format === 'unreal' && isUnrealSaveSupported && !isUnrealPartial)) && (
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
                            value={data}
                            readOnly={isReadOnly}
                            onChange={(e) => setData(e.target.value)}
                        />
                    </div>
                ) : (
                    <>
                        {activeTab === 'quick' && showQuickEdit ? (
                            format === 'rpgmaker' ? (
                                <RpgMakerEditor data={data} onChange={handleDataChange} />
                            ) : (
                                <div className="space-y-6">
                                    {/* Gold Editor (Generic) */}
                                    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-5 border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                                <span className="text-xl">💰</span>
                                            </div>
                                            <label className="text-base font-semibold text-gray-800">Gold / Money</label>
                                        </div>
                                        <input
                                            type="number"
                                            className="block w-full max-w-xs rounded-lg border-amber-200 bg-white shadow-sm focus:border-amber-400 focus:ring-amber-400 text-lg p-3 border font-medium"
                                            value={data?.party?._gold ?? data?.party?.gold ?? data?.gold ?? 0}
                                            onChange={(e) => setData((prev: any) => {
                                                if (!prev) return null;
                                                const newData = JSON.parse(JSON.stringify(prev)); // Deep clone
                                                const newGold = parseInt(e.target.value) || 0;
                                                // Update all possible gold locations
                                                if (newData.party) {
                                                    newData.party._gold = newGold;
                                                    newData.party.gold = newGold;
                                                } else {
                                                    newData.gold = newGold;
                                                }
                                                return newData;
                                            })}
                                        />
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm">
                                    <strong>{t('editor.advancedModeTitle')}:</strong> {t('editor.advancedModeBody')}
                                </div>
                                {isAdvancedLoading ? (
                                    <div className="flex flex-col items-center justify-center py-16 space-y-4">
                                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
                                        <p className="text-gray-500 text-sm">{t('editor.loadingJson')}</p>
                                        <p className="text-gray-400 text-xs">{t('editor.loadingLargeFile')}</p>
                                    </div>
                                ) : (
                                    data && (
                                        <JsonEditor
                                            data={data}
                                            onChange={handleDataChange}
                                            readOnly={isReadOnly}
                                            canEdit={isRenpy ? canEditRenpy : undefined}
                                        />
                                    )
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
                        href="/contact"
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
            {/* Some formats have limited saving support (Ren'Py read-only, Unreal unreliable) */}
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

function buildErrorAdvice(
    ext: string | undefined,
    message: string,
    t: (key: keyof typeof ui['en']) => string
): string[] {
    const advice: string[] = [t('editor.advice.generic1'), t('editor.advice.generic2')];

    if (ext === 'sav') {
        advice.unshift(t('editor.advice.unreal1'));
        advice.push(t('editor.advice.unreal2'));
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
