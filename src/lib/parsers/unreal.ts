import { Buffer } from 'buffer';
import pako from 'pako';
import { makeOutcome, type ParseOutcome, type RoundTripSupportLevel } from './types';

export type UnrealParseMode =
    | 'full'
    | 'full_wrapped'
    | 'partial'
    | 'unsupported_compressed'
    | 'not_gvas';

export type CompressionKind = 'none' | 'zlib' | 'gzip' | 'raw-deflate' | 'unknown';

const MAX_DECOMPRESSED_BYTES = 64 * 1024 * 1024;

export type UnrealParseReasonCode =
    | 'standard_gvas'
    | 'compressed_repackable'
    | 'compressed_readonly'
    | 'gvas_parse_failed'
    | 'decompression_limit'
    | 'unsupported_container'
    | 'decompression_failed'
    | 'not_gvas';

export interface UnrealReasonMeta {
    compression?: CompressionKind;
    parserError?: string;
    maxDecompressedBytes?: number;
}

interface GvasLike {
    serialize(): Uint8Array;
}

export interface UnrealCapabilities {
    canView: boolean;
    canEdit: boolean;
    canSave: boolean;
    requiresExperimental: boolean;
}

export interface UnrealParseResult {
    mode: UnrealParseMode;
    reasonCode: UnrealParseReasonCode;
    reason?: string;
    reasonMeta?: UnrealReasonMeta;
    compression: CompressionKind;
    fileSize: number;
    header: string;
    _unrealParseStatus: 'ok' | 'partial';
    _capabilities: UnrealCapabilities;
    jsonView: any;
    _unrealGvas?: GvasLike;
}

export type UnrealParseOutcome = ParseOutcome<UnrealParseResult>;

interface InflateResult {
    kind: CompressionKind;
    bytes: Uint8Array;
}

interface InflateOutcome {
    result: InflateResult | null;
    limitExceeded: boolean;
    limitKind: CompressionKind | null;
}

class DecompressionLimitError extends Error {
    constructor(
        public readonly kind: CompressionKind,
        public readonly maxBytes: number
    ) {
        super(`Decompression for ${kind} exceeded safety limit (${maxBytes} bytes).`);
        this.name = 'DecompressionLimitError';
    }
}

const GVAS_MAGIC = [0x47, 0x56, 0x41, 0x53];

function hasGvasHeader(bytes: Uint8Array): boolean {
    return (
        bytes.length >= 4 &&
        bytes[0] === GVAS_MAGIC[0] &&
        bytes[1] === GVAS_MAGIC[1] &&
        bytes[2] === GVAS_MAGIC[2] &&
        bytes[3] === GVAS_MAGIC[3]
    );
}

function isLikelyZlib(bytes: Uint8Array): boolean {
    if (bytes.length < 2) return false;
    const cmf = bytes[0];
    const flg = bytes[1];
    if ((cmf & 0x0f) !== 0x08) return false;
    return ((cmf << 8) + flg) % 31 === 0;
}

function isLikelyGzip(bytes: Uint8Array): boolean {
    return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

function looksCompressed(bytes: Uint8Array): boolean {
    return isLikelyGzip(bytes) || isLikelyZlib(bytes);
}

function concatChunks(chunks: Uint8Array[], totalBytes: number): Uint8Array {
    if (chunks.length === 0) return new Uint8Array(0);
    if (chunks.length === 1) return chunks[0];

    const output = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
        output.set(chunk, offset);
        offset += chunk.length;
    }
    return output;
}

function inflateWithLimit(
    bytes: Uint8Array,
    kind: CompressionKind,
    options: { maxOutputBytes: number; inflateOptions?: { raw?: boolean; windowBits?: number } }
): InflateResult {
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    const inflater = new pako.Inflate(options.inflateOptions);

    inflater.onData = (chunk: Uint8Array) => {
        totalBytes += chunk.length;
        if (totalBytes > options.maxOutputBytes) {
            throw new DecompressionLimitError(kind, options.maxOutputBytes);
        }
        chunks.push(chunk);
    };

    try {
        inflater.push(bytes, true);
    } catch (error) {
        if (error instanceof DecompressionLimitError) {
            throw error;
        }
        throw new Error(`Failed to inflate ${kind} payload.`);
    }

    if (inflater.err) {
        throw new Error(inflater.msg || `Failed to inflate ${kind} payload.`);
    }

    return { kind, bytes: concatChunks(chunks, totalBytes) };
}

function tryDecompress(
    bytes: Uint8Array,
    options: { maxOutputBytes: number; allowRawDeflate: boolean }
): InflateOutcome {
    const attempts: Array<() => InflateResult> = [];

    if (isLikelyGzip(bytes)) {
        attempts.push(() =>
            inflateWithLimit(bytes, 'gzip', {
                maxOutputBytes: options.maxOutputBytes,
                inflateOptions: { windowBits: 15 + 16 },
            })
        );
    }

    if (isLikelyZlib(bytes)) {
        attempts.push(() =>
            inflateWithLimit(bytes, 'zlib', {
                maxOutputBytes: options.maxOutputBytes,
                inflateOptions: { windowBits: 15 },
            })
        );
    }

    if (options.allowRawDeflate) {
        attempts.push(() =>
            inflateWithLimit(bytes, 'raw-deflate', {
                maxOutputBytes: options.maxOutputBytes,
                inflateOptions: { raw: true },
            })
        );
    }

    for (const attempt of attempts) {
        try {
            const result = attempt();
            if (result.bytes.length > 0) {
                return { result, limitExceeded: false, limitKind: null };
            }
        } catch (error) {
            if (error instanceof DecompressionLimitError) {
                return { result: null, limitExceeded: true, limitKind: error.kind };
            }
        }
    }

    return { result: null, limitExceeded: false, limitKind: null };
}

function getCapabilities(mode: UnrealParseMode): UnrealCapabilities {
    if (mode === 'full' || mode === 'full_wrapped') {
        return {
            canView: true,
            canEdit: true,
            canSave: true,
            requiresExperimental: false,
        };
    }

    return {
        canView: mode !== 'not_gvas',
        canEdit: false,
        canSave: false,
        requiresExperimental: false,
    };
}

function attachGvas(result: UnrealParseResult, gvas: GvasLike) {
    Object.defineProperty(result, '_unrealGvas', {
        value: gvas,
        enumerable: false,
        configurable: false,
        writable: false,
    });
}

function toRoundTripSupport(capabilities: UnrealCapabilities): RoundTripSupportLevel {
    if (!capabilities.canSave) return 'none';
    if (capabilities.requiresExperimental) return 'experimental';
    return 'stable';
}

function toOutcome(result: UnrealParseResult): UnrealParseOutcome {
    return makeOutcome({
        engine: 'unreal',
        format: 'sav',
        mode: result.mode,
        reasonCode: result.reasonCode,
        reason: result.reason,
        capabilities: {
            canView: result._capabilities.canView,
            canEdit: result._capabilities.canEdit,
            canSave: result._capabilities.canSave,
            requiresExperimental: result._capabilities.requiresExperimental,
            roundTripSupport: toRoundTripSupport(result._capabilities),
        },
        data: result,
        diagnostics: {
            compression: result.compression,
            fileSize: result.fileSize,
        },
    });
}

async function parseGvasPayload(
    file: File,
    payload: Uint8Array,
    compression: CompressionKind
): Promise<UnrealParseResult> {
    try {
        const { Gvas, Serializer } = await import('uesavetool');
        const serializer = new Serializer(Buffer.from(payload));
        const gvas = new Gvas();
        gvas.deserialize(serializer);

        const jsonView = JSON.parse(JSON.stringify(gvas));
        const isStandard = compression === 'none';
        const isSafelyWrapped = compression === 'gzip' || compression === 'zlib';
        const mode: UnrealParseMode = isStandard
            ? 'full'
            : isSafelyWrapped
              ? 'full_wrapped'
              : 'unsupported_compressed';
        const reasonCode: UnrealParseReasonCode = isStandard
            ? 'standard_gvas'
            : isSafelyWrapped
              ? 'compressed_repackable'
              : 'compressed_readonly';

        const result: UnrealParseResult = {
            mode,
            reasonCode,
            compression,
            fileSize: file.size,
            header: 'GVAS',
            reason: isStandard
                ? 'Standard GVAS file parsed successfully.'
                : isSafelyWrapped
                  ? `Parsed after ${compression} decompression. This wrapped GVAS variant supports safe recompression on export.`
                  : `Parsed after ${compression} decompression, but this wrapper is not supported for safe recompression. This variant is read-only.`,
            reasonMeta: { compression },
            _unrealParseStatus: mode === 'unsupported_compressed' ? 'partial' : 'ok',
            _capabilities: getCapabilities(mode),
            jsonView,
        };

        attachGvas(result, gvas);
        return result;
    } catch (error: any) {
        return {
            mode: 'partial',
            reasonCode: 'gvas_parse_failed',
            compression,
            fileSize: file.size,
            header: 'GVAS',
            reason: `GVAS detected but could not be fully parsed: ${error?.message || 'Unknown parser error'}`,
            reasonMeta: {
                compression,
                parserError: error?.message || 'Unknown parser error',
            },
            _unrealParseStatus: 'partial',
            _capabilities: getCapabilities('partial'),
            jsonView: {
                type: 'GVAS (Unreal Engine)',
                fileName: file.name,
                fileSize: file.size,
                compression,
                parserStatus: 'partial',
            },
        };
    }
}

export async function parseUnreal(file: File): Promise<UnrealParseOutcome> {
    const rawBytes = new Uint8Array(await file.arrayBuffer());
    const hasWrappedCompressionHint = looksCompressed(rawBytes);

    if (hasGvasHeader(rawBytes)) {
        return toOutcome(await parseGvasPayload(file, rawBytes, 'none'));
    }

    const { result: decompressed, limitExceeded, limitKind } = tryDecompress(rawBytes, {
        maxOutputBytes: MAX_DECOMPRESSED_BYTES,
        allowRawDeflate: true,
    });

    if (limitExceeded) {
        const compression = limitKind ?? (hasWrappedCompressionHint ? 'unknown' : 'raw-deflate');
        return toOutcome({
            mode: 'unsupported_compressed',
            reasonCode: 'decompression_limit',
            compression,
            fileSize: file.size,
            header: Buffer.from(rawBytes.slice(0, 4)).toString('utf8'),
            reason: `Compressed payload (${compression}) exceeded in-browser safety limit (${MAX_DECOMPRESSED_BYTES} bytes).`,
            reasonMeta: {
                compression,
                maxDecompressedBytes: MAX_DECOMPRESSED_BYTES,
            },
            _unrealParseStatus: 'partial',
            _capabilities: getCapabilities('unsupported_compressed'),
            jsonView: {
                type: 'Compressed .sav (Safety Stop)',
                fileName: file.name,
                fileSize: file.size,
                compression,
                parserStatus: 'unsupported_compressed',
                note: 'Decompression stopped to avoid memory exhaustion in the browser.',
            },
        });
    }

    if (decompressed && hasGvasHeader(decompressed.bytes)) {
        return toOutcome(await parseGvasPayload(file, decompressed.bytes, decompressed.kind));
    }

    if (decompressed && (hasWrappedCompressionHint || decompressed.kind !== 'raw-deflate')) {
        return toOutcome({
            mode: 'unsupported_compressed',
            reasonCode: 'unsupported_container',
            compression: decompressed.kind,
            fileSize: file.size,
            header: Buffer.from(decompressed.bytes.slice(0, 4)).toString('utf8'),
            reason:
                'Compressed .sav detected, but payload is not standard GVAS. This game likely uses a custom container or encryption.',
            reasonMeta: {
                compression: decompressed.kind,
            },
            _unrealParseStatus: 'partial',
            _capabilities: getCapabilities('unsupported_compressed'),
            jsonView: {
                type: 'Compressed .sav (Unsupported Container)',
                fileName: file.name,
                fileSize: file.size,
                compression: decompressed.kind,
                parserStatus: 'unsupported_compressed',
                note: 'The file decompresses, but the payload is not a plain GVAS structure.',
            },
        });
    }

    if (hasWrappedCompressionHint) {
        return toOutcome({
            mode: 'unsupported_compressed',
            reasonCode: 'decompression_failed',
            compression: 'unknown',
            fileSize: file.size,
            header: Buffer.from(rawBytes.slice(0, 4)).toString('utf8'),
            reason:
                'The file appears compressed, but decompression failed in-browser. It may use a custom compression or encrypted container.',
            reasonMeta: {
                compression: 'unknown',
            },
            _unrealParseStatus: 'partial',
            _capabilities: getCapabilities('unsupported_compressed'),
            jsonView: {
                type: 'Compressed .sav (Unsupported)',
                fileName: file.name,
                fileSize: file.size,
                compression: 'unknown',
                parserStatus: 'unsupported_compressed',
            },
        });
    }

    return toOutcome({
        mode: 'not_gvas',
        reasonCode: 'not_gvas',
        compression: 'none',
        fileSize: file.size,
        header: Buffer.from(rawBytes.slice(0, 4)).toString('utf8'),
        reason: 'This .sav file is not a standard Unreal GVAS save.',
        reasonMeta: {
            compression: 'none',
        },
        _unrealParseStatus: 'partial',
        _capabilities: getCapabilities('not_gvas'),
        jsonView: {
            type: 'Unsupported .sav format',
            fileName: file.name,
            fileSize: file.size,
            parserStatus: 'not_gvas',
        },
    });
}

export async function buildUnreal(_originalFile: File, input: any): Promise<Blob> {
    const payload = input?.engine ? input?.data : input?.data ?? input;
    const mode = payload?.mode as UnrealParseMode | undefined;

    if (mode && mode !== 'full' && mode !== 'full_wrapped') {
        throw new Error(
            payload?.reason || 'Saving is only supported for fully parsed standard/wrapped GVAS files.'
        );
    }

    const source = payload?.jsonView ?? payload;
    if (!source) {
        throw new Error('No Unreal save payload found.');
    }

    const { Gvas } = await import('uesavetool');

    let serializedBytes: Uint8Array;

    if (typeof source.serialize === 'function') {
        serializedBytes = source.serialize();
    } else if (source.Header && source.Properties) {
        const gvas = Gvas.from(source);
        serializedBytes = gvas.serialize();
    } else if (payload?._unrealGvas && typeof payload._unrealGvas.serialize === 'function') {
        serializedBytes = payload._unrealGvas.serialize();
    } else {
        throw new Error('Saving Unreal Engine files requires a valid GVAS structure (Header + Properties).');
    }

    const output = new Uint8Array(serializedBytes.byteLength);
    output.set(serializedBytes);

    const compression =
        (payload?.compression as CompressionKind | undefined) ||
        (payload?.reasonMeta?.compression as CompressionKind | undefined) ||
        'none';

    if (compression === 'none') {
        return new Blob([output.buffer], { type: 'application/octet-stream' });
    }

    if (compression === 'gzip') {
        const wrapped = pako.gzip(output);
        return new Blob([wrapped.buffer], { type: 'application/octet-stream' });
    }

    if (compression === 'zlib') {
        const wrapped = pako.deflate(output);
        return new Blob([wrapped.buffer], { type: 'application/octet-stream' });
    }

    throw new Error(
        `Saving for compression "${compression}" is not supported. Only none/gzip/zlib wrappers can be rebuilt safely.`
    );
}
