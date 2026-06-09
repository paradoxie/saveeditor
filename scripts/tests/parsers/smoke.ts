import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { deserialize as deserializeBson, EJSON, serialize as serializeBson } from 'bson';
import compressjs from 'compressjs';
import * as fflate from 'fflate';
import LZString from 'lz-string';
import * as lz4 from 'lz4js';
import pako from 'pako';
import { serializeBplist } from 'bplist-lossless';
import { compress as compressZstd, init as initZstd } from '@bokuweb/zstd-wasm';
import { pickleSerialize } from '../../../src/lib/parsers/pickle-serializer';
import { buildGamemaker, parseGamemaker } from '../../../src/lib/parsers/gamemaker';
import { buildNaniNovel, parseNaniNovel, type NaniNovelFormat } from '../../../src/lib/parsers/naninovel';
import { parsePalworld, buildPalworld } from '../../../src/lib/parsers/palworld';
import { buildGeneric, parseGeneric } from '../../../src/lib/parsers/generic';
import { buildRenpy, parseRenpy } from '../../../src/lib/parsers/renpy';
import { buildRPGMakerMV, parseRPGMakerMV } from '../../../src/lib/parsers/rpgmaker';
import { parseLcfDatabaseNames } from '../../../src/lib/parsers/lcf';
import { buildUnity, parseUnity } from '../../../src/lib/parsers/unity';
import { buildUnreal, parseUnreal } from '../../../src/lib/parsers/unreal';

interface FixtureData {
    rpgmaker: { base: any };
    unity: { xml: string };
    renpy: { base: any };
    gamemaker: { json: any };
    naninovel: { base: any };
}

function makeFile(name: string, bytes: Uint8Array, type = 'application/octet-stream'): File {
    return {
        name,
        size: bytes.byteLength,
        type,
        async arrayBuffer() {
            return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        },
        async text() {
            return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        },
    } as unknown as File;
}

function makeTextFile(name: string, text: string, type = 'text/plain'): File {
    const bytes = new TextEncoder().encode(text);
    return makeFile(name, bytes, type);
}

let zstdReady: Promise<void> | null = null;

async function zstdCompress(bytes: Uint8Array): Promise<Uint8Array> {
    zstdReady ||= initZstd();
    await zstdReady;
    return Uint8Array.from(compressZstd(bytes, 3));
}

async function blobToFile(name: string, blob: Blob): Promise<File> {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return makeFile(name, bytes, blob.type || 'application/octet-stream');
}

async function loadFixtures(): Promise<FixtureData> {
    const fixturePath = path.resolve(process.cwd(), 'scripts/fixtures/parsers/cases.json');
    const raw = await fs.readFile(fixturePath, 'utf8');
    return JSON.parse(raw) as FixtureData;
}

async function makeSqliteFile(name = 'save.sqlite'): Promise<File> {
    const initSqlJs = (await import('sql.js/dist/sql-wasm.js')).default;
    const SQL = await initSqlJs({
        locateFile: (file: string) => new URL(`../../../node_modules/sql.js/dist/${file}`, import.meta.url).pathname,
    });
    const db = new SQL.Database();
    db.run('CREATE TABLE player (id INTEGER PRIMARY KEY, gold INTEGER, name TEXT, clear INTEGER)');
    db.run('INSERT INTO player (gold, name, clear) VALUES (?, ?, ?)', [1234, 'Hero', 1]);
    const bytes = db.export();
    db.close();
    return makeFile(name, bytes);
}

function makeSolFile(name = 'save.sol', values: Record<string, unknown> = { gold: 1234, clear: true, hero: 'Ada' }): File {
    const sharedName = new TextEncoder().encode('save');
    const body = solConcat([
        Uint8Array.from([0x54, 0x43, 0x53, 0x4f, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00]),
        solU16(sharedName.length),
        sharedName,
        Uint8Array.from([0x00, 0x00, 0x00, 0x00]),
        ...Object.entries(values).map(([key, value]) => solConcat([solUtf(key), solAmf(value)])),
        Uint8Array.from([0x00, 0x00, 0x09]),
    ]);
    return makeFile(name, solConcat([Uint8Array.from([0x00, 0xbf]), solU32(body.length), body]));
}

function makeUnsupportedSolFile(name = 'save.sol'): File {
    const sharedName = new TextEncoder().encode('save');
    const body = solConcat([
        Uint8Array.from([0x54, 0x43, 0x53, 0x4f, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00]),
        solU16(sharedName.length),
        sharedName,
        Uint8Array.from([0x00, 0x00, 0x00, 0x00]),
        solUtf('amf3'),
        Uint8Array.from([0x11]),
        Uint8Array.from([0x00, 0x00, 0x09]),
    ]);
    return makeFile(name, solConcat([Uint8Array.from([0x00, 0xbf]), solU32(body.length), body]));
}

function solUtf(value: string): Uint8Array {
    const bytes = new TextEncoder().encode(value);
    return solConcat([solU16(bytes.length), bytes]);
}

function solAmf(value: unknown): Uint8Array {
    if (typeof value === 'number') {
        const bytes = new Uint8Array(9);
        bytes[0] = 0x00;
        new DataView(bytes.buffer).setFloat64(1, value, false);
        return bytes;
    }
    if (typeof value === 'boolean') return Uint8Array.from([0x01, value ? 1 : 0]);
    const bytes = new TextEncoder().encode(String(value ?? ''));
    return solConcat([Uint8Array.from([0x02]), solU16(bytes.length), bytes]);
}

function solU16(value: number): Uint8Array {
    return Uint8Array.from([(value >> 8) & 0xff, value & 0xff]);
}

function solU32(value: number): Uint8Array {
    return Uint8Array.from([(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]);
}

function solConcat(parts: Uint8Array[]): Uint8Array {
    const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

async function testRpgMaker(fixtures: FixtureData) {
    const payload = fixtures.rpgmaker.base;
    const compressed = LZString.compressToBase64(JSON.stringify(payload));
    const file = makeTextFile('slot1.rpgsave', compressed);

    const parsed = await parseRPGMakerMV(file);
    assert.equal(parsed.capabilities.canView, true);
    assert.equal(parsed.reasonCode, 'ok');
    assert.equal(parsed.data?.gold, 1234);

    const rubyMarshalBytes = makeRubyMarshalFixture();
    const legacyFile = makeFile('Save01.rvdata2', rubyMarshalBytes);
    const legacy = await parseRPGMakerMV(legacyFile);
    assert.equal(legacy.capabilities.canView, true);
    assert.equal(legacy.capabilities.canSave, true);
    assert.equal(legacy.capabilities.roundTripSupport, 'stable-limited');
    assert.equal(legacy.format, 'rpgmaker-ruby-marshal');
    assert.equal((legacy.data as any)?.data?._gold, 1234);

    const unchangedLegacy = await buildRPGMakerMV(legacyFile, legacy.data);
    assert.deepEqual(new Uint8Array(await unchangedLegacy.arrayBuffer()), rubyMarshalBytes);

    const editedLegacy = JSON.parse(JSON.stringify(legacy.data));
    editedLegacy.data._gold = 7777;
    editedLegacy.data._items['1'] = 99;
    editedLegacy.data._items['2'] = 44;
    const rebuiltLegacy = await buildRPGMakerMV(legacyFile, editedLegacy);
    const reparsedLegacy = await parseRPGMakerMV(await blobToFile('Save01.rvdata2', rebuiltLegacy));
    assert.equal((reparsedLegacy.data as any)?.data?._gold, 7777);
    assert.equal((reparsedLegacy.data as any)?.data?._items?.['1'], 99);
    assert.equal((reparsedLegacy.data as any)?.data?._items?.['2'], 44);

    const classChange = JSON.parse(JSON.stringify(legacy.data));
    classChange.data.__rubyClass = 'Other_Class';
    await assert.rejects(() => buildRPGMakerMV(legacyFile, classChange), /Ruby Marshal path is not supported/);

    const removedField = JSON.parse(JSON.stringify(legacy.data));
    delete removedField.data._items;
    await assert.rejects(() => buildRPGMakerMV(legacyFile, removedField), /Removing Ruby Marshal field/);

    const addedField = JSON.parse(JSON.stringify(legacy.data));
    addedField.data._debug = 1;
    await assert.rejects(() => buildRPGMakerMV(legacyFile, addedField), /Adding Ruby Marshal field/);

    const invalidItemAdd = JSON.parse(JSON.stringify(legacy.data));
    invalidItemAdd.data._items.potion = 1;
    await assert.rejects(() => buildRPGMakerMV(legacyFile, invalidItemAdd), /Adding Ruby Marshal field/);

    const linkedFile = makeFile('Save02.rvdata2', makeRubyMarshalLinkedFixture());
    const linked = await parseRPGMakerMV(linkedFile);
    const linkedReferenceEdit = JSON.parse(JSON.stringify(linked.data));
    linkedReferenceEdit.data._weapons = 'changed';
    await assert.rejects(() => buildRPGMakerMV(linkedFile, linkedReferenceEdit), /object references/);

    const linkedEdit = JSON.parse(JSON.stringify(linked.data));
    linkedEdit.data._items['1'] = 55;
    const rebuiltLinked = await buildRPGMakerMV(linkedFile, linkedEdit);
    const reparsedLinked = await parseRPGMakerMV(await blobToFile('Save02.rvdata2', rebuiltLinked));
    assert.equal((reparsedLinked.data as any)?.data?._items?.['1'], 55);
    assert.equal((reparsedLinked.data as any)?.data?._weapons, '<circular-reference>');

    const updated = { ...parsed.data, party: { ...parsed.data?.party, _gold: 9999 } };
    const rebuilt = await buildRPGMakerMV(file, updated);
    const reparsed = await parseRPGMakerMV(await blobToFile('slot1.rpgsave', rebuilt));
    assert.equal(reparsed.capabilities.canView, true);
    assert.equal(reparsed.data?.gold, 9999);
}

function makeRubyMarshalFixture(): Uint8Array {
    return Uint8Array.from([
        4, 8,
        ...rubyObject('Game_Party', [
            ['@gold', rubyInt(1234)],
            ['@items', rubyHash([[1, 2]])],
            ['@weapons', rubyHash([[1, 1]])],
            ['@armors', rubyHash([[1, 1]])],
            ['@variables', rubyArray([rubyNil(), rubyInt(5)])],
            ['@switches', rubyArray([rubyNil(), rubyTrue()])],
        ]),
    ]);
}

function makeRubyMarshalLinkedFixture(): Uint8Array {
    return Uint8Array.from([
        4, 8,
        ...rubyObject('Game_Party', [
            ['@gold', rubyInt(1234)],
            ['@items', rubyHash([[1, 2]])],
            ['@weapons', rubyObjectLink(1)],
        ]),
    ]);
}

function rubyObject(className: string, fields: Array<[string, number[]]>): number[] {
    return [
        'o'.charCodeAt(0),
        ...rubySymbol(className),
        ...rubyIntegerBytes(fields.length),
        ...fields.flatMap(([name, value]) => [...rubySymbol(name), ...value]),
    ];
}

function rubyHash(entries: Array<[number, number]>): number[] {
    return [
        '{'.charCodeAt(0),
        ...rubyIntegerBytes(entries.length),
        ...entries.flatMap(([key, value]) => [...rubyInt(key), ...rubyInt(value)]),
    ];
}

function rubyArray(values: number[][]): number[] {
    return ['['.charCodeAt(0), ...rubyIntegerBytes(values.length), ...values.flat()];
}

function rubySymbol(value: string): number[] {
    return [':'.charCodeAt(0), ...rubyStringBytes(value)];
}

function rubyInt(value: number): number[] {
    return ['i'.charCodeAt(0), ...rubyIntegerBytes(value)];
}

function rubyNil(): number[] {
    return ['0'.charCodeAt(0)];
}

function rubyTrue(): number[] {
    return ['T'.charCodeAt(0)];
}

function rubyObjectLink(index: number): number[] {
    return ['@'.charCodeAt(0), ...rubyIntegerBytes(index)];
}

function rubyStringBytes(value: string): number[] {
    const bytes = new TextEncoder().encode(value);
    return [...rubyIntegerBytes(bytes.length), ...bytes];
}

function rubyIntegerBytes(value: number): number[] {
    const n = Math.trunc(value);
    if (n === 0) return [0];
    if (n > 0 && n < 123) return [n + 5];
    if (n < 0 && n > -124) return [(n - 5) & 0xff];

    if (n > 0) {
        const bytes = integerBytes(n);
        return [bytes.length, ...bytes];
    }

    const bytes = integerBytes(n);
    return [(256 - bytes.length) & 0xff, ...bytes];
}

function integerBytes(value: number): number[] {
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

async function testUnity(fixtures: FixtureData) {
    const file = makeTextFile('player.xml', fixtures.unity.xml, 'application/xml');
    const parsed = await parseUnity(file);
    assert.equal(parsed.capabilities.canView, true);
    assert.equal(parsed.reasonCode, 'ok');
    assert.equal((parsed.data as any)?.gold, 100);

    const unsupported = await parseUnity(makeFile('prefs.dat', new Uint8Array([0, 1, 2, 3])));
    assert.equal(unsupported.capabilities.canView, false);
    assert.equal(unsupported.reasonCode, 'unsupported_binary_playerprefs');

    const rebuilt = await buildUnity(file, { ...(parsed.data as any), gold: 777 });
    const reparsed = await parseUnity(await blobToFile('player.xml', rebuilt));
    assert.equal((reparsed.data as any)?.gold, 777);

    const bplistFile = makeFile('playerprefs.plist', serializeBplist({ gold: 321, clear: true }));
    const bplist = await parseUnity(bplistFile);
    assert.equal(bplist.capabilities.canSave, true);
    assert.equal((bplist.data as any)?.gold, 321);
    const rebuiltBplist = await buildUnity(bplistFile, { ...(bplist.data as any), gold: 654 });
    const reparsedBplist = await parseUnity(await blobToFile('playerprefs.plist', rebuiltBplist));
    assert.equal((reparsedBplist.data as any)?.gold, 654);
}

async function testRenpy(fixtures: FixtureData) {
    const renpyData = fixtures.renpy.base;
    const pickled = pickleSerialize(renpyData);
    const compressed = pako.deflate(pickled);
    const header = new TextEncoder().encode("Ren'Py Save Game 8.0\n");
    const bytes = new Uint8Array(header.length + compressed.length);
    bytes.set(header, 0);
    bytes.set(compressed, header.length);
    const file = makeFile('slot.save', bytes);

    const parsed = await parseRenpy(file);
    assert.equal(parsed.capabilities.canView, true);
    assert.equal(parsed.capabilities.requiresExperimental, false);
    assert.equal(parsed.capabilities.roundTripSupport, 'stable-limited');
    assert.equal(parsed.data?.persistent?.coins, 100);

    const parseFail = await parseRenpy(makeTextFile('broken.save', 'not-a-renpy-save'));
    assert.equal(parseFail.capabilities.canView, false);

    const validEdit = {
        ...parsed.data,
        persistent: {
            ...parsed.data.persistent,
            coins: 777,
        },
    };
    const rebuilt = await buildRenpy(file, validEdit);
    const reparsed = await parseRenpy(await blobToFile('slot.save', rebuilt));
    assert.equal(reparsed.data?.persistent?.coins, 777);

    const unsafeEdit = {
        ...parsed.data,
        session: {
            ...parsed.data.session,
            chapter: 999,
        },
    };
    await assert.rejects(() => buildRenpy(file, unsafeEdit));
}

async function testUnrealAndPalworld() {
    const { Gvas } = await import('uesavetool');
    const rawGvasBytes = new Uint8Array(new Gvas().serialize());

    const unrealFile = makeFile('profile.sav', rawGvasBytes);
    const unrealParsed = await parseUnreal(unrealFile);
    assert.equal(unrealParsed.mode, 'full');
    assert.equal(unrealParsed.capabilities.canSave, true);

    const unrealFail = await parseUnreal(makeFile('broken.sav', new Uint8Array([1, 2, 3])));
    assert.equal(unrealFail.reasonCode, 'not_gvas');
    assert.equal(unrealFail.capabilities.canView, false);

    const unrealRebuilt = await buildUnreal(unrealFile, unrealParsed);
    const unrealReparsed = await parseUnreal(await blobToFile('profile.sav', unrealRebuilt));
    assert.equal(unrealReparsed.mode, 'full');

    const palPlayer = await parsePalworld(makeFile('Player.sav', rawGvasBytes));
    assert.equal(palPlayer.capabilities.canView, true);

    const palWorld = await parsePalworld(makeFile('Level.sav', rawGvasBytes));
    assert.equal(palWorld.capabilities.canSave, false);
    assert.ok(palWorld.data?._palworld?.notes?.includes('world_file_limited'));

    const palRebuilt = await buildPalworld(makeFile('Player.sav', rawGvasBytes), palPlayer);
    const palReparsed = await parsePalworld(await blobToFile('Player.sav', palRebuilt));
    assert.equal(palReparsed.capabilities.canView, true);
}

async function testGamemaker(fixtures: FixtureData) {
    const file = makeTextFile('save.json', JSON.stringify(fixtures.gamemaker.json, null, 2));
    const parsed = await parseGamemaker(file);
    assert.equal(parsed.format, 'json');
    assert.equal(parsed.capabilities.canView, true);

    const rawFallback = await parseGamemaker(makeTextFile('save.unknown', 'not structured text'));
    assert.equal(rawFallback.format, 'raw');
    assert.equal(rawFallback.reasonCode, 'raw_fallback');

    const rebuilt = await buildGamemaker(file, { type: parsed.format, data: { ...(parsed.data as any), gold: 999 } });
    const reparsed = await parseGamemaker(await blobToFile('save.json', rebuilt));
    assert.equal((reparsed.data as any)?.gold, 999);
}

async function testGenericFormats() {
    const lsdBytes = makeLcfSaveFixture();
    const lsdFile = makeFile('Save01.lsd', lsdBytes);
    const lsd = await parseRPGMakerMV(lsdFile);
    assert.equal(lsd.format, 'rpgmaker-2000-2003-lsd');
    assert.equal(lsd.capabilities.canView, true);
    assert.equal(lsd.capabilities.canSave, true);
    assert.equal(lsd.capabilities.roundTripSupport, 'stable-limited');
    assert.equal((lsd.data as any).party._gold, 1234);
    assert.equal((lsd.data as any).party._items['1'], 2);
    assert.equal((lsd.data as any).variables[1], 55);
    assert.equal((lsd.data as any).switches[1], true);
    assert.equal((lsd.data as any).actors._data[1]._level, 7);

    const unchangedLsd = await buildRPGMakerMV(lsdFile, lsd.data);
    assert.deepEqual(new Uint8Array(await unchangedLsd.arrayBuffer()), lsdBytes);

    const editedLsd = JSON.parse(JSON.stringify(lsd.data));
    editedLsd.party._gold = 7777;
    editedLsd.party._items['1'] = 99;
    editedLsd.variables[1] = 999;
    editedLsd.switches[1] = false;
    editedLsd.actors._data[1]._level = 42;
    editedLsd.actors._data[1]._exp = 12345;
    const rebuiltLsd = await buildRPGMakerMV(lsdFile, editedLsd);
    const reparsedLsd = await parseRPGMakerMV(await blobToFile('Save01.lsd', rebuiltLsd));
    assert.equal((reparsedLsd.data as any).party._gold, 7777);
    assert.equal((reparsedLsd.data as any).party._items['1'], 99);
    assert.equal((reparsedLsd.data as any).variables[1], 999);
    assert.equal((reparsedLsd.data as any).switches[1], false);
    assert.equal((reparsedLsd.data as any).actors._data[1]._level, 42);
    assert.equal((reparsedLsd.data as any).actors._data[1]._exp, 12345);

    const ldbNames = parseLcfDatabaseNames(makeLcfDatabaseFixture());
    assert.equal(ldbNames.items?.['1'], 'Potion');
    assert.equal(ldbNames.weapons?.['2'], 'Iron Sword');
    assert.equal(ldbNames.armors?.['3'], 'Leather Armor');
    assert.equal(ldbNames.actors?.['1'], 'Hero');
    assert.equal(ldbNames.switches?.['1'], 'Door Open');
    assert.equal(ldbNames.variables?.['1'], 'Gold Check');

    const brokenLsd = makeFile('Broken.lsd', lcfFile('LcfSaveData', [[0x65, lcfChunks([])]]));
    const brokenParsed = await parseRPGMakerMV(brokenLsd);
    assert.equal(brokenParsed.capabilities.canView, true);
    assert.equal(brokenParsed.capabilities.canSave, false);
    assert.deepEqual((brokenParsed.data as any)._lcf.missingChunks, ['SaveInventory']);

    const msgpack = await parseGeneric(makeFile('save.msgpack', new Uint8Array([0x82, 0xa4, 0x67, 0x6f, 0x6c, 0x64, 0xcd, 0x04, 0xd2, 0xa5, 0x6c, 0x65, 0x76, 0x65, 0x6c, 0x05])));
    assert.equal(msgpack.format, 'generic-msgpack');
    assert.equal(msgpack.capabilities.canView, true);
    assert.equal(msgpack.capabilities.canSave, true);
    assert.equal((msgpack.data as any).data.gold, 1234);
    const rebuiltMsgpack = await buildGeneric(makeFile('save.msgpack', new Uint8Array([0x82, 0xa4, 0x67, 0x6f, 0x6c, 0x64, 0xcd, 0x04, 0xd2, 0xa5, 0x6c, 0x65, 0x76, 0x65, 0x6c, 0x05])), { gold: 777, level: 5 });
    const reparsedMsgpack = await parseGeneric(await blobToFile('save.msgpack', rebuiltMsgpack));
    assert.equal((reparsedMsgpack.data as any).data.gold, 777);

    const cbor = await parseGeneric(makeFile('save.cbor', new Uint8Array([0xa1, 0x64, 0x67, 0x6f, 0x6c, 0x64, 0x19, 0x04, 0xd2])));
    assert.equal(cbor.format, 'generic-cbor');
    assert.equal(cbor.capabilities.canSave, true);
    assert.equal((cbor.data as any).data.gold, 1234);
    const rebuiltCbor = await buildGeneric(makeFile('save.cbor', new Uint8Array([0xa1, 0x64, 0x67, 0x6f, 0x6c, 0x64, 0x19, 0x04, 0xd2])), { gold: 888, clear: true });
    const reparsedCbor = await parseGeneric(await blobToFile('save.cbor', rebuiltCbor));
    assert.equal((reparsedCbor.data as any).data.gold, 888);
    assert.equal((reparsedCbor.data as any).data.clear, true);

    const bsonFile = makeFile('save.bson', serializeBson({ gold: 1234, hero: 'Ada' }));
    const bson = await parseGeneric(bsonFile);
    assert.equal(bson.format, 'generic-bson');
    assert.equal(bson.capabilities.canSave, true);
    assert.equal((bson.data as any).data.gold, 1234);
    const rebuiltBson = await buildGeneric(bsonFile, { gold: 777, hero: 'Ada' });
    const reparsedBsonRaw = deserializeBson(new Uint8Array(await rebuiltBson.arrayBuffer()));
    assert.equal(reparsedBsonRaw.gold, 777);
    assert.equal(EJSON.serialize(reparsedBsonRaw).hero, 'Ada');

    const sqliteFile = await makeSqliteFile();
    const sqlite = await parseGeneric(sqliteFile);
    assert.equal(sqlite.format, 'generic-sqlite');
    assert.equal(sqlite.capabilities.canSave, true);
    assert.equal((sqlite.data as any).data.tables.player.rows[0].gold, 1234);
    const editedSqlite = JSON.parse(JSON.stringify(sqlite.data));
    editedSqlite.data.tables.player.rows[0].gold = 4321;
    const rebuiltSqlite = await buildGeneric(sqliteFile, editedSqlite);
    const reparsedSqlite = await parseGeneric(await blobToFile('save.sqlite', rebuiltSqlite));
    assert.equal((reparsedSqlite.data as any).data.tables.player.rows[0].gold, 4321);

    const sqliteAliasFile = await makeSqliteFile('save.sqlite3');
    const sqliteAlias = await parseGeneric(sqliteAliasFile);
    assert.equal(sqliteAlias.format, 'generic-sqlite');
    assert.equal(sqliteAlias.capabilities.canSave, true);
    const editedSqliteAlias = JSON.parse(JSON.stringify(sqliteAlias.data));
    editedSqliteAlias.data.tables.player.rows[0].gold = 2468;
    const rebuiltSqliteAlias = await buildGeneric(sqliteAliasFile, editedSqliteAlias);
    const reparsedSqliteAlias = await parseGeneric(await blobToFile('save.sqlite3', rebuiltSqliteAlias));
    assert.equal((reparsedSqliteAlias.data as any).data.tables.player.rows[0].gold, 2468);

    const sqliteInsert = JSON.parse(JSON.stringify(sqlite.data));
    sqliteInsert.data.tables.player.rows.push({ gold: 1, name: 'New', clear: 0 });
    await assert.rejects(() => buildGeneric(sqliteFile, sqliteInsert), /cannot add or delete visible rows/);

    const sqliteIdentityEdit = JSON.parse(JSON.stringify(sqlite.data));
    sqliteIdentityEdit.data.tables.player.rows[0].__rowid = 99;
    await assert.rejects(() => buildGeneric(sqliteFile, sqliteIdentityEdit), /cannot edit row identity/);

    const solFile = makeSolFile();
    const sol = await parseGeneric(solFile);
    assert.equal(sol.format, 'generic-sol');
    assert.equal(sol.capabilities.canSave, true);
    assert.equal((sol.data as any).data.gold, 1234);
    const rebuiltSol = await buildGeneric(solFile, { gold: 999, clear: false, hero: 'Ada' });
    const reparsedSol = await parseGeneric(await blobToFile('save.sol', rebuiltSol));
    assert.equal((reparsedSol.data as any).data.gold, 999);
    assert.equal((reparsedSol.data as any).data.clear, false);

    const unsupportedSol = await parseGeneric(makeUnsupportedSolFile());
    assert.equal(unsupportedSol.format, 'generic-sol');
    assert.equal(unsupportedSol.capabilities.canView, true);
    assert.equal(unsupportedSol.capabilities.canSave, false);

    const es3 = await parseGeneric(makeTextFile('save.es3', '{"gold":1234,"clear":true}'));
    assert.equal(es3.format, 'generic-es3');
    assert.equal(es3.capabilities.canSave, true);
    assert.equal((es3.data as any).data.gold, 1234);
    const rebuiltEs3 = await buildGeneric(makeTextFile('save.es3', '{"gold":1234,"clear":true}'), { gold: 321, clear: true });
    const reparsedEs3 = await parseGeneric(await blobToFile('save.es3', rebuiltEs3));
    assert.equal((reparsedEs3.data as any).data.gold, 321);

    const gzippedEs3File = makeFile('save.es3', pako.gzip(new TextEncoder().encode('{"gold":456,"clear":false}')));
    const gzippedEs3 = await parseGeneric(gzippedEs3File);
    assert.equal(gzippedEs3.format, 'generic-es3');
    assert.equal((gzippedEs3.data as any).data.gold, 456);
    const rebuiltGzippedEs3 = await buildGeneric(gzippedEs3File, { gold: 654, clear: false });
    const reparsedGzippedEs3 = await parseGeneric(await blobToFile('save.es3', rebuiltGzippedEs3));
    assert.equal((reparsedGzippedEs3.data as any).data.gold, 654);

    const cfg = await parseGeneric(makeTextFile('project.cfg', '[player]\ngold=77\nclear=true\n'));
    assert.equal(cfg.format, 'generic-godot-cfg');
    assert.equal(cfg.capabilities.canSave, true);
    assert.equal((cfg.data as any).data.player.gold, 77);
    const editedCfg = { player: { gold: 99, clear: true, level: 4 } };
    const rebuiltCfg = await buildGeneric(makeTextFile('project.cfg', '; keep\n[player]\ngold=77\nclear=true\n'), editedCfg);
    const reparsedCfg = await parseGeneric(await blobToFile('project.cfg', rebuiltCfg));
    assert.equal((reparsedCfg.data as any).data.player.gold, 99);
    assert.equal((reparsedCfg.data as any).data.player.level, 4);
    await assert.rejects(() => buildGeneric(makeTextFile('project.cfg', '[player]\ngold=77\nclear=true\n'), { player: { gold: 99 } }), /CFG export cannot delete/);

    const yaml = await parseGeneric(makeTextFile('save.yaml', 'player:\n  gold: 77\n  clear: true\n'));
    assert.equal(yaml.format, 'generic-yaml');
    assert.equal(yaml.capabilities.canSave, true);
    assert.equal((yaml.data as any).data.player.gold, 77);
    const rebuiltYaml = await buildGeneric(makeTextFile('save.yaml', 'player:\n  gold: 77\n'), { player: { gold: 88 } });
    const reparsedYaml = await parseGeneric(await blobToFile('save.yaml', rebuiltYaml));
    assert.equal((reparsedYaml.data as any).data.player.gold, 88);

    const toml = await parseGeneric(makeTextFile('save.toml', '[player]\ngold=77\nname="Ada"\n'));
    assert.equal(toml.format, 'generic-toml');
    assert.equal((toml.data as any).data.player.gold, 77);
    const rebuiltToml = await buildGeneric(makeTextFile('save.toml', '# keep\n[player]\ngold=77\nname="Ada"\n'), { player: { gold: 91, name: 'Ada' } });
    const reparsedToml = await parseGeneric(await blobToFile('save.toml', rebuiltToml));
    assert.equal((reparsedToml.data as any).data.player.gold, 91);

    const properties = await parseGeneric(makeTextFile('save.properties', 'gold=77\nclear=true\n'));
    assert.equal(properties.format, 'generic-properties');
    assert.equal((properties.data as any).data.gold, 77);
    const rebuiltProperties = await buildGeneric(makeTextFile('save.properties', '# keep\ngold=77\nclear=true\n'), { gold: 92, clear: true });
    const reparsedProperties = await parseGeneric(await blobToFile('save.properties', rebuiltProperties));
    assert.equal((reparsedProperties.data as any).data.gold, 92);

    const csv = await parseGeneric(makeTextFile('save.csv', 'name,gold\nAda,77\n'));
    assert.equal(csv.format, 'generic-csv');
    assert.equal((csv.data as any).data.rows[0].gold, '77');
    const rebuiltCsv = await buildGeneric(makeTextFile('save.csv', 'name,gold\nAda,77\n'), { columns: ['name', 'gold'], rows: [{ name: 'Ada', gold: '93' }] });
    const reparsedCsv = await parseGeneric(await blobToFile('save.csv', rebuiltCsv));
    assert.equal((reparsedCsv.data as any).data.rows[0].gold, '93');

    const gzJsonFile = makeFile('save.json.gz', pako.gzip(new TextEncoder().encode('{"gold":77,"clear":true}')));
    const gzJson = await parseGeneric(gzJsonFile);
    assert.equal(gzJson.format, 'generic-gzip-json');
    assert.equal((gzJson.data as any).data.gold, 77);
    const rebuiltGzJson = await buildGeneric(gzJsonFile, { gold: 94, clear: true });
    const reparsedGzJson = await parseGeneric(await blobToFile('save.json.gz', rebuiltGzJson));
    assert.equal((reparsedGzJson.data as any).data.gold, 94);

    const gzYamlFile = makeFile('save.yaml.gz', pako.gzip(new TextEncoder().encode('gold: 77\nclear: true\n')));
    const gzYaml = await parseGeneric(gzYamlFile);
    assert.equal(gzYaml.format, 'generic-gzip-yaml');
    assert.equal((gzYaml.data as any).data.gold, 77);
    const rebuiltGzYaml = await buildGeneric(gzYamlFile, { gold: 94, clear: true });
    const reparsedGzYaml = await parseGeneric(await blobToFile('save.yaml.gz', rebuiltGzYaml));
    assert.equal((reparsedGzYaml.data as any).data.gold, 94);

    const zipFile = makeFile('save.zip', fflate.zipSync({
        'save.json': new TextEncoder().encode('{"gold":77,"clear":true}'),
        'notes/readme.txt': new TextEncoder().encode('keep'),
    }));
    const zip = await parseGeneric(zipFile);
    assert.equal(zip.format, 'generic-zip');
    assert.equal(zip.capabilities.canSave, true);
    assert.equal((zip.data as any).data.entries['save.json'].gold, 77);
    const rebuiltZip = await buildGeneric(zipFile, { entries: { 'save.json': { gold: 95, clear: true }, 'notes/readme.txt': { text: 'keep' } } });
    const reparsedZip = await parseGeneric(await blobToFile('save.zip', rebuiltZip));
    assert.equal((reparsedZip.data as any).data.entries['save.json'].gold, 95);

    const xml = await parseGeneric(makeTextFile('save.xml', '<save><gold>77</gold></save>'));
    assert.equal(xml.format, 'generic-xml');
    assert.equal((xml.data as any).data.text, '<save><gold>77</gold></save>');
    const rebuiltXml = await buildGeneric(makeTextFile('save.xml', '<save><gold>77</gold></save>'), { text: '<save><gold>96</gold></save>' });
    const reparsedXml = await parseGeneric(await blobToFile('save.xml', rebuiltXml));
    assert.equal((reparsedXml.data as any).data.text, '<save><gold>96</gold></save>');

    const b64File = makeTextFile('save.json.b64', Buffer.from('{"gold":77,"clear":true}', 'utf8').toString('base64'));
    const b64 = await parseGeneric(b64File);
    assert.equal(b64.format, 'generic-base64-json');
    assert.equal((b64.data as any).data.gold, 77);
    const rebuiltB64 = await buildGeneric(b64File, { gold: 96, clear: true });
    const reparsedB64 = await parseGeneric(await blobToFile('save.json.b64', rebuiltB64));
    assert.equal((reparsedB64.data as any).data.gold, 96);

    const lzFile = makeTextFile('save.json.lzstring', LZString.compressToBase64('{"gold":77,"clear":true}'));
    const lz = await parseGeneric(lzFile);
    assert.equal(lz.format, 'generic-lzstring-json');
    assert.equal((lz.data as any).data.gold, 77);
    const rebuiltLz = await buildGeneric(lzFile, { gold: 97, clear: true });
    const reparsedLz = await parseGeneric(await blobToFile('save.json.lzstring', rebuiltLz));
    assert.equal((reparsedLz.data as any).data.gold, 97);

    const deflateFile = makeFile('save.json.deflate', pako.deflateRaw(new TextEncoder().encode('{"gold":77,"clear":true}')));
    const deflate = await parseGeneric(deflateFile);
    assert.equal(deflate.format, 'generic-deflate-json');
    assert.equal((deflate.data as any).data.gold, 77);
    const rebuiltDeflate = await buildGeneric(deflateFile, { gold: 98, clear: true });
    const reparsedDeflate = await parseGeneric(await blobToFile('save.json.deflate', rebuiltDeflate));
    assert.equal((reparsedDeflate.data as any).data.gold, 98);

    const zlibFile = makeFile('save.yaml.zlib', pako.deflate(new TextEncoder().encode('gold: 77\nclear: true\n')));
    const zlib = await parseGeneric(zlibFile);
    assert.equal(zlib.format, 'generic-zlib-yaml');
    assert.equal((zlib.data as any).data.gold, 77);
    const rebuiltZlib = await buildGeneric(zlibFile, { gold: 99, clear: true });
    const reparsedZlib = await parseGeneric(await blobToFile('save.yaml.zlib', rebuiltZlib));
    assert.equal((reparsedZlib.data as any).data.gold, 99);

    const bz2File = makeFile('save.json.bz2', Uint8Array.from(compressjs.Bzip2.compressFile(Array.from(new TextEncoder().encode('{"gold":77,"clear":true}')))));
    const bz2 = await parseGeneric(bz2File);
    assert.equal(bz2.format, 'generic-bz2-json');
    assert.equal((bz2.data as any).data.gold, 77);
    const rebuiltBz2 = await buildGeneric(bz2File, { gold: 100, clear: true });
    const reparsedBz2 = await parseGeneric(await blobToFile('save.json.bz2', rebuiltBz2));
    assert.equal((reparsedBz2.data as any).data.gold, 100);

    const lz4File = makeFile('save.json.lz4', lz4.compress(new TextEncoder().encode('{"gold":77,"clear":true}')));
    const lz4Parsed = await parseGeneric(lz4File);
    assert.equal(lz4Parsed.format, 'generic-lz4-json');
    assert.equal((lz4Parsed.data as any).data.gold, 77);
    const rebuiltLz4 = await buildGeneric(lz4File, { gold: 101, clear: true });
    const reparsedLz4 = await parseGeneric(await blobToFile('save.json.lz4', rebuiltLz4));
    assert.equal((reparsedLz4.data as any).data.gold, 101);

    const zstdFile = makeFile('save.json.zst', await zstdCompress(new TextEncoder().encode('{"gold":77,"clear":true}')));
    const zstd = await parseGeneric(zstdFile);
    assert.equal(zstd.format, 'generic-zstd-json');
    assert.equal((zstd.data as any).data.gold, 77);
    const rebuiltZstd = await buildGeneric(zstdFile, { gold: 102, clear: true });
    const reparsedZstd = await parseGeneric(await blobToFile('save.json.zst', rebuiltZstd));
    assert.equal((reparsedZstd.data as any).data.gold, 102);

    const pickle = await parseGeneric(makeFile('save.pkl', pickleSerialize({ persistent: { coins: 9 } })));
    assert.equal(pickle.format, 'generic-pickle');
    assert.equal(pickle.capabilities.canSave, true);
    assert.equal((pickle.data as any).data.persistent.coins, 9);
    const rebuiltPickle = await buildGeneric(makeFile('save.pkl', pickleSerialize({ persistent: { coins: 9 } })), { persistent: { coins: 77 } });
    const reparsedPickle = await parseGeneric(await blobToFile('save.pkl', rebuiltPickle));
    assert.equal((reparsedPickle.data as any).data.persistent.coins, 77);

    const nrbf = await parseGeneric(makeFile('save.nrbf', new Uint8Array([0, 1, 0, 0, 0, 255, 255, 255, 255])));
    assert.equal(nrbf.format, 'generic-nrbf');
    assert.equal(nrbf.capabilities.canSave, false);
}

function makeLcfSaveFixture(): Uint8Array {
    const system = lcfChunks([
        [0x1f, lcfBer(3)],
        [0x20, new Uint8Array([0, 1, 0])],
        [0x21, lcfBer(3)],
        [0x22, lcfInt32Array([0, 55, 0])],
    ]);
    const actor = lcfChunks([
        [0x1f, lcfBer(7)],
        [0x20, lcfBer(100)],
        [0x47, lcfBer(88)],
        [0x48, lcfBer(22)],
    ]);
    const actors = lcfArray([[1, actor]]);
    const inventory = lcfChunks([
        [0x0b, lcfBer(1)],
        [0x0c, lcfInt16Array([1])],
        [0x0d, new Uint8Array([2])],
        [0x0e, new Uint8Array([0])],
        [0x15, lcfBer(1234)],
    ]);
    return lcfFile('LcfSaveData', [
        [0x65, system],
        [0x6c, actors],
        [0x6d, inventory],
        [0x7f, new Uint8Array([1, 2, 3])],
    ]);
}

function makeLcfDatabaseFixture(): Uint8Array {
    return lcfFile('LcfDataBase', [
        [0x0d, lcfArray([
            [1, lcfChunks([[0x01, lcfString('Potion')], [0x03, lcfBer(0)]])],
            [2, lcfChunks([[0x01, lcfString('Iron Sword')], [0x03, lcfBer(1)]])],
            [3, lcfChunks([[0x01, lcfString('Leather Armor')], [0x03, lcfBer(2)]])],
        ])],
        [0x0b, lcfArray([[1, lcfChunks([[0x01, lcfString('Hero')]])]])],
        [0x17, lcfArray([[1, lcfChunks([[0x01, lcfString('Door Open')]])]])],
        [0x18, lcfArray([[1, lcfChunks([[0x01, lcfString('Gold Check')]])]])],
    ]);
}

function lcfFile(header: string, chunks: Array<[number, Uint8Array]>): Uint8Array {
    const headerBytes = new TextEncoder().encode(header);
    return concatTestBytes([new Uint8Array([headerBytes.length]), headerBytes, lcfChunks(chunks)]);
}

function lcfChunks(chunks: Array<[number, Uint8Array]>): Uint8Array {
    return concatTestBytes(chunks.flatMap(([id, payload]) => [lcfBer(id), lcfBer(payload.length), payload]));
}

function lcfArray(items: Array<[number, Uint8Array]>): Uint8Array {
    return concatTestBytes([lcfBer(items.length), ...items.flatMap(([id, payload]) => [lcfBer(id), lcfBer(payload.length), payload])]);
}

function lcfBer(input: number): Uint8Array {
    const parts = [input & 0x7f];
    let rest = input >> 7;
    while (rest > 0) {
        parts.unshift((rest & 0x7f) | 0x80);
        rest >>= 7;
    }
    return new Uint8Array(parts);
}

function lcfString(value: string): Uint8Array {
    const bytes = new TextEncoder().encode(value);
    return concatTestBytes([lcfBer(bytes.length), bytes]);
}

function lcfInt16Array(values: number[]): Uint8Array {
    const bytes = new Uint8Array(values.length * 2);
    values.forEach((value, index) => {
        bytes[index * 2] = value & 0xff;
        bytes[index * 2 + 1] = (value >> 8) & 0xff;
    });
    return bytes;
}

function lcfInt32Array(values: number[]): Uint8Array {
    const bytes = new Uint8Array(values.length * 4);
    const view = new DataView(bytes.buffer);
    values.forEach((value, index) => view.setInt32(index * 4, value, true));
    return bytes;
}

function concatTestBytes(parts: Uint8Array[]): Uint8Array {
    const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts) {
        output.set(part, offset);
        offset += part.length;
    }
    return output;
}

async function testNaniNovel(fixtures: FixtureData) {
    const source = fixtures.naninovel.base;
    const nson = pako.deflateRaw(new TextEncoder().encode(JSON.stringify(source)));
    const file = makeFile('state.nson', nson);

    const parsed = await parseNaniNovel(file);
    assert.equal(parsed.capabilities.canView, true);
    assert.equal(parsed.format, 'naninovel-nson');

    const unsupported = await parseNaniNovel(makeTextFile('bad.nson', '%%%'));
    assert.equal(unsupported.capabilities.canView, false);

    const rebuilt = await buildNaniNovel(file, { ...(parsed.data as any), state: { scene: 'end' } }, parsed.format as NaniNovelFormat);
    const reparsed = await parseNaniNovel(await blobToFile('state.nson', rebuilt));
    assert.equal((reparsed.data as any)?.state?.scene, 'end');
}

async function main() {
    const fixtures = await loadFixtures();

    await testRpgMaker(fixtures);
    await testUnity(fixtures);
    await testRenpy(fixtures);
    await testUnrealAndPalworld();
    await testGamemaker(fixtures);
    await testGenericFormats();
    await testNaniNovel(fixtures);

    console.log('Parser baseline smoke suite passed (all engines).');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
