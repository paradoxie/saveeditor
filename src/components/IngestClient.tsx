import React from 'react';
import {
    appendUploadToken,
    detectIngestRoute,
    readUploadToken,
    type IngestDetectionResult
} from '../lib/ingest';
import { localizePath, normalizeLang, type SiteLang } from '../i18n/utils';
import { peekUploadFile, pruneUploadVault } from '../lib/upload-vault';

interface IngestClientProps {
    lang?: string;
}

type Status = 'loading' | 'ready' | 'error';

const COPY: Record<
    SiteLang,
    {
        loadingTitle: string;
        loadingBody: string;
        readyTitle: string;
        readyBody: string;
        openNow: string;
        chooseAnother: string;
        missingTitle: string;
        missingBody: string;
        goHome: string;
    }
> = {
    en: {
        loadingTitle: 'Checking your save format',
        loadingBody: 'We are restoring your file and recommending the best editor.',
        readyTitle: 'Best editor detected',
        readyBody: 'We will open the recommended workflow automatically. You can also choose another compatible editor.',
        openNow: 'Open now',
        chooseAnother: 'Choose another workflow',
        missingTitle: 'Upload expired or missing',
        missingBody: 'We could not restore the uploaded file. Please start again from the upload page.',
        goHome: 'Back to home',
    },
    ja: {
        loadingTitle: 'セーブ形式を確認しています',
        loadingBody: 'ファイルを復元し、最適なエディタを選択しています。',
        readyTitle: '最適なエディタを選択しました',
        readyBody: '推奨ワークフローを自動で開きます。必要なら別の互換エディタも選べます。',
        openNow: '今すぐ開く',
        chooseAnother: '別のワークフローを選ぶ',
        missingTitle: 'アップロードが見つかりません',
        missingBody: 'アップロードしたファイルを復元できませんでした。最初からやり直してください。',
        goHome: 'ホームへ戻る',
    },
    pt: {
        loadingTitle: 'Verificando o formato do save',
        loadingBody: 'Estamos restaurando seu arquivo e recomendando o melhor editor.',
        readyTitle: 'Melhor editor detectado',
        readyBody: 'Abriremos o fluxo recomendado automaticamente. Você também pode escolher outro editor compatível.',
        openNow: 'Abrir agora',
        chooseAnother: 'Escolher outro fluxo',
        missingTitle: 'Upload expirado ou ausente',
        missingBody: 'Não foi possível restaurar o arquivo enviado. Volte e faça o upload novamente.',
        goHome: 'Voltar ao início',
    },
    ko: {
        loadingTitle: '세이브 형식을 확인하는 중입니다',
        loadingBody: '파일을 복원하고 가장 적합한 에디터를 추천하고 있습니다.',
        readyTitle: '추천 에디터를 찾았습니다',
        readyBody: '권장 워크플로우를 자동으로 엽니다. 다른 호환 에디터도 직접 고를 수 있습니다.',
        openNow: '지금 열기',
        chooseAnother: '다른 워크플로우 선택',
        missingTitle: '업로드를 찾을 수 없습니다',
        missingBody: '업로드한 파일을 복원하지 못했습니다. 처음부터 다시 시도해 주세요.',
        goHome: '홈으로 돌아가기',
    },
    'zh-cn': {
        loadingTitle: '正在检测存档格式',
        loadingBody: '我们正在恢复你的文件，并推荐最合适的编辑器。',
        readyTitle: '已找到推荐编辑器',
        readyBody: '系统将自动打开推荐工作流，你也可以手动切换到其他兼容编辑器。',
        openNow: '立即打开',
        chooseAnother: '选择其他工作流',
        missingTitle: '上传已失效或不存在',
        missingBody: '无法恢复你上传的文件，请重新上传。',
        goHome: '返回首页',
    },
    es: {
        loadingTitle: 'Comprobando el formato del guardado',
        loadingBody: 'Estamos restaurando tu archivo y recomendando el flujo compatible.',
        readyTitle: 'Mejor editor detectado',
        readyBody: 'Abriremos automáticamente el flujo recomendado. También puedes elegir otro editor compatible.',
        openNow: 'Abrir ahora',
        chooseAnother: 'Elegir otro flujo',
        missingTitle: 'La subida expiró o no existe',
        missingBody: 'No pudimos restaurar el archivo subido. Vuelve a subirlo desde la página principal.',
        goHome: 'Volver al inicio',
    },
    ru: {
        loadingTitle: 'Проверяем формат сохранения',
        loadingBody: 'Мы восстанавливаем файл и подбираем лучший редактор.',
        readyTitle: 'Подходящий редактор найден',
        readyBody: 'Мы автоматически откроем рекомендуемый сценарий. При желании можно выбрать другой совместимый редактор.',
        openNow: 'Открыть сейчас',
        chooseAnother: 'Выбрать другой сценарий',
        missingTitle: 'Загрузка истекла или отсутствует',
        missingBody: 'Не удалось восстановить загруженный файл. Начните загрузку заново.',
        goHome: 'Вернуться на главную',
    },
};

export default function IngestClient({ lang }: IngestClientProps) {
    const locale = normalizeLang(lang);
    const copy = COPY[locale];
    const [status, setStatus] = React.useState<Status>('loading');
    const [fileName, setFileName] = React.useState('');
    const [reason, setReason] = React.useState('');
    const [result, setResult] = React.useState<IngestDetectionResult | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        let redirectTimer: number | undefined;

        const run = async () => {
            try {
                await pruneUploadVault();

                const params = new URLSearchParams(window.location.search);
                const token = params.get('uploadToken');
                if (!token) {
                    if (!cancelled) setStatus('error');
                    return;
                }

                const restored = await peekUploadFile(token);
                if (!restored) {
                    if (!cancelled) setStatus('error');
                    return;
                }

                const detected = await detectIngestRoute(restored.file, locale);
                if (cancelled) return;

                setFileName(restored.ticket.name);
                setReason(detected.reason);
                setResult(detected);
                setStatus('ready');

                redirectTimer = window.setTimeout(() => {
                    window.location.assign(appendUploadToken(detected.suggestedRoute, token));
                }, 900);
            } catch (error) {
                console.error(error);
                if (!cancelled) {
                    setStatus('error');
                }
            }
        };

        run();

        return () => {
            cancelled = true;
            if (redirectTimer) {
                window.clearTimeout(redirectTimer);
            }
        };
    }, [locale]);

    if (status === 'error') {
        return (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-7.938 4h15.876c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L2.33 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{copy.missingTitle}</h1>
                <p className="text-gray-600 mb-6">{copy.missingBody}</p>
                <a
                    href={localizePath('/', locale)}
                    className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-5 py-3 text-white font-semibold hover:bg-primary-700 transition-colors"
                >
                    {copy.goHome}
                </a>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-center mb-6">
                <div className="h-14 w-14 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-200 border-t-primary-600" />
                </div>
            </div>
            <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                    {status === 'loading' ? copy.loadingTitle : copy.readyTitle}
                </h1>
                <p className="text-gray-600 max-w-2xl mx-auto mb-6">
                    {status === 'loading' ? copy.loadingBody : copy.readyBody}
                </p>
                {fileName && <p className="text-sm text-gray-500 mb-3">{fileName}</p>}
            </div>

            {status === 'ready' && result ? (
                <div className="space-y-6">
                    <div className="rounded-xl border border-primary-100 bg-primary-50 p-5">
                        <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
                            <div className="text-left">
                                <p className="text-sm font-medium text-primary-700">
                                    {result.confidence.toUpperCase()} confidence
                                </p>
                                <p className="text-xl font-semibold text-gray-900 mt-1">
                                    {result.alternateRoutes.length > 0
                                        ? result.engine === 'palworld'
                                            ? 'Palworld'
                                            : 'Unreal Engine'
                                        : result.engine.replace('-', ' ')}
                                </p>
                                <p className="text-sm text-gray-600 mt-2">{reason}</p>
                            </div>
                            <a
                                href={appendUploadToken(result.suggestedRoute, readUploadToken(window.location.search))}
                                className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-5 py-3 text-white font-semibold hover:bg-primary-700 transition-colors"
                            >
                                {copy.openNow}
                            </a>
                        </div>
                    </div>

                    {result.alternateRoutes.length > 0 && (
                        <div className="rounded-xl border border-gray-200 p-5">
                            <p className="text-sm font-semibold text-gray-900 mb-3">{copy.chooseAnother}</p>
                            <div className="flex flex-wrap gap-3">
                                {result.alternateRoutes.map((route) => (
                                    <a
                                        key={route.engine}
                                        href={appendUploadToken(route.route, readUploadToken(window.location.search))}
                                        className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                                    >
                                        {route.label}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center text-sm text-gray-500">…</div>
            )}
        </div>
    );
}
