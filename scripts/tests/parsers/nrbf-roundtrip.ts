import assert from 'node:assert/strict';
import {
    deserialize,
    PrimitiveTypeEnumeration,
    serialize,
    type NrbfObject,
} from 'ms-nrbf-js';
import { buildGeneric, parseGeneric } from '../../../src/lib/parsers/generic';
import { parseSaveFile } from '../../../src/lib/parseSaveFile';

function makeFile(name: string, bytes: Uint8Array): File {
    return new File([bytes as any], name, { type: 'application/octet-stream' });
}

const stats: NrbfObject = {
    typeName: 'Dredge.SaveData.Stats',
    libraryName: 'Assembly-CSharp, Version=0.0.0.0, Culture=neutral, PublicKeyToken=null',
    memberTypes: {
        fishCaught: PrimitiveTypeEnumeration.Int32,
        sanity: PrimitiveTypeEnumeration.Single,
    },
    members: {
        fishCaught: 17,
        sanity: 0.75,
    },
};

const root: NrbfObject = {
    typeName: 'Dredge.SaveData',
    libraryName: 'Assembly-CSharp, Version=0.0.0.0, Culture=neutral, PublicKeyToken=null',
    memberTypes: {
        currency: PrimitiveTypeEnumeration.Int32,
        elapsedTicks: PrimitiveTypeEnumeration.Int64,
        inventoryCounts: PrimitiveTypeEnumeration.Int16,
    },
    members: {
        currency: 250,
        elapsedTicks: 1234567890123n,
        playerName: 'Fisher',
        inventoryCounts: [1, 2, 3],
        stats,
        statsAlias: stats,
    },
};

const source = new Uint8Array(serialize(root));
const file = makeFile('dredge-save0.bin', source);
const parsed = await parseGeneric(file);
assert.equal(parsed.format, 'generic-nrbf');
assert.equal(parsed.capabilities.canView, true);
assert.equal(parsed.capabilities.canEdit, true);
assert.equal(parsed.capabilities.canSave, true);
assert.equal((parsed.data as any).data.currency, 250);
assert.equal((parsed.data as any).data.elapsedTicks, '1234567890123');
assert.deepEqual((parsed.data as any).data.inventoryCounts, [1, 2, 3]);
assert.deepEqual((parsed.data as any).data.statsAlias, { _nrbfReference: '$.stats' });

const routed = await parseSaveFile(makeFile('renamed.save', source), 'unreal');
assert.equal(routed.parserPath, 'generic');
assert.equal(routed.outcome.format, 'generic-nrbf');

const edited = structuredClone((parsed.data as any).data);
edited.currency = 9999;
edited.elapsedTicks = '2234567890123';
edited.playerName = 'Mariner';
edited.inventoryCounts[1] = 44;
edited.stats.fishCaught = 88;
edited.stats.sanity = 0.5;

const rebuiltBlob = await buildGeneric(file, edited);
const rebuiltBytes = new Uint8Array(await rebuiltBlob.arrayBuffer());
const rebuilt = deserialize(rebuiltBytes) as NrbfObject;
assert.equal(rebuilt.typeName, root.typeName);
assert.equal(rebuilt.libraryName, root.libraryName);
assert.equal(rebuilt.memberTypes?.currency, PrimitiveTypeEnumeration.Int32);
assert.equal(rebuilt.memberTypes?.elapsedTicks, PrimitiveTypeEnumeration.Int64);
assert.equal(rebuilt.memberTypes?.inventoryCounts, PrimitiveTypeEnumeration.Int16);
assert.equal(rebuilt.members.currency, 9999);
assert.equal(rebuilt.members.elapsedTicks, 2234567890123n);
assert.equal(rebuilt.members.playerName, 'Mariner');
assert.deepEqual(rebuilt.members.inventoryCounts, [1, 44, 3]);

const rebuiltStats = rebuilt.members.stats as NrbfObject;
assert.equal(rebuiltStats.members.fishCaught, 88);
assert.equal(rebuiltStats.members.sanity, 0.5);
assert.equal(rebuilt.members.statsAlias, rebuiltStats);

const unchangedBlob = await buildGeneric(file, (parsed.data as any).data);
assert.deepEqual(new Uint8Array(await unchangedBlob.arrayBuffer()), source);

const invalid = structuredClone((parsed.data as any).data);
invalid.currency = 2 ** 40;
await assert.rejects(() => buildGeneric(file, invalid), /outside its NRBF type range/);

// This fixture was produced by .NET BinaryFormatter and is retained as an independent wire-format check.
const dotnetFixture = Uint8Array.from(Buffer.from(
    'AAEAAAD/////AQAAAAAAAAAMAgAAAERTYW1wbGVMaWJyYXJ5LCBWZXJzaW9uPTEuMC4wLjAsIEN1bHR1cmU9bmV1dHJhbCwgUHVibGljS2V5VG9rZW49bnVsbAUBAAAAClNhbXBsZURhdGEFAAAABE5hbWUDQWdlCElzQWN0aXZlBVNjb3JlBlZhbHVlcwEAAAAHCAEGCAIAAAAGAwAAAA1IZWxsbywgV29ybGQhKgAAAAEfhetRuB4JQA8EAAAAAwAAAAgKAAAAFAAAAB4AAAAL',
    'base64'
));
const dotnetParsed = await parseGeneric(makeFile('sample.nrbf', dotnetFixture));
assert.equal(dotnetParsed.capabilities.canSave, true);
assert.equal((dotnetParsed.data as any).data.Name, 'Hello, World!');
assert.equal((dotnetParsed.data as any).data.Age, 42);
const dotnetEdited = structuredClone((dotnetParsed.data as any).data);
dotnetEdited.Age = 84;
dotnetEdited.Name = 'Edited from browser';
const dotnetRebuilt = await buildGeneric(makeFile('sample.nrbf', dotnetFixture), dotnetEdited);
const dotnetRoot = deserialize(new Uint8Array(await dotnetRebuilt.arrayBuffer())) as NrbfObject;
assert.equal(dotnetRoot.members.Age, 84);
assert.equal(dotnetRoot.members.Name, 'Edited from browser');
assert.deepEqual(dotnetRoot.members.Values, [10, 20, 30]);

console.log('NRBF round-trip suite passed.');
