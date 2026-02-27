import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
    buildNaniNovel,
    parseNaniNovel,
    type NaniNovelFormat,
} from '../../../src/lib/parsers/naninovel';

interface FailureCase {
    id: string;
    base64?: string;
    text?: string;
    expectedReason: 'likely_encrypted_container' | 'unsupported_naninovel_wrapper';
}

interface FixtureFile {
    base: unknown;
    failures: FailureCase[];
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

async function testRoundTripVariant(base: unknown, format: NaniNovelFormat) {
    const seedFile = makeTextFile('seed.nson', '{}');
    const built = await buildNaniNovel(seedFile, base, format);
    const parsed = await parseNaniNovel(await blobToFile(`state-${format}.nson`, built));

    assert.equal(parsed.format, format, `Format ${format}: parser should preserve wrapper identity.`);
    assert.equal(parsed.capabilities.canSave, true, `Format ${format}: should remain writable.`);
    assert.deepEqual(parsed.data, base, `Format ${format}: payload drift after parse.`);

    const rebuilt = await buildNaniNovel(seedFile, parsed.data, parsed.format as NaniNovelFormat);
    const reparsed = await parseNaniNovel(await blobToFile(`state-${format}.nson`, rebuilt));

    assert.equal(reparsed.format, format, `Format ${format}: format drift after rebuild.`);
    assert.deepEqual(reparsed.data, base, `Format ${format}: payload drift after rebuild.`);
}

async function main() {
    const fixturePath = path.resolve(process.cwd(), 'scripts/fixtures/parsers/naninovel-variants.json');
    const fixtureRaw = await fs.readFile(fixturePath, 'utf8');
    const fixture = JSON.parse(fixtureRaw) as FixtureFile;

    await testRoundTripVariant(fixture.base, 'naninovel-zlib');
    await testRoundTripVariant(fixture.base, 'naninovel-base64-gzip');

    for (const failureCase of fixture.failures) {
        let file: File;

        if (failureCase.text) {
            file = makeTextFile(`${failureCase.id}.nson`, failureCase.text);
        } else {
            const bytes = Uint8Array.from(Buffer.from(failureCase.base64 || '', 'base64'));
            file = makeFile(`${failureCase.id}.nson`, bytes);
        }

        const parsed = await parseNaniNovel(file);
        assert.equal(
            parsed.reasonCode,
            failureCase.expectedReason,
            `Case ${failureCase.id}: unexpected failure reason.`
        );
        assert.equal(parsed.capabilities.canView, false, `Case ${failureCase.id}: should be read-only/unsupported.`);
        assert.equal(parsed.capabilities.canSave, false, `Case ${failureCase.id}: should not be writable.`);
    }

    console.log('NaniNovel variants suite passed.');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
