import { deserialize as deserializeBson, EJSON, serialize as serializeBson } from 'bson';
import * as fflate from 'fflate';
import LZString from 'lz-string';
import pako from 'pako';
import pickleparser from 'pickleparser';
import YAML from 'yaml';
import { pickleSerialize } from './pickle-serializer';
import { decodeNrbf, isNrbfBytes, rebuildNrbf } from './nrbf';
import { makeOutcome, type ParseOutcome } from './types';

type GenericPayload = {
    _format: string;
    _readOnly?: boolean;
    _summary: Record<string, unknown>;
    data?: unknown;
};

interface SqliteColumn {
    name: string;
    type: string;
    notNull: boolean;
    primaryKey: number;
}

interface SqliteTable {
    columns: SqliteColumn[];
    rows: Array<Record<string, unknown>>;
    rowLimit: number;
    hasRowId: boolean;
}

interface SqliteData {
    tables: Record<string, SqliteTable>;
}

const textDecoder = new TextDecoder('utf-8', { fatal: false });
const textEncoder = new TextEncoder();
const SQLITE_EXTENSIONS = new Set(['db', 'sqlite', 'sqlite3', 'db3', 's3db', 'sl3', 'sqlitedb']);
const WRAPPED_TEXT_EXTENSIONS = new Set(['json', 'yaml', 'yml', 'toml', 'properties', 'props', 'conf', 'csv', 'tsv', 'cfg', 'xml', 'txt']);
let sqlJsPromise: Promise<any> | null = null;
let msgpackPromise: Promise<any> | null = null;

async function getMsgpack(): Promise<any> {
    msgpackPromise ||= (async () => {
        if (!(globalThis as any).Buffer) {
            const buffer = await import('buffer');
            (globalThis as any).Buffer = buffer.Buffer;
        }
        const mod = await import('msgpack-lite');
        return mod.default || mod;
    })();
    return msgpackPromise;
}

function isNodeRuntime(): boolean {
    return typeof process !== 'undefined' && Boolean((process as any).versions?.node);
}

function extOf(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
}

function innerExtOfGzip(fileName: string): string {
    const parts = fileName.toLowerCase().split('.');
    return parts.length > 2 && parts[parts.length - 1] === 'gz' ? parts[parts.length - 2] : '';
}

function innerExtOfWrapper(fileName: string, wrappers: string[]): string {
    const parts = fileName.toLowerCase().split('.');
    if (parts.length <= 2 || !wrappers.includes(parts[parts.length - 1])) return '';
    return parts[parts.length - 2] || '';
}

function isSqliteExtension(ext: string): boolean {
    return SQLITE_EXTENSIONS.has(ext);
}

function isSqliteBytes(bytes: Uint8Array): boolean {
    return textDecoder.decode(bytes.slice(0, 16)) === 'SQLite format 3\0';
}

function readUint32(bytes: Uint8Array, offset: number): number {
    return (((bytes[offset] || 0) << 24) | ((bytes[offset + 1] || 0) << 16) | ((bytes[offset + 2] || 0) << 8) | (bytes[offset + 3] || 0)) >>> 0;
}

function readUint16(bytes: Uint8Array, offset: number): number {
    return ((bytes[offset] || 0) << 8) | (bytes[offset + 1] || 0);
}

function basicCborDecode(bytes: Uint8Array): unknown {
    let offset = 0;

    const read = (): unknown => {
        if (offset >= bytes.length) throw new Error('Unexpected end of CBOR data.');
        const head = bytes[offset++];
        const major = head >> 5;
        const minor = head & 0x1f;
        const readLength = (): number => {
            if (minor < 24) return minor;
            if (minor === 24) return bytes[offset++];
            if (minor === 25) {
                const value = ((bytes[offset] || 0) << 8) | (bytes[offset + 1] || 0);
                offset += 2;
                return value;
            }
            if (minor === 26) {
                const value = readUint32(bytes, offset);
                offset += 4;
                return value;
            }
            throw new Error('Unsupported CBOR length.');
        };

        if (major === 0) return readLength();
        if (major === 1) return -1 - readLength();
        if (major === 2) {
            const length = readLength();
            const chunk = bytes.slice(offset, offset + length);
            offset += length;
            return Array.from(chunk);
        }
        if (major === 3) {
            const length = readLength();
            const chunk = bytes.slice(offset, offset + length);
            offset += length;
            return textDecoder.decode(chunk);
        }
        if (major === 4) {
            const length = readLength();
            return Array.from({ length }, () => read());
        }
        if (major === 5) {
            const length = readLength();
            const obj: Record<string, unknown> = {};
            for (let i = 0; i < length; i += 1) {
                obj[String(read())] = read();
            }
            return obj;
        }
        if (major === 7) {
            if (minor === 20) return false;
            if (minor === 21) return true;
            if (minor === 22) return null;
        }
        throw new Error('Unsupported CBOR value.');
    };

    return read();
}

function parseCfg(text: string): Record<string, unknown> {
    const result: Record<string, Record<string, unknown>> = { default: {} };
    let section = 'default';

    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#') || line.startsWith(';')) continue;
        const sectionMatch = line.match(/^\[(.+)]$/);
        if (sectionMatch) {
            section = sectionMatch[1].trim();
            result[section] ||= {};
            continue;
        }
        const idx = line.indexOf('=');
        if (idx === -1) continue;
        const key = line.slice(0, idx).trim();
        const raw = line.slice(idx + 1).trim();
        result[section][key] = parsePrimitive(raw);
    }

    return result;
}

function parseFlatKeyValue(text: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#') || line.startsWith(';') || line.startsWith('!')) continue;
        const idx = findKeyValueDelimiter(rawLine);
        if (idx === -1) continue;
        const key = rawLine.slice(0, idx).trim();
        if (!key) continue;
        result[key] = parsePrimitive(rawLine.slice(idx + 1).trim());
    }
    return result;
}

function parseCsv(text: string, delimiter: ',' | '\t'): { columns: string[]; rows: Array<Record<string, string>> } {
    const records = parseCsvRows(text, delimiter).filter((row) => row.some((cell) => cell !== ''));
    if (records.length === 0) return { columns: [], rows: [] };
    const columns = records[0].map((column, index) => column || `column_${index + 1}`);
    return {
        columns,
        rows: records.slice(1).map((row) => {
            const out: Record<string, string> = {};
            columns.forEach((column, index) => {
                out[column] = row[index] ?? '';
            });
            return out;
        }),
    };
}

function parseCsvRows(text: string, delimiter: ',' | '\t'): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        const next = text[index + 1];
        if (quoted) {
            if (char === '"' && next === '"') {
                cell += '"';
                index += 1;
            } else if (char === '"') {
                quoted = false;
            } else {
                cell += char;
            }
            continue;
        }
        if (char === '"') {
            quoted = true;
        } else if (char === delimiter) {
            row.push(cell);
            cell = '';
        } else if (char === '\n') {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
        } else if (char !== '\r') {
            cell += char;
        }
    }

    if (cell !== '' || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }
    return rows;
}

function parsePrimitive(raw: string): unknown {
    const value = raw.trim();
    if (value === '') return '';
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }
    if (value.startsWith('[') && value.endsWith(']')) {
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : raw;
}

function detectStructuredTextExtension(text: string): string {
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
    if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) return 'xml';
    if (/^\s*\[.+]\s*$/m.test(text)) return 'cfg';
    if (/^\s*[^:=\s][^:=]*\s*[:=]\s*.+$/m.test(text)) return 'yaml';
    return 'txt';
}

function parseWrappedStructured(bytes: Uint8Array, innerExt: string): { innerExt: string; format: string; data: unknown } {
    const text = textDecoder.decode(bytes);
    const normalizedExt = innerExt || detectStructuredTextExtension(text);
    if (!WRAPPED_TEXT_EXTENSIONS.has(normalizedExt)) {
        throw new Error('Wrapped payload is not a supported structured text format.');
    }
    if (normalizedExt === 'json') {
        return { innerExt: normalizedExt, format: 'JSON', data: JSON.parse(text) };
    }
    if (normalizedExt === 'yaml' || normalizedExt === 'yml') {
        const data = YAML.parse(text);
        if (!isJsonSafeValue(data)) throw new Error('YAML payload is outside the safe JSON write subset.');
        return { innerExt: normalizedExt, format: 'YAML', data };
    }
    if (normalizedExt === 'toml') {
        return { innerExt: normalizedExt, format: 'TOML', data: parseCfg(text) };
    }
    if (normalizedExt === 'properties' || normalizedExt === 'props' || normalizedExt === 'conf') {
        return { innerExt: normalizedExt, format: 'Properties / CONF', data: parseFlatKeyValue(text) };
    }
    if (normalizedExt === 'csv' || normalizedExt === 'tsv') {
        return { innerExt: normalizedExt, format: normalizedExt === 'tsv' ? 'TSV' : 'CSV', data: parseCsv(text, normalizedExt === 'tsv' ? '\t' : ',') };
    }
    if (normalizedExt === 'cfg') {
        return { innerExt: normalizedExt, format: 'Godot / INI-style CFG', data: parseCfg(text) };
    }
    if (normalizedExt === 'xml') {
        return { innerExt: normalizedExt, format: 'XML text', data: { text } };
    }
    return { innerExt: normalizedExt, format: 'Plain text', data: { text } };
}

function buildWrappedStructured(payload: unknown, innerExt: string, sourceText = ''): Uint8Array {
    const normalizedExt = innerExt || 'json';
    if (normalizedExt === 'json') return textEncoder.encode(JSON.stringify(payload, null, 2));
    if (normalizedExt === 'yaml' || normalizedExt === 'yml') return textEncoder.encode(YAML.stringify(payload));
    if (normalizedExt === 'toml') return textEncoder.encode(buildCfg(sourceText, payload, formatTomlValue, 'TOML'));
    if (normalizedExt === 'properties' || normalizedExt === 'props' || normalizedExt === 'conf') return textEncoder.encode(buildProperties(sourceText, payload));
    if (normalizedExt === 'csv' || normalizedExt === 'tsv') return textEncoder.encode(buildCsv(payload, normalizedExt === 'tsv' ? '\t' : ','));
    if (normalizedExt === 'cfg') return textEncoder.encode(buildCfg(sourceText, payload));
    if (normalizedExt === 'xml' || normalizedExt === 'txt') {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload) || typeof (payload as Record<string, unknown>).text !== 'string') {
            throw new Error('Text export requires an object with a text field.');
        }
        return textEncoder.encode((payload as Record<string, string>).text);
    }
    throw new Error('Wrapped export only supports JSON, YAML, TOML, properties, CSV, CFG, XML, and text.');
}

function decodeBase64Bytes(text: string): { bytes: Uint8Array; urlSafe: boolean; omitPadding: boolean } {
    const compact = text.replace(/\s+/g, '');
    const urlSafe = compact.includes('-') || compact.includes('_');
    const omitPadding = !compact.endsWith('=');
    const normalized = compact.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = typeof atob === 'function'
        ? atob(padded)
        : (globalThis as any).Buffer.from(padded, 'base64').toString('binary');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return { bytes, urlSafe, omitPadding };
}

function encodeBase64Bytes(bytes: Uint8Array, urlSafe: boolean, omitPadding: boolean): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.slice(i, i + 0x8000));
    }
    let base64 = typeof btoa === 'function'
        ? btoa(binary)
        : (globalThis as any).Buffer.from(binary, 'binary').toString('base64');
    if (urlSafe) base64 = base64.replace(/\+/g, '-').replace(/\//g, '_');
    return omitPadding ? base64.replace(/=+$/, '') : base64;
}

function parseZipPayload(bytes: Uint8Array): { entries: Record<string, unknown>; formats: Record<string, string>; entryCount: number } {
    const zipEntries = fflate.unzipSync(bytes);
    const entries: Record<string, unknown> = {};
    const formats: Record<string, string> = {};

    for (const [name, entryBytes] of Object.entries(zipEntries)) {
        if (name.endsWith('/')) continue;
        const innerExt = extOf(name);
        if (!WRAPPED_TEXT_EXTENSIONS.has(innerExt)) continue;
        try {
            const parsed = parseWrappedStructured(entryBytes, innerExt);
            entries[name] = parsed.data;
            formats[name] = parsed.innerExt;
        } catch {
            // Keep unsupported archive members untouched; they are preserved on export.
        }
    }

    return { entries, formats, entryCount: Object.keys(zipEntries).length };
}

type GenericCompressionKind = 'bz2' | 'lz4' | 'zstd';
let zstdWasmPromise: Promise<typeof import('@bokuweb/zstd-wasm')> | null = null;

async function getZstdWasm(): Promise<typeof import('@bokuweb/zstd-wasm')> {
    zstdWasmPromise ||= import('@bokuweb/zstd-wasm').then(async (mod) => {
        await mod.init();
        return mod;
    });
    return zstdWasmPromise;
}

async function decompressGenericWrapper(kind: GenericCompressionKind, bytes: Uint8Array): Promise<Uint8Array> {
    if (kind === 'bz2') {
        const mod = await import('compressjs');
        return Uint8Array.from((mod.default || mod).Bzip2.decompressFile(Array.from(bytes)));
    }
    if (kind === 'lz4') {
        const mod = await import('lz4js');
        return Uint8Array.from(mod.decompress(bytes));
    }
    const zstd = await getZstdWasm();
    return Uint8Array.from(zstd.decompress(bytes));
}

async function compressGenericWrapper(kind: GenericCompressionKind, bytes: Uint8Array): Promise<Uint8Array> {
    if (kind === 'bz2') {
        const mod = await import('compressjs');
        return Uint8Array.from((mod.default || mod).Bzip2.compressFile(Array.from(bytes)));
    }
    if (kind === 'lz4') {
        const mod = await import('lz4js');
        return Uint8Array.from(mod.compress(bytes));
    }
    const zstd = await getZstdWasm();
    return Uint8Array.from(zstd.compress(bytes, 3));
}

function isGzip(bytes: Uint8Array): boolean {
    return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

function parseEs3Data(bytes: Uint8Array, text: string): { data: unknown; compression: 'none' | 'gzip' } {
    if (isGzip(bytes)) {
        const inflated = pako.ungzip(bytes);
        return {
            data: JSON.parse(textDecoder.decode(inflated)),
            compression: 'gzip',
        };
    }

    const trimmed = text.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        throw new Error('ES3 payload is not an unencrypted JSON container.');
    }
    return {
        data: JSON.parse(trimmed),
        compression: 'none',
    };
}

function isJsonSafeValue(value: unknown, depth = 0): boolean {
    if (depth > 64) return false;
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' || typeof value === 'boolean') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (Array.isArray(value)) return value.every((item) => isJsonSafeValue(item, depth + 1));
    if (typeof value === 'object') {
        const proto = Object.getPrototypeOf(value);
        if (proto !== Object.prototype && proto !== null) return false;
        return Object.entries(value as Record<string, unknown>).every(([key, item]) => typeof key === 'string' && isJsonSafeValue(item, depth + 1));
    }
    return false;
}

function parseSqliteMaster(bytes: Uint8Array): Record<string, unknown> {
    if (new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 16)) !== 'SQLite format 3\0') {
        throw new Error('Invalid SQLite header.');
    }
    const pageSizeRaw = (bytes[16] << 8) | bytes[17];
    const pageSize = pageSizeRaw === 1 ? 65536 : pageSizeRaw;
    const page = bytes.slice(0, pageSize);
    const btreeOffset = 100;
    if (page[btreeOffset] !== 0x0d) {
        return { tables: [], note: 'SQLite database recognized; sqlite_master is not a simple table leaf page.' };
    }

    const cellCount = (page[btreeOffset + 3] << 8) | page[btreeOffset + 4];
    const tables: Array<Record<string, unknown>> = [];

    for (let i = 0; i < cellCount; i += 1) {
        const pointerOffset = btreeOffset + 8 + i * 2;
        const cellOffset = (page[pointerOffset] << 8) | page[pointerOffset + 1];
        const record = readSqliteTableLeafRecord(page, cellOffset);
        if (!record) continue;
        const [type, name, tblName, rootPage, sql] = record;
        if (type === 'table' || type === 'index' || type === 'view' || type === 'trigger') {
            tables.push({ type, name, table: tblName, rootPage, sql });
        }
    }

    return { tables };
}

interface SolFile {
    name: string;
    flags: Uint8Array;
    encoding: Uint8Array;
    data: Record<string, unknown>;
}

function parseSolFile(bytes: Uint8Array): SolFile {
    if (bytes.length < 20 || bytes[0] !== 0x00 || bytes[1] !== 0xbf) {
        throw new Error('Invalid Flash SharedObject header.');
    }

    const tcsoOffset = findBytes(bytes, Uint8Array.from([0x54, 0x43, 0x53, 0x4f]), 2, Math.min(bytes.length, 32));
    if (tcsoOffset === -1 || tcsoOffset + 16 > bytes.length) {
        throw new Error('Flash SharedObject TCSO header was not found.');
    }

    const flags = bytes.slice(tcsoOffset + 4, tcsoOffset + 10);
    const name = readSolUtf(bytes, tcsoOffset + 10);
    if (name.offset + 4 > bytes.length) {
        throw new Error('Flash SharedObject name section is truncated.');
    }

    const encoding = bytes.slice(name.offset, name.offset + 4);
    const data = parseSolEntries(bytes, name.offset + 4);
    return { name: name.value, flags, encoding, data };
}

function findBytes(bytes: Uint8Array, needle: Uint8Array, start: number, end: number): number {
    for (let offset = start; offset <= end - needle.length; offset += 1) {
        let matched = true;
        for (let i = 0; i < needle.length; i += 1) {
            if (bytes[offset + i] !== needle[i]) {
                matched = false;
                break;
            }
        }
        if (matched) return offset;
    }
    return -1;
}

function readSolUtf(bytes: Uint8Array, offset: number, wide = false): { value: string; offset: number } {
    ensureBytes(bytes, offset, wide ? 4 : 2, 'AMF0 string length is truncated.');
    const length = wide ? readUint32(bytes, offset) : readUint16(bytes, offset);
    const start = offset + (wide ? 4 : 2);
    ensureBytes(bytes, start, length, 'AMF0 string data is truncated.');
    return {
        value: textDecoder.decode(bytes.slice(start, start + length)),
        offset: start + length,
    };
}

function parseSolEntries(bytes: Uint8Array, start: number): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    let offset = start;

    while (offset < bytes.length) {
        if (isAmf0ObjectEnd(bytes, offset)) break;
        const key = readSolUtf(bytes, offset);
        offset = key.offset;
        if (key.value === '' && bytes[offset] === 0x09) break;
        const parsed = readAmf0Value(bytes, offset, 0);
        data[key.value] = parsed.value;
        offset = parsed.offset;
    }

    return data;
}

function readAmf0Value(bytes: Uint8Array, offset: number, depth: number): { value: unknown; offset: number } {
    if (depth > 32) throw new Error('AMF0 nesting is too deep.');
    ensureBytes(bytes, offset, 1, 'AMF0 value marker is truncated.');
    const marker = bytes[offset++];

    if (marker === 0x00) {
        ensureBytes(bytes, offset, 8, 'AMF0 number is truncated.');
        const value = new DataView(bytes.buffer, bytes.byteOffset + offset, 8).getFloat64(0, false);
        return { value, offset: offset + 8 };
    }
    if (marker === 0x01) {
        ensureBytes(bytes, offset, 1, 'AMF0 boolean is truncated.');
        return { value: bytes[offset] !== 0, offset: offset + 1 };
    }
    if (marker === 0x02) return readSolUtf(bytes, offset);
    if (marker === 0x03) return readAmf0Object(bytes, offset, depth + 1);
    if (marker === 0x05 || marker === 0x06) return { value: null, offset };
    if (marker === 0x08) {
        ensureBytes(bytes, offset, 4, 'AMF0 ECMA array length is truncated.');
        return readAmf0Object(bytes, offset + 4, depth + 1);
    }
    if (marker === 0x0a) {
        ensureBytes(bytes, offset, 4, 'AMF0 strict array length is truncated.');
        const length = readUint32(bytes, offset);
        offset += 4;
        const value: unknown[] = [];
        for (let i = 0; i < length; i += 1) {
            const item = readAmf0Value(bytes, offset, depth + 1);
            value.push(item.value);
            offset = item.offset;
        }
        return { value, offset };
    }
    if (marker === 0x0b) {
        ensureBytes(bytes, offset, 10, 'AMF0 date is truncated.');
        const timestamp = new DataView(bytes.buffer, bytes.byteOffset + offset, 8).getFloat64(0, false);
        const timezone = new DataView(bytes.buffer, bytes.byteOffset + offset + 8, 2).getInt16(0, false);
        return {
            value: {
                _amf0Type: 'date',
                timestamp,
                timezone,
                iso: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null,
            },
            offset: offset + 10,
        };
    }
    if (marker === 0x0c) return readSolUtf(bytes, offset, true);

    throw new Error(`Unsupported AMF0 marker 0x${marker.toString(16).padStart(2, '0')}.`);
}

function readAmf0Object(bytes: Uint8Array, offset: number, depth: number): { value: Record<string, unknown>; offset: number } {
    const value: Record<string, unknown> = {};

    while (offset < bytes.length) {
        if (isAmf0ObjectEnd(bytes, offset)) {
            return { value, offset: offset + 3 };
        }
        const key = readSolUtf(bytes, offset);
        offset = key.offset;
        const parsed = readAmf0Value(bytes, offset, depth + 1);
        value[key.value] = parsed.value;
        offset = parsed.offset;
    }

    throw new Error('AMF0 object terminator was not found.');
}

function isAmf0ObjectEnd(bytes: Uint8Array, offset: number): boolean {
    return offset + 2 < bytes.length && bytes[offset] === 0x00 && bytes[offset + 1] === 0x00 && bytes[offset + 2] === 0x09;
}

function buildSolFile(source: Uint8Array, payload: unknown): Uint8Array {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('SOL export requires an object payload.');
    }

    const original = parseSolFile(source);
    const body = concatBytes(
        Uint8Array.from([0x54, 0x43, 0x53, 0x4f]),
        original.flags,
        encodeSolUtf(original.name),
        original.encoding,
        ...Object.entries(payload as Record<string, unknown>).map(([key, value]) =>
            concatBytes(encodeSolUtf(key), encodeAmf0Value(value))
        ),
        Uint8Array.from([0x00, 0x00, 0x09])
    );

    return concatBytes(Uint8Array.from([0x00, 0xbf]), writeUint32(body.length), body);
}

function encodeAmf0Value(value: unknown): Uint8Array {
    if (value === null || value === undefined) return Uint8Array.from([0x05]);
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) throw new Error('AMF0 export only supports finite numbers.');
        const bytes = new Uint8Array(9);
        bytes[0] = 0x00;
        new DataView(bytes.buffer).setFloat64(1, value, false);
        return bytes;
    }
    if (typeof value === 'boolean') return Uint8Array.from([0x01, value ? 1 : 0]);
    if (typeof value === 'string') return encodeAmf0String(value);
    if (Array.isArray(value)) {
        return concatBytes(
            Uint8Array.from([0x0a]),
            writeUint32(value.length),
            ...value.map((item) => encodeAmf0Value(item))
        );
    }
    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        if (record._amf0Type === 'date' && typeof record.timestamp === 'number') {
            const bytes = new Uint8Array(11);
            bytes[0] = 0x0b;
            new DataView(bytes.buffer).setFloat64(1, record.timestamp, false);
            new DataView(bytes.buffer).setInt16(9, typeof record.timezone === 'number' ? record.timezone : 0, false);
            return bytes;
        }
        return concatBytes(
            Uint8Array.from([0x03]),
            ...Object.entries(record).map(([key, item]) => concatBytes(encodeSolUtf(key), encodeAmf0Value(item))),
            Uint8Array.from([0x00, 0x00, 0x09])
        );
    }
    return encodeAmf0String(String(value));
}

function encodeAmf0String(value: string): Uint8Array {
    const bytes = textEncoder.encode(value);
    if (bytes.length <= 0xffff) {
        return concatBytes(Uint8Array.from([0x02]), writeUint16(bytes.length), bytes);
    }
    return concatBytes(Uint8Array.from([0x0c]), writeUint32(bytes.length), bytes);
}

function encodeSolUtf(value: string): Uint8Array {
    const bytes = textEncoder.encode(value);
    if (bytes.length > 0xffff) throw new Error('SOL keys longer than 65535 bytes are not supported.');
    return concatBytes(writeUint16(bytes.length), bytes);
}

function writeUint16(value: number): Uint8Array {
    return Uint8Array.from([(value >> 8) & 0xff, value & 0xff]);
}

function writeUint32(value: number): Uint8Array {
    return Uint8Array.from([(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]);
}

function ensureBytes(bytes: Uint8Array, offset: number, length: number, message: string): void {
    if (offset < 0 || offset + length > bytes.length) {
        throw new Error(message);
    }
}

async function loadSqlJs(): Promise<any> {
    if (!sqlJsPromise) {
        sqlJsPromise = (async () => {
            if (isNodeRuntime()) {
                const nodeSqlJsModule = 'sql.js/dist/sql-wasm.js';
                const mod = await import(/* @vite-ignore */ nodeSqlJsModule);
                const initSqlJs = mod.default || mod;
                return initSqlJs({
                    locateFile: (file: string) => nodeSqlJsAssetPath(file),
                });
            }

            const browserSqlJsModule = '/sql-wasm-browser.js';
            const mod = await import(/* @vite-ignore */ browserSqlJsModule);
            const initSqlJs = mod.default || mod;
            return initSqlJs({
                locateFile: (file: string) => `/${file}`,
            });
        })();
    }
    return sqlJsPromise;
}

function nodeSqlJsAssetPath(file: string): string {
    const distPath = '../../../node_modules/sql.js/dist/';
    return new URL(distPath + file, import.meta.url).pathname;
}

async function parseSqliteDatabase(bytes: Uint8Array): Promise<SqliteData> {
    const SQL = await loadSqlJs();
    const db = new SQL.Database(bytes);
    const tables: Record<string, SqliteTable> = {};

    try {
        const tableRows = execRows(
            db,
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        );

        for (const [tableNameValue] of tableRows) {
            const tableName = String(tableNameValue);
            const columns = getSqliteColumns(db, tableName);
            if (columns.length === 0) continue;

            const quotedColumns = columns.map((column) => quoteIdentifier(column.name)).join(', ');
            let hasRowId = true;
            let rows: Array<Record<string, unknown>>;
            try {
                rows = selectSqliteRows(db, `SELECT rowid AS __rowid, ${quotedColumns} FROM ${quoteIdentifier(tableName)} LIMIT 100`);
            } catch {
                hasRowId = false;
                rows = selectSqliteRows(db, `SELECT ${quotedColumns} FROM ${quoteIdentifier(tableName)} LIMIT 100`);
            }

            tables[tableName] = {
                columns,
                rows,
                rowLimit: 100,
                hasRowId,
            };
        }
    } finally {
        db.close();
    }

    return { tables };
}

function getSqliteColumns(db: any, tableName: string): SqliteColumn[] {
    return execRows(db, `PRAGMA table_info(${quoteSqlString(tableName)})`).map((row) => ({
        name: String(row[1]),
        type: String(row[2] || ''),
        notNull: row[3] === 1,
        primaryKey: Number(row[5] || 0),
    }));
}

function execRows(db: any, sql: string): unknown[][] {
    const result = db.exec(sql)[0];
    return result?.values || [];
}

function selectSqliteRows(db: any, sql: string): Array<Record<string, unknown>> {
    const result = db.exec(sql)[0];
    if (!result) return [];
    return result.values.map((row: unknown[]) => {
        const out: Record<string, unknown> = {};
        result.columns.forEach((column: string, index: number) => {
            out[column] = normalizeSqliteValue(row[index]);
        });
        return out;
    });
}

function normalizeSqliteValue(value: unknown): unknown {
    if (value instanceof Uint8Array) return Array.from(value);
    return value;
}

function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}

function quoteSqlString(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
}

function readSqliteTableLeafRecord(page: Uint8Array, start: number): unknown[] | null {
    const payloadLength = readSqliteVarint(page, start);
    const rowId = readSqliteVarint(page, payloadLength.offset);
    void rowId;
    const payload = page.slice(rowId.offset, rowId.offset + payloadLength.value);
    if (payload.length === 0) return null;

    const headerSize = readSqliteVarint(payload, 0);
    const serialTypes: number[] = [];
    let offset = headerSize.offset;
    while (offset < headerSize.value) {
        const serial = readSqliteVarint(payload, offset);
        serialTypes.push(serial.value);
        offset = serial.offset;
    }

    const values: unknown[] = [];
    let valueOffset = headerSize.value;
    for (const serial of serialTypes) {
        const decoded = readSqliteValue(payload, valueOffset, serial);
        values.push(decoded.value);
        valueOffset = decoded.offset;
    }
    return values;
}

function readSqliteVarint(bytes: Uint8Array, start: number): { value: number; offset: number } {
    let value = 0;
    let offset = start;
    for (let i = 0; i < 9; i += 1) {
        const byte = bytes[offset++];
        if (i === 8) return { value: value * 256 + byte, offset };
        value = value * 128 + (byte & 0x7f);
        if ((byte & 0x80) === 0) return { value, offset };
    }
    return { value, offset };
}

function readSqliteValue(bytes: Uint8Array, offset: number, serial: number): { value: unknown; offset: number } {
    if (serial === 0) return { value: null, offset };
    if (serial === 8) return { value: 0, offset };
    if (serial === 9) return { value: 1, offset };
    const readInt = (length: number) => {
        let value = 0;
        for (let i = 0; i < length; i += 1) value = value * 256 + bytes[offset + i];
        return { value, offset: offset + length };
    };
    if (serial === 1) return readInt(1);
    if (serial === 2) return readInt(2);
    if (serial === 3) return readInt(3);
    if (serial === 4) return readInt(4);
    if (serial === 5) return readInt(6);
    if (serial === 6) return readInt(8);
    if (serial >= 12) {
        const length = serial % 2 === 0 ? (serial - 12) / 2 : (serial - 13) / 2;
        const chunk = bytes.slice(offset, offset + length);
        return {
            value: serial % 2 === 1 ? textDecoder.decode(chunk) : Array.from(chunk),
            offset: offset + length,
        };
    }
    return { value: null, offset };
}

function looksLikeNrbf(bytes: Uint8Array, text: string): boolean {
    return isNrbfBytes(bytes) || text.includes('System.') || text.includes('BinaryFormatter');
}

function readonlyOutcome(format: string, payload: GenericPayload, reason: string): ParseOutcome<GenericPayload> {
    return makeOutcome({
        engine: 'generic',
        format,
        formatFamily: payload.data && typeof payload.data === 'object' ? 'generic-structured' : 'generic-binary',
        mode: 'readonly',
        reasonCode: 'read_only_generic',
        reason,
        capabilities: {
            canView: true,
            canEdit: false,
            canSave: false,
            roundTripSupport: 'none',
        },
        data: payload,
        warnings: ['This format is opened in transparent read-only mode. Share a sample if you need safe write support.'],
    });
}

function writableOutcome(format: string, payload: GenericPayload, reason: string): ParseOutcome<GenericPayload> {
    return makeOutcome({
        engine: 'generic',
        format,
        formatFamily: 'generic-structured',
        mode: 'limited',
        reasonCode: 'ok',
        reason,
        capabilities: {
            canView: true,
            canEdit: true,
            canSave: true,
            roundTripSupport: 'stable-limited',
        },
        data: { ...payload, _readOnly: false },
        warnings: ['Generic structured export preserves the selected container format, but game-specific checksums may still reject edited data.'],
    });
}

export async function parseGeneric(file: File): Promise<ParseOutcome<GenericPayload | null>> {
    const ext = extOf(file.name);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const text = textDecoder.decode(bytes);
    const extension = ext ? `.${ext}` : '(none)';
    const summary = {
        fileName: extension === '(none)' ? 'redacted' : `redacted${extension}`,
        size: file.size,
        extension,
    };

    try {
        if (ext === 'msgpack' || ext === 'mpack') {
            const msgpack = await getMsgpack();
            return writableOutcome('generic-msgpack', {
                _format: 'MessagePack',
                _summary: summary,
                data: msgpack.decode(bytes as any),
            }, 'MessagePack was decoded as editable structured data. Export rebuilds a MessagePack payload.');
        }

        if (ext === 'cbor') {
            return writableOutcome('generic-cbor', {
                _format: 'CBOR',
                _summary: summary,
                data: basicCborDecode(bytes),
            }, 'CBOR was decoded as editable structured data. Export rebuilds a CBOR payload.');
        }

        if (ext === 'bson') {
            const data = EJSON.serialize(deserializeBson(bytes), { relaxed: true });
            return writableOutcome('generic-bson', {
                _format: 'BSON Extended JSON',
                _summary: summary,
                data,
            }, 'BSON was decoded as editable Extended JSON. Export rebuilds a BSON document.');
        }

        if (ext === 'pkl' || ext === 'pickle') {
            const parser = new pickleparser.Parser();
            const data = parser.parse(bytes);
            if (isJsonSafeValue(data)) {
                return writableOutcome('generic-pickle', {
                    _format: 'Python Pickle',
                    _summary: summary,
                    data,
                }, 'Python pickle was decoded as editable primitive data. Export rebuilds a simple Protocol 0 pickle.');
            }
            return readonlyOutcome('generic-pickle', {
                _format: 'Python Pickle',
                _readOnly: true,
                _summary: summary,
                data,
            }, 'Python pickle was decoded for inspection only because it contains values outside the simple safe write subset.');
        }

        if (ext === 'cfg') {
            return writableOutcome('generic-godot-cfg', {
                _format: 'Godot / INI-style CFG',
                _summary: summary,
                data: parseCfg(text),
            }, 'CFG data was parsed as editable structured data. Export preserves comments and known source lines where possible.');
        }

        if (ext === 'yaml' || ext === 'yml') {
            const data = YAML.parse(text);
            if (!isJsonSafeValue(data)) {
                return readonlyOutcome('generic-yaml', {
                    _format: 'YAML',
                    _readOnly: true,
                    _summary: summary,
                    data,
                }, 'YAML was decoded for inspection only because it contains values outside the safe JSON write subset.');
            }
            return writableOutcome('generic-yaml', {
                _format: 'YAML',
                _summary: summary,
                data,
            }, 'YAML was decoded as editable structured data. Export rebuilds a YAML document.');
        }

        if (ext === 'toml') {
            return writableOutcome('generic-toml', {
                _format: 'TOML',
                _summary: summary,
                data: parseCfg(text),
            }, 'TOML was decoded as editable sectioned key-value data. Export preserves comments and known source lines where possible.');
        }

        if (ext === 'properties' || ext === 'props' || ext === 'conf') {
            return writableOutcome('generic-properties', {
                _format: 'Properties / CONF',
                _summary: summary,
                data: parseFlatKeyValue(text),
            }, 'Key-value data was decoded as editable structured data. Export preserves comments and known source lines where possible.');
        }

        if (ext === 'csv' || ext === 'tsv') {
            return writableOutcome(ext === 'tsv' ? 'generic-tsv' : 'generic-csv', {
                _format: ext === 'tsv' ? 'TSV' : 'CSV',
                _summary: summary,
                data: parseCsv(text, ext === 'tsv' ? '\t' : ','),
            }, `${ext.toUpperCase()} was decoded as editable table data. Export rebuilds the same delimiter format.`);
        }

        if (ext === 'xml') {
            return writableOutcome('generic-xml', {
                _format: 'XML text',
                _summary: summary,
                data: { text },
            }, 'XML was decoded as editable text. Export rebuilds an XML text file.');
        }

        if (ext === 'zip') {
            const zip = parseZipPayload(bytes);
            if (Object.keys(zip.entries).length === 0) {
                return readonlyOutcome('generic-zip', {
                    _format: 'ZIP container',
                    _readOnly: true,
                    _summary: { ...summary, entryCount: zip.entryCount },
                }, 'ZIP was recognized, but no supported structured text entries were found.');
            }
            return writableOutcome('generic-zip', {
                _format: 'ZIP container',
                _summary: {
                    ...summary,
                    entryCount: zip.entryCount,
                    editableEntries: Object.keys(zip.entries),
                    entryFormats: zip.formats,
                },
                data: { entries: zip.entries },
            }, 'ZIP entries with supported structured text formats were decoded as editable data. Export preserves other archive entries.');
        }

        if (ext === 'b64' || ext === 'base64') {
            const decoded = decodeBase64Bytes(text);
            const innerExt = innerExtOfWrapper(file.name, ['b64', 'base64']);
            const parsed = parseWrappedStructured(decoded.bytes, innerExt);
            return writableOutcome(`generic-base64-${parsed.innerExt}`, {
                _format: `Base64 ${parsed.format}`,
                _summary: {
                    ...summary,
                    encoding: decoded.urlSafe ? 'base64url' : 'base64',
                    omitPadding: decoded.omitPadding,
                    innerExtension: parsed.innerExt ? `.${parsed.innerExt}` : 'detected',
                },
                data: parsed.data,
            }, 'Base64-wrapped structured text was decoded as editable data. Export rebuilds the same Base64 wrapper.');
        }

        if (ext === 'lzstring' || ext === 'lzstr') {
            const innerExt = innerExtOfWrapper(file.name, ['lzstring', 'lzstr']);
            const decompressed = LZString.decompressFromBase64(text.trim());
            if (decompressed === null) throw new Error('LZString Base64 payload could not be decompressed.');
            const parsed = parseWrappedStructured(textEncoder.encode(decompressed), innerExt);
            return writableOutcome(`generic-lzstring-${parsed.innerExt}`, {
                _format: `LZString ${parsed.format}`,
                _summary: { ...summary, compression: 'lzstring-base64', innerExtension: parsed.innerExt ? `.${parsed.innerExt}` : 'detected' },
                data: parsed.data,
            }, 'LZString-wrapped structured text was decoded as editable data. Export rebuilds the same LZString Base64 wrapper.');
        }

        if (ext === 'zlib' || ext === 'deflate') {
            const innerExt = innerExtOfWrapper(file.name, ['zlib', 'deflate']);
            const inflated = ext === 'deflate' ? pako.inflateRaw(bytes) : pako.inflate(bytes);
            const parsed = parseWrappedStructured(inflated, innerExt);
            return writableOutcome(`generic-${ext}-${parsed.innerExt}`, {
                _format: `${ext === 'deflate' ? 'Raw deflate' : 'Zlib'} ${parsed.format}`,
                _summary: { ...summary, compression: ext, innerExtension: parsed.innerExt ? `.${parsed.innerExt}` : 'detected' },
                data: parsed.data,
            }, `${ext === 'deflate' ? 'Raw deflate' : 'Zlib'}-wrapped structured text was decoded as editable data. Export rebuilds the same compression wrapper.`);
        }

        if (ext === 'bz2' || ext === 'bzip2' || ext === 'lz4' || ext === 'zst' || ext === 'zstd') {
            const kind: GenericCompressionKind = ext === 'lz4' ? 'lz4' : ext === 'zst' || ext === 'zstd' ? 'zstd' : 'bz2';
            const innerExt = innerExtOfWrapper(file.name, ['bz2', 'bzip2', 'lz4', 'zst', 'zstd']);
            const inflated = await decompressGenericWrapper(kind, bytes);
            const parsed = parseWrappedStructured(inflated, innerExt);
            return writableOutcome(`generic-${kind}-${parsed.innerExt}`, {
                _format: `${kind === 'bz2' ? 'BZip2' : kind === 'lz4' ? 'LZ4' : 'Zstandard'} ${parsed.format}`,
                _summary: { ...summary, compression: kind, innerExtension: parsed.innerExt ? `.${parsed.innerExt}` : 'detected' },
                data: parsed.data,
            }, `${kind === 'bz2' ? 'BZip2' : kind === 'lz4' ? 'LZ4' : 'Zstandard'}-wrapped structured text was decoded as editable data. Export rebuilds the same compression wrapper.`);
        }

        if (ext === 'gz') {
            const innerExt = innerExtOfGzip(file.name);
            const inflated = pako.ungzip(bytes);
            if (innerExt === 'json' || innerExt === 'yaml' || innerExt === 'yml') {
                const parsed = parseWrappedStructured(inflated, innerExt);
                return writableOutcome(`generic-gzip-${parsed.innerExt}`, {
                    _format: `Gzip ${parsed.format}`,
                    _summary: { ...summary, compression: 'gzip', innerExtension: `.${parsed.innerExt}` },
                    data: parsed.data,
                }, `Gzip-compressed ${parsed.format} was decoded as editable structured data. Export rebuilds gzip ${parsed.format}.`);
            }
            return readonlyOutcome('generic-gzip', {
                _format: 'Gzip container',
                _readOnly: true,
                _summary: { ...summary, compression: 'gzip', innerExtension: innerExt ? `.${innerExt}` : 'unknown' },
            }, 'Gzip was recognized, but only .json.gz and .yaml.gz are enabled for safe same-container export.');
        }

        if (isSqliteExtension(ext) || isSqliteBytes(bytes)) {
            const data = await parseSqliteDatabase(bytes);
            return writableOutcome('generic-sqlite', {
                _format: 'SQLite database',
                _summary: { ...summary, recognizedHeader: 'sqlite' },
                data,
            }, 'SQLite tables were decoded as editable structured data. Export updates existing visible rows in the original database.');
        }

        if (ext === 'sol') {
            try {
                const sol = parseSolFile(bytes);
                return writableOutcome('generic-sol', {
                    _format: 'Flash SharedObject',
                    _summary: {
                        ...summary,
                        recognizedHeader: 'flash-shared-object',
                        sharedObjectName: sol.name,
                        valueCount: Object.keys(sol.data).length,
                    },
                    data: sol.data,
                }, 'Standard Flash SharedObject AMF0 data was decoded as editable structured data. Export rebuilds a SOL payload.');
            } catch {
                return readonlyOutcome('generic-sol', {
                    _format: 'Flash SharedObject',
                    _readOnly: true,
                    _summary: { ...summary, recognizedHeader: 'flash-shared-object-candidate' },
                }, 'Only standard AMF0 Flash SharedObject files are enabled for export. AMF3 or custom SOL variants are inspection-first.');
            }
        }

        if (ext === 'es3') {
            try {
                const es3 = parseEs3Data(bytes, text);
                return writableOutcome('generic-es3', {
                    _format: 'Easy Save 3 JSON',
                    _summary: { ...summary, compression: es3.compression },
                    data: es3.data,
                }, 'Unencrypted Easy Save 3 JSON data was decoded as editable structured data. Export rebuilds the same JSON container.');
            } catch {
                return readonlyOutcome('generic-binary-serialization', {
                    _format: 'Easy Save 3 / Unity serialization candidate',
                    _readOnly: true,
                    _summary: { ...summary, recognizedHeader: 'easy-save-3-candidate' },
                }, 'Encrypted, compressed non-gzip, or binary Easy Save 3 data is recognized for transparency; safe write support requires game-specific fixtures.');
            }
        }

        if (ext === 'nrbf' || ext === 'bytes' || looksLikeNrbf(bytes, text)) {
            try {
                const decoded = await decodeNrbf(bytes);
                return writableOutcome('generic-nrbf', {
                    _format: '.NET BinaryFormatter / NRBF',
                    _readOnly: false,
                    _summary: { ...summary, recognizedHeader: 'nrbf', ...decoded.summary },
                    data: decoded.data,
                }, 'NRBF data was decoded as an editable object graph. Export preserves the original CLR schema and verifies the rebuilt stream before download.');
            } catch (error: any) {
                return readonlyOutcome('generic-nrbf', {
                    _format: '.NET BinaryFormatter / NRBF candidate',
                    _readOnly: true,
                    _summary: { ...summary, recognizedHeader: 'nrbf-candidate' },
                }, `This NRBF variant is inspection-only: ${error?.message || 'the object graph could not be decoded safely.'}`);
            }
        }

        if (ext === 'dat') {
            return readonlyOutcome('generic-binary-serialization', {
                _format: '.NET / custom binary serialization candidate',
                _readOnly: true,
                _summary: { ...summary, recognizedHeader: 'custom-binary-candidate' },
            }, 'This binary serialization format is recognized for transparency; safe write support requires game-specific fixtures.');
        }
    } catch (error: any) {
        return makeOutcome({
            engine: 'generic',
            format: `generic-${ext || 'unknown'}`,
            formatFamily: 'generic-binary',
            mode: 'unsupported',
            reasonCode: 'parse_failed',
            reason: error?.message || 'Generic parser failed.',
            capabilities: {
                canView: false,
                canEdit: false,
                canSave: false,
                roundTripSupport: 'none',
            },
            data: null,
        });
    }

    return readonlyOutcome('generic-binary', {
        _format: 'Generic binary',
        _readOnly: true,
        _summary: { ...summary, recognizedHeader: 'unmatched-binary-candidate' },
    }, 'No specific parser matched. The file is shown as a binary support candidate.');
}

export async function buildGeneric(originalFile: File, input: unknown): Promise<Blob> {
    const ext = extOf(originalFile.name);
    const payload = extractGenericPayload(input);
    const originalBytes = new Uint8Array(await originalFile.arrayBuffer());

    if (isNrbfBytes(originalBytes)) return blobFromBytes(await rebuildNrbf(originalBytes, payload), 'application/octet-stream');

    if (ext === 'msgpack' || ext === 'mpack') {
        const msgpack = await getMsgpack();
        return blobFromBytes(msgpack.encode(payload) as Uint8Array, 'application/octet-stream');
    }

    if (ext === 'cbor') {
        return blobFromBytes(encodeCbor(payload), 'application/cbor');
    }

    if (ext === 'bson') {
        return blobFromBytes(serializeBson(EJSON.deserialize(payload as any)), 'application/bson');
    }

    if (ext === 'pkl' || ext === 'pickle') {
        if (!isJsonSafeValue(payload)) {
            throw new Error('Pickle export only supports simple JSON-safe values.');
        }
        return blobFromBytes(pickleSerialize(payload), 'application/octet-stream');
    }

    if (ext === 'cfg') {
        const source = await originalFile.text();
        return new Blob([buildCfg(source, payload)], { type: 'text/plain' });
    }

    if (ext === 'yaml' || ext === 'yml') {
        return new Blob([YAML.stringify(payload)], { type: 'text/yaml' });
    }

    if (ext === 'toml') {
        const source = await originalFile.text();
        return new Blob([buildCfg(source, payload, formatTomlValue, 'TOML')], { type: 'text/plain' });
    }

    if (ext === 'properties' || ext === 'props' || ext === 'conf') {
        const source = await originalFile.text();
        return new Blob([buildProperties(source, payload)], { type: 'text/plain' });
    }

    if (ext === 'csv' || ext === 'tsv') {
        return new Blob([buildCsv(payload, ext === 'tsv' ? '\t' : ',')], { type: 'text/csv' });
    }

    if (ext === 'xml') {
        return blobFromBytes(buildWrappedStructured(payload, 'xml'), 'application/xml');
    }

    if (ext === 'zip') {
        return blobFromBytes(buildZip(originalBytes, payload), 'application/zip');
    }

    if (ext === 'b64' || ext === 'base64') {
        const sourceText = await originalFile.text();
        const decoded = decodeBase64Bytes(sourceText);
        const innerExt = innerExtOfWrapper(originalFile.name, ['b64', 'base64']) || parseWrappedStructured(decoded.bytes, '').innerExt;
        const rebuilt = buildWrappedStructured(payload, innerExt, textDecoder.decode(decoded.bytes));
        return new Blob([encodeBase64Bytes(rebuilt, decoded.urlSafe, decoded.omitPadding)], { type: 'text/plain' });
    }

    if (ext === 'lzstring' || ext === 'lzstr') {
        const sourceText = await originalFile.text();
        const decompressed = LZString.decompressFromBase64(sourceText.trim());
        if (decompressed === null) throw new Error('LZString Base64 payload could not be decompressed.');
        const innerExt = innerExtOfWrapper(originalFile.name, ['lzstring', 'lzstr']) || parseWrappedStructured(textEncoder.encode(decompressed), '').innerExt;
        const rebuilt = textDecoder.decode(buildWrappedStructured(payload, innerExt, decompressed));
        return new Blob([LZString.compressToBase64(rebuilt)], { type: 'text/plain' });
    }

    if (ext === 'zlib' || ext === 'deflate') {
        const inflated = ext === 'deflate' ? pako.inflateRaw(originalBytes) : pako.inflate(originalBytes);
        const innerExt = innerExtOfWrapper(originalFile.name, ['zlib', 'deflate']) || parseWrappedStructured(inflated, '').innerExt;
        const rebuilt = buildWrappedStructured(payload, innerExt, textDecoder.decode(inflated));
        return blobFromBytes(ext === 'deflate' ? pako.deflateRaw(rebuilt) : pako.deflate(rebuilt), 'application/octet-stream');
    }

    if (ext === 'bz2' || ext === 'bzip2' || ext === 'lz4' || ext === 'zst' || ext === 'zstd') {
        const kind: GenericCompressionKind = ext === 'lz4' ? 'lz4' : ext === 'zst' || ext === 'zstd' ? 'zstd' : 'bz2';
        const inflated = await decompressGenericWrapper(kind, originalBytes);
        const innerExt = innerExtOfWrapper(originalFile.name, ['bz2', 'bzip2', 'lz4', 'zst', 'zstd']) || parseWrappedStructured(inflated, '').innerExt;
        const rebuilt = buildWrappedStructured(payload, innerExt, textDecoder.decode(inflated));
        return blobFromBytes(await compressGenericWrapper(kind, rebuilt), 'application/octet-stream');
    }

    if (ext === 'gz') {
        const innerExt = innerExtOfGzip(originalFile.name);
        if (innerExt === 'json') {
            return blobFromBytes(pako.gzip(textEncoder.encode(JSON.stringify(payload, null, 2))), 'application/gzip');
        }
        if (innerExt === 'yaml' || innerExt === 'yml') {
            return blobFromBytes(pako.gzip(textEncoder.encode(YAML.stringify(payload))), 'application/gzip');
        }
        throw new Error('Only .json.gz and .yaml.gz generic containers can be rebuilt safely yet.');
    }

    if (isSqliteExtension(ext)) {
        return blobFromBytes(await buildSqlite(originalBytes, payload), 'application/vnd.sqlite3');
    }

    if (ext === 'sol') {
        return blobFromBytes(buildSolFile(originalBytes, payload), 'application/octet-stream');
    }

    if (ext === 'es3') {
        const bytes = textEncoder.encode(JSON.stringify(payload, null, 2));
        return blobFromBytes(isGzip(originalBytes) ? pako.gzip(bytes) : bytes, 'application/octet-stream');
    }

    if (isSqliteBytes(originalBytes)) {
        return blobFromBytes(await buildSqlite(originalBytes, payload), 'application/vnd.sqlite3');
    }

    throw new Error('Generic read-only formats cannot be rebuilt safely yet.');
}

function blobFromBytes(bytes: Uint8Array, type: string): Blob {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return new Blob([buffer], { type });
}

function buildZip(source: Uint8Array, payload: unknown): Uint8Array {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('ZIP export requires parsed entries.');
    }
    const entries = (payload as { entries?: unknown }).entries;
    if (!entries || typeof entries !== 'object' || Array.isArray(entries)) {
        throw new Error('ZIP export requires an entries object.');
    }

    const zipEntries = fflate.unzipSync(source);
    const parsed = parseZipPayload(source);
    const editableNames = Object.keys(parsed.entries).sort();
    const payloadNames = Object.keys(entries as Record<string, unknown>).sort();
    if (editableNames.join('\u0000') !== payloadNames.join('\u0000')) {
        throw new Error('ZIP export cannot add or delete editable entries.');
    }

    for (const name of editableNames) {
        const innerExt = parsed.formats[name] || extOf(name);
        const sourceText = textDecoder.decode(zipEntries[name]);
        zipEntries[name] = buildWrappedStructured((entries as Record<string, unknown>)[name], innerExt, sourceText);
    }

    return fflate.zipSync(zipEntries);
}

async function buildSqlite(source: Uint8Array, payload: unknown): Promise<Uint8Array> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('SQLite export requires parsed table data.');
    }
    const tables = (payload as SqliteData).tables;
    if (!tables || typeof tables !== 'object') {
        throw new Error('SQLite export requires a tables object.');
    }

    const SQL = await loadSqlJs();
    const db = new SQL.Database(source);

    try {
        db.run('BEGIN');
        for (const [tableName, table] of Object.entries(tables)) {
            if (!table || !Array.isArray(table.rows) || !Array.isArray(table.columns)) continue;
            updateSqliteRows(db, tableName, table);
        }
        db.run('COMMIT');
        return db.export();
    } catch (error) {
        try {
            db.run('ROLLBACK');
        } catch {
            // Ignore rollback failure; the original database bytes are still untouched.
        }
        throw error;
    } finally {
        db.close();
    }
}

function updateSqliteRows(db: any, tableName: string, table: SqliteTable): void {
    const currentColumns = getSqliteColumns(db, tableName);
    const columnNames = new Set(currentColumns.map((column) => column.name));
    const primaryKeys = currentColumns
        .filter((column) => column.primaryKey > 0)
        .sort((a, b) => a.primaryKey - b.primaryKey)
        .map((column) => column.name);
    const quotedColumns = currentColumns.map((column) => quoteIdentifier(column.name)).join(', ');
    const identityRows = table.hasRowId
        ? selectSqliteRows(db, `SELECT rowid AS __rowid, ${quotedColumns} FROM ${quoteIdentifier(tableName)} LIMIT ${Number(table.rowLimit) || 100}`)
        : primaryKeys.length > 0
          ? selectSqliteRows(db, `SELECT ${quotedColumns} FROM ${quoteIdentifier(tableName)} LIMIT ${Number(table.rowLimit) || 100}`)
          : [];

    if (identityRows.length > 0 && identityRows.length !== table.rows.length) {
        throw new Error('SQLite export cannot add or delete visible rows.');
    }

    for (const [index, row] of table.rows.entries()) {
        if (!row || typeof row !== 'object') continue;
        const updates = Object.keys(row).filter((key) => key !== '__rowid' && columnNames.has(key));
        if (updates.length === 0) continue;

        const values = updates.map((key) => denormalizeSqliteValue(row[key]));
        let where = '';
        const whereValues: unknown[] = [];

        if (Object.prototype.hasOwnProperty.call(row, '__rowid')) {
            if (identityRows[index]?.__rowid !== row.__rowid) {
                throw new Error('SQLite export cannot edit row identity.');
            }
            where = 'rowid = ?';
            whereValues.push(row.__rowid);
        } else if (primaryKeys.length > 0 && primaryKeys.every((key) => Object.prototype.hasOwnProperty.call(row, key))) {
            const identityRow = identityRows[index];
            if (identityRow && primaryKeys.some((key) => identityRow[key] !== row[key])) {
                throw new Error('SQLite export cannot edit primary keys.');
            }
            where = primaryKeys.map((key) => `${quoteIdentifier(key)} = ?`).join(' AND ');
            whereValues.push(...primaryKeys.map((key) => denormalizeSqliteValue(row[key])));
        } else {
            throw new Error('SQLite export only updates existing visible rows.');
        }

        const sql = `UPDATE ${quoteIdentifier(tableName)} SET ${updates
            .map((key) => `${quoteIdentifier(key)} = ?`)
            .join(', ')} WHERE ${where}`;
        const statement = db.prepare(sql);
        try {
            statement.run([...values, ...whereValues]);
        } finally {
            statement.free();
        }
    }
}

function denormalizeSqliteValue(value: unknown): unknown {
    if (Array.isArray(value) && value.every((item) => Number.isInteger(item) && item >= 0 && item <= 255)) {
        return Uint8Array.from(value as number[]);
    }
    return value;
}

function extractGenericPayload(input: unknown): unknown {
    if (
        input &&
        typeof input === 'object' &&
        Object.prototype.hasOwnProperty.call(input as Record<string, unknown>, '_format') &&
        Object.prototype.hasOwnProperty.call(input as Record<string, unknown>, 'data')
    ) {
        return (input as GenericPayload).data;
    }
    return input;
}

function encodeCbor(value: unknown): Uint8Array {
    if (value === null || value === undefined) return Uint8Array.from([0xf6]);
    if (typeof value === 'boolean') return Uint8Array.from([value ? 0xf5 : 0xf4]);
    if (typeof value === 'number') {
        if (Number.isInteger(value)) {
            if (value >= 0) return encodeCborLength(0, value);
            return encodeCborLength(1, -1 - value);
        }
        const bytes = new Uint8Array(9);
        bytes[0] = 0xfb;
        new DataView(bytes.buffer).setFloat64(1, value, false);
        return bytes;
    }
    if (typeof value === 'string') {
        const bytes = new TextEncoder().encode(value);
        return concatBytes(encodeCborLength(3, bytes.length), bytes);
    }
    if (value instanceof Uint8Array) {
        return concatBytes(encodeCborLength(2, value.length), value);
    }
    if (Array.isArray(value)) {
        return concatBytes(
            encodeCborLength(4, value.length),
            ...value.map((item) => encodeCbor(item))
        );
    }
    if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>);
        return concatBytes(
            encodeCborLength(5, entries.length),
            ...entries.flatMap(([key, item]) => [encodeCbor(String(key)), encodeCbor(item)])
        );
    }
    return encodeCbor(String(value));
}

function encodeCborLength(major: number, length: number): Uint8Array {
    if (!Number.isSafeInteger(length) || length < 0) throw new Error('Unsupported CBOR length.');
    const head = major << 5;
    if (length < 24) return Uint8Array.from([head | length]);
    if (length <= 0xff) return Uint8Array.from([head | 24, length]);
    if (length <= 0xffff) return Uint8Array.from([head | 25, length >> 8, length & 0xff]);
    if (length <= 0xffffffff) {
        return Uint8Array.from([
            head | 26,
            (length >>> 24) & 0xff,
            (length >>> 16) & 0xff,
            (length >>> 8) & 0xff,
            length & 0xff,
        ]);
    }
    throw new Error('CBOR values larger than 4GB are not supported in-browser.');
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.length;
    }
    return out;
}

function buildCfg(
    source: string,
    payload: unknown,
    formatValue: (value: unknown) => string = formatCfgValue,
    label = 'CFG'
): string {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error(`${label} export requires an object grouped by section.`);
    }

    const data = payload as Record<string, Record<string, unknown>>;
    const original = parseCfg(source);
    const newline = source.includes('\r\n') ? '\r\n' : '\n';
    const lines = source.split(/\r?\n/);
    const output: string[] = [];
    const emitted = new Set<string>();
    let section = 'default';

    for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        const sectionMatch = trimmed.match(/^\[(.+)]$/);
        if (sectionMatch) {
            section = sectionMatch[1].trim();
            output.push(rawLine);
            continue;
        }

        const keyMatch = rawLine.match(/^(\s*[^=]+?)(\s*=\s*)(.*)$/);
        if (!keyMatch || !trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
            output.push(rawLine);
            continue;
        }

        const key = keyMatch[1].trim();
        const sectionData = data[section];
        if (!sectionData || !Object.prototype.hasOwnProperty.call(sectionData, key)) {
            throw new Error(`${label} export cannot delete existing keys.`);
        }

        emitted.add(`${section}\u0000${key}`);
        if (Object.is((original as any)[section]?.[key], sectionData[key])) {
            output.push(rawLine);
        } else {
            output.push(`${keyMatch[1]}${keyMatch[2]}${formatValue(sectionData[key])}`);
        }
    }

    for (const [sectionName, sectionData] of Object.entries(data)) {
        if (!sectionData || typeof sectionData !== 'object' || Array.isArray(sectionData)) continue;
        const missingEntries = Object.entries(sectionData).filter(([key]) => !emitted.has(`${sectionName}\u0000${key}`));
        if (missingEntries.length === 0) continue;
        if (output.length > 0 && output[output.length - 1] !== '') output.push('');
        if (sectionName !== 'default') output.push(`[${sectionName}]`);
        for (const [key, value] of missingEntries) {
            output.push(`${key}=${formatValue(value)}`);
        }
    }

    const text = output.join(newline);
    return source.endsWith('\n') || source.endsWith('\r\n') ? text : text.replace(/(\r?\n)+$/, '');
}

function formatCfgValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value);
}

function formatTomlValue(value: unknown): string {
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return JSON.stringify(value);
    return JSON.stringify(value ?? '');
}

function buildProperties(source: string, payload: unknown): string {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('Properties export requires a flat object.');
    }

    const data = payload as Record<string, unknown>;
    const newline = source.includes('\r\n') ? '\r\n' : '\n';
    const lines = source.split(/\r?\n/);
    const output: string[] = [];
    const emitted = new Set<string>();

    for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        const idx = findKeyValueDelimiter(rawLine);
        if (idx === -1 || !trimmed || trimmed.startsWith('#') || trimmed.startsWith(';') || trimmed.startsWith('!')) {
            output.push(rawLine);
            continue;
        }

        const key = rawLine.slice(0, idx).trim();
        if (!Object.prototype.hasOwnProperty.call(data, key)) {
            throw new Error('Properties export cannot delete existing keys.');
        }
        emitted.add(key);
        output.push(`${rawLine.slice(0, idx + 1)}${formatCfgValue(data[key])}`);
    }

    const missingEntries = Object.entries(data).filter(([key]) => !emitted.has(key));
    if (missingEntries.length > 0 && output.length > 0 && output[output.length - 1] !== '') output.push('');
    for (const [key, value] of missingEntries) {
        output.push(`${key}=${formatCfgValue(value)}`);
    }

    const text = output.join(newline);
    return source.endsWith('\n') || source.endsWith('\r\n') ? text : text.replace(/(\r?\n)+$/, '');
}

function findKeyValueDelimiter(line: string): number {
    const equals = line.indexOf('=');
    const colon = line.indexOf(':');
    if (equals === -1) return colon;
    if (colon === -1) return equals;
    return Math.min(equals, colon);
}

function buildCsv(payload: unknown, delimiter: ',' | '\t'): string {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('CSV export requires parsed table data.');
    }
    const { columns, rows } = payload as { columns?: unknown; rows?: unknown };
    if (!Array.isArray(columns) || !columns.every((column) => typeof column === 'string') || !Array.isArray(rows)) {
        throw new Error('CSV export requires columns and rows.');
    }

    const out = [
        columns.map((column) => encodeCsvCell(column, delimiter)).join(delimiter),
        ...rows.map((row) => {
            if (!row || typeof row !== 'object' || Array.isArray(row)) {
                throw new Error('CSV export rows must be objects.');
            }
            return columns.map((column) => encodeCsvCell(String((row as Record<string, unknown>)[column] ?? ''), delimiter)).join(delimiter);
        }),
    ];
    return `${out.join('\n')}\n`;
}

function encodeCsvCell(value: string, delimiter: ',' | '\t'): string {
    if (value.includes('"') || value.includes('\n') || value.includes('\r') || value.includes(delimiter)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}
