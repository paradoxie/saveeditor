import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gamePresets, getCoverageRows, getPreset, sampleRecords } from '../../../src/data/capability';
import { games } from '../../../src/data/games';
import { buildDiffProposal } from '../../../src/lib/diffWizard';
import { executePresetAction, resolvePresetFields, setPresetFieldValue } from '../../../src/lib/presetRuntime';
import { buildRejectedSupportPackFromFile, buildSupportPack } from '../../../src/lib/supportPack';
import { makeOutcome } from '../../../src/lib/parsers/types';

const sampleIds = new Set(sampleRecords.map((sample) => sample.id));

for (const sample of sampleRecords) {
    assert.ok(sample.id, 'Sample record needs id.');
    assert.ok(sample.gameSlug, `${sample.id}: gameSlug is required.`);
    assert.ok(sample.parserTestIds.length > 0 || sample.sampleKind === 'structure-only', `${sample.id}: needs parser tests or structure-only status.`);
    assert.notEqual(sample.privacyLevel, undefined, `${sample.id}: privacy level is required.`);
    assert.ok(sample.evidenceScope, `${sample.id}: evidence scope is required.`);
    assert.ok(sample.verifiedFeatures.length > 0, `${sample.id}: verified features are required.`);
}

for (const preset of gamePresets) {
    const resolved = getPreset(preset.slug);
    assert.ok(preset.fields.length > 0, `${preset.slug}: preset fields are required.`);
    assert.ok(preset.limits.length > 0, `${preset.slug}: preset limits are required.`);
    if (resolved?.confidence === 'verified') {
        assert.ok(preset.sampleRecordIds.length > 0, `${preset.slug}: verified preset needs sample records.`);
        for (const id of preset.sampleRecordIds) {
            assert.ok(sampleIds.has(id), `${preset.slug}: unknown sample record ${id}.`);
        }
        if (preset.slug !== 'rpg-maker' && !preset.slug.endsWith('-engine')) {
            assert.ok(
                resolved.samples.some((sample) =>
                    sample.evidenceScope === 'game-specific' &&
                    sample.sampleKind === 'real-anonymized' &&
                    sample.appliesTo.includes(preset.slug)
                ),
                `${preset.slug}: game-level verified requires real anonymized game-specific evidence.`
            );
        }
    }
}

for (const game of games) {
    const preset = getPreset(game.presetSlug || game.slug);
    if (!preset) continue;
    assert.deepEqual(game.editorQuickEditTargets, preset.fields.map((field) => field.label), `${game.slug}: editor quick targets must come from preset catalog.`);
    assert.equal(game.presetConfidence, preset.confidence, `${game.slug}: page preset status must match capability status.`);
    if (preset.confidence !== 'verified') {
        assert.equal(game.editorVerifiedItems.length, 0, `${game.slug}: candidate pages must not show verified editor fields.`);
    }
}

const diff = buildDiffProposal(
    { before: { party: { gold: 10 }, persistent: { gallery: false }, actor: { level: 1 } }, after: { party: { gold: 999 }, persistent: { gallery: true }, actor: { level: 8 } } }
);
assert.equal(diff.status, 'ok');
assert.ok(diff.candidates.some((candidate) => candidate.path.join('.') === 'party.gold'));
assert.ok(diff.presetProposal?.fields.some((field) => field.pathSelector.join('.') === 'persistent.gallery'));

const same = buildDiffProposal({ before: { gold: 1 }, after: { gold: 1 } });
assert.equal(same.status, 'rejected');

const outcome = makeOutcome({
    engine: 'generic',
    format: 'generic-test',
    mode: 'unsupported',
    reasonCode: 'parse_failed',
    capabilities: { canView: false, canEdit: false, canSave: false, roundTripSupport: 'none' },
    data: { playerName: 'Alice', money: 100 },
});
const pack = buildSupportPack(outcome, new File(['secret'], 'AliceSave.rvdata2'), 'test-parser', 'parse_failed', new Uint8Array([1, 2, 3, 4]));
assert.equal(pack.fileName, 'redacted.rvdata2');
assert.equal(pack.reasonCode, 'parse_failed');
assert.ok(!JSON.stringify(pack).includes('AliceSave'));
assert.ok(!JSON.stringify(pack).includes('Alice'));
assert.ok(!('headerHex' in pack.signature));
assert.ok(!('asciiPreview' in pack.signature));
const rejectedPack = await buildRejectedSupportPackFromFile({
    file: new File(['secret'], 'AliceSave.rvdata2'),
    parserPath: 'test-parser',
    failureStage: 'unsupported_extension',
    reasonCode: 'unsupported_extension',
    format: '.rvdata2',
});
assert.notEqual(rejectedPack.signature.byteHash, 'fnv1a-811c9dc5');

const coverage = getCoverageRows();
assert.ok(coverage.some((row) => row.slug === 'palworld' && row.sampleCount >= 2));
assert.ok(coverage.every((row) => row.confidence !== 'verified' || row.sampleCount > 0));
assert.ok(coverage.every((row) => row.confidence === 'verified' || row.verifiedFeatures.length === 0));
assert.ok(coverage.some((row) => row.slug === 'palworld' && row.candidateFeatures.includes('Player Level')));
assert.equal(getPreset('fear-and-hunger')?.confidence, 'candidate');
assert.equal(getPreset('katawa-shoujo')?.confidence, 'candidate');
assert.equal(getPreset('palworld')?.confidence, 'candidate');
assert.equal(getPreset('renpy-engine')?.confidence, 'verified');

const rpgRoot = {
    party: { _gold: 10, _items: { '1': 1 }, _weapons: { '2': 1 }, _armors: { '3': 1 } },
    actors: { _data: [null, { _actorId: 1, _level: 2, _exp: { 1: 5 }, _hp: 20, _mp: 7, _paramPlus: [0, 0, 0, 0] }] },
    _variables: [null, 1],
    _switches: [null, false],
};
assert.equal(executePresetAction(rpgRoot, 'set-gold', { path: ['party', '_gold'], value: 999 }).party._gold, 999);
assert.equal(executePresetAction(rpgRoot, 'set-level', { path: ['actors', '_data', 1, '_level'], value: 9 }).actors._data[1]._level, 9);
assert.equal(executePresetAction(rpgRoot, 'set-exp', { path: ['actors', '_data', 1, '_exp', 1], value: 777 }).actors._data[1]._exp[1], 777);
assert.equal(executePresetAction(rpgRoot, 'set-hp-mp', { path: ['actors', '_data', 1, '_hp'], value: 88 }).actors._data[1]._hp, 88);
assert.equal(executePresetAction(rpgRoot, 'set-variable', { path: ['_variables', 1], value: 42 })._variables[1], 42);
assert.equal(executePresetAction(rpgRoot, 'set-switch', { path: ['_switches', 1], value: true })._switches[1], true);
assert.equal(executePresetAction(rpgRoot, 'all-items-99', { mapPath: ['party', '_items'], value: 99 }).party._items['1'], 99);
assert.equal(executePresetAction(rpgRoot, 'add-item', { mapPath: ['party', '_items'], itemId: '5', value: 99 }).party._items['5'], 99);
assert.equal(executePresetAction(rpgRoot, 'set-gold', { path: ['actors', '_data', 1, '_level'], value: 500 }).actors._data[1]._level, 2);

const renpyFields = resolvePresetFields({ persistent: { galleryUnlocked: false, counter: 1 }, store: { galleryUnlocked: false } }, 'renpy-engine', {
    canEditPath: (path) => path[0] === 'persistent',
});
const renpyBoolean = renpyFields.find((field) => field.path.join('.') === 'persistent.galleryUnlocked');
assert.ok(renpyBoolean);
assert.equal(setPresetFieldValue({ persistent: { galleryUnlocked: false } }, renpyBoolean!, true).persistent.galleryUnlocked, true);

const saveEditorSource = readFileSync(new URL('../../../src/components/SaveEditor.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(saveEditorSource, /format === 'renpy'\) return 'katawa-shoujo'/);
assert.doesNotMatch(saveEditorSource, /format === 'unity'\) return 'stardew-valley'/);
assert.match(saveEditorSource, /renpy-engine/);

const presetRuntimeSource = readFileSync(new URL('../../../src/lib/presetRuntime.ts', import.meta.url), 'utf8');
assert.doesNotMatch(presetRuntimeSource, /\|\| preset\.fields\.find\(\(field\) => field\.valueType === typeof value\)/);
assert.match(presetRuntimeSource, /canWritePresetField/);
assert.doesNotMatch(presetRuntimeSource, /pathToken\.endsWith\(selectorToken\)/);

const apiParseSource = readFileSync(new URL('../../../src/pages/api/parse.ts', import.meta.url), 'utf8');
assert.match(apiParseSource, /buildRejectedSupportPack/);
assert.doesNotMatch(apiParseSource, /diagnostics: null/);
assert.match(apiParseSource, /isUploadedFile/);

const quickFieldSource = readFileSync(new URL('../../../src/components/editors/QuickFieldEditor.tsx', import.meta.url), 'utf8');
assert.match(quickFieldSource, /supportHref/);
assert.match(quickFieldSource, /preset\?\.confidence === 'verified'\) return \[\]/);
assert.match(quickFieldSource, /Open diff wizard/);
assert.doesNotMatch(quickFieldSource, /nextData = setValueAtPath\(nextData, field\.path, 99\)/);

const diffWizardSource = readFileSync(new URL('../../../src/components/editors/BeforeAfterDiffWizard.tsx', import.meta.url), 'utf8');
assert.match(diffWizardSource, /format_family_mismatch/);
assert.match(diffWizardSource, /identical_files/);
assert.match(diffWizardSource, /diff_rejected/);

const genericParserSource = readFileSync(new URL('../../../src/lib/parsers/generic.ts', import.meta.url), 'utf8');
assert.doesNotMatch(genericParserSource, /headerHex|asciiPreview/);
assert.match(genericParserSource, /redacted/);

console.log('Capability flywheel suite passed.');
