import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseUnity } from '../../../src/lib/parsers/unity';

interface FixtureCase {
    id: string;
    fileName: string;
    bytes: number[];
    expectedReason: 'unsupported_binary_plist' | 'unsupported_binary_playerprefs';
    expectedVariant: 'bplist' | 'unknown-playerprefs';
}

interface FixtureFile {
    cases: FixtureCase[];
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

async function main() {
    const fixturePath = path.resolve(process.cwd(), 'scripts/fixtures/parsers/unity-binary-strategy.json');
    const fixtureRaw = await fs.readFile(fixturePath, 'utf8');
    const fixture = JSON.parse(fixtureRaw) as FixtureFile;

    assert.ok(Array.isArray(fixture.cases) && fixture.cases.length >= 3, 'Expected at least 3 Unity binary strategy cases.');

    for (const testCase of fixture.cases) {
        const bytes = new Uint8Array(testCase.bytes);
        const parsed = await parseUnity(makeFile(testCase.fileName, bytes));

        assert.equal(parsed.mode, 'unsupported', `Case ${testCase.id}: expected unsupported mode.`);
        assert.equal(parsed.reasonCode, testCase.expectedReason, `Case ${testCase.id}: unexpected reasonCode.`);
        assert.equal(parsed.capabilities.canView, false, `Case ${testCase.id}: canView must be false.`);
        assert.equal(parsed.capabilities.canSave, false, `Case ${testCase.id}: canSave must be false.`);

        const diagnostics = parsed.diagnostics || {};
        assert.equal(
            diagnostics.binaryVariant,
            testCase.expectedVariant,
            `Case ${testCase.id}: unexpected diagnostics.binaryVariant.`
        );
        assert.equal(
            diagnostics.byteLength,
            bytes.byteLength,
            `Case ${testCase.id}: diagnostics.byteLength mismatch.`
        );
        assert.equal(
            typeof diagnostics.nullByteRatio,
            'number',
            `Case ${testCase.id}: diagnostics.nullByteRatio should be numeric.`
        );
    }

    console.log('Unity binary strategy suite passed.');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
