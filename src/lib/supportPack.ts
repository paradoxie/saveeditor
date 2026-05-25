import type { ParseOutcome, SupportPackSummary } from './parsers/types';

interface RejectedSupportPackInput {
    file?: Pick<File, 'name' | 'size'> | null;
    parserPath: string;
    failureStage: string;
    reasonCode: string;
    format?: string;
    mode?: string;
    contentClass?: SupportPackSummary['contentClass'];
    data?: unknown;
    headerBytes?: Uint8Array;
}

export async function attachSupportPack<T>(
    outcome: ParseOutcome<T>,
    file: File,
    parserPath: string,
    failureStage = outcome.capabilities.canView ? 'parsed' : 'parse_failed'
): Promise<ParseOutcome<T>> {
    const bytes = await readSupportHeaderBytes(file);
    const supportPack = buildSupportPack(outcome, file, parserPath, failureStage, bytes);
    return {
        ...outcome,
        diagnostics: {
            ...(outcome.diagnostics || {}),
            supportPack,
        },
    };
}

export function buildSupportPack<T>(
    outcome: ParseOutcome<T>,
    file: File,
    parserPath: string,
    failureStage: string,
    headerBytes: Uint8Array
): SupportPackSummary {
    return buildSupportPackSummary({
        fileName: file.name,
        fileSize: file.size,
        parserPath,
        failureStage,
        reasonCode: String(outcome.reasonCode || 'ok'),
        format: outcome.format,
        mode: outcome.mode,
        capability: outcome.capabilities.roundTripSupport,
        canView: outcome.capabilities.canView,
        canEdit: outcome.capabilities.canEdit,
        canSave: outcome.capabilities.canSave,
        data: outcome.data,
        headerBytes,
    });
}

export function buildRejectedSupportPack(input: RejectedSupportPackInput): SupportPackSummary {
    return buildSupportPackSummary({
        fileName: input.file?.name || 'unknown',
        fileSize: input.file?.size || 0,
        parserPath: input.parserPath,
        failureStage: input.failureStage,
        reasonCode: input.reasonCode,
        format: input.format || extensionOf(input.file?.name || ''),
        mode: input.mode || 'error',
        capability: 'none',
        canView: false,
        canEdit: false,
        canSave: false,
        contentClass: input.contentClass,
        data: input.data ?? null,
        headerBytes: input.headerBytes || new Uint8Array(),
    });
}

export async function buildRejectedSupportPackFromFile(
    input: Omit<RejectedSupportPackInput, 'headerBytes'> & { file: File }
): Promise<SupportPackSummary> {
    return buildRejectedSupportPack({
        ...input,
        headerBytes: await readSupportHeaderBytes(input.file),
    });
}

export async function readSupportHeaderBytes(file: Pick<File, 'slice'>): Promise<Uint8Array> {
    try {
        return new Uint8Array(await file.slice(0, 512).arrayBuffer());
    } catch {
        return new Uint8Array();
    }
}

export function supportPackMailto(pack: SupportPackSummary, email = 'support@saveeditor.top'): string {
    const subject = `SaveEditor support pack: ${pack.extension} ${pack.reasonCode}`;
    const body = [
        'Paste any game name/version notes above this line.',
        '',
        JSON.stringify(pack, null, 2),
    ].join('\n');
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function summarizeStructure(value: unknown): SupportPackSummary['structureSummary'] {
    const visited = new WeakSet<object>();
    let nodeCount = 0;
    let primitiveCount = 0;
    let maxDepth = 0;

    const visit = (node: unknown, depth: number) => {
        if (nodeCount > 800 || depth > 8) return;
        maxDepth = Math.max(maxDepth, depth);
        if (node === null || typeof node !== 'object') {
            primitiveCount += 1;
            return;
        }
        if (visited.has(node)) return;
        visited.add(node);
        nodeCount += 1;
        const children = Array.isArray(node) ? node.slice(0, 80) : Object.values(node as Record<string, unknown>).slice(0, 80);
        for (const child of children) visit(child, depth + 1);
    };

    visit(value, 0);
    return {
        rootType: Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value,
        nodeCount,
        primitiveCount,
        maxDepth,
    };
}

function buildSupportPackSummary(input: {
    fileName: string;
    fileSize: number;
    parserPath: string;
    failureStage: string;
    reasonCode: string;
    format: string;
    mode: string;
    capability: SupportPackSummary['capability'];
    canView: boolean;
    canEdit: boolean;
    canSave: boolean;
    contentClass?: SupportPackSummary['contentClass'];
    data: unknown;
    headerBytes: Uint8Array;
}): SupportPackSummary {
    const structureSummary = summarizeStructure(input.data);
    const contentClass = input.contentClass || classifyContent(input.data, input.headerBytes);
    return {
        fileName: redactFileName(input.fileName),
        extension: extensionOf(input.fileName),
        sizeBucket: sizeBucket(input.fileSize),
        parserPath: input.parserPath,
        failureStage: input.failureStage,
        reasonCode: input.reasonCode,
        format: input.format || 'unknown',
        mode: input.mode,
        capability: input.capability,
        canView: input.canView,
        canEdit: input.canEdit,
        canSave: input.canSave,
        contentClass,
        signature: {
            byteHash: hashBytes(input.headerBytes),
            schemaFingerprint: hashText(`${structureSummary.rootType}:${structureSummary.nodeCount}:${structureSummary.primitiveCount}:${structureSummary.maxDepth}`),
        },
        structureSummary,
    };
}

function classifyContent(value: unknown, headerBytes: Uint8Array): SupportPackSummary['contentClass'] {
    if (!value && headerBytes.length === 0) return 'empty';
    if (value && typeof value === 'object') return 'structured';
    if (headerBytes.length === 0) return 'empty';
    const printable = headerBytes.slice(0, 128).reduce((count, byte) => {
        if (byte === 9 || byte === 10 || byte === 13) return count + 1;
        return byte >= 32 && byte <= 126 ? count + 1 : count;
    }, 0);
    return printable / Math.max(headerBytes.length, 1) >= 0.85 ? 'text' : 'binary';
}

function hashBytes(bytes: Uint8Array): string {
    let hash = 2166136261;
    for (const byte of bytes) {
        hash ^= byte;
        hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-${(hash >>> 0).toString(16)}`;
}

function hashText(text: string): string {
    const bytes = new TextEncoder().encode(text);
    return hashBytes(bytes);
}

function extensionOf(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ext ? `.${ext}` : '(none)';
}

function redactFileName(fileName: string): string {
    const ext = extensionOf(fileName);
    return ext === '(none)' ? 'redacted' : `redacted${ext}`;
}

function sizeBucket(size: number): string {
    if (size < 1024) return '<1KB';
    if (size < 1024 * 1024) return `${Math.ceil(size / 1024)}KB`;
    return `${Math.ceil(size / (1024 * 1024))}MB`;
}
