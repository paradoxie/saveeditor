import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import LZString from 'lz-string';
import pako from 'pako';
import { buildRPGMakerMV, parseRPGMakerMV } from '../../../src/lib/parsers/rpgmaker';
import { buildUnity, parseUnity } from '../../../src/lib/parsers/unity';

interface FidelityFixture {
    unity: {
        xml: string;
        expectedOrder: string[];
        expectedTypes: Record<string, 'int' | 'long' | 'float' | 'boolean' | 'string'>;
    };
    rpgmaker: {
        base: any;
        variants: Array<'lzstring' | 'zlib-binary' | 'zlib-mojibake'>;
    };
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

function indexSequence(text: string, keys: string[]) {
    return keys.map((key) => text.indexOf(`name=\"${key}\"`));
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

    // Simulate mojibake path: text() returns latin1-like bytes while arrayBuffer keeps raw compressed data.
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

async function testUnity(fixture: FidelityFixture['unity']) {
    const sourceFile = makeTextFile('player.xml', fixture.xml, 'application/xml');
    const parsed = await parseUnity(sourceFile);

    assert.equal(parsed.capabilities.canView, true, 'Unity fixture should parse.');

    const parsedData = parsed.data as Record<string, unknown>;
    assert.deepEqual(
        Object.keys(parsedData),
        fixture.expectedOrder,
        'Unity parse should preserve key order metadata from source.'
    );

    const edited = {
        ...parsedData,
        gold: 321,
        ratio: 2.5,
        quote: `X & Y < Z "Q" 'W'`,
    };

    const rebuilt = await buildUnity(sourceFile, edited);
    const rebuiltText = new TextDecoder('utf-8').decode(new Uint8Array(await rebuilt.arrayBuffer()));

    const orderIndexes = indexSequence(rebuiltText, fixture.expectedOrder);
    orderIndexes.reduce((prev, next) => {
        assert.ok(next > prev, 'Unity rebuild must keep original key order.');
        return next;
    }, -1);

    for (const [key, type] of Object.entries(fixture.expectedTypes)) {
        assert.match(rebuiltText, new RegExp(`<${type}\\s+name=\\"${key}\\"`), `Unity type drift for key ${key}.`);
    }

    const reparsed = await parseUnity(await blobToFile('player.xml', rebuilt));
    assert.equal((reparsed.data as any).gold, 321);
    assert.equal((reparsed.data as any).ratio, 2.5);
    assert.equal((reparsed.data as any).quote, `X & Y < Z "Q" 'W'`);
}

async function testRpgMaker(fixture: FidelityFixture['rpgmaker']) {
    for (const variant of fixture.variants) {
        const file = makeRpgVariantFile(variant, fixture.base);
        const parsed = await parseRPGMakerMV(file);

        assert.equal(parsed.capabilities.canView, true, `RPG Maker variant ${variant} should parse.`);
        const originalCompression = (parsed.data as any)?._compressionType;
        assert.equal(typeof originalCompression, 'string', `RPG Maker variant ${variant} must report compression.`);

        const edited = {
            ...(parsed.data as any),
            party: {
                ...(parsed.data as any).party,
                _gold: 7777,
            },
            actors: {
                ...(parsed.data as any).actors,
                _data: [null, { _level: 30 }],
            },
        };

        const rebuilt = await buildRPGMakerMV(file, edited);
        const reparsed = await parseRPGMakerMV(await blobToFile('slot1.rpgsave', rebuilt));

        assert.equal(reparsed.capabilities.canView, true, `RPG Maker variant ${variant} should reparse.`);
        assert.equal(reparsed.data?.gold, 7777, `RPG Maker variant ${variant}: gold drift.`);
        assert.equal(
            reparsed.data?.actors?._data?.[1]?._level,
            30,
            `RPG Maker variant ${variant}: level drift.`
        );
        assert.equal(
            (reparsed.data as any)?._compressionType,
            originalCompression,
            `RPG Maker variant ${variant}: compression strategy drift.`
        );
    }
}

async function main() {
    const fixturePath = path.resolve(process.cwd(), 'scripts/fixtures/parsers/fidelity.json');
    const raw = await fs.readFile(fixturePath, 'utf8');
    const fixture = JSON.parse(raw) as FidelityFixture;

    await testUnity(fixture.unity);
    await testRpgMaker(fixture.rpgmaker);

    console.log('RPG Maker/Unity fidelity suite passed.');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
