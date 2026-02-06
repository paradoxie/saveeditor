import assert from 'node:assert/strict';
import { Buffer } from 'buffer';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import pako from 'pako';
import { extractPalworldQuickFields, parsePalworld } from '../src/lib/parsers/palworld';
import { buildUnreal, parseUnreal } from '../src/lib/parsers/unreal';

function makeFile(name: string, bytes: Uint8Array): File {
    return {
        name,
        size: bytes.byteLength,
        type: 'application/octet-stream',
        async arrayBuffer() {
            return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        },
    } as unknown as File;
}

function header(bytes: Uint8Array): string {
    return Buffer.from(bytes.slice(0, 4)).toString('utf8');
}

interface FixtureExpect {
    file: string;
    parser?: 'unreal' | 'palworld';
    expectMode: 'full' | 'partial' | 'unsupported_compressed' | 'not_gvas';
    expectCanSave?: boolean;
    expectReasonCode?:
        | 'standard_gvas'
        | 'compressed_readonly'
        | 'gvas_parse_failed'
        | 'decompression_limit'
        | 'unsupported_container'
        | 'decompression_failed'
        | 'not_gvas';
}

async function runOptionalFixtures() {
    const fixturesDir = path.resolve(process.cwd(), 'scripts/fixtures/unreal');

    try {
        await fs.access(fixturesDir);
    } catch {
        console.log('Fixture suite skipped: scripts/fixtures/unreal not found.');
        return;
    }

    const entries = await fs.readdir(fixturesDir);
    const jsonSpecs = entries
        .filter((name) => name.endsWith('.json'))
        .sort((a, b) => a.localeCompare(b));
    if (jsonSpecs.length === 0) {
        console.log('Fixture suite skipped: no fixture spec files (*.json).');
        return;
    }

    let executed = 0;
    for (const specName of jsonSpecs) {
        const specPath = path.join(fixturesDir, specName);
        const spec = JSON.parse(await fs.readFile(specPath, 'utf8')) as FixtureExpect;
        const savePath = path.join(fixturesDir, spec.file);
        const saveBytes = new Uint8Array(await fs.readFile(savePath));
        const fixtureFile = makeFile(spec.file, saveBytes);

        const parsed = spec.parser === 'palworld'
            ? await parsePalworld(fixtureFile)
            : await parseUnreal(fixtureFile);

        assert.equal(parsed.mode, spec.expectMode, `Fixture ${specName} mode mismatch`);
        if (typeof spec.expectCanSave === 'boolean') {
            assert.equal(parsed._capabilities.canSave, spec.expectCanSave, `Fixture ${specName} canSave mismatch`);
        }
        if (spec.expectReasonCode) {
            assert.equal(parsed.reasonCode, spec.expectReasonCode, `Fixture ${specName} reasonCode mismatch`);
        }
        executed += 1;
    }

    console.log(`Fixture suite passed (${executed} cases).`);
}

async function main() {
    const { Gvas } = await import('uesavetool');

    const rawGvasBytes = new Uint8Array(new Gvas().serialize());

    const full = await parseUnreal(makeFile('full.sav', rawGvasBytes));
    assert.equal(full.mode, 'full');
    assert.equal(full.reasonCode, 'standard_gvas');
    assert.equal(full._capabilities.canSave, true);

    const rebuiltFromState = await buildUnreal(makeFile('full.sav', rawGvasBytes), full);
    assert.equal(header(new Uint8Array(await rebuiltFromState.arrayBuffer())), 'GVAS');

    const rebuiltFromJson = await buildUnreal(makeFile('full.sav', rawGvasBytes), {
        mode: 'full',
        jsonView: full.jsonView,
    });
    assert.equal(header(new Uint8Array(await rebuiltFromJson.arrayBuffer())), 'GVAS');

    const gzipWrapped = new Uint8Array(pako.gzip(rawGvasBytes));
    const compressed = await parseUnreal(makeFile('compressed.sav', gzipWrapped));
    assert.equal(compressed.mode, 'unsupported_compressed');
    assert.equal(compressed.reasonCode, 'compressed_readonly');
    assert.equal(compressed._capabilities.canSave, false);
    await assert.rejects(() =>
        buildUnreal(makeFile('compressed.sav', gzipWrapped), compressed)
    );

    const fakeWrapped = new Uint8Array(pako.gzip(new TextEncoder().encode('not-gvas-payload')));
    const unsupportedCompressed = await parseUnreal(makeFile('fake-compressed.sav', fakeWrapped));
    assert.equal(unsupportedCompressed.mode, 'unsupported_compressed');
    assert.equal(unsupportedCompressed.reasonCode, 'unsupported_container');

    const bombPayload = new Uint8Array(66 * 1024 * 1024);
    bombPayload.fill(65);
    const bombWrapped = new Uint8Array(pako.gzip(bombPayload));
    const bombResult = await parseUnreal(makeFile('bomb.sav', bombWrapped));
    assert.equal(bombResult.mode, 'unsupported_compressed');
    assert.equal(bombResult.reasonCode, 'decompression_limit');
    assert.match(bombResult.reason ?? '', /safety limit/i);

    const palworldParsed = await parsePalworld(makeFile('Level.sav', rawGvasBytes));
    assert.equal(palworldParsed.game, 'palworld');
    assert.equal(palworldParsed._palworld.fileRole, 'world');
    assert.ok(palworldParsed._palworld.notes.includes('world_file_limited'));

    const quickFields = extractPalworldQuickFields({
        SaveData: {
            PlayerSaveParameter: {
                Gold: 4500,
                TechnologyPoint: 12,
                Status: {
                    Level: 21,
                    HP: 388,
                    Stamina: 240,
                },
            },
        },
    });
    assert.ok(quickFields.find((field) => field.id === 'gold'));
    assert.ok(quickFields.find((field) => field.id === 'techPoints'));
    assert.ok(quickFields.find((field) => field.id === 'playerLevel'));
    assert.ok(quickFields.find((field) => field.id === 'hp'));
    assert.ok(quickFields.find((field) => field.id === 'stamina'));

    const plain = await parseUnreal(makeFile('plain.sav', new Uint8Array([1, 2, 3, 4, 5])));
    assert.equal(plain.mode, 'not_gvas');
    assert.equal(plain.reasonCode, 'not_gvas');
    assert.equal(plain._capabilities.canView, false);
    assert.equal(plain._capabilities.canSave, false);

    await runOptionalFixtures();

    console.log('Unreal parser smoke checks passed.');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
