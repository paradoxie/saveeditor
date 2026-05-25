import msgpack from 'msgpack-lite';
import pickleparser from 'pickleparser';
import { makeOutcome, type ParseOutcome } from './types';

type GenericPayload = {
    _format: string;
    _readOnly: true;
    _summary: Record<string, unknown>;
    data?: unknown;
};

const textDecoder = new TextDecoder('utf-8', { fatal: false });

function extOf(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
}

function readUint32(bytes: Uint8Array, offset: number): number {
    return ((bytes[offset] || 0) << 24) | ((bytes[offset + 1] || 0) << 16) | ((bytes[offset + 2] || 0) << 8) | (bytes[offset + 3] || 0);
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
        const num = Number(raw);
        result[section][key] = raw === 'true' ? true : raw === 'false' ? false : Number.isFinite(num) && raw !== '' ? num : raw;
    }

    return result;
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
    const binaryFormatterHeader =
        bytes.length >= 8 &&
        bytes[0] === 0x00 &&
        bytes[1] === 0x01 &&
        bytes[2] === 0x00 &&
        bytes[3] === 0x00 &&
        bytes[4] === 0x00 &&
        bytes[5] === 0xff &&
        bytes[6] === 0xff &&
        bytes[7] === 0xff;
    return binaryFormatterHeader || text.includes('System.') || text.includes('BinaryFormatter');
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
            return readonlyOutcome('generic-msgpack', {
                _format: 'MessagePack',
                _readOnly: true,
                _summary: summary,
                data: msgpack.decode(bytes as any),
            }, 'MessagePack was decoded for inspection. Safe rebuild is not enabled yet.');
        }

        if (ext === 'cbor') {
            return readonlyOutcome('generic-cbor', {
                _format: 'CBOR',
                _readOnly: true,
                _summary: summary,
                data: basicCborDecode(bytes),
            }, 'CBOR was decoded for inspection. Safe rebuild is not enabled yet.');
        }

        if (ext === 'pkl' || ext === 'pickle') {
            const parser = new pickleparser.Parser();
            return readonlyOutcome('generic-pickle', {
                _format: 'Python Pickle',
                _readOnly: true,
                _summary: summary,
                data: parser.parse(bytes),
            }, 'Python pickle was decoded for inspection only.');
        }

        if (ext === 'cfg') {
            return readonlyOutcome('generic-godot-cfg', {
                _format: 'Godot / INI-style CFG',
                _readOnly: true,
                _summary: summary,
                data: parseCfg(text),
            }, 'CFG data was parsed for inspection. Save export is disabled until source-preserving rebuild is available.');
        }

        if (ext === 'db' || ext === 'sqlite' || text.startsWith('SQLite format 3')) {
            return readonlyOutcome('generic-sqlite', {
                _format: 'SQLite database',
                _readOnly: true,
                _summary: { ...summary, recognizedHeader: 'sqlite' },
                data: parseSqliteMaster(bytes),
            }, 'SQLite schema was decoded for inspection. Browser-side table editing is not enabled yet.');
        }

        if (ext === 'sol') {
            return readonlyOutcome('generic-sol', {
                _format: 'Flash SharedObject',
                _readOnly: true,
                _summary: { ...summary, recognizedHeader: 'flash-shared-object' },
            }, 'Flash SharedObject files are recognized in read-only mode.');
        }

        if (ext === 'nrbf' || ext === 'bytes' || looksLikeNrbf(bytes, text)) {
            return readonlyOutcome('generic-nrbf', {
                _format: '.NET BinaryFormatter / NRBF candidate',
                _readOnly: true,
                _summary: { ...summary, recognizedHeader: 'nrbf-candidate' },
            }, 'NRBF/BinaryFormatter data is recognized for inspection only. Safe write support requires game-specific fixtures.');
        }

        if (ext === 'es3' || ext === 'dat') {
            return readonlyOutcome('generic-binary-serialization', {
                _format: ext === 'es3' ? 'Easy Save 3 / Unity serialization candidate' : '.NET / custom binary serialization candidate',
                _readOnly: true,
                _summary: { ...summary, recognizedHeader: ext === 'es3' ? 'easy-save-3-candidate' : 'custom-binary-candidate' },
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

export async function buildGeneric(): Promise<Blob> {
    throw new Error('Generic read-only formats cannot be rebuilt safely yet.');
}
