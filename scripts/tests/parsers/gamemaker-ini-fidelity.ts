import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { buildGamemaker, parseGamemaker } from '../../../src/lib/parsers/gamemaker';

interface Fixture {
    source: string;
    expected: {
        notes: string;
        path: string;
        level: number;
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
    return makeFile(name, new TextEncoder().encode(text), type);
}

async function blobToText(blob: Blob): Promise<string> {
    return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(await blob.arrayBuffer()));
}

async function blobToFile(name: string, blob: Blob): Promise<File> {
    return makeFile(name, new Uint8Array(await blob.arrayBuffer()), blob.type || 'text/plain');
}

async function main() {
    const fixturePath = path.resolve(process.cwd(), 'scripts/fixtures/parsers/gamemaker-ini-fidelity.json');
    const fixtureRaw = await fs.readFile(fixturePath, 'utf8');
    const fixture = JSON.parse(fixtureRaw) as Fixture;

    const sourceFile = makeTextFile('save.ini', fixture.source);
    const parsed = await parseGamemaker(sourceFile);

    assert.equal(parsed.format, 'ini', 'Fixture should parse as INI.');
    assert.equal(parsed.capabilities.canSave, true, 'INI mode should be writable.');
    assert.equal((parsed.data as any)?.meta?.notes, fixture.expected.notes, 'Multiline note parse mismatch.');
    assert.equal((parsed.data as any)?.meta?.path, fixture.expected.path, 'Escaped path parse mismatch.');
    assert.equal((parsed.data as any)?.progress?.level, fixture.expected.level, 'Duplicate key semantics mismatch.');

    const noOpBlob = await buildGamemaker(sourceFile, { type: 'ini', data: parsed.data });
    const noOpText = await blobToText(noOpBlob);
    assert.equal(noOpText, fixture.source, 'No-op round-trip should be text-identical for INI fidelity.');

    const edited = {
        ...(parsed.data as any),
        progress: {
            ...((parsed.data as any)?.progress || {}),
            level: 9,
            newFlag: false,
        },
        extra: {
            slot: 2,
        },
    };

    const editedBlob = await buildGamemaker(sourceFile, { type: 'ini', data: edited });
    const editedText = await blobToText(editedBlob);

    assert.ok(editedText.startsWith('; top comment'), 'Header comment should remain at the top.');
    assert.ok(editedText.indexOf('[meta]') < editedText.indexOf('[progress]'), 'Section order should be preserved.');
    assert.ok(editedText.indexOf('[progress]') < editedText.indexOf('[extra]'), 'New section should append at end.');
    assert.ok(editedText.includes('level=3'), 'Earlier duplicate key should remain unchanged.');
    assert.ok(editedText.includes('level=9 ; duplicate winner'), 'Last duplicate key should be updated in-place.');
    assert.ok(
        editedText.indexOf('newFlag=false') > editedText.indexOf('[progress]') &&
            editedText.indexOf('newFlag=false') < editedText.indexOf('[extra]'),
        'New key should append to the target section tail.'
    );

    const reparsed = await parseGamemaker(await blobToFile('save.ini', editedBlob));
    assert.equal((reparsed.data as any)?.progress?.level, 9, 'Edited level should persist after rebuild.');
    assert.equal((reparsed.data as any)?.progress?.newFlag, false, 'New key should persist after rebuild.');
    assert.equal((reparsed.data as any)?.meta?.notes, fixture.expected.notes, 'Multiline values should stay reversible.');
    assert.equal((reparsed.data as any)?.meta?.path, fixture.expected.path, 'Escaped values should stay reversible.');

    console.log('GameMaker INI fidelity suite passed.');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
