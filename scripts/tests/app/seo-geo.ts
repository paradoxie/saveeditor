import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { games, localizeGamePage } from '../../../src/data/games';

const text = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

for (const game of games) {
    assert.ok(existsSync(`public${game.image}`), `${game.slug}: game image must exist or use the approved fallback.`);
    assert.ok(game.longTailTermsByLocale.en.some((term) => term.includes('save file location')), `${game.slug}: English long-tail save location term missing.`);
    assert.ok(game.longTailTermsByLocale.en.some((term) => term.includes('save folder')), `${game.slug}: English save folder term missing.`);
    assert.ok(game.longTailTermsByLocale.en.some((term) => term.includes('no download')), `${game.slug}: English no-download term missing.`);
    assert.ok(game.longTailTermsByLocale['zh-cn'].some((term) => term.includes('存档位置')), `${game.slug}: Chinese save location term missing.`);
    assert.ok(game.longTailTermsByLocale['zh-cn'].some((term) => term.includes('存档修改')), `${game.slug}: Chinese edit term missing.`);
    assert.ok(game.longTailTermsByLocale['zh-cn'].some((term) => term.includes('无需下载')), `${game.slug}: Chinese no-download term missing.`);
    assert.ok(game.longTailTermsByLocale.ja.some((term) => term.includes('セーブ場所')), `${game.slug}: Japanese save location term missing.`);
    assert.ok(game.longTailTermsByLocale.ja.some((term) => term.includes('セーブ改造')), `${game.slug}: Japanese edit term missing.`);
    assert.ok(game.longTailTermsByLocale.ja.some((term) => term.includes('ダウンロード不要')), `${game.slug}: Japanese no-download term missing.`);
    assert.ok(game.imageAltByLocale.en.includes(game.format), `${game.slug}: English image alt must mention format.`);
    assert.ok(game.imageAltByLocale['zh-cn'].includes('存档编辑器'), `${game.slug}: Chinese image alt must mention save editor.`);
    assert.ok(game.imageAltByLocale.ja.includes('セーブエディタ'), `${game.slug}: Japanese image alt must mention save editor.`);
    assert.doesNotMatch(game.imageAltByLocale.en, /interface/i, `${game.slug}: English image alt must not claim an interface screenshot.`);
    assert.doesNotMatch(game.imageAltByLocale['zh-cn'], /界面/, `${game.slug}: Chinese image alt must not claim an interface screenshot.`);
    assert.doesNotMatch(game.imageAltByLocale.ja, /画面/, `${game.slug}: Japanese image alt must not claim an interface screenshot.`);

    const zh = localizeGamePage(game, 'zh-cn', game.name);
    const ja = localizeGamePage(game, 'ja', game.name);
    assert.ok(zh.seoDescriptionByLocale['zh-cn'].includes(game.format), `${game.slug}: zh SEO description must mention format.`);
    assert.ok(ja.seoDescriptionByLocale.ja.includes(game.format), `${game.slug}: ja SEO description must mention format.`);
}

const baseLayout = text('../../../src/layouts/BaseLayout.astro');
assert.match(baseLayout, /SITE_LOCALES/);
assert.match(baseLayout, /localizedUrl\(Astro\.url\.pathname/);
assert.doesNotMatch(baseLayout, /https:\/\/saveeditor\.top\$\{basePath\}/);

for (const path of [
    '../../../src/pages/games/[slug].astro',
    '../../../src/pages/zh-cn/games/[slug].astro',
    '../../../src/pages/ja/games/[slug].astro',
]) {
    const source = text(path);
    assert.match(source, /coverage-proof/);
    assert.match(source, /sourceRefs/);
    assert.match(source, /BreadcrumbList/);
    assert.match(source, /SoftwareApplication/);
    assert.match(source, /FAQPage/);
    assert.match(source, /imageAltByLocale/);
    assert.match(source, /alt=""/);
}

const zhGamePage = text('../../../src/pages/zh-cn/games/[slug].astro');
const jaGamePage = text('../../../src/pages/ja/games/[slug].astro');
assert.doesNotMatch(zhGamePage, /save file location, \$\{game\.format\} editor/);
assert.doesNotMatch(jaGamePage, /save file location, \$\{game\.format\} editor/);
assert.match(zhGamePage, /\/zh-cn\/coverage-proof/);
assert.match(jaGamePage, /\/ja\/coverage-proof/);

const config = text('../../../astro.config.mjs');
assert.doesNotMatch(config, /lastmod:\s*new Date/);

const indexUrls = text('../../search-console-urls.js');
const indexNow = text('../../submit-indexnow.js');
for (const slug of games.map((game) => game.slug)) {
    assert.match(indexUrls, new RegExp(`'${slug}'`), `${slug}: missing from Search Console slug list.`);
    assert.match(indexNow, new RegExp(`'${slug}'`), `${slug}: missing from IndexNow slug list.`);
}
assert.match(indexUrls, /\/games\/\$\{slug\}/);
assert.match(indexUrls, /fullLocales = \['zh-cn', 'ja'\]/);
assert.match(indexUrls, /\/\$\{locale\}\/games\/\$\{slug\}/);
assert.match(indexNow, /\/games\/\$\{slug\}/);
assert.match(indexNow, /fullLocales = \['zh-cn', 'ja'\]/);
assert.match(indexNow, /\/\$\{locale\}\/games\/\$\{slug\}/);
for (const required of ['/llms.txt', '/llms-full.txt', '/coverage-proof', '/compatibility', '/formats']) {
    assert.match(indexUrls, new RegExp(required.replace('.', '\\.')));
    assert.match(indexNow, new RegExp(required.replace('.', '\\.')));
}
assert.match(indexUrls, /\/\$\{locale\}\/coverage-proof/);
assert.match(indexNow, /\/\$\{locale\}\/coverage-proof/);

const llms = text('../../../public/llms.txt');
const llmsFull = text('../../../public/llms-full.txt');
assert.match(llms, /Language Coverage/);
assert.match(llms, /\/zh-cn\/coverage-proof/);
assert.match(llms, /\/ja\/coverage-proof/);
assert.match(llmsFull, /Coverage proof/);
assert.match(llmsFull, /\| 简体中文 \| \/zh-cn\/ \| Full \|/);
assert.match(llmsFull, /\| 日本語 \| \/ja\/ \| Full \|/);
assert.match(llmsFull, /\/zh-cn\/games\//);
assert.match(llmsFull, /\/ja\/games\//);
assert.doesNotMatch(llmsFull, /\| 한국어 .* Full \|/);
assert.doesNotMatch(llmsFull, /\| Português .* Full \|/);
assert.doesNotMatch(llmsFull, /\| Español .* Full \|/);
assert.doesNotMatch(llmsFull, /\| Русский .* Full \|/);
assert.doesNotMatch(llmsFull, /80\+ supported games/);

console.log('SEO/GEO suite passed.');
