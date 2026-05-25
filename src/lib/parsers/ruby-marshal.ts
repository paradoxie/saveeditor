type MarshalPrimitive = null | boolean | number | string;
type MarshalProjection = MarshalPrimitive | MarshalProjection[] | { [key: string]: MarshalProjection };

type MarshalNode =
    | { type: 'nil' }
    | { type: 'true' }
    | { type: 'false' }
    | { type: 'int'; value: number }
    | { type: 'bignum'; value: number; sign: 1 | -1; wordCount: number }
    | { type: 'float'; value: number; raw: Uint8Array }
    | { type: 'string'; value: string; raw: Uint8Array }
    | { type: 'symbol'; value: string; raw: Uint8Array }
    | { type: 'symlink'; index: number }
    | { type: 'array'; values: MarshalNode[] }
    | { type: 'hash'; entries: Array<{ key: MarshalNode; value: MarshalNode }> }
    | { type: 'object'; className: MarshalNode; fields: Array<{ key: MarshalNode; value: MarshalNode }> }
    | { type: 'ivar'; value: MarshalNode; fields: Array<{ key: MarshalNode; value: MarshalNode }> }
    | { type: 'objectLink'; index: number };

export interface RubyMarshalTree {
    root: MarshalNode;
    objects: MarshalNode[];
    symbols: MarshalNode[];
    bytes: Uint8Array;
}

const decoder = new TextDecoder('utf-8', { fatal: false });
const encoder = new TextEncoder();

export function parseRubyMarshal(bytes: Uint8Array): MarshalProjection {
    return projectRubyMarshal(parseRubyMarshalTree(bytes));
}

export function parseRubyMarshalTree(bytes: Uint8Array): RubyMarshalTree {
    const parser = new RubyMarshalParser(bytes);
    return parser.parse();
}

export function projectRubyMarshal(tree: RubyMarshalTree): MarshalProjection {
    return projectNode(tree.root, tree);
}

export function buildRubyMarshalFromProjection(sourceBytes: Uint8Array, projection: MarshalProjection): Uint8Array {
    const tree = parseRubyMarshalTree(sourceBytes);
    const originalProjection = projectRubyMarshal(tree);
    if (JSON.stringify(originalProjection) === JSON.stringify(projection)) {
        return sourceBytes;
    }

    validateProjectionChange(originalProjection, projection, []);
    applyProjection(tree.root, projection, tree);
    const writer = new RubyMarshalWriter(tree);
    return writer.write();
}

class RubyMarshalParser {
    private offset = 0;
    private readonly objects: MarshalNode[] = [];
    private readonly symbols: MarshalNode[] = [];

    constructor(private readonly bytes: Uint8Array) {}

    parse(): RubyMarshalTree {
        if (this.readByte() !== 4 || this.readByte() !== 8) {
            throw new Error('Not a Ruby Marshal 4.8 file.');
        }
        return {
            root: this.readValue(),
            objects: this.objects,
            symbols: this.symbols,
            bytes: this.bytes,
        };
    }

    private readValue(): MarshalNode {
        const type = String.fromCharCode(this.readByte());

        if (type === '0') return { type: 'nil' };
        if (type === 'T') return { type: 'true' };
        if (type === 'F') return { type: 'false' };
        if (type === 'i') return { type: 'int', value: this.readInteger() };
        if (type === '"') return this.trackObject({ type: 'string', ...this.readString() });
        if (type === ':') return this.trackSymbol({ type: 'symbol', ...this.readString() });
        if (type === ';') return { type: 'symlink', index: this.readInteger() };
        if (type === '[') return this.readArray();
        if (type === '{') return this.readHash();
        if (type === 'o') return this.readObject();
        if (type === 'I') return this.readInstanceVariable();
        if (type === '@') return { type: 'objectLink', index: this.readInteger() };
        if (type === 'f') return { type: 'float', ...this.readFloat() };
        if (type === 'l') return this.readBignum();

        throw new Error(`Unsupported Ruby Marshal type "${type}".`);
    }

    private readArray(): MarshalNode {
        const length = this.readInteger();
        const node: MarshalNode = { type: 'array', values: [] };
        this.objects.push(node);
        for (let i = 0; i < length; i += 1) {
            node.values.push(this.readValue());
        }
        return node;
    }

    private readHash(): MarshalNode {
        const length = this.readInteger();
        const node: MarshalNode = { type: 'hash', entries: [] };
        this.objects.push(node);
        for (let i = 0; i < length; i += 1) {
            node.entries.push({ key: this.readValue(), value: this.readValue() });
        }
        return node;
    }

    private readObject(): MarshalNode {
        const className = this.readValue();
        const node: MarshalNode = { type: 'object', className, fields: [] };
        this.objects.push(node);
        const length = this.readInteger();
        for (let i = 0; i < length; i += 1) {
            node.fields.push({ key: this.readValue(), value: this.readValue() });
        }
        return node;
    }

    private readInstanceVariable(): MarshalNode {
        const node: MarshalNode = { type: 'ivar', value: this.readValue(), fields: [] };
        const length = this.readInteger();
        for (let i = 0; i < length; i += 1) {
            node.fields.push({ key: this.readValue(), value: this.readValue() });
        }
        return node;
    }

    private readBignum(): MarshalNode {
        const sign = String.fromCharCode(this.readByte()) === '+' ? 1 : -1;
        const wordCount = this.readInteger();
        let value = 0n;
        for (let i = 0; i < wordCount; i += 1) {
            const word = BigInt(this.readByte() | (this.readByte() << 8));
            value += word << BigInt(16 * i);
        }
        const signed = value * BigInt(sign);
        return { type: 'bignum', value: Number(signed), sign, wordCount };
    }

    private readFloat(): { value: number; raw: Uint8Array } {
        const { value, raw } = this.readString();
        return { value: Number(value), raw };
    }

    private readString(): { value: string; raw: Uint8Array } {
        const length = this.readInteger();
        const start = this.offset;
        this.offset += length;
        if (this.offset > this.bytes.length) throw new Error('Unexpected end of Ruby Marshal string.');
        const raw = this.bytes.slice(start, start + length);
        return { value: decoder.decode(raw), raw };
    }

    private readInteger(): number {
        const first = this.readSignedByte();
        if (first === 0) return 0;
        if (first > 5) return first - 5;
        if (first < -5) return first + 5;

        const length = Math.abs(first);
        let value = 0;
        for (let i = 0; i < length; i += 1) {
            value += this.readByte() << (8 * i);
        }
        if (first < 0) {
            value -= Math.pow(2, 8 * length);
        }
        return value;
    }

    private readByte(): number {
        if (this.offset >= this.bytes.length) throw new Error('Unexpected end of Ruby Marshal data.');
        return this.bytes[this.offset++];
    }

    private readSignedByte(): number {
        const value = this.readByte();
        return value > 127 ? value - 256 : value;
    }

    private trackObject<T extends MarshalNode>(node: T): T {
        this.objects.push(node);
        return node;
    }

    private trackSymbol<T extends MarshalNode>(node: T): T {
        this.symbols.push(node);
        return node;
    }
}

class RubyMarshalWriter {
    private readonly chunks: number[] = [];

    constructor(private readonly tree: RubyMarshalTree) {}

    write(): Uint8Array {
        this.push(4, 8);
        this.writeNode(this.tree.root);
        return new Uint8Array(this.chunks);
    }

    private writeNode(node: MarshalNode): void {
        if (node.type === 'nil') return this.writeAscii('0');
        if (node.type === 'true') return this.writeAscii('T');
        if (node.type === 'false') return this.writeAscii('F');
        if (node.type === 'int') return this.writeAscii('i', () => this.writeInteger(node.value));
        if (node.type === 'bignum') return this.writeBignum(node);
        if (node.type === 'float') return this.writeAscii('f', () => this.writeStringBytes(node.raw));
        if (node.type === 'string') return this.writeAscii('"', () => this.writeStringBytes(node.raw));
        if (node.type === 'symbol') return this.writeAscii(':', () => this.writeStringBytes(node.raw));
        if (node.type === 'symlink') return this.writeAscii(';', () => this.writeInteger(node.index));
        if (node.type === 'objectLink') return this.writeAscii('@', () => this.writeInteger(node.index));
        if (node.type === 'array') return this.writeArray(node);
        if (node.type === 'hash') return this.writeHash(node);
        if (node.type === 'object') return this.writeObject(node);
        if (node.type === 'ivar') return this.writeIvar(node);
    }

    private writeArray(node: Extract<MarshalNode, { type: 'array' }>): void {
        this.writeAscii('[', () => {
            this.writeInteger(node.values.length);
            for (const value of node.values) this.writeNode(value);
        });
    }

    private writeHash(node: Extract<MarshalNode, { type: 'hash' }>): void {
        this.writeAscii('{', () => {
            this.writeInteger(node.entries.length);
            for (const entry of node.entries) {
                this.writeNode(entry.key);
                this.writeNode(entry.value);
            }
        });
    }

    private writeObject(node: Extract<MarshalNode, { type: 'object' }>): void {
        this.writeAscii('o', () => {
            this.writeNode(node.className);
            this.writeInteger(node.fields.length);
            for (const field of node.fields) {
                this.writeNode(field.key);
                this.writeNode(field.value);
            }
        });
    }

    private writeIvar(node: Extract<MarshalNode, { type: 'ivar' }>): void {
        this.writeAscii('I', () => {
            this.writeNode(node.value);
            this.writeInteger(node.fields.length);
            for (const field of node.fields) {
                this.writeNode(field.key);
                this.writeNode(field.value);
            }
        });
    }

    private writeBignum(node: Extract<MarshalNode, { type: 'bignum' }>): void {
        this.writeAscii('l', () => {
            this.writeAscii(node.sign === 1 ? '+' : '-');
            this.writeInteger(node.wordCount);
            let value = BigInt(Math.abs(Math.trunc(node.value)));
            for (let i = 0; i < node.wordCount; i += 1) {
                const word = Number(value & 0xffffn);
                this.push(word & 0xff, (word >> 8) & 0xff);
                value >>= 16n;
            }
        });
    }

    private writeStringBytes(bytes: Uint8Array): void {
        this.writeInteger(bytes.length);
        this.push(...bytes);
    }

    private writeInteger(value: number): void {
        const n = Math.trunc(value);
        if (n === 0) return this.push(0);
        if (n > 0 && n < 123) return this.push(n + 5);
        if (n < 0 && n > -124) return this.push((n - 5) & 0xff);

        if (n > 0) {
            const bytes = this.integerBytes(n);
            this.push(bytes.length, ...bytes);
            return;
        }

        const bytes = this.integerBytes(n);
        this.push((256 - bytes.length) & 0xff, ...bytes);
    }

    private integerBytes(value: number): number[] {
        if (value >= 0) {
            let n = value;
            const bytes: number[] = [];
            while (n > 0) {
                bytes.push(n & 0xff);
                n = Math.floor(n / 256);
            }
            return bytes.slice(0, 4);
        }

        let n = value >>> 0;
        const bytes = [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
        while (bytes.length > 1 && bytes[bytes.length - 1] === 0xff && (bytes[bytes.length - 2] & 0x80)) {
            bytes.pop();
        }
        return bytes;
    }

    private writeAscii(char: string, body?: () => void): void {
        this.push(char.charCodeAt(0));
        body?.();
    }

    private push(...bytes: number[]): void {
        this.chunks.push(...bytes);
    }
}

function projectNode(node: MarshalNode, tree: RubyMarshalTree, seen = new Set<MarshalNode>()): MarshalProjection {
    if (node.type === 'nil') return null;
    if (node.type === 'true') return true;
    if (node.type === 'false') return false;
    if (node.type === 'int' || node.type === 'bignum' || node.type === 'float') return node.value;
    if (node.type === 'string' || node.type === 'symbol') return node.value;
    if (node.type === 'symlink') return projectNode(tree.symbols[node.index], tree, seen);
    if (node.type === 'objectLink') return projectNode(tree.objects[node.index], tree, seen);
    if (node.type === 'ivar') return projectNode(node.value, tree, seen);

    if (seen.has(node)) return '<circular-reference>';
    seen.add(node);

    if (node.type === 'array') return node.values.map((value) => projectNode(value, tree, seen));

    if (node.type === 'hash') {
        const output: Record<string, MarshalProjection> = {};
        for (const entry of node.entries) {
            output[String(projectNode(entry.key, tree, seen))] = projectNode(entry.value, tree, seen);
        }
        return output;
    }

    const output: Record<string, MarshalProjection> = { __rubyClass: String(projectNode(node.className, tree, seen)) };
    for (const field of node.fields) {
        output[projectFieldName(field.key, tree)] = projectNode(field.value, tree, seen);
    }
    return output;
}

function applyProjection(
    node: MarshalNode,
    projection: MarshalProjection,
    tree: RubyMarshalTree,
    seen = new Set<MarshalNode>(),
    path: Array<string | number> = []
): void {
    if (node.type === 'objectLink') return applyProjection(tree.objects[node.index], projection, tree, seen, path);
    if (node.type === 'ivar') return applyProjection(node.value, projection, tree, seen, path);

    if (node.type === 'int' && typeof projection === 'number' && Number.isInteger(projection)) {
        node.value = projection;
        return;
    }
    if (node.type === 'bignum' && typeof projection === 'number' && Number.isInteger(projection)) {
        node.value = projection;
        node.sign = projection < 0 ? -1 : 1;
        return;
    }
    if (node.type === 'float' && typeof projection === 'number' && Number.isFinite(projection)) {
        node.value = projection;
        node.raw = encoder.encode(String(projection));
        return;
    }
    if (node.type === 'string' && typeof projection === 'string' && projection !== node.value) {
        node.value = projection;
        node.raw = encoder.encode(projection);
        return;
    }
    if ((node.type === 'true' || node.type === 'false') && typeof projection === 'boolean') {
        (node as any).type = projection ? 'true' : 'false';
        return;
    }
    if (node.type === 'nil' || typeof projection !== 'object' || projection === null) return;

    if (seen.has(node)) return;
    seen.add(node);

    if (node.type === 'array' && Array.isArray(projection)) {
        const length = Math.min(node.values.length, projection.length);
        for (let i = 0; i < length; i += 1) {
            applyProjection(node.values[i], projection[i], tree, seen, [...path, i]);
        }
        return;
    }

    if (node.type === 'hash' && !Array.isArray(projection)) {
        const seenKeys = new Set<string>();
        for (const entry of node.entries) {
            const key = String(projectNode(entry.key, tree));
            seenKeys.add(key);
            if (Object.prototype.hasOwnProperty.call(projection, key)) {
                applyProjection(entry.value, (projection as Record<string, MarshalProjection>)[key], tree, seen, [...path, key]);
            }
        }
        for (const key of Object.keys(projection)) {
            const value = (projection as Record<string, MarshalProjection>)[key];
            if (!seenKeys.has(key) && isRubyHashAddAllowed(path, key, value)) {
                node.entries.push({ key: { type: 'int', value: Number(key) }, value: { type: 'int', value } });
            }
        }
        return;
    }

    if (node.type === 'object' && !Array.isArray(projection)) {
        for (const field of node.fields) {
            const key = projectFieldName(field.key, tree);
            if (Object.prototype.hasOwnProperty.call(projection, key)) {
                applyProjection(field.value, (projection as Record<string, MarshalProjection>)[key], tree, seen, [...path, key]);
            }
        }
    }
}

function projectFieldName(key: MarshalNode, tree: RubyMarshalTree): string {
    return String(projectNode(key, tree)).replace(/^@/, '_');
}

function validateProjectionChange(
    original: MarshalProjection,
    next: MarshalProjection,
    path: Array<string | number>
): void {
    if (Object.is(original, next)) return;

    if (original === '<circular-reference>' || next === '<circular-reference>') {
        throw new Error(`Editing Ruby Marshal object references is not supported at ${formatPath(path)}.`);
    }

    if (Array.isArray(original)) {
        if (!Array.isArray(next)) throw new Error(`Changing Ruby Marshal structure is not supported at ${formatPath(path)}.`);
        if (original.length !== next.length) {
            throw new Error(`Changing Ruby Marshal array length is not supported at ${formatPath(path)}.`);
        }
        for (let i = 0; i < original.length; i += 1) {
            validateProjectionChange(original[i], next[i], [...path, i]);
        }
        return;
    }

    if (isRecord(original)) {
        if (!isRecord(next)) throw new Error(`Changing Ruby Marshal structure is not supported at ${formatPath(path)}.`);

        for (const key of Object.keys(original)) {
            if (!Object.prototype.hasOwnProperty.call(next, key)) {
                throw new Error(`Removing Ruby Marshal field is not supported at ${formatPath([...path, key])}.`);
            }
        }
        for (const key of Object.keys(next)) {
            if (!Object.prototype.hasOwnProperty.call(original, key)) {
                if (!isRubyHashAddAllowed(path, key, next[key])) {
                    throw new Error(`Adding Ruby Marshal field is not supported at ${formatPath([...path, key])}.`);
                }
            }
        }
        for (const key of Object.keys(original)) {
            validateProjectionChange(original[key], next[key], [...path, key]);
        }
        return;
    }

    if (original === null || next === null) {
        throw new Error(`Changing Ruby Marshal null fields is not supported at ${formatPath(path)}.`);
    }
    if (typeof original !== typeof next) {
        throw new Error(`Changing Ruby Marshal value type is not supported at ${formatPath(path)}.`);
    }
    if (!isAllowedRubyMutationPath(path)) {
        throw new Error(`Editing this Ruby Marshal path is not supported at ${formatPath(path)}.`);
    }
    if (typeof next === 'number' && !Number.isFinite(next)) {
        throw new Error(`Ruby Marshal numeric value is invalid at ${formatPath(path)}.`);
    }
}

function isRecord(value: MarshalProjection): value is Record<string, MarshalProjection> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isRubyHashAddAllowed(path: Array<string | number>, key: string, value: MarshalProjection): value is number {
    const text = path.map(String).join('.').toLowerCase();
    const isItemMap = ['_items', 'items', 'inventory', '_weapons', 'weapons', '_armors', 'armors'].some((term) =>
        text.includes(term)
    );
    return isItemMap && /^-?\d+$/.test(key) && typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value);
}

function isAllowedRubyMutationPath(path: Array<string | number>): boolean {
    const text = path.map(String).join('.').toLowerCase();
    if (!text || text.includes('__rubyclass')) return false;
    return [
        '_gold',
        'gold',
        'money',
        'coin',
        'cash',
        'currency',
        '_items',
        'items',
        'inventory',
        '_weapons',
        'weapons',
        '_armors',
        'armors',
        '_variables',
        'variables',
        '_switches',
        'switches',
        '_actors',
        'actors',
        'actor',
        'level',
        '_exp',
        'exp',
        '_hp',
        'hp',
        '_mp',
        'mp',
        'param',
        'stats',
        'switch',
        'flag',
    ].some((term) => text.includes(term));
}

function formatPath(path: Array<string | number>): string {
    return path.length > 0 ? path.join('.') : '<root>';
}
