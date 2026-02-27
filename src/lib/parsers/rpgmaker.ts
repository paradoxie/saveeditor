import LZString from 'lz-string';
import pako from 'pako';
import * as fflate from 'fflate';
import { makeOutcome, type ParseOutcome } from './types';

export interface RPGMakerSave {
    gold: number;
    level: number;
    variables: Record<string, any>;
    switches: boolean[];
    items: Array<{ id: number; amount: number }> | Record<string, number>;
    party: any;
    actors: any;
    system: any;
    [key: string]: any;
}

export type RPGMakerCompressionType =
    | 'lzstring'
    | 'none'
    | 'pako'
    | 'fflate'
    | 'pako-mojibake-fix'
    | 'fflate-mojibake-fix'
    | 'pako-raw'
    | 'pako-gzip';

function isKnownCompressionType(input: unknown): input is RPGMakerCompressionType {
    return (
        input === 'lzstring' ||
        input === 'none' ||
        input === 'pako' ||
        input === 'fflate' ||
        input === 'pako-mojibake-fix' ||
        input === 'fflate-mojibake-fix' ||
        input === 'pako-raw' ||
        input === 'pako-gzip'
    );
}

function getExtension(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ext || '';
}

function keepJsonCandidate(input: string | null): string | null {
    if (!input) return null;
    try {
        JSON.parse(input);
        return input;
    } catch {
        return null;
    }
}

export async function parseRPGMakerMV(file: File): Promise<ParseOutcome<RPGMakerSave | null>> {
    const ext = getExtension(file.name);
    if (ext === 'rvdata2') {
        return makeOutcome({
            engine: 'rpgmaker',
            format: 'rpgmaker',
            mode: 'unsupported',
            reasonCode: 'unsupported_ruby_marshal',
            reason:
                'RPG Maker VX Ace .rvdata2 uses Ruby Marshal and is not supported in this browser editor yet.',
            capabilities: {
                canView: false,
                canEdit: false,
                canSave: false,
                roundTripSupport: 'none',
            },
            data: null,
        });
    }

    const debug = typeof window !== 'undefined' && (window as any).__SAVE_EDITOR_DEBUG === true;
    const text = await file.text();

    let decompressed: string | null = null;
    let compressionType: RPGMakerCompressionType = 'lzstring';

    try {
        if (debug) console.log('Trying LZString.decompressFromBase64...');
        decompressed = LZString.decompressFromBase64(text);

        if (!decompressed) {
            if (debug) console.log('Trying LZString.decompress...');
            decompressed = LZString.decompress(text);
        }

        if (!decompressed) {
            if (debug) console.log('Trying LZString with binary string...');
            const buffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);
            let binaryString = '';
            const chunkSize = 8192;
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
                binaryString += String.fromCharCode(...uint8Array.subarray(i, i + chunkSize));
            }

            decompressed = LZString.decompress(binaryString) || LZString.decompressFromBase64(binaryString);
        }
        decompressed = keepJsonCandidate(decompressed);

        if (!decompressed) {
            if (debug) console.log('Trying UTF-8 mojibake zlib recovery...');
            const recoveredBytes = new Uint8Array(text.length);
            for (let i = 0; i < text.length; i++) {
                recoveredBytes[i] = text.charCodeAt(i) & 0xff;
            }

            try {
                const inflated = pako.inflate(recoveredBytes);
                decompressed = new TextDecoder('utf-8').decode(inflated);
                compressionType = 'pako-mojibake-fix';
            } catch {
                try {
                    const inflated = fflate.inflateSync(recoveredBytes);
                    decompressed = new TextDecoder('utf-8').decode(inflated);
                    compressionType = 'fflate-mojibake-fix';
                } catch {
                    // continue
                }
            }
        }
        decompressed = keepJsonCandidate(decompressed);

        if (!decompressed) {
            if (debug) console.log('Trying raw binary inflate...');
            try {
                const uint8Array = new Uint8Array(await file.arrayBuffer());

                try {
                    const unzipped = fflate.unzipSync(uint8Array);
                    const firstFilename = Object.keys(unzipped)[0];
                    if (!firstFilename) throw new Error('Empty zip file');
                    decompressed = new TextDecoder('utf-8').decode(unzipped[firstFilename]);
                    compressionType = 'fflate';
                } catch {
                    const inflated = fflate.inflateSync(uint8Array);
                    decompressed = new TextDecoder('utf-8').decode(inflated);
                    compressionType = 'fflate';
                }
            } catch {
                try {
                    const uint8Array = new Uint8Array(await file.arrayBuffer());
                    const inflated = pako.inflate(uint8Array);
                    decompressed = new TextDecoder('utf-8').decode(inflated);
                    compressionType = 'pako';
                } catch {
                    try {
                        const uint8Array = new Uint8Array(await file.arrayBuffer());
                        const rawBuffer = uint8Array.slice(2);
                        const inflated = pako.inflateRaw(rawBuffer);
                        decompressed = new TextDecoder('utf-8').decode(inflated);
                        compressionType = 'pako-raw';
                    } catch {
                        try {
                            const uint8Array = new Uint8Array(await file.arrayBuffer());
                            decompressed = pako.ungzip(uint8Array, { to: 'string' });
                            compressionType = 'pako-gzip';
                        } catch {
                            // continue
                        }
                    }
                }
            }
        }
        decompressed = keepJsonCandidate(decompressed);

        if (!decompressed) {
            try {
                JSON.parse(text);
                decompressed = text;
                compressionType = 'none';
            } catch {
                // continue
            }
        }

        if (!decompressed) {
            throw new Error('Failed to decompress save file. Unknown compression format.');
        }

        const saveData = JSON.parse(decompressed);
        (saveData as any)._compressionType = compressionType;

        const payload: RPGMakerSave = {
            gold: saveData.party?._gold ?? saveData.party?.gold ?? 0,
            level: saveData.actors?._data?.[1]?._level ?? saveData.actors?._data?.[1]?.level ?? 1,
            variables: saveData.variables || {},
            switches: saveData.switches || [],
            items: saveData.party?._items ?? saveData.party?.items ?? {},
            party: saveData.party,
            actors: saveData.actors,
            system: saveData.system,
            ...saveData,
        };

        return makeOutcome({
            engine: 'rpgmaker',
            format: 'rpgmaker',
            mode: 'full',
            reasonCode: 'ok',
            capabilities: {
                canView: true,
                canEdit: true,
                canSave: true,
                roundTripSupport: 'stable',
            },
            data: payload,
            diagnostics: { compressionType },
        });
    } catch (error: any) {
        if (debug) console.error('RPG Maker parse error:', error);
        return makeOutcome({
            engine: 'rpgmaker',
            format: 'rpgmaker',
            mode: 'unsupported',
            reasonCode: 'parse_failed',
            reason: 'Invalid RPG Maker MV/MZ save file',
            capabilities: {
                canView: false,
                canEdit: false,
                canSave: false,
                roundTripSupport: 'none',
            },
            data: null,
            diagnostics: {
                parserError: error?.message || 'Unknown parse error',
            },
        });
    }
}

export async function buildRPGMakerMV(originalFile: File, input: any): Promise<Blob> {
    const payload = input?.data ?? input;
    if (!payload || typeof payload !== 'object') {
        throw new Error('No RPG Maker payload found.');
    }

    const parsed = await parseRPGMakerMV(originalFile);
    if (!parsed.capabilities.canView || !parsed.data) {
        throw new Error(parsed.reason || 'Unable to determine RPG Maker compression strategy from source file.');
    }

    const parsedCompressionType = (parsed.data as any)._compressionType;
    if (!isKnownCompressionType(parsedCompressionType)) {
        throw new Error(
            `Unsupported RPG Maker compression strategy "${String(parsedCompressionType)}". Save export is blocked to avoid corruption.`
        );
    }
    const compressionType = parsedCompressionType;

    const saveData = JSON.parse(JSON.stringify(payload));
    delete saveData._compressionType;
    delete saveData.gold;
    delete saveData.level;

    const json = JSON.stringify(saveData);

    const jsonBytes = new TextEncoder().encode(json);

    if (compressionType === 'pako-mojibake-fix' || compressionType === 'fflate-mojibake-fix') {
        const compressed = pako.deflate(jsonBytes, { level: 1 });
        let latin1String = '';
        for (let i = 0; i < compressed.length; i++) {
            latin1String += String.fromCharCode(compressed[i]);
        }
        return new Blob([latin1String], { type: 'text/plain;charset=utf-8' });
    }

    if (compressionType === 'pako') {
        const compressed = pako.deflate(jsonBytes);
        return new Blob([compressed], { type: 'application/octet-stream' });
    }

    if (compressionType === 'fflate') {
        const compressed = fflate.deflateSync(jsonBytes);
        return new Blob([compressed as any], { type: 'application/octet-stream' });
    }

    if (compressionType === 'pako-raw') {
        const compressed = pako.deflateRaw(jsonBytes);
        return new Blob([compressed], { type: 'application/octet-stream' });
    }

    if (compressionType === 'pako-gzip') {
        const compressed = pako.gzip(jsonBytes);
        return new Blob([compressed], { type: 'application/octet-stream' });
    }

    if (compressionType === 'none') {
        return new Blob([json], { type: 'application/json' });
    }

    if (compressionType === 'lzstring') {
        const compressed = LZString.compressToBase64(json);
        return new Blob([compressed], { type: 'text/plain' });
    }

    throw new Error(`Unhandled RPG Maker compression strategy "${compressionType}".`);
}
