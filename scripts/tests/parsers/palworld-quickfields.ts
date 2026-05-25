import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
    analyzePalworldQuickFields,
    buildPalworld,
    summarizePalworldPals,
    type PalworldFieldId,
    type PalworldQuickField,
} from '../../../src/lib/parsers/palworld';

interface FixtureCase {
    id: string;
    expectedFields: PalworldFieldId[];
    expectAmbiguous?: boolean;
    input: unknown;
}

interface FixtureFile {
    cases: FixtureCase[];
}

function toSet<T>(items: T[]): Set<T> {
    return new Set(items);
}

async function main() {
    const fixturePath = path.resolve(process.cwd(), 'scripts/fixtures/parsers/palworld-quickfields.json');
    const fixtureRaw = await fs.readFile(fixturePath, 'utf8');
    const fixture = JSON.parse(fixtureRaw) as FixtureFile;

    assert.ok(Array.isArray(fixture.cases), 'Fixture "cases" must be an array.');
    assert.ok(fixture.cases.length >= 20, 'Fixture set must contain at least 20 cases.');

    let tp = 0;
    let fp = 0;
    let fn = 0;
    let negatives = 0;
    let falsePositiveCases = 0;

    for (const testCase of fixture.cases) {
        const analysis = analyzePalworldQuickFields(testCase.input);
        const predicted = analysis.quickFields;
        const predictedIds = predicted.map((field) => field.id);
        const predictedSet = toSet(predictedIds);
        const expectedSet = toSet(testCase.expectedFields);

        predicted.forEach((field: PalworldQuickField) => {
            assert.equal(typeof field.score, 'number', `Case ${testCase.id}: quick field score must be numeric.`);
            assert.ok(field.evidence.length > 0, `Case ${testCase.id}: quick field evidence must be non-empty.`);
        });

        if (testCase.expectAmbiguous) {
            assert.ok(
                analysis.stats.ambiguous > 0,
                `Case ${testCase.id}: expected ambiguous quick-field selection but none recorded.`
            );
        }

        if (testCase.expectedFields.length === 0) {
            negatives += 1;
            if (predictedIds.length > 0) falsePositiveCases += 1;
        }

        for (const id of predictedIds) {
            if (expectedSet.has(id)) {
                tp += 1;
            } else {
                fp += 1;
            }
        }

        for (const id of testCase.expectedFields) {
            if (!predictedSet.has(id)) {
                fn += 1;
            }
        }
    }

    const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
    const falsePositiveRate = negatives === 0 ? 0 : falsePositiveCases / negatives;

    assert.ok(
        precision >= 0.9,
        `Palworld quick-fields precision below threshold: ${precision.toFixed(3)} < 0.900`
    );
    assert.ok(
        falsePositiveRate <= 0.1,
        `Palworld quick-fields falsePositiveRate above threshold: ${falsePositiveRate.toFixed(3)} > 0.100`
    );
    assert.ok(recall >= 0.8, `Palworld quick-fields recall below threshold: ${recall.toFixed(3)} < 0.800`);

    const pals = summarizePalworldPals({
        PlayerSaveData: {
            Pals: [
                { PalId: 'JetDragon', Level: 50 },
                { NickName: 'Worker', Level: 12 },
            ],
        },
    });
    assert.equal(pals.candidateCount, 2);
    assert.equal(pals.candidates[0].label, 'JetDragon');
    assert.equal(pals.candidates[0].level, 50);
    await assert.rejects(
        () => buildPalworld(new File([new Uint8Array([1, 2, 3])], 'Level.sav'), { jsonView: { WorldSaveData: {} } } as any),
        /world saves are read-only/i
    );

    console.log(
        `Palworld quick-field metrics passed: precision=${precision.toFixed(3)}, recall=${recall.toFixed(3)}, falsePositiveRate=${falsePositiveRate.toFixed(3)}.`
    );
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
