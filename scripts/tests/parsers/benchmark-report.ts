import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import LZString from 'lz-string';
import pako from 'pako';
import plist from 'plist';
import { pickleSerialize } from '../../../src/lib/parsers/pickle-serializer';
import { buildGamemaker, parseGamemaker } from '../../../src/lib/parsers/gamemaker';
import { parseGeneric } from '../../../src/lib/parsers/generic';
import { buildNaniNovel, parseNaniNovel, type NaniNovelFormat } from '../../../src/lib/parsers/naninovel';
import { buildPalworld, parsePalworld } from '../../../src/lib/parsers/palworld';
import { buildRenpy, parseRenpy } from '../../../src/lib/parsers/renpy';
import { buildRPGMakerMV, parseRPGMakerMV } from '../../../src/lib/parsers/rpgmaker';
import { buildUnity, parseUnity } from '../../../src/lib/parsers/unity';
import { buildUnreal, parseUnreal } from '../../../src/lib/parsers/unreal';

type Tier = 'tier1' | 'tier2';

interface ThresholdFixture {
    thresholds: {
        tier1Parse: number;
        tier2Parse: number;
        tier1RoundTrip: number;
        tier2RoundTrip: number;
    };
}

interface CasesFixture {
    rpgmaker: { base: any };
    unity: { xml: string };
    renpy: { base: any };
    gamemaker: { json: any };
    naninovel: { base: any };
}

interface IniFixture {
    source: string;
}

interface SupportedCaseResult {
    id: string;
    engine: string;
    format: string;
    tier: Tier;
    parseOk: boolean;
    roundTripOk: boolean | 'n/a';
    detail: string;
}

interface UnsupportedCaseResult {
    id: string;
    reasonExpected: string;
    reasonActual: string;
    ok: boolean;
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
    return makeFile(name, new TextEncoder().encode(text), type);
}

async function blobToFile(name: string, blob: Blob): Promise<File> {
    return makeFile(name, new Uint8Array(await blob.arrayBuffer()), blob.type || 'application/octet-stream');
}

function ratio(passed: number, total: number): number {
    if (total === 0) return 1;
    return passed / total;
}

function toPct(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

function makeBenchmarkLcfSaveFixture(): Uint8Array {
    const inventory = benchmarkLcfChunks([
        [0x0b, benchmarkLcfBer(1)],
        [0x0c, new Uint8Array([1, 0])],
        [0x0d, new Uint8Array([2])],
        [0x0e, new Uint8Array([0])],
        [0x15, benchmarkLcfBer(2048)],
    ]);
    const system = benchmarkLcfChunks([
        [0x1f, benchmarkLcfBer(1)],
        [0x20, new Uint8Array([0])],
        [0x21, benchmarkLcfBer(1)],
        [0x22, new Uint8Array([0, 0, 0, 0])],
    ]);
    return benchmarkLcfFile('LcfSaveData', [
        [0x65, system],
        [0x6d, inventory],
    ]);
}

function benchmarkLcfFile(header: string, chunks: Array<[number, Uint8Array]>): Uint8Array {
    const headerBytes = new TextEncoder().encode(header);
    return benchmarkConcat([new Uint8Array([headerBytes.length]), headerBytes, benchmarkLcfChunks(chunks)]);
}

function benchmarkLcfChunks(chunks: Array<[number, Uint8Array]>): Uint8Array {
    return benchmarkConcat(chunks.flatMap(([id, payload]) => [benchmarkLcfBer(id), benchmarkLcfBer(payload.length), payload]));
}

function benchmarkLcfBer(input: number): Uint8Array {
    const parts = [input & 0x7f];
    let rest = input >> 7;
    while (rest > 0) {
        parts.unshift((rest & 0x7f) | 0x80);
        rest >>= 7;
    }
    return new Uint8Array(parts);
}

function benchmarkConcat(parts: Uint8Array[]): Uint8Array {
    const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts) {
        output.set(part, offset);
        offset += part.length;
    }
    return output;
}

function summarizeTier(results: SupportedCaseResult[], tier: Tier) {
    const tierResults = results.filter((item) => item.tier === tier);
    const roundTripResults = tierResults.filter((item) => item.roundTripOk !== 'n/a');
    const parsePassed = tierResults.filter((item) => item.parseOk).length;
    const roundTripPassed = roundTripResults.filter((item) => item.roundTripOk === true).length;

    return {
        total: tierResults.length,
        parseRate: ratio(parsePassed, tierResults.length),
        roundTripRate: ratio(roundTripPassed, roundTripResults.length),
    };
}

function makeRpgVariantFile(variant: 'lzstring' | 'zlib-binary' | 'zlib-mojibake', payload: any): File {
    const json = JSON.stringify(payload);
    if (variant === 'lzstring') {
        return makeTextFile('slot1.rpgsave', LZString.compressToBase64(json), 'text/plain');
    }

    const bytes = new TextEncoder().encode(json);
    const compressed = new Uint8Array(pako.deflate(bytes));

    if (variant === 'zlib-binary') {
        return makeFile('slot1.rpgsave', compressed, 'application/octet-stream');
    }

    let latin1 = '';
    for (let i = 0; i < compressed.length; i += 1) {
        latin1 += String.fromCharCode(compressed[i]);
    }

    return {
        name: 'slot1.rpgsave',
        size: compressed.byteLength,
        type: 'text/plain',
        async arrayBuffer() {
            return compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength);
        },
        async text() {
            return latin1;
        },
    } as unknown as File;
}

async function loadFixture<T>(relativePath: string): Promise<T> {
    const fixturePath = path.resolve(process.cwd(), relativePath);
    return JSON.parse(await fs.readFile(fixturePath, 'utf8')) as T;
}

async function runSupportedCases(cases: CasesFixture, iniFixture: IniFixture): Promise<SupportedCaseResult[]> {
    const results: SupportedCaseResult[] = [];
    const { Gvas } = await import('uesavetool');

    const push = (result: SupportedCaseResult) => {
        results.push(result);
    };

    // RPG Maker tier1
    for (const variant of ['lzstring', 'zlib-binary'] as const) {
        const sourceFile = makeRpgVariantFile(variant, cases.rpgmaker.base);
        const parsed = await parseRPGMakerMV(sourceFile);
        const parseOk = parsed.capabilities.canView && parsed.reasonCode === 'ok';

        let roundTripOk = false;
        if (parseOk && parsed.data) {
            const edited = {
                ...(parsed.data as any),
                party: {
                    ...(parsed.data as any).party,
                    _gold: 2048,
                },
            };
            const rebuilt = await buildRPGMakerMV(sourceFile, edited);
            const reparsed = await parseRPGMakerMV(await blobToFile('slot1.rpgsave', rebuilt));
            roundTripOk = reparsed.capabilities.canView && reparsed.data?.gold === 2048;
        }

        push({
            id: `rpgmaker-${variant}`,
            engine: 'rpgmaker',
            format: '.rpgsave',
            tier: 'tier1',
            parseOk,
            roundTripOk,
            detail: parseOk ? 'ok' : String(parsed.reasonCode),
        });
    }

    {
        const legacyBytes = new Uint8Array([
            0x04, 0x08, 0x6f, 0x3a, 0x0f, 0x47, 0x61, 0x6d, 0x65, 0x5f, 0x50, 0x61, 0x72, 0x74,
            0x79, 0x06, 0x3a, 0x0a, 0x40, 0x67, 0x6f, 0x6c, 0x64, 0x69, 0x02, 0xd2, 0x04,
        ]);
        const sourceFile = makeFile('Save01.rvdata2', legacyBytes);
        const parsed = await parseRPGMakerMV(sourceFile);
        const parseOk = parsed.capabilities.canView && parsed.reasonCode === 'ok';
        let roundTripOk = false;

        if (parseOk && parsed.data) {
            const edited = JSON.parse(JSON.stringify(parsed.data));
            edited.data._gold = 4096;
            const rebuilt = await buildRPGMakerMV(sourceFile, edited);
            const reparsed = await parseRPGMakerMV(await blobToFile('Save01.rvdata2', rebuilt));
            roundTripOk = reparsed.capabilities.canView && (reparsed.data as any)?.data?._gold === 4096;
        }

        push({
            id: 'rpgmaker-ruby-marshal',
            engine: 'rpgmaker',
            format: '.rvdata2/.rvdata/.rxdata',
            tier: 'tier2',
            parseOk,
            roundTripOk,
            detail: parseOk ? 'stable-limited' : String(parsed.reasonCode),
        });
    }

    {
        const lsdBytes = makeBenchmarkLcfSaveFixture();
        const sourceFile = makeFile('Save01.lsd', lsdBytes);
        const parsed = await parseRPGMakerMV(sourceFile);
        const parseOk =
            parsed.capabilities.canView &&
            parsed.capabilities.roundTripSupport === 'stable-limited' &&
            parsed.format === 'rpgmaker-2000-2003-lsd';
        let roundTripOk = false;

        if (parseOk && parsed.data) {
            const edited = JSON.parse(JSON.stringify(parsed.data));
            edited.party._gold = 4096;
            const rebuilt = await buildRPGMakerMV(sourceFile, edited);
            const reparsed = await parseRPGMakerMV(await blobToFile('Save01.lsd', rebuilt));
            roundTripOk = reparsed.capabilities.canView && (reparsed.data as any)?.party?._gold === 4096;
        }

        push({
            id: 'rpgmaker-2000-2003-lsd',
            engine: 'rpgmaker',
            format: '.lsd',
            tier: 'tier2',
            parseOk,
            roundTripOk,
            detail: parseOk ? 'stable-limited' : String(parsed.reasonCode),
        });
    }

    // Unity tier1 (xml/plist)
    {
        const xmlFile = makeTextFile('player.xml', cases.unity.xml, 'application/xml');
        const parsed = await parseUnity(xmlFile);
        const parseOk = parsed.capabilities.canView && parsed.reasonCode === 'ok';
        let roundTripOk = false;

        if (parseOk) {
            const rebuilt = await buildUnity(xmlFile, { ...(parsed.data as any), gold: 777 });
            const reparsed = await parseUnity(await blobToFile('player.xml', rebuilt));
            roundTripOk = reparsed.capabilities.canView && (reparsed.data as any)?.gold === 777;
        }

        push({
            id: 'unity-xml',
            engine: 'unity',
            format: '.xml',
            tier: 'tier1',
            parseOk,
            roundTripOk,
            detail: parseOk ? 'ok' : String(parsed.reasonCode),
        });
    }

    {
        const plistPayload = {
            gold: 100,
            highScore: 999999999,
            isPremium: true,
            name: 'Hero',
        };
        const plistText = plist.build(plistPayload);
        const plistFile = makeTextFile('player.plist', plistText, 'application/x-plist');
        const parsed = await parseUnity(plistFile);
        const parseOk = parsed.capabilities.canView && parsed.reasonCode === 'ok';
        let roundTripOk = false;

        if (parseOk) {
            const rebuilt = await buildUnity(plistFile, { ...(parsed.data as any), gold: 888 });
            const reparsed = await parseUnity(await blobToFile('player.plist', rebuilt));
            roundTripOk = reparsed.capabilities.canView && (reparsed.data as any)?.gold === 888;
        }

        push({
            id: 'unity-plist',
            engine: 'unity',
            format: '.plist',
            tier: 'tier1',
            parseOk,
            roundTripOk,
            detail: parseOk ? 'ok' : String(parsed.reasonCode),
        });
    }

    // Unreal tier1 (standard + wrapped)
    const rawGvasBytes = new Uint8Array(new Gvas().serialize());
    for (const [id, bytes] of [
        ['unreal-gvas', rawGvasBytes],
        ['unreal-gzip-wrapped', new Uint8Array(pako.gzip(rawGvasBytes))],
        ['unreal-zlib-wrapped', new Uint8Array(pako.deflate(rawGvasBytes))],
    ] as const) {
        const file = makeFile('profile.sav', bytes);
        const parsed = await parseUnreal(file);
        const parseOk = parsed.capabilities.canView && parsed.capabilities.canSave;

        let roundTripOk = false;
        if (parseOk) {
            const rebuilt = await buildUnreal(file, parsed.data);
            const reparsed = await parseUnreal(await blobToFile('profile.sav', rebuilt));
            roundTripOk = reparsed.capabilities.canView && reparsed.capabilities.canSave;
        }

        push({
            id,
            engine: 'unreal',
            format: '.sav',
            tier: 'tier1',
            parseOk,
            roundTripOk,
            detail: parseOk ? String(parsed.reasonCode) : String(parsed.reasonCode),
        });
    }

    // Ren'Py tier2
    {
        const pickled = pickleSerialize(cases.renpy.base);
        const compressed = pako.deflate(pickled);
        const header = new TextEncoder().encode("Ren'Py Save Game 8.0\n");
        const bytes = new Uint8Array(header.length + compressed.length);
        bytes.set(header, 0);
        bytes.set(compressed, header.length);

        const file = makeFile('slot.save', bytes);
        const parsed = await parseRenpy(file);
        const parseOk = parsed.capabilities.canView && parsed.reasonCode === 'ok';

        let roundTripOk = false;
        if (parseOk) {
            const edited = {
                ...(parsed.data as any),
                persistent: {
                    ...((parsed.data as any)?.persistent || {}),
                    coins: 333,
                },
            };
            const rebuilt = await buildRenpy(file, edited);
            const reparsed = await parseRenpy(await blobToFile('slot.save', rebuilt));
            roundTripOk = reparsed.capabilities.canView && reparsed.data?.persistent?.coins === 333;
        }

        push({
            id: 'renpy-save',
            engine: 'renpy',
            format: '.save',
            tier: 'tier2',
            parseOk,
            roundTripOk,
            detail: parseOk ? 'ok' : String(parsed.reasonCode),
        });
    }

    // Palworld tier2 (player)
    {
        const sourceFile = makeFile('Player.sav', rawGvasBytes);
        const parsed = await parsePalworld(sourceFile);
        const parseOk = parsed.capabilities.canView && parsed.capabilities.canSave;

        let roundTripOk = false;
        if (parseOk) {
            const rebuilt = await buildPalworld(sourceFile, parsed.data);
            const reparsed = await parsePalworld(await blobToFile('Player.sav', rebuilt));
            roundTripOk = reparsed.capabilities.canView;
        }

        push({
            id: 'palworld-player-sav',
            engine: 'palworld',
            format: 'Player.sav',
            tier: 'tier2',
            parseOk,
            roundTripOk,
            detail: parseOk ? 'ok' : String(parsed.reasonCode),
        });
    }

    // GameMaker tier2 (json/ini)
    {
        const jsonFile = makeTextFile('save.json', JSON.stringify(cases.gamemaker.json, null, 2));
        const parsed = await parseGamemaker(jsonFile);
        const parseOk = parsed.capabilities.canView && parsed.format === 'json';

        let roundTripOk = false;
        if (parseOk) {
            const rebuilt = await buildGamemaker(jsonFile, {
                type: 'json',
                data: { ...(parsed.data as any), gold: 919 },
            });
            const reparsed = await parseGamemaker(await blobToFile('save.json', rebuilt));
            roundTripOk = (reparsed.data as any)?.gold === 919;
        }

        push({
            id: 'gamemaker-json',
            engine: 'gamemaker',
            format: '.json',
            tier: 'tier2',
            parseOk,
            roundTripOk,
            detail: parseOk ? 'ok' : String(parsed.reasonCode),
        });
    }

    {
        const iniFile = makeTextFile('save.ini', iniFixture.source);
        const parsed = await parseGamemaker(iniFile);
        const parseOk = parsed.capabilities.canView && parsed.format === 'ini';

        let roundTripOk = false;
        if (parseOk) {
            const edited = {
                ...(parsed.data as any),
                progress: {
                    ...((parsed.data as any)?.progress || {}),
                    level: 7,
                },
            };
            const rebuilt = await buildGamemaker(iniFile, { type: 'ini', data: edited });
            const reparsed = await parseGamemaker(await blobToFile('save.ini', rebuilt));
            roundTripOk = (reparsed.data as any)?.progress?.level === 7;
        }

        push({
            id: 'gamemaker-ini',
            engine: 'gamemaker',
            format: '.ini',
            tier: 'tier2',
            parseOk,
            roundTripOk,
            detail: parseOk ? 'ok' : String(parsed.reasonCode),
        });
    }

    // NaniNovel tier2 wrappers
    for (const format of ['naninovel-nson', 'naninovel-zlib', 'naninovel-base64-gzip'] as const) {
        const seed = makeTextFile('state.nson', '{}');
        const built = await buildNaniNovel(seed, cases.naninovel.base, format);
        const file = await blobToFile(`state-${format}.nson`, built);
        const parsed = await parseNaniNovel(file);
        const parseOk = parsed.capabilities.canView && parsed.format === format;

        let roundTripOk = false;
        if (parseOk) {
            const rebuilt = await buildNaniNovel(seed, parsed.data, parsed.format as NaniNovelFormat);
            const reparsed = await parseNaniNovel(await blobToFile(`state-${format}.nson`, rebuilt));
            roundTripOk = reparsed.capabilities.canView && reparsed.format === format;
        }

        push({
            id: `naninovel-${format}`,
            engine: 'naninovel',
            format,
            tier: 'tier2',
            parseOk,
            roundTripOk,
            detail: parseOk ? 'ok' : String(parsed.reasonCode),
        });
    }

    for (const [id, file] of [
        ['generic-msgpack', makeFile('save.msgpack', new Uint8Array([0x81, 0xa4, 0x67, 0x6f, 0x6c, 0x64, 0xcd, 0x04, 0xd2]))],
        ['generic-cbor', makeFile('save.cbor', new Uint8Array([0xa1, 0x64, 0x67, 0x6f, 0x6c, 0x64, 0x19, 0x04, 0xd2]))],
        ['generic-sqlite', makeTextFile('save.sqlite', 'SQLite format 3\u0000demo')],
        ['generic-sol', makeFile('save.sol', new Uint8Array([0x00, 0xbf, 0x54, 0x43, 0x53, 0x4f]))],
        ['generic-es3', makeTextFile('save.es3', 'Easy Save 3 sample')],
        ['generic-godot-cfg', makeTextFile('project.cfg', '[player]\ngold=77\n')],
        ['generic-pickle', makeFile('save.pkl', pickleSerialize({ persistent: { coins: 9 } }))],
    ] as const) {
        const parsed = await parseGeneric(file);
        const parseOk = parsed.capabilities.canView && !parsed.capabilities.canSave;
        push({
            id,
            engine: 'generic',
            format: file.name.split('.').pop() || 'generic',
            tier: 'tier2',
            parseOk,
            roundTripOk: 'n/a',
            detail: parseOk ? String(parsed.reasonCode) : String(parsed.reasonCode),
        });
    }

    return results;
}

async function runUnsupportedCases(): Promise<UnsupportedCaseResult[]> {
    const checks: UnsupportedCaseResult[] = [];

    const rvdata2 = await parseRPGMakerMV(makeTextFile('Save01.rvdata2', 'dummy'));
    checks.push({
        id: 'rpgmaker-invalid-rvdata2',
        reasonExpected: 'unsupported_ruby_marshal',
        reasonActual: String(rvdata2.reasonCode),
        ok: rvdata2.reasonCode === 'unsupported_ruby_marshal' && !rvdata2.capabilities.canView,
    });

    const unityBplist = await parseUnity(
        makeFile('prefs.dat', new Uint8Array([98, 112, 108, 105, 115, 116, 48, 48, 0, 1, 2, 3]))
    );
    checks.push({
        id: 'unity-binary-plist',
        reasonExpected: 'unsupported_binary_plist',
        reasonActual: String(unityBplist.reasonCode),
        ok: unityBplist.reasonCode === 'unsupported_binary_plist' && !unityBplist.capabilities.canSave,
    });

    const unityBinary = await parseUnity(makeFile('prefs.bin', new Uint8Array([0, 1, 2, 3, 4])));
    checks.push({
        id: 'unity-binary-playerprefs',
        reasonExpected: 'unsupported_binary_playerprefs',
        reasonActual: String(unityBinary.reasonCode),
        ok: unityBinary.reasonCode === 'unsupported_binary_playerprefs' && !unityBinary.capabilities.canSave,
    });

    const naninovelEncrypted = await parseNaniNovel(makeTextFile('encrypted.nson', 'ENC:ABCD1234'));
    checks.push({
        id: 'naninovel-encrypted',
        reasonExpected: 'likely_encrypted_container',
        reasonActual: String(naninovelEncrypted.reasonCode),
        ok: naninovelEncrypted.reasonCode === 'likely_encrypted_container' && !naninovelEncrypted.capabilities.canView,
    });

    const unrealNotGvas = await parseUnreal(makeFile('broken.sav', new Uint8Array([1, 2, 3])));
    checks.push({
        id: 'unreal-not-gvas',
        reasonExpected: 'not_gvas',
        reasonActual: String(unrealNotGvas.reasonCode),
        ok: unrealNotGvas.reasonCode === 'not_gvas' && !unrealNotGvas.capabilities.canView,
    });

    const { Gvas } = await import('uesavetool');
    const palworldWorld = await parsePalworld(makeFile('Level.sav', new Uint8Array(new Gvas().serialize())));
    checks.push({
        id: 'palworld-world-readonly',
        reasonExpected: 'world_file_limited',
        reasonActual: palworldWorld.data?._palworld?.notes?.includes('world_file_limited') ? 'world_file_limited' : 'missing',
        ok: palworldWorld.capabilities.canView && !palworldWorld.capabilities.canSave,
    });

    return checks;
}

function printReport(
    supported: SupportedCaseResult[],
    unsupported: UnsupportedCaseResult[],
    thresholds: ThresholdFixture['thresholds']
) {
    const tier1 = summarizeTier(supported, 'tier1');
    const tier2 = summarizeTier(supported, 'tier2');

    console.log('');
    console.log('Parser benchmark summary (commercial-competitor baseline):');
    console.log(
        `- Tier1 parse ${toPct(tier1.parseRate)} (threshold ${toPct(thresholds.tier1Parse)}), round-trip ${toPct(tier1.roundTripRate)} (threshold ${toPct(thresholds.tier1RoundTrip)})`
    );
    console.log(
        `- Tier2 parse ${toPct(tier2.parseRate)} (threshold ${toPct(thresholds.tier2Parse)}), round-trip ${toPct(tier2.roundTripRate)} (threshold ${toPct(thresholds.tier2RoundTrip)})`
    );
    console.log('');
    console.log('Supported format cases:');
    supported.forEach((item) => {
        console.log(
            `  - ${item.id}: parse=${item.parseOk ? 'PASS' : 'FAIL'}, roundTrip=${item.roundTripOk === 'n/a' ? 'N/A' : item.roundTripOk ? 'PASS' : 'FAIL'} (${item.tier}, ${item.detail})`
        );
    });

    console.log('');
    console.log('Unsupported transparency cases:');
    unsupported.forEach((item) => {
        console.log(
            `  - ${item.id}: ${item.ok ? 'PASS' : 'FAIL'} (expected=${item.reasonExpected}, actual=${item.reasonActual})`
        );
    });
}

async function main() {
    const thresholdFixture = await loadFixture<ThresholdFixture>('scripts/fixtures/parsers/benchmark-thresholds.json');
    const casesFixture = await loadFixture<CasesFixture>('scripts/fixtures/parsers/cases.json');
    const iniFixture = await loadFixture<IniFixture>('scripts/fixtures/parsers/gamemaker-ini-fidelity.json');

    const supported = await runSupportedCases(casesFixture, iniFixture);
    const unsupported = await runUnsupportedCases();

    const tier1 = summarizeTier(supported, 'tier1');
    const tier2 = summarizeTier(supported, 'tier2');

    assert.ok(
        tier1.parseRate >= thresholdFixture.thresholds.tier1Parse,
        `Tier1 parse success below threshold: ${toPct(tier1.parseRate)} < ${toPct(thresholdFixture.thresholds.tier1Parse)}`
    );
    assert.ok(
        tier2.parseRate >= thresholdFixture.thresholds.tier2Parse,
        `Tier2 parse success below threshold: ${toPct(tier2.parseRate)} < ${toPct(thresholdFixture.thresholds.tier2Parse)}`
    );
    assert.ok(
        tier1.roundTripRate >= thresholdFixture.thresholds.tier1RoundTrip,
        `Tier1 round-trip success below threshold: ${toPct(tier1.roundTripRate)} < ${toPct(thresholdFixture.thresholds.tier1RoundTrip)}`
    );
    assert.ok(
        tier2.roundTripRate >= thresholdFixture.thresholds.tier2RoundTrip,
        `Tier2 round-trip success below threshold: ${toPct(tier2.roundTripRate)} < ${toPct(thresholdFixture.thresholds.tier2RoundTrip)}`
    );

    const failedTransparency = unsupported.filter((item) => !item.ok);
    assert.equal(
        failedTransparency.length,
        0,
        `Unsupported transparency checks failed: ${failedTransparency
            .map((item) => `${item.id} expected=${item.reasonExpected} actual=${item.reasonActual}`)
            .join('; ')}`
    );

    printReport(supported, unsupported, thresholdFixture.thresholds);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
