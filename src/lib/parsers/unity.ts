import plist from 'plist';
import { makeOutcome, type ParseOutcome } from './types';

type UnityInputFormat = 'unity-plist' | 'unity-xml' | 'unity-bplist';
type UnityValueType = 'int' | 'long' | 'float' | 'string' | 'boolean';
type UnityBinaryVariant = 'bplist' | 'unknown-playerprefs';

interface UnityParseMeta {
    inputFormat: UnityInputFormat;
    keyOrder: string[];
    valueTypes: Record<string, UnityValueType>;
}

interface ParsedUnityXml {
    data: Record<string, unknown>;
    meta: UnityParseMeta;
}

interface UnityBinaryDetection {
    variant: UnityBinaryVariant;
    nullByteRatio: number;
}

const unityMetaByFile = new Map<string, UnityParseMeta>();

function detectUnityBinaryVariant(bytes: Uint8Array): UnityBinaryDetection {
    const nullCount = bytes.reduce((count, value) => count + (value === 0 ? 1 : 0), 0);
    const nullByteRatio = bytes.length > 0 ? nullCount / bytes.length : 0;
    const header = new TextDecoder('ascii', { fatal: false }).decode(bytes.subarray(0, 8));

    if (header === 'bplist00') {
        return { variant: 'bplist', nullByteRatio };
    }

    return { variant: 'unknown-playerprefs', nullByteRatio };
}

function decodeXmlEntities(value: string): string {
    return value
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

function escapeXmlEntities(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function inferUnityType(value: unknown): UnityValueType {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'float';
    if (typeof value === 'bigint') return 'long';
    return 'string';
}

function normalizeBplistValue(value: unknown): unknown {
    if (typeof value === 'bigint') {
        return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER)
            ? Number(value)
            : value.toString();
    }
    if (value instanceof Uint8Array) return Array.from(value);
    if (Array.isArray(value)) return value.map(normalizeBplistValue);
    if (value && typeof value === 'object') {
        const normalized: Record<string, unknown> = {};
        for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
            normalized[key] = normalizeBplistValue(item);
        }
        return normalized;
    }
    return value;
}

function attachUnityMeta(fileName: string, payload: Record<string, unknown>, meta: UnityParseMeta) {
    unityMetaByFile.set(fileName, meta);
    Object.defineProperty(payload, '__unityMeta', {
        value: meta,
        enumerable: false,
        configurable: true,
        writable: false,
    });
}

function toOrderedEntries(
    payload: Record<string, unknown>,
    meta: UnityParseMeta | undefined
): Array<[string, unknown]> {
    const keys = Object.keys(payload);
    if (!meta || meta.keyOrder.length === 0) {
        return keys.map((key) => [key, payload[key]]);
    }

    const orderedKeys = [
        ...meta.keyOrder.filter((key) => Object.prototype.hasOwnProperty.call(payload, key)),
        ...keys.filter((key) => !meta.keyOrder.includes(key)),
    ];
    return orderedKeys.map((key) => [key, payload[key]]);
}

function parseUnityXml(text: string): ParsedUnityXml {
    const result: Record<string, unknown> = {};
    const valueTypes: Record<string, UnityValueType> = {};
    const keyOrder: string[] = [];
    const nodePattern = /<(int|long|float|string|boolean)\b([^>]*)\/?>(?:([^<]*)<\/\1>)?/gi;
    let matched = false;

    for (const match of text.matchAll(nodePattern)) {
        const tag = match[1] as UnityValueType;
        const attrs = match[2] || '';
        const textValue = match[3] ?? '';

        const nameMatch = attrs.match(/\bname\s*=\s*"([^"]+)"/i);
        if (!nameMatch) continue;

        const rawName = decodeXmlEntities(nameMatch[1]);
        const valueMatch = attrs.match(/\bvalue\s*=\s*"([^"]*)"/i);
        const attrValue = valueMatch ? decodeXmlEntities(valueMatch[1]) : null;
        const fallbackValue = decodeXmlEntities(textValue.trim());
        const rawValue = attrValue ?? fallbackValue;

        if (tag === 'int' || tag === 'long') {
            result[rawName] = Number.parseInt(rawValue || '0', 10);
        } else if (tag === 'float') {
            result[rawName] = Number.parseFloat(rawValue || '0');
        } else if (tag === 'boolean') {
            result[rawName] = rawValue === 'true' || rawValue === '1';
        } else {
            result[rawName] = rawValue;
        }
        valueTypes[rawName] = tag;
        keyOrder.push(rawName);

        matched = true;
    }

    if (!matched) {
        throw new Error('Invalid Unity XML: No supported <map> entries found.');
    }

    return {
        data: result,
        meta: {
            inputFormat: 'unity-xml',
            keyOrder,
            valueTypes,
        },
    };
}

export async function parseUnity(file: File): Promise<ParseOutcome<any>> {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

    if (text.trim().startsWith('<?xml') && text.includes('<!DOCTYPE plist')) {
        try {
            const parsed = plist.parse(text);
            const payload = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                ? parsed
                : {}) as Record<string, unknown>;
            const meta: UnityParseMeta = {
                inputFormat: 'unity-plist',
                keyOrder: Object.keys(payload),
                valueTypes: Object.fromEntries(
                    Object.entries(payload).map(([key, value]) => [key, inferUnityType(value)])
                ),
            };
            attachUnityMeta(file.name, payload, meta);
            return makeOutcome({
                engine: 'unity',
                format: 'unity',
                mode: 'full',
                reasonCode: 'ok',
                capabilities: {
                    canView: true,
                    canEdit: true,
                    canSave: true,
                    roundTripSupport: 'stable',
                },
                data: payload,
                diagnostics: { inputFormat: 'unity-plist' satisfies UnityInputFormat, keys: meta.keyOrder.length },
            });
        } catch (error: any) {
            return makeOutcome({
                engine: 'unity',
                format: 'unity',
                mode: 'unsupported',
                reasonCode: 'parse_failed',
                reason: `Failed to parse Unity Plist: ${error?.message || 'Unknown error'}`,
                capabilities: {
                    canView: false,
                    canEdit: false,
                    canSave: false,
                    roundTripSupport: 'none',
                },
                data: null,
            });
        }
    }

    if (text.trim().startsWith('<?xml') || text.includes('<map>')) {
        try {
            const parsed = parseUnityXml(text);
            attachUnityMeta(file.name, parsed.data, parsed.meta);
            return makeOutcome({
                engine: 'unity',
                format: 'unity',
                mode: 'full',
                reasonCode: 'ok',
                capabilities: {
                    canView: true,
                    canEdit: true,
                    canSave: true,
                    roundTripSupport: 'stable',
                },
                data: parsed.data,
                diagnostics: { inputFormat: 'unity-xml' satisfies UnityInputFormat, keys: parsed.meta.keyOrder.length },
            });
        } catch (error: any) {
            return makeOutcome({
                engine: 'unity',
                format: 'unity',
                mode: 'unsupported',
                reasonCode: 'parse_failed',
                reason: `Failed to parse Unity XML: ${error?.message || 'Unknown error'}`,
                capabilities: {
                    canView: false,
                    canEdit: false,
                    canSave: false,
                    roundTripSupport: 'none',
                },
                data: null,
            });
        }
    }

    const hasBinary = bytes.some((b) => b === 0);
    if (hasBinary) {
        const detection = detectUnityBinaryVariant(bytes);
        if (detection.variant === 'bplist') {
            try {
                const { parseBplist } = await import('bplist-lossless');
                const parsed = normalizeBplistValue(parseBplist(bytes));
                const payload = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                    ? parsed
                    : {}) as Record<string, unknown>;
                const meta: UnityParseMeta = {
                    inputFormat: 'unity-bplist',
                    keyOrder: Object.keys(payload),
                    valueTypes: Object.fromEntries(
                        Object.entries(payload).map(([key, value]) => [key, inferUnityType(value)])
                    ),
                };
                attachUnityMeta(file.name, payload, meta);
                return makeOutcome({
                    engine: 'unity',
                    format: 'unity',
                    mode: 'limited',
                    reasonCode: 'ok',
                    reason: 'Binary plist PlayerPrefs parsed successfully. Export rebuilds a binary plist payload.',
                    capabilities: {
                        canView: true,
                        canEdit: true,
                        canSave: true,
                        roundTripSupport: 'stable-limited',
                    },
                    data: payload,
                    diagnostics: {
                        inputFormat: 'unity-bplist' satisfies UnityInputFormat,
                        binaryVariant: detection.variant,
                        byteLength: bytes.byteLength,
                        keys: meta.keyOrder.length,
                    },
                });
            } catch (error: any) {
                return makeOutcome({
                    engine: 'unity',
                    format: 'unity',
                    mode: 'unsupported',
                    reasonCode: 'unsupported_binary_plist',
                    reason: `Unsupported Unity binary plist: ${error?.message || 'parse failed'}`,
                    capabilities: {
                        canView: false,
                        canEdit: false,
                        canSave: false,
                        roundTripSupport: 'none',
                    },
                    data: null,
                    diagnostics: {
                        binaryVariant: detection.variant,
                        byteLength: bytes.byteLength,
                        nullByteRatio: Number(detection.nullByteRatio.toFixed(4)),
                    },
                });
            }
        }

        return makeOutcome({
            engine: 'unity',
            format: 'unity',
            mode: 'unsupported',
            reasonCode: 'unsupported_binary_playerprefs',
            reason: 'Unsupported Unity format: binary PlayerPrefs is not supported.',
            capabilities: {
                canView: false,
                canEdit: false,
                canSave: false,
                roundTripSupport: 'none',
            },
            data: null,
            diagnostics: {
                binaryVariant: detection.variant,
                byteLength: bytes.byteLength,
                nullByteRatio: Number(detection.nullByteRatio.toFixed(4)),
            },
        });
    }

    return makeOutcome({
        engine: 'unity',
        format: 'unity',
        mode: 'unsupported',
        reasonCode: 'unsupported_extension',
        reason: 'Unsupported Unity format. Only XML and Plist are supported.',
        capabilities: {
            canView: false,
            canEdit: false,
            canSave: false,
            roundTripSupport: 'none',
        },
        data: null,
    });
}

export async function buildUnity(originalFile: File, input: any): Promise<Blob> {
    const payload = input?.data ?? input;
    const text = await originalFile.text();
    const structuredPayload =
        payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const persistedMeta =
        unityMetaByFile.get(originalFile.name) || ((structuredPayload as any).__unityMeta as UnityParseMeta | undefined);
    const inputFormat: UnityInputFormat =
        persistedMeta?.inputFormat ||
        (text.startsWith('bplist00')
            ? 'unity-bplist'
            : text.trim().startsWith('<?xml') && text.includes('<!DOCTYPE plist')
              ? 'unity-plist'
              : 'unity-xml');
    const orderedEntries = toOrderedEntries(structuredPayload, persistedMeta);

    if (inputFormat === 'unity-bplist') {
        const orderedPayload: Record<string, unknown> = {};
        orderedEntries.forEach(([key, value]) => {
            orderedPayload[key] = value;
        });
        const { serializeBplist } = await import('bplist-lossless');
        return blobFromBytes(serializeBplist(orderedPayload), 'application/x-plist');
    }

    if (inputFormat === 'unity-plist') {
        const orderedPayload: Record<string, unknown> = {};
        orderedEntries.forEach(([key, value]) => {
            orderedPayload[key] = value;
        });
        const newXml = plist.build(orderedPayload as any);
        return new Blob([newXml], { type: 'application/x-plist' });
    }

    let xml = "<?xml version='1.0' encoding='utf-8' standalone='yes' ?>\n<map>\n";
    for (const [key, value] of orderedEntries) {
        const safeKey = escapeXmlEntities(String(key));
        const valueType = persistedMeta?.valueTypes?.[key] || inferUnityType(value);

        if (valueType === 'int' || valueType === 'long') {
            const numericValue = Number.parseInt(String(value ?? 0), 10);
            const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
            xml += `    <${valueType} name="${safeKey}" value="${safeValue}" />\n`;
            continue;
        }

        if (valueType === 'float') {
            const numericValue = Number.parseFloat(String(value ?? 0));
            const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
            xml += `    <float name="${safeKey}" value="${safeValue}" />\n`;
            continue;
        }

        if (valueType === 'boolean') {
            const boolValue = value === true || value === 'true' || value === 1 || value === '1';
            xml += `    <boolean name="${safeKey}" value="${boolValue}" />\n`;
            continue;
        }

        const safeValue = escapeXmlEntities(String(value ?? ''));
        xml += `    <string name="${safeKey}" value="${safeValue}" />\n`;
    }

    xml += '</map>';
    return new Blob([xml], { type: 'application/xml' });
}

function blobFromBytes(bytes: Uint8Array, type: string): Blob {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return new Blob([buffer], { type });
}
