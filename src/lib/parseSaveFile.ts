import { makeOutcome, type FormatFamily, type ParseOutcome } from './parsers/types';
import { GENERIC_EXTENSION_SET } from './saveExtensions';
import { attachSupportPack, buildSupportPack } from './supportPack';

export interface ParsedSaveFileResult<TData = unknown> {
    outcome: ParseOutcome<TData>;
    parserPath: string;
    uiFormat: string;
}

const TEXT_EDITABLE_EXTENSIONS = new Set(['json', 'ini', 'txt']);
const RPG_MAKER_EXTENSIONS = new Set(['rpgsave', 'rmmzsave', 'rvdata2', 'rvdata', 'rxdata', 'lsd']);

const loadParsers = {
    gamemaker: () => import('./parsers/gamemaker').then((mod) => mod.parseGamemaker),
    generic: () => import('./parsers/generic').then((mod) => mod.parseGeneric),
    naninovel: () => import('./parsers/naninovel').then((mod) => mod.parseNaniNovel),
    palworld: () => import('./parsers/palworld').then((mod) => mod.parsePalworld),
    renpy: () => import('./parsers/renpy').then((mod) => mod.parseRenpy),
    rpgmaker: () => import('./parsers/rpgmaker').then((mod) => mod.parseRPGMakerMV),
    unity: () => import('./parsers/unity').then((mod) => mod.parseUnity),
    unreal: () => import('./parsers/unreal').then((mod) => mod.parseUnreal),
};

export async function parseSaveFile(file: File, editorSlug = ''): Promise<ParsedSaveFileResult<any>> {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let outcome: ParseOutcome<any>;
    let parserPath = inferParserPath(file, editorSlug);

    if (editorSlug === 'generic' && GENERIC_EXTENSION_SET.has(ext)) {
        outcome = await (await loadParsers.generic())(file);
    } else if (ext === 'save') {
        outcome = await (await loadParsers.renpy())(file);
    } else if (['xml', 'plist', 'prefs'].includes(ext)) {
        outcome = await (await loadParsers.unity())(file);
    } else if (ext === 'sav') {
        if (editorSlug === 'palworld') {
            outcome = await (await loadParsers.palworld())(file);
        } else {
            outcome = await (await loadParsers.unreal())(file);
        }
    } else if (ext === 'nson') {
        outcome = await (await loadParsers.naninovel())(file);
    } else if (RPG_MAKER_EXTENSIONS.has(ext)) {
        outcome = await (await loadParsers.rpgmaker())(file);
    } else if (GENERIC_EXTENSION_SET.has(ext) || editorSlug === 'generic') {
        outcome = await (await loadParsers.generic())(file);
    } else if (TEXT_EDITABLE_EXTENSIONS.has(ext) || editorSlug === 'gamemaker') {
        outcome = await (await loadParsers.gamemaker())(file);
    } else {
        parserPath = 'generic-unsupported';
        outcome = await (await loadParsers.generic())(file);
    }

    const normalizedOutcome = ensureFormatFamily(await attachSupportPack(outcome, file, parserPath));
    return {
        outcome: normalizedOutcome,
        parserPath,
        uiFormat: resolveUiFormat(normalizedOutcome, editorSlug),
    };
}

export async function parseSaveFileSafe(file: File, editorSlug = ''): Promise<ParsedSaveFileResult<any>> {
    try {
        return await parseSaveFile(file, editorSlug);
    } catch (error: any) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        const parserPath = inferParserPath(file, editorSlug);
        const fallbackOutcome = makeOutcome({
            engine: 'generic',
            format: ext ? `.${ext}` : 'unknown',
            formatFamily: inferFormatFamily('generic', ext ? `.${ext}` : 'unknown'),
            mode: 'error',
            reasonCode: 'parse_failed',
            reason: error?.message || 'Parser threw before returning a structured outcome.',
            capabilities: {
                canView: false,
                canEdit: false,
                canSave: false,
                roundTripSupport: 'none',
            },
            data: null,
        });
        const headerBytes = new Uint8Array(await file.slice(0, 512).arrayBuffer());
        const outcomeWithPack = {
            ...fallbackOutcome,
            diagnostics: {
                ...(fallbackOutcome.diagnostics || {}),
                supportPack: buildSupportPack(fallbackOutcome, file, parserPath, 'exception', headerBytes),
            },
        };
        return {
            outcome: outcomeWithPack,
            parserPath,
            uiFormat: ext ? `.${ext}` : 'unknown',
        };
    }
}

export function inferParserPath(file: Pick<File, 'name'>, editorSlug = ''): string {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (editorSlug === 'generic' && GENERIC_EXTENSION_SET.has(ext)) return 'generic';
    if (ext === 'save') return 'renpy';
    if (['xml', 'plist', 'prefs'].includes(ext)) return 'unity';
    if (ext === 'sav') return editorSlug === 'palworld' ? 'palworld' : 'unreal';
    if (ext === 'nson') return 'naninovel';
    if (RPG_MAKER_EXTENSIONS.has(ext)) return 'rpgmaker';
    if (GENERIC_EXTENSION_SET.has(ext) || editorSlug === 'generic') return 'generic';
    if (TEXT_EDITABLE_EXTENSIONS.has(ext) || editorSlug === 'gamemaker') return 'gamemaker';
    return 'generic-unsupported';
}

export function getComparableData(outcome: ParseOutcome<any>): unknown {
    if (!outcome.capabilities.canView) return null;
    if (outcome.engine === 'unreal' || outcome.engine === 'palworld') {
        return outcome.data?.jsonView ?? null;
    }
    if (outcome.engine === 'generic' && !outcome.capabilities.canEdit) {
        return null;
    }
    return outcome.data;
}

function resolveUiFormat(outcome: ParseOutcome<any>, editorSlug: string): string {
    if (editorSlug === 'palworld') return 'palworld';
    if (outcome.format === 'rpgmaker-ruby-marshal' || outcome.format === 'rpgmaker-2000-2003-lsd') {
        return outcome.format;
    }
    if (outcome.engine === 'rpgmaker') return 'rpgmaker';
    if (outcome.engine === 'unreal') return 'unreal';
    if (outcome.engine === 'palworld') return 'palworld';
    return outcome.format;
}

function ensureFormatFamily<TData>(outcome: ParseOutcome<TData>): ParseOutcome<TData> {
    if (outcome.formatFamily) return outcome;
    return {
        ...outcome,
        formatFamily: inferFormatFamily(outcome.engine, outcome.format),
    };
}

function inferFormatFamily(engine: ParseOutcome['engine'], format: string): FormatFamily {
    if (engine === 'rpgmaker') return 'rpgmaker';
    if (engine === 'renpy') return 'renpy';
    if (engine === 'unity') return 'unity';
    if (engine === 'unreal' || engine === 'palworld') return 'unreal';
    return format.startsWith('generic-structured') ? 'generic-structured' : 'generic-binary';
}
