import pako from 'pako';
import pickleparser from 'pickleparser';
import { pickleSerialize } from './pickle-serializer';
import { makeOutcome, type ParseOutcome } from './types';

interface RenpyHeaderInfo {
    header: string;
    zlibStartIndex: number;
}

const fileHeaders = new Map<string, RenpyHeaderInfo>();
const parsedSnapshots = new Map<string, any>();

function isPrimitive(value: unknown): boolean {
    return (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    );
}

function isContainer(value: unknown): value is Record<string, unknown> | Array<unknown> {
    return typeof value === 'object' && value !== null;
}

function validateRenpyMutationScope(
    original: unknown,
    next: unknown,
    path: Array<string | number>
): string | null {
    if (Object.is(original, next)) return null;

    const originalIsContainer = isContainer(original);
    const nextIsContainer = isContainer(next);

    if (!originalIsContainer || !nextIsContainer) {
        if (path[0] === 'persistent' && isPrimitive(next)) {
            return null;
        }
        return `Only primitive values under "persistent" can be edited (blocked path: ${path.join('.') || '<root>'}).`;
    }

    if (Array.isArray(original) !== Array.isArray(next)) {
        if (path[0] !== 'persistent') {
            return `Only fields under "persistent" can be modified (blocked path: ${path.join('.') || '<root>'}).`;
        }
        return `Changing data structure types is not allowed (blocked path: ${path.join('.') || '<root>'}).`;
    }

    const originalKeys = Array.isArray(original)
        ? original.map((_, index) => index)
        : Object.keys(original);
    const nextKeys = Array.isArray(next) ? next.map((_, index) => index) : Object.keys(next);

    for (const key of originalKeys) {
        const hasKey = Array.isArray(next)
            ? Number(key) >= 0 && Number(key) < next.length
            : Object.prototype.hasOwnProperty.call(next, key);
        if (!hasKey) {
            return `Deleting fields is not supported (blocked path: ${[...path, key].join('.')}).`;
        }
    }

    for (const key of nextKeys) {
        const hasOriginal = Array.isArray(original)
            ? Number(key) >= 0 && Number(key) < original.length
            : Object.prototype.hasOwnProperty.call(original, key);

        if (!hasOriginal) {
            if (path[0] !== 'persistent') {
                return `Adding fields outside "persistent" is not allowed (blocked path: ${[...path, key].join('.')}).`;
            }

            const addedValue = (next as any)[key as any];
            if (!isPrimitive(addedValue)) {
                return `Only primitive values can be added under "persistent" (blocked path: ${[...path, key].join('.')}).`;
            }
            continue;
        }

        const error = validateRenpyMutationScope(
            (original as any)[key as any],
            (next as any)[key as any],
            [...path, key]
        );
        if (error) return error;
    }

    return null;
}

function deepCloneForSnapshot<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

export async function parseRenpy(file: File): Promise<ParseOutcome<any>> {
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    let zlibStartIndex = -1;
    let headerStr = '';

    const headerPreview = new TextDecoder().decode(uint8Array.slice(0, 100));
    if (headerPreview.startsWith("Ren'Py Save Game")) {
        const newlineIndex = uint8Array.indexOf(10);
        if (newlineIndex !== -1) {
            zlibStartIndex = newlineIndex + 1;
            headerStr = new TextDecoder().decode(uint8Array.slice(0, newlineIndex + 1));
        }
    } else {
        zlibStartIndex = 0;
        headerStr = '';
    }

    if (zlibStartIndex === -1) {
        return makeOutcome({
            engine: 'renpy',
            format: 'renpy',
            mode: 'unsupported',
            reasonCode: 'parse_failed',
            reason: "Could not determine start of Ren'Py save data",
            capabilities: {
                canView: false,
                canEdit: false,
                canSave: false,
                roundTripSupport: 'none',
            },
            data: null,
        });
    }

    fileHeaders.set(file.name, { header: headerStr, zlibStartIndex });

    try {
        const compressedData = uint8Array.slice(zlibStartIndex);
        const inflated = pako.inflate(compressedData);
        const parser = new pickleparser.Parser();
        const result = parser.parse(inflated);

        parsedSnapshots.set(file.name, deepCloneForSnapshot(result));

        return makeOutcome({
            engine: 'renpy',
            format: 'renpy',
            mode: 'full',
            reasonCode: 'ok',
            capabilities: {
                canView: true,
                canEdit: true,
                canSave: true,
                requiresExperimental: true,
                roundTripSupport: 'experimental',
            },
            data: result,
            warnings: [
                'Write support is constrained to primitive values under "persistent".',
                'Always back up before saving Ren\'Py files.',
            ],
        });
    } catch (error: any) {
        return makeOutcome({
            engine: 'renpy',
            format: 'renpy',
            mode: 'unsupported',
            reasonCode: 'parse_failed',
            reason: `Failed to parse Ren'Py save: ${error?.message || 'Unknown error'}`,
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

/**
 * Build a Ren'Py save file from modified data.
 *
 * Guardrails:
 * 1) Only primitive fields under "persistent" are writable.
 * 2) Deletions are rejected.
 * 3) A parse snapshot must exist for structural diffing.
 */
export async function buildRenpy(originalFile: File, input: any): Promise<Blob> {
    const data = input?.data ?? input;

    const snapshot = parsedSnapshots.get(originalFile.name);
    if (!snapshot) {
        throw new Error(
            'Ren\'Py write validation requires a source snapshot. Re-open the save file before exporting.'
        );
    }

    const validationError = validateRenpyMutationScope(snapshot, data, []);
    if (validationError) {
        throw new Error(validationError);
    }

    try {
        const headerInfo = fileHeaders.get(originalFile.name);
        const header = headerInfo?.header || "Ren'Py Save Game 8.0\n";

        const pickledData = pickleSerialize(data);
        const compressedData = pako.deflate(pickledData);

        const headerBytes = new TextEncoder().encode(header);
        const fullFile = new Uint8Array(headerBytes.length + compressedData.length);
        fullFile.set(headerBytes, 0);
        fullFile.set(compressedData, headerBytes.length);

        return new Blob([fullFile], { type: 'application/octet-stream' });
    } catch (error: any) {
        throw new Error(
            `Failed to build Ren'Py save: ${error?.message || 'Unknown error'}. This format may not be fully supported.`
        );
    }
}
