import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import LZString from 'lz-string';
import pako from 'pako';
import { pickleSerialize } from '../../../src/lib/parsers/pickle-serializer';
import { buildGamemaker, parseGamemaker } from '../../../src/lib/parsers/gamemaker';
import { buildNaniNovel, parseNaniNovel, type NaniNovelFormat } from '../../../src/lib/parsers/naninovel';
import { parsePalworld, buildPalworld } from '../../../src/lib/parsers/palworld';
import { parseGeneric } from '../../../src/lib/parsers/generic';
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

async function blobToFile(name: string, blob: Blob): Promise<File> {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return makeFile(name, bytes, blob.type || 'application/octet-stream');
}

async function loadFixtures(): Promise<FixtureData> {
    const fixturePath = path.resolve(process.cwd(), 'scripts/fixtures/parsers/cases.json');
    const raw = await fs.readFile(fixturePath, 'utf8');
    return JSON.parse(raw) as FixtureData;
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
    const rubyGold = execFileSync(
        'ruby',
        ['-e', 'class Game_Party; end; STDIN.binmode; obj=Marshal.load(STDIN.read); items=obj.instance_variable_get(:@items); print "#{obj.instance_variable_get(:@gold)},#{items[1]},#{items[2]}"'],
        { input: Buffer.from(await rebuiltLegacy.arrayBuffer()) }
    ).toString();
    assert.equal(rubyGold, '7777,99,44');

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
    const linkedResult = execFileSync(
        'ruby',
        ['-e', 'class Game_Party; end; STDIN.binmode; obj=Marshal.load(STDIN.read); print "#{obj.instance_variable_get(:@items)[1]},#{obj.instance_variable_get(:@weapons)[1]}"'],
        { input: Buffer.from(await rebuiltLinked.arrayBuffer()) }
    ).toString();
    assert.equal(linkedResult, '55,55');

    const updated = { ...parsed.data, party: { ...parsed.data?.party, _gold: 9999 } };
    const rebuilt = await buildRPGMakerMV(file, updated);
    const reparsed = await parseRPGMakerMV(await blobToFile('slot1.rpgsave', rebuilt));
    assert.equal(reparsed.capabilities.canView, true);
    assert.equal(reparsed.data?.gold, 9999);
}

function makeRubyMarshalFixture(): Uint8Array {
    const source = `
class Game_Party
  def initialize
    @gold = 1234
    @items = { 1 => 2 }
    @weapons = { 1 => 1 }
    @armors = { 1 => 1 }
    @variables = [nil, 5]
    @switches = [nil, true]
  end
end
STDOUT.binmode
print Marshal.dump(Game_Party.new)
`;
    return new Uint8Array(execFileSync('ruby', ['-e', source]));
}

function makeRubyMarshalLinkedFixture(): Uint8Array {
    const source = `
class Game_Party
  def initialize
    shared = { 1 => 2 }
    @gold = 1234
    @items = shared
    @weapons = shared
  end
end
STDOUT.binmode
print Marshal.dump(Game_Party.new)
`;
    return new Uint8Array(execFileSync('ruby', ['-e', source]));
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
    assert.equal(msgpack.capabilities.canSave, false);
    assert.equal((msgpack.data as any).data.gold, 1234);

    const cbor = await parseGeneric(makeFile('save.cbor', new Uint8Array([0xa1, 0x64, 0x67, 0x6f, 0x6c, 0x64, 0x19, 0x04, 0xd2])));
    assert.equal(cbor.format, 'generic-cbor');
    assert.equal((cbor.data as any).data.gold, 1234);

    const sqlite = await parseGeneric(makeTextFile('save.sqlite', 'SQLite format 3\u0000demo'));
    assert.equal(sqlite.format, 'generic-sqlite');
    assert.equal(sqlite.capabilities.canSave, false);

    const sol = await parseGeneric(makeFile('save.sol', new Uint8Array([0x00, 0xbf, 0x54, 0x43, 0x53, 0x4f])));
    assert.equal(sol.format, 'generic-sol');

    const cfg = await parseGeneric(makeTextFile('project.cfg', '[player]\ngold=77\nclear=true\n'));
    assert.equal(cfg.format, 'generic-godot-cfg');
    assert.equal((cfg.data as any).data.player.gold, 77);

    const pickle = await parseGeneric(makeFile('save.pkl', pickleSerialize({ persistent: { coins: 9 } })));
    assert.equal(pickle.format, 'generic-pickle');
    assert.equal((pickle.data as any).data.persistent.coins, 9);

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
