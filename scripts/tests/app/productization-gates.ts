import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { editors } from '../../../src/data/editors';
import { gamePresets, getCoverageRows, sampleRecords } from '../../../src/data/capability';
import { GENERIC_SAVE_EXTENSIONS, SMART_UPLOAD_ACCEPT } from '../../../src/lib/saveExtensions';

const roots = ['src/pages', 'src/content', 'src/i18n', 'src/data', 'src/components'];
const realSampleLaunchTarget = 10;

const claimPatterns = [
    /all games/i,
    /\bany games?\b/i,
    /all formats/i,
    /any save/i,
    /unlimited/i,
    /god mode/i,
    /god[- ]?tier/i,
    /perfect save/i,
    /zero risk/i,
    /no ban/i,
    /never uploaded/i,
    /never upload/i,
    /most advanced/i,
    /world'?s most/i,
    /80\+ supported games/i,
    /所有游戏(都|均|支持|格式|存档)/,
    /所有格式/,
    /万能/,
    /无限/,
    /最强/,
    /最先进/,
    /完美存档/,
    /零风险/,
    /不会封号/,
    /80タイトル以上/,
    /最も安全/,
    /完全無料/,
    /전 세계에서 가장/,
    /가장\s*진보/,
    /무한/,
    /완전히\s*지원/,
    /철저히\s*보호/,
    /сервер[^\n.]+не переда/i,
    /исключительно внутри вашего браузера/i,
    /самый продвинутый/i,
    /абсолютно любые/i,
    /неограниченн/i,
    /полностью бесплат/i,
    /арсенал совместимости огромен/i,
    /el mejor editor/i,
    /Pack de Partidas Dios/i,
    /Pack Deus/i,
];

async function listFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
        entries.map((entry) => {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) return listFiles(fullPath);
            return /\.(astro|ts|tsx|md)$/.test(entry.name) ? [fullPath] : [];
        })
    );
    return files.flat();
}

async function text(relativePath: string): Promise<string> {
    return fs.readFile(path.resolve(process.cwd(), relativePath), 'utf8');
}

const sourceFiles = (await Promise.all(roots.map(listFiles))).flat();
const claimViolations: string[] = [];

for (const file of sourceFiles) {
    const content = await fs.readFile(file, 'utf8');
    if (file.endsWith('scripts/tests/app/productization-gates.ts')) continue;
    for (const pattern of claimPatterns) {
        if (pattern.test(content)) {
            claimViolations.push(`${file}: ${pattern}`);
        }
    }
}

assert.deepEqual(claimViolations, []);

const config = await text('astro.config.mjs');
assert.match(config, /cloudflare\(\{\s*imageService:\s*'compile'\s*\}\)/s);
assert.match(config, /session:\s*\{\s*driver:\s*'memory'/s);

const apiParse = await text('src/pages/api/parse.ts');
assert.match(apiParse, /export const prerender = false/);

const homeTemplate = await text('src/components/templates/HomeTemplate.astro');
assert.match(homeTemplate, /SMART_UPLOAD_ACCEPT/);
for (const ext of GENERIC_SAVE_EXTENSIONS) {
    assert.ok(SMART_UPLOAD_ACCEPT.includes(`.${ext}`), `Home upload accept is missing .${ext}.`);
}

const ingest = await text('src/lib/ingest.ts');
assert.match(ingest, /GENERIC_DOTTED_EXTENSION_SET\.has\(ext\)/);
assert.doesNotMatch(ingest, /Generic format inspector/);

const header = await text('src/components/Header.astro');
const mobileEditors = header.match(/<!-- Editors Submenu -->([\s\S]*?)<\/div>/)?.[1] || '';
assert.match(mobileEditors, /\/editor\/palworld/);
assert.match(mobileEditors, /\/editor\/generic/);

const saveEditor = await text('src/components/SaveEditor.tsx');
assert.match(saveEditor, /buildDownloadPackage/);
assert.doesNotMatch(saveEditor, /downloadBlob\(file,/);

const genericEditor = editors.find((editor) => editor.slug === 'generic');
assert.ok(genericEditor);
assert.match(genericEditor.name, /Editor/);
assert.match(genericEditor.title, /Editor/);
assert.match(genericEditor.description, /Browser editor/i);
assert.match(genericEditor.keywords, /zip save editor|base64 save editor|sqlite save editor|sol save editor|es3 save editor/i);
assert.match(genericEditor.description, /ZIP|Base64|LZString|BZip2|LZ4|Zstd|BSON|YAML|TOML|CSV/);
assert.match(genericEditor.fileType, /\.sqlite3/);
assert.match(genericEditor.fileType, /\.bson/);
assert.match(genericEditor.fileType, /\.zip/);
assert.match(genericEditor.fileType, /\.lzstring/);
assert.match(genericEditor.fileType, /\.zstd/);
assert.doesNotMatch(genericEditor.keywords, /pickle save editor/i);

for (const sample of sampleRecords) {
    assert.ok(sample.parserTestIds.length > 0 || sample.sampleKind === 'structure-only', `${sample.id}: missing parser evidence.`);
    if (sample.sampleKind === 'real-anonymized') {
        assert.equal(sample.privacyLevel, 'private-regression', `${sample.id}: real samples must stay private regression records.`);
        assert.equal(sample.evidenceScope, 'game-specific', `${sample.id}: real samples must be game-specific.`);
    }
}

for (const preset of gamePresets) {
    const row = getCoverageRows().find((item) => item.slug === preset.slug);
    assert.ok(row, `${preset.slug}: missing coverage row.`);
    if (row.realSampleCount < realSampleLaunchTarget) {
        assert.notEqual(row.evidenceScope.includes('game-specific') && row.confidence === 'verified', true, `${preset.slug}: game-specific launch needs ${realSampleLaunchTarget} real samples.`);
    }
}

const coverageProof = await text('src/pages/coverage-proof.astro');
assert.match(coverageProof, /zero real-sample count/i);

console.log('Productization gate suite passed.');
