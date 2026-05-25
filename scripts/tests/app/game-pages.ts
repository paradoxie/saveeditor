import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { games, localizeGamePage } from '../../../src/data/games';

const requiredSlugs = [
    'omori',
    'lisa-the-painful',
    'to-the-moon',
    'mad-father',
    'oneshot',
    'katawa-shoujo',
    'fear-and-hunger',
    'ib',
    'yume-nikki',
    'the-witchs-house',
    'ao-oni',
    'mogeko-castle',
    'misao',
    'off',
    'wadanohara',
    'pocket-mirror',
    'hello-charlotte',
    'teaching-feeling',
    'being-a-dik',
    'summertime-saga',
];

for (const slug of requiredSlugs) {
    const game = games.find((item) => item.slug === slug);
    assert.ok(game, `Missing game landing page data: ${slug}`);
    assert.ok(game.sourceRefs.length > 0, `${slug}: source references are required.`);
    assert.ok(
        game.sourceRefs.some((ref) => ref.url.startsWith('https://')),
        `${slug}: at least one external source reference is required.`
    );
    assert.ok(
        game.sourceRefs.every((ref) => !ref.url.includes('/w/index.php?search=')),
        `${slug}: search result pages are not acceptable source references.`
    );
    assert.ok(
        game.sourceRefs.every((ref) => !ref.url.includes('saveeditor.top')),
        `${slug}: source references must not cite our own pages as evidence.`
    );
    assert.notEqual(
        game.supportLimits[0],
        `Best results require the listed ${game.format} file format.`,
        `${slug}: support limits must be game-specific.`
    );
    assert.notEqual(
        game.failureReasons[0],
        'Wrong file selected, such as a metadata, backup, or cloud placeholder file.',
        `${slug}: failure reasons must be game-specific.`
    );
    assert.doesNotMatch(
        `${game.saveLocations.windows} ${game.saveLocations.mac} ${game.saveLocations.linux}`,
        /Game folder\\www\\save or Game folder\\Save|game folder save directory|Game folder\/www\/save or game folder\/Save/,
        `${slug}: save paths must not be generic template paths.`
    );
}

for (const game of games) {
    assert.ok(game.editorPath, `${game.slug}: upload entry is required.`);
    assert.ok(game.saveLocations.windows && game.saveLocations.mac && game.saveLocations.linux, `${game.slug}: save paths are required.`);
    assert.ok(game.editableItems.length > 0, `${game.slug}: editable fields are required.`);
    assert.ok(game.sourceRefs.length > 0, `${game.slug}: source references are required.`);
    assert.ok(game.seoContent, `${game.slug}: english SEO content is required.`);
    assert.ok(game.supportLimits.length > 0, `${game.slug}: support limits are required.`);
    assert.ok(game.failureReasons.length > 0, `${game.slug}: failure reasons are required.`);
    assert.ok(game.quickEditTargets.length > 0, `${game.slug}: quick edit targets are required.`);
    assert.ok(game.backupSteps.length > 0, `${game.slug}: backup steps are required.`);
    const zh = localizeGamePage(game, 'zh-cn', game.name);
    const ja = localizeGamePage(game, 'ja', game.name);
    assert.ok(zh.seoContent && ja.seoContent, `${game.slug}: zh/ja SEO content is required.`);
    assert.notEqual(zh.faq[0]?.question, game.faq[0]?.question, `${game.slug}: zh FAQ must be localized.`);
    assert.notEqual(ja.faq[0]?.question, game.faq[0]?.question, `${game.slug}: ja FAQ must be localized.`);
    assert.doesNotMatch(JSON.stringify(zh.supportLimits), /Best results require|Wrong file selected/i, `${game.slug}: zh support copy must not be raw English.`);
    assert.doesNotMatch(JSON.stringify(ja.supportLimits), /Best results require|Wrong file selected/i, `${game.slug}: ja support copy must not be raw English.`);
}

const saveEditorSource = readFileSync(new URL('../../../src/components/SaveEditor.tsx', import.meta.url), 'utf8');
assert.match(saveEditorSource, /format === 'rpgmaker' \|\| format === 'rpgmaker-ruby-marshal'/);
assert.match(saveEditorSource, /GenericInspector/);
assert.match(saveEditorSource, /editor\.palworldDedicatedBoundary/);
assert.match(saveEditorSource, /parseSaveFileSafe/);
assert.doesNotMatch(saveEditorSource, /Read-only Ruby Marshal preview/);
assert.doesNotMatch(saveEditorSource, /export is disabled until safe Marshal rebuilding/);

const rpgMakerSource = readFileSync(new URL('../../../src/components/editors/RpgMakerEditor.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(rpgMakerSource, /extractRpgRtLdbNames/);
assert.match(rpgMakerSource, /RPG_RT\.ldb/);
assert.match(rpgMakerSource, /parseLcfDatabaseNames/);
assert.match(rpgMakerSource, /folderContext\.actors/);
assert.match(rpgMakerSource, /HP Mod/);
assert.match(rpgMakerSource, /Object\.keys\(itemCatalog\)/);
assert.match(rpgMakerSource, /Object\.keys\(names\)/);
assert.match(rpgMakerSource, /mergeNameMaps\(folderContext\.items, folderContext\.weapons, folderContext\.armors\)/);
assert.match(rpgMakerSource, /folderContext\.switches\[idx\] \|\| val === true/);
assert.match(rpgMakerSource, /: idx\] = val/);
assert.match(rpgMakerSource, /folderContext\.variables\[idx\]/);

const lcfSource = readFileSync(new URL('../../../src/lib/parsers/lcf.ts', import.meta.url), 'utf8');
assert.match(lcfSource, /const editable = \[/);
assert.match(lcfSource, /hasChunk\(inventory, INV_GOLD\)/);
assert.match(lcfSource, /missingChunks/);
assert.doesNotMatch(lcfSource, /requireChunk\(file\.chunks, LSD_SYSTEM/);
assert.doesNotMatch(lcfSource, /requireChunk\(file\.chunks, LSD_INVENTORY/);

const apiParseSource = readFileSync(new URL('../../../src/pages/api/parse.ts', import.meta.url), 'utf8');
const parseServiceSource = readFileSync(new URL('../../../src/lib/parseSaveFile.ts', import.meta.url), 'utf8');
assert.match(apiParseSource, /parseSaveFileSafe/);
assert.match(parseServiceSource, /parseRenpy/);
assert.match(parseServiceSource, /parseGeneric/);
assert.match(parseServiceSource, /parsePalworld/);
assert.match(parseServiceSource, /RPG_MAKER_EXTENSIONS/);

const llmsFullSource = readFileSync(new URL('../../../public/llms-full.txt', import.meta.url), 'utf8');
assert.match(llmsFullSource, /Limited stable write/);
assert.doesNotMatch(llmsFullSource, /Editing is experimental/);

const genericInspectorSource = readFileSync(new URL('../../../src/components/editors/GenericInspector.tsx', import.meta.url), 'utf8');
assert.match(genericInspectorSource, /editor\.genericInspectorBody/);
assert.doesNotMatch(genericInspectorSource, /This format is decoded for inspection/);

const benchmarkSource = readFileSync(new URL('../../../scripts/tests/parsers/benchmark-report.ts', import.meta.url), 'utf8');
assert.match(benchmarkSource, /roundTripOk: 'n\/a'/);
assert.doesNotMatch(benchmarkSource, /roundTripOk: true,[\s\S]{0,120}detail: parseOk \? String\(parsed\.reasonCode\)/);

for (const matrixPath of [
    '../../../src/content/compatibility/matrix.md',
    '../../../src/content/matrix/zh-cn/matrix.md',
    '../../../src/content/matrix/ko/matrix.md',
]) {
    const matrixSource = readFileSync(new URL(matrixPath, import.meta.url), 'utf8');
    assert.doesNotMatch(matrixSource, /zlib[^。\n]*只读|zlib[^.\n]*read-only|zlib[^.\n]*읽기 전용/i);
}

const zhGamePage = readFileSync(new URL('../../../src/pages/zh-cn/games/[slug].astro', import.meta.url), 'utf8');
const jaGamePage = readFileSync(new URL('../../../src/pages/ja/games/[slug].astro', import.meta.url), 'utf8');
for (const [label, source] of [['zh-cn', zhGamePage], ['ja', jaGamePage]] as const) {
    assert.match(source, /baseGames\.map/);
    assert.match(source, /localizeGamePage/);
    assert.match(source, /editorVerifiedItems/);
    assert.match(source, /editorQuickEditTargets/);
    assert.match(source, /game\.seoContent/);
    assert.doesNotMatch(source, /\.\.\.\((zhOverrides|jaOverrides)\[game\.slug\] \?\? \{\}\)/);
    assert.doesNotMatch(source, /\b(editableItems|supportLimits|failureReasons|quickEditTargets|backupSteps|sourceRefs|saveLocations|engine|format|editorPath|emoji):/);
}

const uiSource = readFileSync(new URL('../../../src/i18n/ui.ts', import.meta.url), 'utf8');
assert.doesNotMatch(uiSource, /Older Ruby Marshal formats \(\.rvdata2\/\.rvdata\/\.rxdata\) are currently not editable/);
assert.doesNotMatch(uiSource, /旧Ruby Marshal形式 \(\.rvdata2\/\.rvdata\/\.rxdata\) は現在Web版では未対応/);
assert.doesNotMatch(uiSource, /旧版 Ruby Marshal 格式 \(\.rvdata2\/\.rvdata\/\.rxdata\) 目前在网页编辑器中暂不支持/);

console.log('Game landing page data suite passed.');
