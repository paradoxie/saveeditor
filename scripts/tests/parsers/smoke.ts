import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import LZString from 'lz-string';
import pako from 'pako';
import { pickleSerialize } from '../../../src/lib/parsers/pickle-serializer';
import { buildGamemaker, parseGamemaker } from '../../../src/lib/parsers/gamemaker';
import { buildNaniNovel, parseNaniNovel, type NaniNovelFormat } from '../../../src/lib/parsers/naninovel';
import { parsePalworld, buildPalworld } from '../../../src/lib/parsers/palworld';
import { buildRenpy, parseRenpy } from '../../../src/lib/parsers/renpy';
import { buildRPGMakerMV, parseRPGMakerMV } from '../../../src/lib/parsers/rpgmaker';
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

    const unsupported = await parseRPGMakerMV(makeTextFile('Save01.rvdata2', 'dummy'));
    assert.equal(unsupported.capabilities.canView, false);
    assert.equal(unsupported.reasonCode, 'unsupported_ruby_marshal');

    const updated = { ...parsed.data, party: { ...parsed.data?.party, _gold: 9999 } };
    const rebuilt = await buildRPGMakerMV(file, updated);
    const reparsed = await parseRPGMakerMV(await blobToFile('slot1.rpgsave', rebuilt));
    assert.equal(reparsed.capabilities.canView, true);
    assert.equal(reparsed.data?.gold, 9999);
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
    assert.equal(parsed.capabilities.requiresExperimental, true);
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
    await testNaniNovel(fixtures);

    console.log('Parser baseline smoke suite passed (all engines).');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
