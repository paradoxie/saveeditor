import { localizePath, normalizeLang, type SiteLang } from '../i18n/utils';
import { GENERIC_DOTTED_EXTENSION_SET } from './saveExtensions';
import { isNrbfBytes } from './parsers/nrbf';
import { SITE_ORIGIN } from './site';
import { createUploadTicket, type UploadTicket } from './upload-vault';

export type EditorSlug =
    | 'rpg-maker-mv'
    | 'unity'
    | 'renpy'
    | 'unreal'
    | 'palworld'
    | 'gamemaker'
    | 'naninovel'
    | 'generic';

type DetectionConfidence = 'high' | 'medium' | 'low';

export interface IngestAlternateRoute {
    engine: EditorSlug;
    route: string;
    label: string;
}

export interface IngestDetectionResult {
    engine: EditorSlug;
    confidence: DetectionConfidence;
    suggestedRoute: string;
    alternateRoutes: IngestAlternateRoute[];
    reason: string;
}

const GVAS_MAGIC = [0x47, 0x56, 0x41, 0x53];
const PALWORLD_FILE_HINTS = ['player', 'players', 'localdata', 'level', 'world', 'pal'];

function getExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot === -1 ? '' : fileName.slice(lastDot).toLowerCase();
}

function getEditorRoute(lang: SiteLang, editor: EditorSlug): string {
    return localizePath(`/editor/${editor}`, lang);
}

function buildAlternateRoutes(
    lang: SiteLang,
    alternates: EditorSlug[]
): IngestAlternateRoute[] {
    return alternates.map((engine) => ({
        engine,
        route: getEditorRoute(lang, engine),
        label: getEditorLabel(engine, lang),
    }));
}

function getEditorLabel(engine: EditorSlug, lang: SiteLang): string {
    const labels: Record<EditorSlug, Record<SiteLang, string>> = {
        'rpg-maker-mv': {
            en: 'RPG Maker editor',
            ja: 'RPG Maker エディタ',
            pt: 'Editor RPG Maker',
            ko: 'RPG Maker 에디터',
            'zh-cn': 'RPG Maker 编辑器',
            es: 'Editor RPG Maker',
            ru: 'Редактор RPG Maker',
        },
        unity: {
            en: 'Unity editor',
            ja: 'Unity エディタ',
            pt: 'Editor Unity',
            ko: 'Unity 에디터',
            'zh-cn': 'Unity 编辑器',
            es: 'Editor Unity',
            ru: 'Редактор Unity',
        },
        renpy: {
            en: "Ren'Py editor",
            ja: "Ren'Py エディタ",
            pt: "Editor Ren'Py",
            ko: "Ren'Py 에디터",
            'zh-cn': "Ren'Py 编辑器",
            es: "Editor Ren'Py",
            ru: "Редактор Ren'Py",
        },
        unreal: {
            en: 'Unreal .sav workflow',
            ja: 'Unreal .sav ワークフロー',
            pt: 'Fluxo Unreal .sav',
            ko: 'Unreal .sav 워크플로우',
            'zh-cn': 'Unreal .sav 工作流',
            es: 'Flujo Unreal .sav',
            ru: 'Сценарий Unreal .sav',
        },
        palworld: {
            en: 'Palworld workflow',
            ja: 'Palworld ワークフロー',
            pt: 'Fluxo Palworld',
            ko: 'Palworld 워크플로우',
            'zh-cn': 'Palworld 工作流',
            es: 'Flujo Palworld',
            ru: 'Сценарий Palworld',
        },
        gamemaker: {
            en: 'GameMaker editor',
            ja: 'GameMaker エディタ',
            pt: 'Editor GameMaker',
            ko: 'GameMaker 에디터',
            'zh-cn': 'GameMaker 编辑器',
            es: 'Editor GameMaker',
            ru: 'Редактор GameMaker',
        },
        naninovel: {
            en: 'NaniNovel editor',
            ja: 'NaniNovel エディタ',
            pt: 'Editor NaniNovel',
            ko: 'NaniNovel 에디터',
            'zh-cn': 'NaniNovel 编辑器',
            es: 'Editor NaniNovel',
            ru: 'Редактор NaniNovel',
        },
        generic: {
            en: 'Generic Save Editor',
            ja: '汎用保存エディタ',
            pt: 'Editor genérico de saves',
            ko: '일반 세이브 에디터',
            'zh-cn': '通用存档编辑器',
            es: 'Editor genérico de partidas',
            ru: 'Универсальный редактор сохранений',
        },
    };

    return labels[engine][lang];
}

async function readFileHeader(file: File, bytes = 64): Promise<Uint8Array> {
    const buffer = await file.slice(0, bytes).arrayBuffer();
    return new Uint8Array(buffer);
}

async function readTextSnippet(file: File, bytes = 256): Promise<string> {
    const header = await readFileHeader(file, bytes);
    return new TextDecoder('utf-8', { fatal: false }).decode(header);
}

function hasGvasHeader(header: Uint8Array): boolean {
    return header.length >= 4 && GVAS_MAGIC.every((byte, index) => header[index] === byte);
}

function looksLikePalworldFileName(fileName: string): boolean {
    const normalized = fileName.toLowerCase();
    return PALWORLD_FILE_HINTS.some((hint) => normalized.includes(hint));
}

function buildDetection(
    lang: SiteLang,
    engine: EditorSlug,
    confidence: DetectionConfidence,
    reason: string,
    alternates: EditorSlug[] = []
): IngestDetectionResult {
    return {
        engine,
        confidence,
        suggestedRoute: getEditorRoute(lang, engine),
        alternateRoutes: buildAlternateRoutes(lang, alternates),
        reason,
    };
}

export async function detectIngestRoute(
    file: File,
    locale?: string | null
): Promise<IngestDetectionResult> {
    const lang = normalizeLang(locale);
    const ext = getExtension(file.name);
    const header = await readFileHeader(file, 17);

    if (isNrbfBytes(header)) {
        return buildDetection(lang, 'generic', 'high', 'NRBF / BinaryFormatter signature matched.');
    }

    if (ext === '.rpgsave' || ext === '.rmmzsave' || ext === '.rvdata2' || ext === '.rvdata' || ext === '.rxdata' || ext === '.lsd') {
        return buildDetection(lang, 'rpg-maker-mv', 'high', 'RPG Maker save extension matched.');
    }

    if (ext === '.save') {
        const snippet = await readTextSnippet(file, 32);
        const confidence = snippet.includes("Ren'Py Save Game") ? 'high' : 'medium';
        return buildDetection(lang, 'renpy', confidence, "Ren'Py save signature or extension matched.");
    }

    if (ext === '.xml' || ext === '.plist' || ext === '.prefs') {
        return buildDetection(lang, 'unity', 'high', 'Unity PlayerPrefs extension matched.');
    }

    if (ext === '.nson') {
        return buildDetection(lang, 'naninovel', 'high', 'NaniNovel save extension matched.');
    }

    if (ext === '.ini' || ext === '.json') {
        return buildDetection(lang, 'gamemaker', 'medium', 'Structured text save extension matched.');
    }

    if (GENERIC_DOTTED_EXTENSION_SET.has(ext)) {
        return buildDetection(lang, 'generic', 'medium', 'Generic competitor-format coverage matched.');
    }

    if (ext === '.sav') {
        const fileNameLooksLikePalworld = looksLikePalworldFileName(file.name);
        const preferredEngine = fileNameLooksLikePalworld ? 'palworld' : 'unreal';
        const reason = fileNameLooksLikePalworld
            ? 'Palworld filename hints matched; using the Palworld workflow first.'
            : hasGvasHeader(header)
              ? 'Standard GVAS header detected; using the generic Unreal workflow first.'
              : '.sav extension matched; using the generic Unreal workflow first.';

        return buildDetection(lang, preferredEngine, fileNameLooksLikePalworld ? 'medium' : 'low', reason, [
            preferredEngine === 'palworld' ? 'unreal' : 'palworld',
        ]);
    }

    return buildDetection(
        lang,
        'generic',
        'low',
        'No specific save signature matched; falling back to the Generic Save Editor.'
    );
}

export function buildIngestUrl(token: string, locale?: string | null): string {
    const lang = normalizeLang(locale);
    const base = localizePath('/ingest', lang);
    const url = new URL(base, SITE_ORIGIN);
    url.searchParams.set('uploadToken', token);
    return `${url.pathname}${url.search}`;
}

export function appendUploadToken(route: string, token?: string | null): string {
    if (!token) return route;
    const url = new URL(route, SITE_ORIGIN);
    url.searchParams.set('uploadToken', token);
    return `${url.pathname}${url.search}`;
}

export function readUploadToken(search: string): string | null {
    return new URLSearchParams(search).get('uploadToken');
}

export async function beginIngestFlow(
    file: File,
    options: { locale?: string | null; source: string }
): Promise<{ ticket: UploadTicket; url: string }> {
    const ticket = await createUploadTicket(file, options);
    return {
        ticket,
        url: buildIngestUrl(ticket.token, ticket.locale),
    };
}
