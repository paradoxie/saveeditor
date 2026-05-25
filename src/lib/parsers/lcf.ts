export interface LcfNameMaps {
    items: Record<string, string>;
    weapons: Record<string, string>;
    armors: Record<string, string>;
    actors: Record<string, string>;
    variables: Record<string, string>;
    switches: Record<string, string>;
    maps: Record<string, string>;
}

interface LcfChunk {
    id: number;
    payload: Uint8Array;
}

interface LcfFile {
    header: string;
    chunks: LcfChunk[];
}

const lcfTextDecoder = new TextDecoder('shift-jis', { fatal: false });
const lcfTextEncoder = new TextEncoder();

const LSD_HEADER = 'LcfSaveData';
const LDB_HEADER = 'LcfDataBase';

const LSD_SYSTEM = 0x65;
const LSD_ACTORS = 0x6c;
const LSD_INVENTORY = 0x6d;

const SYS_SWITCHES_SIZE = 0x1f;
const SYS_SWITCHES = 0x20;
const SYS_VARIABLES_SIZE = 0x21;
const SYS_VARIABLES = 0x22;

const ACTOR_LEVEL = 0x1f;
const ACTOR_EXP = 0x20;
const ACTOR_HP_MOD = 0x21;
const ACTOR_SP_MOD = 0x22;
const ACTOR_ATTACK_MOD = 0x29;
const ACTOR_DEFENSE_MOD = 0x2a;
const ACTOR_SPIRIT_MOD = 0x2b;
const ACTOR_AGILITY_MOD = 0x2c;
const ACTOR_CURRENT_HP = 0x47;
const ACTOR_CURRENT_SP = 0x48;

const INV_ITEM_IDS_SIZE = 0x0b;
const INV_ITEM_IDS = 0x0c;
const INV_ITEM_COUNTS = 0x0d;
const INV_ITEM_USAGE = 0x0e;
const INV_GOLD = 0x15;

const LDB_ITEMS = 0x0d;
const LDB_ACTORS = 0x0b;
const LDB_SWITCHES = 0x17;
const LDB_VARIABLES = 0x18;
const LDB_ITEM_NAME = 0x01;
const LDB_ITEM_TYPE = 0x03;

export function parseLcfSave(bytes: Uint8Array, fileName: string): any {
    const file = parseLcfFile(bytes, LSD_HEADER);
    const systemChunk = findChunk(file.chunks, LSD_SYSTEM);
    const inventoryChunk = findChunk(file.chunks, LSD_INVENTORY);
    const system = systemChunk ? parseChunkList(systemChunk.payload) : [];
    const inventory = inventoryChunk ? parseChunkList(inventoryChunk.payload) : [];
    const actors = parseObjectArray(findChunk(file.chunks, LSD_ACTORS)?.payload ?? new Uint8Array());
    const editable = [
        hasChunk(inventory, INV_GOLD) ? 'gold' : '',
        hasChunk(inventory, INV_ITEM_IDS_SIZE) && hasChunk(inventory, INV_ITEM_IDS) && hasChunk(inventory, INV_ITEM_COUNTS) && hasChunk(inventory, INV_ITEM_USAGE) ? 'items' : '',
        hasChunk(system, SYS_VARIABLES_SIZE) && hasChunk(system, SYS_VARIABLES) ? 'variables' : '',
        hasChunk(system, SYS_SWITCHES_SIZE) && hasChunk(system, SYS_SWITCHES) ? 'switches' : '',
        actors.length > 0 ? 'actors' : '',
    ].filter(Boolean);

    const itemIds = readInt16Array(findChunk(inventory, INV_ITEM_IDS)?.payload ?? new Uint8Array());
    const itemCounts = Array.from(findChunk(inventory, INV_ITEM_COUNTS)?.payload ?? new Uint8Array());
    const items = Object.fromEntries(itemIds.map((id, index) => [String(id), itemCounts[index] ?? 0]));
    const variables = readInt32Array(findChunk(system, SYS_VARIABLES)?.payload ?? new Uint8Array());
    const switches = Array.from(findChunk(system, SYS_SWITCHES)?.payload ?? new Uint8Array()).map(Boolean);

    const actorRows = actors.map((entry) => {
        const chunks = parseChunkList(entry.payload);
        return {
            _actorId: entry.index,
            _name: `Actor #${entry.index}`,
            _level: readNumberChunk(chunks, ACTOR_LEVEL, 1),
            _exp: readNumberChunk(chunks, ACTOR_EXP, 0),
            _hp: readNumberChunk(chunks, ACTOR_CURRENT_HP, 0),
            _mp: readNumberChunk(chunks, ACTOR_CURRENT_SP, 0),
            _paramPlus: [
                readNumberChunk(chunks, ACTOR_HP_MOD, 0),
                readNumberChunk(chunks, ACTOR_SP_MOD, 0),
                readNumberChunk(chunks, ACTOR_ATTACK_MOD, 0),
                readNumberChunk(chunks, ACTOR_DEFENSE_MOD, 0),
                readNumberChunk(chunks, ACTOR_SPIRIT_MOD, 0),
                0,
                readNumberChunk(chunks, ACTOR_AGILITY_MOD, 0),
                0,
            ],
        };
    });

    const actorData: any[] = [null];
    for (const actor of actorRows) actorData[actor._actorId] = actor;

    return {
        _format: 'RPG Maker 2000/2003 LSD',
        _sourceFile: fileName,
        _limitedWrite: true,
        _lcf: {
            header: file.header,
            chunkIds: file.chunks.map((chunk) => chunk.id),
            editable,
            missingChunks: [
                systemChunk ? '' : 'SaveSystem',
                inventoryChunk ? '' : 'SaveInventory',
            ].filter(Boolean),
        },
        gold: readNumberChunk(inventory, INV_GOLD, 0),
        party: {
            _gold: readNumberChunk(inventory, INV_GOLD, 0),
            _items: items,
        },
        _items: items,
        variables,
        switches,
        actors: {
            _data: actorData,
        },
    };
}

export function buildLcfSave(sourceBytes: Uint8Array, input: any): Uint8Array {
    const file = parseLcfFile(sourceBytes, LSD_HEADER);
    const root = input?.data && input?._format ? input.data : input;
    if (!root || typeof root !== 'object') throw new Error('No RPG Maker 2000/2003 payload found.');

    updateNestedChunks(file.chunks, LSD_SYSTEM, (system) => {
        const variables = Array.isArray(root.variables) ? root.variables : Array.isArray(root._variables) ? root._variables : null;
        if (variables && hasChunk(system, SYS_VARIABLES_SIZE) && hasChunk(system, SYS_VARIABLES)) {
            setExistingChunk(system, SYS_VARIABLES_SIZE, encodeBer(variables.length));
            setExistingChunk(system, SYS_VARIABLES, writeInt32Array(variables.map((value: any) => Number(value) || 0)));
        }

        const switches = Array.isArray(root.switches) ? root.switches : Array.isArray(root._switches) ? root._switches : null;
        if (switches && hasChunk(system, SYS_SWITCHES_SIZE) && hasChunk(system, SYS_SWITCHES)) {
            setExistingChunk(system, SYS_SWITCHES_SIZE, encodeBer(switches.length));
            setExistingChunk(system, SYS_SWITCHES, new Uint8Array(switches.map((value: any) => (value ? 1 : 0))));
        }
    });

    updateNestedChunks(file.chunks, LSD_INVENTORY, (inventory) => {
        const gold = Number(root.party?._gold ?? root.party?.gold ?? root.gold ?? 0);
        if (hasChunk(inventory, INV_GOLD)) {
            setExistingChunk(inventory, INV_GOLD, encodeBer(Math.max(0, Math.trunc(gold))));
        }

        const items = root.party?._items ?? root.party?.items ?? root._items ?? root.items;
        if (
            items &&
            typeof items === 'object' &&
            hasChunk(inventory, INV_ITEM_IDS_SIZE) &&
            hasChunk(inventory, INV_ITEM_IDS) &&
            hasChunk(inventory, INV_ITEM_COUNTS) &&
            hasChunk(inventory, INV_ITEM_USAGE)
        ) {
            const ids = Object.keys(items)
                .map((key) => Number.parseInt(key, 10))
                .filter((id) => Number.isInteger(id) && id > 0 && id <= 0xffff)
                .sort((a, b) => a - b);
            setExistingChunk(inventory, INV_ITEM_IDS_SIZE, encodeBer(ids.length));
            setExistingChunk(inventory, INV_ITEM_IDS, writeInt16Array(ids));
            setExistingChunk(inventory, INV_ITEM_COUNTS, new Uint8Array(ids.map((id) => clampByte(Number(items[String(id)]) || 0))));
            const oldUsage = Array.from(findChunk(inventory, INV_ITEM_USAGE)?.payload ?? new Uint8Array());
            setExistingChunk(inventory, INV_ITEM_USAGE, new Uint8Array(ids.map((_, index) => oldUsage[index] ?? 0)));
        }
    });

    updateObjectArray(file.chunks, LSD_ACTORS, (actorId, chunks) => {
        const actor = root.actors?._data?.[actorId] ?? root._actors?._data?.[actorId];
        if (!actor) return;
        setNumberChunk(chunks, ACTOR_LEVEL, Math.max(1, Math.trunc(Number(actor._level ?? actor.level ?? 1))));
        setNumberChunk(chunks, ACTOR_EXP, Math.max(0, Math.trunc(Number(readActorExp(actor, actorId)))));
        setNumberChunk(chunks, ACTOR_CURRENT_HP, Math.max(0, Math.trunc(Number(actor._hp ?? 0))));
        setNumberChunk(chunks, ACTOR_CURRENT_SP, Math.max(0, Math.trunc(Number(actor._mp ?? 0))));
        const params = Array.isArray(actor._paramPlus) ? actor._paramPlus : [];
        setNumberChunk(chunks, ACTOR_HP_MOD, Math.trunc(Number(params[0] ?? 0)));
        setNumberChunk(chunks, ACTOR_SP_MOD, Math.trunc(Number(params[1] ?? 0)));
        setNumberChunk(chunks, ACTOR_ATTACK_MOD, Math.trunc(Number(params[2] ?? 0)));
        setNumberChunk(chunks, ACTOR_DEFENSE_MOD, Math.trunc(Number(params[3] ?? 0)));
        setNumberChunk(chunks, ACTOR_SPIRIT_MOD, Math.trunc(Number(params[4] ?? 0)));
        setNumberChunk(chunks, ACTOR_AGILITY_MOD, Math.trunc(Number(params[6] ?? 0)));
    });

    return writeLcfFile(file);
}

export function parseLcfDatabaseNames(bytes: Uint8Array): Partial<LcfNameMaps> {
    const file = parseLcfFile(bytes, LDB_HEADER);
    const itemMaps = parseItemNameMaps(findChunk(file.chunks, LDB_ITEMS)?.payload ?? new Uint8Array());
    return {
        items: itemMaps.items,
        weapons: itemMaps.weapons,
        armors: itemMaps.armors,
        actors: parseNameArray(findChunk(file.chunks, LDB_ACTORS)?.payload ?? new Uint8Array()),
        switches: parseNameArray(findChunk(file.chunks, LDB_SWITCHES)?.payload ?? new Uint8Array()),
        variables: parseNameArray(findChunk(file.chunks, LDB_VARIABLES)?.payload ?? new Uint8Array()),
    };
}

function parseLcfFile(bytes: Uint8Array, expectedHeader: string): LcfFile {
    const headerLength = bytes[0];
    const headerStart = 1;
    const headerEnd = headerStart + headerLength;
    if (!headerLength || headerEnd > bytes.length) throw new Error('Invalid LCF header.');
    const header = lcfTextDecoder.decode(bytes.slice(headerStart, headerEnd));
    if (header !== expectedHeader) throw new Error(`Expected ${expectedHeader}.`);
    return {
        header,
        chunks: parseChunkList(bytes.slice(headerEnd)),
    };
}

function writeLcfFile(file: LcfFile): Uint8Array {
    const header = lcfTextEncoder.encode(file.header);
    const body = writeChunkList(file.chunks);
    const output = new Uint8Array(1 + header.length + body.length);
    output[0] = header.length;
    output.set(header, 1);
    output.set(body, 1 + header.length);
    return output;
}

function parseChunkList(bytes: Uint8Array): LcfChunk[] {
    const chunks: LcfChunk[] = [];
    let offset = 0;
    while (offset < bytes.length) {
        const idRead = readBer(bytes, offset);
        offset = idRead.offset;
        if (idRead.value === 0 && offset >= bytes.length) break;
        const sizeRead = readBer(bytes, offset);
        offset = sizeRead.offset;
        const end = offset + sizeRead.value;
        if (end > bytes.length) throw new Error('LCF chunk exceeds payload length.');
        chunks.push({ id: idRead.value, payload: bytes.slice(offset, end) });
        offset = end;
    }
    return chunks;
}

function writeChunkList(chunks: LcfChunk[]): Uint8Array {
    const parts = chunks.flatMap((chunk) => [encodeBer(chunk.id), encodeBer(chunk.payload.length), chunk.payload]);
    return concatBytes(parts);
}

function parseObjectArray(bytes: Uint8Array): Array<{ index: number; payload: Uint8Array }> {
    if (bytes.length === 0) return [];
    let offset = 0;
    const countRead = readBer(bytes, offset);
    const count = countRead.value;
    offset = countRead.offset;
    const result: Array<{ index: number; payload: Uint8Array }> = [];
    for (let i = 0; i < count && offset < bytes.length; i += 1) {
        const indexRead = readBer(bytes, offset);
        offset = indexRead.offset;
        const sizeRead = readBer(bytes, offset);
        offset = sizeRead.offset;
        const end = offset + sizeRead.value;
        if (end > bytes.length) throw new Error('LCF array item exceeds payload length.');
        result.push({ index: indexRead.value, payload: bytes.slice(offset, end) });
        offset = end;
    }
    return result;
}

function writeObjectArray(items: Array<{ index: number; payload: Uint8Array }>): Uint8Array {
    const parts: Uint8Array[] = [encodeBer(items.length)];
    for (const item of items) {
        parts.push(encodeBer(item.index), encodeBer(item.payload.length), item.payload);
    }
    return concatBytes(parts);
}

function updateObjectArray(chunks: LcfChunk[], id: number, updater: (index: number, chunks: LcfChunk[]) => void): void {
    const chunk = findChunk(chunks, id);
    if (!chunk) return;
    const items = parseObjectArray(chunk.payload);
    for (const item of items) {
        const itemChunks = parseChunkList(item.payload);
        updater(item.index, itemChunks);
        item.payload = writeChunkList(itemChunks);
    }
    chunk.payload = writeObjectArray(items);
}

function parseNameArray(bytes: Uint8Array): Record<string, string> {
    const result: Record<string, string> = {};
    for (const entry of parseObjectArray(bytes)) {
        const nameChunk = findChunk(parseChunkList(entry.payload), 0x01);
        if (nameChunk) result[String(entry.index)] = readString(nameChunk.payload);
    }
    return result;
}

function updateNestedChunks(chunks: LcfChunk[], id: number, updater: (nested: LcfChunk[]) => void): void {
    const chunk = findChunk(chunks, id);
    if (!chunk) return;
    const nested = parseChunkList(chunk.payload);
    updater(nested);
    chunk.payload = writeChunkList(nested);
}

function findChunk(chunks: LcfChunk[], id: number): LcfChunk | undefined {
    return chunks.find((chunk) => chunk.id === id);
}

function hasChunk(chunks: LcfChunk[], id: number): boolean {
    return Boolean(findChunk(chunks, id));
}

function requireChunk(chunks: LcfChunk[], id: number, label: string): LcfChunk {
    const chunk = findChunk(chunks, id);
    if (!chunk) throw new Error(`Missing ${label} chunk.`);
    return chunk;
}

function setChunk(chunks: LcfChunk[], id: number, payload: Uint8Array): void {
    const existing = findChunk(chunks, id);
    if (existing) existing.payload = payload;
    else chunks.push({ id, payload });
}

function setExistingChunk(chunks: LcfChunk[], id: number, payload: Uint8Array): void {
    const existing = findChunk(chunks, id);
    if (!existing) throw new Error(`LCF field 0x${id.toString(16)} is missing in the source file.`);
    existing.payload = payload;
}

function setNumberChunk(chunks: LcfChunk[], id: number, value: number): void {
    if (!findChunk(chunks, id)) return;
    setExistingChunk(chunks, id, encodeBer(Math.max(0, Math.trunc(value))));
}

function readNumberChunk(chunks: LcfChunk[], id: number, fallback: number): number {
    const chunk = findChunk(chunks, id);
    if (!chunk || chunk.payload.length === 0) return fallback;
    try {
        return readBer(chunk.payload, 0).value;
    } catch {
        return fallback;
    }
}

function readBer(bytes: Uint8Array, start: number): { value: number; offset: number } {
    let value = 0;
    let offset = start;
    while (offset < bytes.length) {
        const current = bytes[offset++];
        value = (value << 7) | (current & 0x7f);
        if ((current & 0x80) === 0) return { value, offset };
    }
    throw new Error('Unexpected end of LCF BER number.');
}

function encodeBer(input: number): Uint8Array {
    const value = Math.max(0, Math.trunc(input));
    const parts = [value & 0x7f];
    let rest = value >> 7;
    while (rest > 0) {
        parts.unshift((rest & 0x7f) | 0x80);
        rest >>= 7;
    }
    return new Uint8Array(parts);
}

function readInt16Array(bytes: Uint8Array): number[] {
    const result: number[] = [];
    for (let offset = 0; offset + 1 < bytes.length; offset += 2) {
        result.push(bytes[offset] | (bytes[offset + 1] << 8));
    }
    return result;
}

function writeInt16Array(values: number[]): Uint8Array {
    const bytes = new Uint8Array(values.length * 2);
    values.forEach((value, index) => {
        bytes[index * 2] = value & 0xff;
        bytes[index * 2 + 1] = (value >> 8) & 0xff;
    });
    return bytes;
}

function readInt32Array(bytes: Uint8Array): number[] {
    const result: number[] = [];
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let offset = 0; offset + 3 < bytes.length; offset += 4) {
        result.push(view.getInt32(offset, true));
    }
    return result;
}

function writeInt32Array(values: number[]): Uint8Array {
    const bytes = new Uint8Array(values.length * 4);
    const view = new DataView(bytes.buffer);
    values.forEach((value, index) => view.setInt32(index * 4, Math.trunc(value), true));
    return bytes;
}

function readString(bytes: Uint8Array): string {
    const length = readBer(bytes, 0);
    return lcfTextDecoder.decode(bytes.slice(length.offset, length.offset + length.value));
}

function parseItemNameMaps(bytes: Uint8Array): Pick<LcfNameMaps, 'items' | 'weapons' | 'armors'> {
    const maps = { items: {}, weapons: {}, armors: {} } as Pick<LcfNameMaps, 'items' | 'weapons' | 'armors'>;
    for (const entry of parseObjectArray(bytes)) {
        const chunks = parseChunkList(entry.payload);
        const nameChunk = findChunk(chunks, LDB_ITEM_NAME);
        if (!nameChunk) continue;
        const name = readString(nameChunk.payload);
        const type = readNumberChunk(chunks, LDB_ITEM_TYPE, 0);
        if (type === 1) maps.weapons[String(entry.index)] = name;
        else if (type >= 2 && type <= 5) maps.armors[String(entry.index)] = name;
        else maps.items[String(entry.index)] = name;
    }
    return maps;
}

function readActorExp(actor: any, actorId: number): number {
    if (typeof actor?._exp === 'number') return actor._exp;
    if (typeof actor?.exp === 'number') return actor.exp;
    if (actor?._exp && typeof actor._exp === 'object') return Number(actor._exp[actorId] ?? 0);
    return 0;
}

function clampByte(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(255, Math.trunc(value)));
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
    const size = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
        output.set(part, offset);
        offset += part.length;
    }
    return output;
}
