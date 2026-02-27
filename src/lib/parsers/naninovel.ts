import pako from 'pako';
import { makeOutcome, type ParseOutcome } from './types';

export type NaniNovelFormat =
    | 'naninovel-json'
    | 'naninovel-base64'
    | 'naninovel-gzip'
    | 'naninovel-zlib'
    | 'naninovel-base64-gzip'
    | 'naninovel-nson';

const textDecoder = new TextDecoder('utf-8', { fatal: false });

function toBytes(input: string): Uint8Array {
    const bytes = new Uint8Array(input.length);
    for (let i = 0; i < input.length; i += 1) {
        bytes[i] = input.charCodeAt(i) & 0xff;
    }
    return bytes;
}

function bytesToBinary(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
    }
    return binary;
}

function decodeBase64ToBytes(input: string): Uint8Array {
    const normalized = input.replace(/\s+/g, '');
    return toBytes(atob(normalized));
}

function isLikelyBase64(input: string): boolean {
    const normalized = input.replace(/\s+/g, '');
    if (!normalized || normalized.length % 4 !== 0) return false;
    return /^[A-Za-z0-9+/=]+$/.test(normalized);
}

function nonPrintableRatio(bytes: Uint8Array): number {
    if (bytes.length === 0) return 0;

    let nonPrintable = 0;
    for (let i = 0; i < bytes.length; i += 1) {
        const value = bytes[i];
        const printable =
            value === 9 || value === 10 || value === 13 || (value >= 32 && value <= 126);
        if (!printable) nonPrintable += 1;
    }

    return nonPrintable / bytes.length;
}

function isLikelyEncryptedContainer(bytes: Uint8Array, text: string): boolean {
    const header = textDecoder.decode(bytes.subarray(0, 8));
    const trimmed = text.trim();

    if (header.startsWith('Salted__')) return true;
    if (trimmed.startsWith('Salted__')) return true;
    if (trimmed.startsWith('ENC:')) return true;

    return nonPrintableRatio(bytes) > 0.45;
}

function makeSuccess(format: NaniNovelFormat, data: unknown): ParseOutcome<any> {
    return makeOutcome({
        engine: 'naninovel',
        format,
        mode: 'full',
        reasonCode: 'ok',
        capabilities: {
            canView: true,
            canEdit: true,
            canSave: true,
            roundTripSupport: 'stable',
        },
        data,
    });
}

function tryParseJsonString(payload: string): unknown {
    return JSON.parse(payload);
}

export async function parseNaniNovel(file: File): Promise<ParseOutcome<any>> {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    try {
        const decompressed = pako.inflateRaw(uint8Array);
        return makeSuccess('naninovel-nson', tryParseJsonString(textDecoder.decode(decompressed)));
    } catch {
        // fallthrough
    }

    try {
        const decompressed = pako.inflate(uint8Array);
        return makeSuccess('naninovel-zlib', tryParseJsonString(textDecoder.decode(decompressed)));
    } catch {
        // fallthrough
    }

    try {
        const decompressed = pako.ungzip(uint8Array, { to: 'string' });
        return makeSuccess('naninovel-gzip', tryParseJsonString(decompressed));
    } catch {
        // fallthrough
    }

    const text = textDecoder.decode(uint8Array);

    try {
        return makeSuccess('naninovel-json', tryParseJsonString(text));
    } catch {
        // fallthrough
    }

    if (isLikelyBase64(text)) {
        try {
            const decodedBytes = decodeBase64ToBytes(text);
            try {
                return makeSuccess('naninovel-base64', tryParseJsonString(textDecoder.decode(decodedBytes)));
            } catch {
                // Continue to base64-gzip path.
            }

            const decompressed = pako.ungzip(decodedBytes, { to: 'string' });
            return makeSuccess('naninovel-base64-gzip', tryParseJsonString(decompressed));
        } catch {
            // fallthrough
        }
    }

    const likelyEncrypted = isLikelyEncryptedContainer(uint8Array, text);

    return makeOutcome({
        engine: 'naninovel',
        format: 'naninovel',
        mode: 'unsupported',
        reasonCode: likelyEncrypted ? 'likely_encrypted_container' : 'unsupported_naninovel_wrapper',
        reason: likelyEncrypted
            ? 'Failed to parse NaniNovel file. It appears encrypted and is not currently supported.'
            : 'Failed to parse NaniNovel file. The wrapper/container is currently unsupported.',
        capabilities: {
            canView: false,
            canEdit: false,
            canSave: false,
            roundTripSupport: 'none',
        },
        data: null,
    });
}

export async function buildNaniNovel(_originalFile: File, data: any, format: NaniNovelFormat): Promise<Blob> {
    const payload = data?.data ?? data;
    const jsonString = JSON.stringify(payload);

    if (format === 'naninovel-nson') {
        const jsonBytes = new TextEncoder().encode(jsonString);
        const compressed = pako.deflateRaw(jsonBytes);
        return new Blob([compressed], { type: 'application/octet-stream' });
    }

    if (format === 'naninovel-zlib') {
        const jsonBytes = new TextEncoder().encode(jsonString);
        const compressed = pako.deflate(jsonBytes);
        return new Blob([compressed], { type: 'application/octet-stream' });
    }

    if (format === 'naninovel-gzip') {
        const compressed = pako.gzip(jsonString);
        return new Blob([compressed], { type: 'application/octet-stream' });
    }

    if (format === 'naninovel-base64') {
        const encoded = btoa(jsonString);
        return new Blob([encoded], { type: 'text/plain' });
    }

    if (format === 'naninovel-base64-gzip') {
        const compressed = pako.gzip(jsonString);
        const encoded = btoa(bytesToBinary(compressed));
        return new Blob([encoded], { type: 'text/plain' });
    }

    return new Blob([jsonString], { type: 'application/json' });
}
