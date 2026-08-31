import type { NrbfRoot, NrbfValue, PrimitiveTypeEnumeration } from 'ms-nrbf-js';

const MAX_PROJECTED_NODES = 100_000;
const MAX_PROJECTED_DEPTH = 128;
const REFERENCE_KEY = '_nrbfReference';

interface NrbfModule {
    deserialize(bytes: Uint8Array): NrbfRoot;
    serialize(root: NrbfRoot): Uint8Array;
    isDateTime(value: unknown): boolean;
    isNrbfArray(value: unknown): boolean;
    isNrbfMethodCall(value: unknown): boolean;
    isNrbfMethodReturn(value: unknown): boolean;
    isNrbfObject(value: unknown): boolean;
    PrimitiveTypeEnumeration: typeof PrimitiveTypeEnumeration;
}

interface ProjectionState {
    module: NrbfModule;
    seen: WeakMap<object, string>;
    classNames: Set<string>;
    nodes: number;
    primitives: number;
    maxDepth: number;
}

interface ApplyState {
    module: NrbfModule;
    seen: WeakSet<object>;
    changes: number;
}

let nrbfModulePromise: Promise<NrbfModule> | null = null;

async function loadNrbf(): Promise<NrbfModule> {
    nrbfModulePromise ||= (async () => {
        if (!(globalThis as any).Buffer) {
            const buffer = await import('buffer');
            (globalThis as any).Buffer = buffer.Buffer;
        }
        return import('ms-nrbf-js') as Promise<NrbfModule>;
    })();
    return nrbfModulePromise;
}

export function isNrbfBytes(bytes: Uint8Array): boolean {
    if (bytes.length < 17 || bytes[0] !== 0) return false;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return view.getInt32(9, true) === 1 && view.getInt32(13, true) === 0;
}

export async function decodeNrbf(bytes: Uint8Array) {
    const module = await loadNrbf();
    const root = module.deserialize(bytes);
    if (module.isNrbfMethodCall(root) || module.isNrbfMethodReturn(root)) {
        throw new Error('NRBF RPC streams are not supported as game saves.');
    }
    if (!module.isNrbfObject(root)) {
        throw new Error('NRBF game-save editing currently requires an object root.');
    }

    const state: ProjectionState = {
        module,
        seen: new WeakMap(),
        classNames: new Set(),
        nodes: 0,
        primitives: 0,
        maxDepth: 0,
    };
    const data = projectValue(root as NrbfValue, '$', 0, state);
    return {
        data,
        summary: {
            rootType: String((root as any).typeName || 'object'),
            classCount: state.classNames.size,
            nodeCount: state.nodes,
            primitiveCount: state.primitives,
            maxDepth: state.maxDepth,
        },
    };
}

export async function rebuildNrbf(originalBytes: Uint8Array, editedProjection: unknown): Promise<Uint8Array> {
    const module = await loadNrbf();
    const root = module.deserialize(originalBytes);
    if (!module.isNrbfObject(root)) {
        throw new Error('NRBF game-save editing currently requires an object root.');
    }

    const originalProjection = projectRoot(root as NrbfValue, module);
    if (equalProjection(originalProjection, editedProjection)) return originalBytes.slice();

    const state: ApplyState = { module, seen: new WeakSet(), changes: 0 };
    applyProjection(root as NrbfValue, editedProjection, undefined, '$', state);
    if (state.changes === 0) return originalBytes.slice();

    const rebuilt = module.serialize(root);
    const verifiedRoot = module.deserialize(rebuilt);
    const verifiedProjection = projectRoot(verifiedRoot as NrbfValue, module);
    const expectedProjection = projectRoot(root as NrbfValue, module);
    if (!equalProjection(expectedProjection, verifiedProjection)) {
        throw new Error('NRBF semantic verification failed after rebuilding.');
    }
    if (schemaFingerprint(root as NrbfValue, module) !== schemaFingerprint(verifiedRoot as NrbfValue, module)) {
        throw new Error('NRBF type or object schema changed during rebuilding.');
    }
    return new Uint8Array(rebuilt.buffer, rebuilt.byteOffset, rebuilt.byteLength).slice();
}

function projectRoot(root: NrbfValue, module: NrbfModule): unknown {
    return projectValue(root, '$', 0, {
        module,
        seen: new WeakMap(),
        classNames: new Set(),
        nodes: 0,
        primitives: 0,
        maxDepth: 0,
    });
}

function projectValue(value: NrbfValue, path: string, depth: number, state: ProjectionState): unknown {
    state.nodes += 1;
    state.maxDepth = Math.max(state.maxDepth, depth);
    if (state.nodes > MAX_PROJECTED_NODES) throw new Error('NRBF object graph is too large to edit safely.');
    if (depth > MAX_PROJECTED_DEPTH) throw new Error('NRBF object graph is too deeply nested to edit safely.');

    if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
        state.primitives += 1;
        return value;
    }
    if (typeof value === 'bigint') {
        state.primitives += 1;
        return value.toString();
    }
    if (typeof value !== 'object') throw new Error(`Unsupported NRBF value at ${path}.`);

    const existingPath = state.seen.get(value);
    if (existingPath) return { [REFERENCE_KEY]: existingPath };
    state.seen.set(value, path);

    if (state.module.isDateTime(value)) {
        state.primitives += 1;
        return { ticks: String((value as any).ticks), kind: Number((value as any).kind) };
    }
    if (state.module.isNrbfObject(value)) {
        const object = value as any;
        state.classNames.add(String(object.typeName));
        return Object.fromEntries(
            Object.entries(object.members).map(([key, child]) => [
                key,
                projectValue(child as NrbfValue, `${path}.${key}`, depth + 1, state),
            ])
        );
    }
    if (state.module.isNrbfArray(value)) {
        return (value as any).elements.map((child: NrbfValue, index: number) =>
            projectValue(child, `${path}[${index}]`, depth + 1, state)
        );
    }
    if (Array.isArray(value)) {
        return value.map((child, index) => projectValue(child, `${path}[${index}]`, depth + 1, state));
    }
    throw new Error(`Unsupported NRBF object at ${path}.`);
}

function applyProjection(
    original: NrbfValue,
    edited: unknown,
    hint: PrimitiveTypeEnumeration | undefined,
    path: string,
    state: ApplyState
): NrbfValue {
    if (original === null) {
        if (edited !== null) throw new Error(`Cannot change the null type at ${path}.`);
        return original;
    }
    if (typeof original === 'boolean') {
        if (typeof edited !== 'boolean') throw new Error(`Expected a boolean at ${path}.`);
        if (edited !== original) state.changes += 1;
        return edited;
    }
    if (typeof original === 'number') {
        const next = validateNumber(edited, original, hint, path, state.module);
        if (!Object.is(next, original)) state.changes += 1;
        return next;
    }
    if (typeof original === 'bigint') {
        if (typeof edited !== 'string' || !/^-?\d+$/.test(edited)) throw new Error(`Expected a 64-bit integer at ${path}.`);
        const next = BigInt(edited);
        validateBigInt(next, hint, path, state.module);
        if (next !== original) state.changes += 1;
        return next;
    }
    if (typeof original === 'string') {
        if (typeof edited !== 'string') throw new Error(`Expected text at ${path}.`);
        validateString(edited, hint, path, state.module);
        if (edited !== original) state.changes += 1;
        return edited;
    }
    if (typeof original !== 'object') throw new Error(`Unsupported value at ${path}.`);
    if (state.seen.has(original)) return original;
    state.seen.add(original);

    if (state.module.isDateTime(original)) {
        assertExactKeys(edited, ['ticks', 'kind'], path);
        const ticks = BigInt(String((edited as any).ticks));
        const kind = Number((edited as any).kind);
        if (ticks < 0n || ticks > 0x3fffffffffffffffn || !Number.isInteger(kind) || kind < 0 || kind > 2) {
            throw new Error(`Invalid DateTime at ${path}.`);
        }
        if (ticks !== (original as any).ticks || kind !== (original as any).kind) state.changes += 1;
        (original as any).ticks = ticks;
        (original as any).kind = kind;
        return original;
    }
    if (state.module.isNrbfObject(original)) {
        const object = original as any;
        const keys = Object.keys(object.members);
        assertExactKeys(edited, keys, path);
        for (const key of keys) {
            object.members[key] = applyProjection(
                object.members[key],
                (edited as any)[key],
                object.memberTypes?.[key],
                `${path}.${key}`,
                state
            );
        }
        return original;
    }
    if (state.module.isNrbfArray(original)) {
        const array = original as any;
        assertArrayShape(edited, array.elements.length, path);
        for (let index = 0; index < array.elements.length; index += 1) {
            array.elements[index] = applyProjection(
                array.elements[index],
                (edited as unknown[])[index],
                array.elementPrimitiveType,
                `${path}[${index}]`,
                state
            );
        }
        return original;
    }
    if (Array.isArray(original)) {
        assertArrayShape(edited, original.length, path);
        for (let index = 0; index < original.length; index += 1) {
            original[index] = applyProjection(original[index], (edited as unknown[])[index], hint, `${path}[${index}]`, state);
        }
        return original;
    }
    throw new Error(`Unsupported object at ${path}.`);
}

function validateNumber(
    edited: unknown,
    original: number,
    hint: PrimitiveTypeEnumeration | undefined,
    path: string,
    module: NrbfModule
): number {
    if (typeof edited !== 'number' || !Number.isFinite(edited)) throw new Error(`Expected a finite number at ${path}.`);
    const type = module.PrimitiveTypeEnumeration;
    const ranges = new Map<number, [number, number]>([
        [type.Byte, [0, 255]],
        [type.SByte, [-128, 127]],
        [type.Int16, [-32768, 32767]],
        [type.UInt16, [0, 65535]],
        [type.Int32, [-2147483648, 2147483647]],
        [type.UInt32, [0, 4294967295]],
    ]);
    const range = hint === undefined ? undefined : ranges.get(hint);
    if ((range || Number.isInteger(original)) && !Number.isInteger(edited)) throw new Error(`Expected an integer at ${path}.`);
    if (range && (edited < range[0] || edited > range[1])) throw new Error(`Number is outside its NRBF type range at ${path}.`);
    return edited;
}

function validateBigInt(value: bigint, hint: PrimitiveTypeEnumeration | undefined, path: string, module: NrbfModule) {
    const type = module.PrimitiveTypeEnumeration;
    if (hint === type.UInt64 && (value < 0n || value > 18446744073709551615n)) {
        throw new Error(`Unsigned 64-bit integer is out of range at ${path}.`);
    }
    if (hint !== type.UInt64 && (value < -9223372036854775808n || value > 9223372036854775807n)) {
        throw new Error(`Signed 64-bit integer is out of range at ${path}.`);
    }
}

function validateString(value: string, hint: PrimitiveTypeEnumeration | undefined, path: string, module: NrbfModule) {
    const type = module.PrimitiveTypeEnumeration;
    if (hint === type.Char && Array.from(value).length !== 1) throw new Error(`Expected one character at ${path}.`);
    if (hint === type.Decimal && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) {
        throw new Error(`Expected a decimal value at ${path}.`);
    }
}

function assertArrayShape(value: unknown, length: number, path: string): asserts value is unknown[] {
    if (!Array.isArray(value) || value.length !== length) throw new Error(`Cannot add or remove array entries at ${path}.`);
}

function assertExactKeys(value: unknown, expectedKeys: string[], path: string): asserts value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Expected an object at ${path}.`);
    const actualKeys = Object.keys(value as Record<string, unknown>);
    if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) {
        throw new Error(`Cannot add, remove, or reorder NRBF fields at ${path}.`);
    }
}

function equalProjection(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

function schemaFingerprint(root: NrbfValue, module: NrbfModule): string {
    const seen = new WeakMap<object, number>();
    let nextId = 1;
    const walk = (value: NrbfValue): unknown => {
        if (value === null) return 'null';
        if (typeof value !== 'object') return typeof value;
        if (module.isDateTime(value)) return 'datetime';
        const existing = seen.get(value);
        if (existing) return ['ref', existing];
        seen.set(value, nextId++);
        if (module.isNrbfObject(value)) {
            const object = value as any;
            return ['class', object.typeName, object.libraryName || '', object.memberTypes || {}, Object.entries(object.members).map(([key, child]) => [key, walk(child as NrbfValue)])];
        }
        if (module.isNrbfArray(value)) {
            const array = value as any;
            return ['array', array.arrayType, array.lengths, array.lowerBounds || [], array.elementBinaryType, array.elementPrimitiveType, array.elementClassName || '', array.elementLibraryName || '', array.elements.map(walk)];
        }
        if (Array.isArray(value)) return ['vector', value.length, value.map(walk)];
        return 'unknown';
    };
    return JSON.stringify(walk(root));
}
