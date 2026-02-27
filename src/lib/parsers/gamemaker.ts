import { makeOutcome, type ParseOutcome } from './types';

type GamemakerFormat = 'json' | 'ini' | 'raw';

type IniEntry = IniBlankEntry | IniCommentEntry | IniSectionEntry | IniKeyEntry | IniOtherEntry;

interface IniBlankEntry {
    kind: 'blank';
    raw: string;
    section: string;
}

interface IniCommentEntry {
    kind: 'comment';
    raw: string;
    section: string;
}

interface IniSectionEntry {
    kind: 'section';
    raw: string;
    name: string;
}

interface IniKeyEntry {
    kind: 'key';
    section: string;
    key: string;
    rawLines: string[];
    parsedValue: unknown;
    prefix: string;
    inlineComment: string;
}

interface IniOtherEntry {
    kind: 'other';
    raw: string;
    section: string;
}

interface IniKeyRef {
    section: string;
    key: string;
    entryIndex: number;
}

interface IniMeta {
    originalText: string;
    eol: string;
    trailingNewline: boolean;
    entries: IniEntry[];
    keyRefs: Record<string, Record<string, IniKeyRef>>;
    parsedFingerprint: string;
}

interface ParsedIniResult {
    type: GamemakerFormat;
    data: unknown;
    meta?: IniMeta;
}

const gamemakerIniMetaByFile = new Map<string, IniMeta>();

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stableClone(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => stableClone(item));
    }

    if (isObject(value)) {
        const ordered: Record<string, unknown> = {};
        Object.keys(value)
            .sort()
            .forEach((key) => {
                ordered[key] = stableClone(value[key]);
            });
        return ordered;
    }

    return value;
}

function stableStringify(value: unknown): string {
    try {
        return JSON.stringify(stableClone(value));
    } catch {
        return '';
    }
}

function unquoteIni(value: string): string {
    const trimmed = value.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        const inner = trimmed.slice(1, -1);
        return inner.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    return trimmed;
}

function coerceIniValue(value: string): unknown {
    if (value === 'true') return true;
    if (value === 'false') return false;
    const num = Number(value);
    return !Number.isNaN(num) && value !== '' ? num : value;
}

function splitInlineComment(
    value: string,
    initialInQuote = false
): { valuePart: string; inlineComment: string; inQuoteAtEnd: boolean } {
    let inQuote = initialInQuote;
    let escaped = false;

    for (let i = 0; i < value.length; i += 1) {
        const ch = value[i];
        if (ch === '"' && !escaped) {
            inQuote = !inQuote;
        }

        if (!inQuote && (ch === ';' || ch === '#')) {
            const prev = i > 0 ? value[i - 1] : '';
            if (i === 0 || /\s/.test(prev)) {
                return {
                    valuePart: value.slice(0, i),
                    inlineComment: value.slice(i),
                    inQuoteAtEnd: inQuote,
                };
            }
        }

        escaped = ch === '\\' ? !escaped : false;
    }

    return { valuePart: value, inlineComment: '', inQuoteAtEnd: inQuote };
}

function hasLineContinuation(valuePart: string): boolean {
    const trimmedRight = valuePart.replace(/\s+$/g, '');
    let slashCount = 0;

    for (let i = trimmedRight.length - 1; i >= 0; i -= 1) {
        if (trimmedRight[i] !== '\\') break;
        slashCount += 1;
    }

    return slashCount % 2 === 1;
}

function stripLineContinuation(valuePart: string): string {
    const trimmedRight = valuePart.replace(/\s+$/g, '');
    if (!hasLineContinuation(trimmedRight)) {
        return trimmedRight;
    }
    return trimmedRight.slice(0, -1);
}

function parseSectionHeader(rawLine: string): string | null {
    const match = rawLine.match(/^\s*\[(.+)]\s*$/);
    if (!match) return null;
    return match[1].trim();
}

function ensureSection(
    target: Record<string, Record<string, unknown>>,
    section: string
): Record<string, unknown> {
    if (!target[section]) target[section] = {};
    return target[section];
}

function toSectionValueMap(sectionValue: unknown): Map<string, unknown> {
    if (!isObject(sectionValue)) {
        return new Map<string, unknown>([['value', sectionValue]]);
    }
    return new Map<string, unknown>(Object.entries(sectionValue));
}

function formatInlineComment(inlineComment: string): string {
    if (!inlineComment) return '';
    return /^\s/.test(inlineComment) ? inlineComment : ` ${inlineComment}`;
}

function escapeIniStringValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function normalizeIniValue(value: unknown): string | number | boolean {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';
    return JSON.stringify(value);
}

function renderIniValueLines(prefix: string, value: unknown, inlineComment = ''): string[] {
    const normalized = normalizeIniValue(value);

    if (typeof normalized === 'number' || typeof normalized === 'boolean') {
        return [`${prefix}${String(normalized)}${formatInlineComment(inlineComment)}`];
    }

    const escaped = escapeIniStringValue(normalized);
    const chunks = escaped.split('\n');

    if (chunks.length === 1) {
        return [`${prefix}"${chunks[0]}"${formatInlineComment(inlineComment)}`];
    }

    const rendered: string[] = [];
    chunks.forEach((chunk, index) => {
        const isLast = index === chunks.length - 1;
        if (index === 0) {
            rendered.push(`${prefix}"${chunk}\\`);
            return;
        }

        if (isLast) {
            rendered.push(`${chunk}"${formatInlineComment(inlineComment)}`);
            return;
        }

        rendered.push(`${chunk}\\`);
    });

    return rendered;
}

function buildIniFallback(source: Record<string, unknown>): string {
    let ini = '';

    for (const [section, sectionValue] of Object.entries(source)) {
        if (section !== 'default') {
            ini += `[${section}]\n`;
        }

        if (!isObject(sectionValue)) {
            const serialized = escapeIniStringValue(String(sectionValue ?? ''));
            ini += `value="${serialized}"\n\n`;
            continue;
        }

        for (const [key, value] of Object.entries(sectionValue)) {
            const lines = renderIniValueLines(`${key}=`, value);
            lines.forEach((line) => {
                ini += `${line}\n`;
            });
        }
        ini += '\n';
    }

    return ini;
}

function valuesEqual(left: unknown, right: unknown): boolean {
    return stableStringify(left) === stableStringify(right);
}

function buildIniWithMeta(meta: IniMeta, payload: Record<string, unknown>): string {
    if (meta.parsedFingerprint === stableStringify(payload)) {
        return meta.originalText;
    }

    const sectionMaps = new Map<string, Map<string, unknown>>();
    Object.entries(payload).forEach(([section, sectionValue]) => {
        sectionMaps.set(section, toSectionValueMap(sectionValue));
    });

    const outputLines: string[] = [];
    const seenSections = new Set<string>();
    let currentSection = 'default';

    const flushPendingKeys = (section: string) => {
        const sectionMap = sectionMaps.get(section);
        if (!sectionMap || sectionMap.size === 0) return;

        for (const [key, value] of sectionMap.entries()) {
            outputLines.push(...renderIniValueLines(`${key}=`, value));
        }
        sectionMap.clear();
    };

    for (let entryIndex = 0; entryIndex < meta.entries.length; entryIndex += 1) {
        const entry = meta.entries[entryIndex];
        if (entry.kind === 'section') {
            flushPendingKeys(currentSection);
            currentSection = entry.name;
            seenSections.add(entry.name);
            outputLines.push(entry.raw);
            continue;
        }

        if (entry.kind === 'key') {
            currentSection = entry.section;
            const latestRef = meta.keyRefs?.[entry.section]?.[entry.key];
            const isLatestOccurrence = latestRef ? latestRef.entryIndex === entryIndex : true;
            if (!isLatestOccurrence) {
                outputLines.push(...entry.rawLines);
                continue;
            }

            const sectionMap = sectionMaps.get(entry.section);
            if (!sectionMap || !sectionMap.has(entry.key)) {
                continue;
            }

            const nextValue = sectionMap.get(entry.key);
            sectionMap.delete(entry.key);

            if (valuesEqual(entry.parsedValue, nextValue)) {
                outputLines.push(...entry.rawLines);
                continue;
            }

            outputLines.push(...renderIniValueLines(entry.prefix, nextValue, entry.inlineComment));
            continue;
        }

        outputLines.push(entry.raw);
    }

    flushPendingKeys(currentSection);

    for (const [section, sectionMap] of sectionMaps.entries()) {
        if (sectionMap.size === 0) continue;

        if (section !== 'default' && !seenSections.has(section)) {
            if (outputLines.length > 0 && outputLines[outputLines.length - 1].trim() !== '') {
                outputLines.push('');
            }
            outputLines.push(`[${section}]`);
        }

        for (const [key, value] of sectionMap.entries()) {
            outputLines.push(...renderIniValueLines(`${key}=`, value));
        }
        sectionMap.clear();
    }

    let rendered = outputLines.join(meta.eol);

    if (meta.trailingNewline) {
        if (!rendered.endsWith(meta.eol)) rendered += meta.eol;
    } else if (rendered.endsWith(meta.eol)) {
        rendered = rendered.slice(0, -meta.eol.length);
    }

    return rendered;
}

function attachIniMeta(fileName: string, payload: Record<string, unknown>, meta: IniMeta) {
    gamemakerIniMetaByFile.set(fileName, meta);
    Object.defineProperty(payload, '__gmIniMeta', {
        value: meta,
        enumerable: false,
        configurable: true,
        writable: false,
    });
}

function parseIni(text: string): ParsedIniResult {
    const lines = text.split(/\r?\n/);
    const ini: Record<string, Record<string, unknown>> = {};
    const entries: IniEntry[] = [];
    const keyRefs: Record<string, Record<string, IniKeyRef>> = {};
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    const trailingNewline = text.endsWith('\n');

    let currentSection = 'default';
    let isIni = false;

    const ensureSectionReferences = (section: string) => {
        ensureSection(ini, section);
        if (!keyRefs[section]) keyRefs[section] = {};
    };

    ensureSectionReferences(currentSection);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const rawLine = lines[lineIndex];
        const trimmed = rawLine.trim();

        if (trimmed.length === 0) {
            entries.push({ kind: 'blank', raw: rawLine, section: currentSection });
            continue;
        }

        if (trimmed.startsWith(';') || trimmed.startsWith('#')) {
            entries.push({ kind: 'comment', raw: rawLine, section: currentSection });
            continue;
        }

        const sectionName = parseSectionHeader(rawLine);
        if (sectionName !== null) {
            currentSection = sectionName;
            ensureSectionReferences(currentSection);
            entries.push({ kind: 'section', raw: rawLine, name: currentSection });
            isIni = true;
            continue;
        }

        const equalsIndex = rawLine.indexOf('=');
        if (equalsIndex === -1) {
            entries.push({ kind: 'other', raw: rawLine, section: currentSection });
            continue;
        }

        const key = rawLine.slice(0, equalsIndex).trim();
        if (!key) {
            entries.push({ kind: 'other', raw: rawLine, section: currentSection });
            continue;
        }

        ensureSectionReferences(currentSection);

        const valueSegment = rawLine.slice(equalsIndex + 1);
        const leadingWhitespace = valueSegment.match(/^\s*/)?.[0] ?? '';
        const firstSplit = splitInlineComment(valueSegment);

        const rawLines = [rawLine];
        let inlineComment = firstSplit.inlineComment;
        let inQuoteState = firstSplit.inQuoteAtEnd;
        let normalizedValue = stripLineContinuation(firstSplit.valuePart);
        let continuation = hasLineContinuation(firstSplit.valuePart);

        while (continuation && lineIndex + 1 < lines.length) {
            lineIndex += 1;
            const continuationLine = lines[lineIndex];
            rawLines.push(continuationLine);

            const continuationSplit = splitInlineComment(continuationLine, inQuoteState);
            inQuoteState = continuationSplit.inQuoteAtEnd;
            if (continuationSplit.inlineComment) {
                inlineComment = continuationSplit.inlineComment;
            }
            normalizedValue += `\n${stripLineContinuation(continuationSplit.valuePart)}`;
            continuation = hasLineContinuation(continuationSplit.valuePart);
        }

        const parsedValue = coerceIniValue(unquoteIni(normalizedValue.trim()));
        ini[currentSection][key] = parsedValue;

        const entry: IniKeyEntry = {
            kind: 'key',
            section: currentSection,
            key,
            rawLines,
            parsedValue,
            prefix: `${rawLine.slice(0, equalsIndex + 1)}${leadingWhitespace}`,
            inlineComment,
        };

        const entryIndex = entries.length;
        entries.push(entry);
        keyRefs[currentSection][key] = { section: currentSection, key, entryIndex };
        isIni = true;
    }

    if (!isIni) {
        return { type: 'raw', data: text };
    }

    return {
        type: 'ini',
        data: ini,
        meta: {
            originalText: text,
            eol,
            trailingNewline,
            entries,
            keyRefs,
            parsedFingerprint: stableStringify(ini),
        },
    };
}

export async function parseGamemaker(file: File): Promise<ParseOutcome<any>> {
    const text = await file.text();

    try {
        const parsedJson = JSON.parse(text);
        if (isObject(parsedJson) || Array.isArray(parsedJson)) {
            return makeOutcome({
                engine: 'gamemaker',
                format: 'json',
                mode: 'full',
                reasonCode: 'ok',
                capabilities: {
                    canView: true,
                    canEdit: true,
                    canSave: true,
                    roundTripSupport: 'stable',
                },
                data: parsedJson,
            });
        }
    } catch {
        // Not JSON, continue to INI/raw detection.
    }

    const parsed = parseIni(text);

    if (parsed.type === 'ini') {
        const structured = (parsed.data && typeof parsed.data === 'object'
            ? parsed.data
            : {}) as Record<string, unknown>;
        if (parsed.meta) {
            attachIniMeta(file.name, structured, parsed.meta);
        }

        return makeOutcome({
            engine: 'gamemaker',
            format: 'ini',
            mode: 'full',
            reasonCode: 'ok',
            capabilities: {
                canView: true,
                canEdit: true,
                canSave: true,
                roundTripSupport: 'stable',
            },
            data: structured,
        });
    }

    return makeOutcome({
        engine: 'gamemaker',
        format: 'raw',
        mode: 'partial',
        reasonCode: 'raw_fallback',
        reason: 'Opened as raw text fallback. Structured parse was not available for this file.',
        capabilities: {
            canView: true,
            canEdit: true,
            canSave: true,
            roundTripSupport: 'experimental',
        },
        data: parsed.data,
        warnings: ['Editing raw mode may corrupt binary or custom-encoded save files.'],
    });
}

interface GamemakerBuildInput {
    type?: string;
    data?: unknown;
}

export async function buildGamemaker(originalFile: File, input: GamemakerBuildInput): Promise<Blob> {
    const type = (input?.type ?? 'raw').toLowerCase();
    const payload = input?.data;

    if (type === 'json') {
        return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    }

    if (type === 'ini') {
        const source = isObject(payload) ? payload : {};
        const persistedMeta =
            gamemakerIniMetaByFile.get(originalFile.name) ||
            ((source as any).__gmIniMeta as IniMeta | undefined);

        const ini = persistedMeta ? buildIniWithMeta(persistedMeta, source) : buildIniFallback(source);
        return new Blob([ini], { type: 'text/plain' });
    }

    return new Blob([typeof payload === 'string' ? payload : String(payload ?? '')], {
        type: 'text/plain',
    });
}
