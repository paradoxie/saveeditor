import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pako from 'pako';
import { appendUploadToken, buildIngestUrl, detectIngestRoute, readUploadToken } from '../../../src/lib/ingest';
import { editors } from '../../../src/data/editors';
import { localizePath } from '../../../src/i18n/utils';

function makeFile(name: string, bytes: Uint8Array, type = 'application/octet-stream'): File {
    return new File([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], name, { type });
}

async function main() {
    const rpgmaker = await detectIngestRoute(
        makeFile('slot1.rpgsave', new TextEncoder().encode('{"party":{"_gold":1}}'))
    );
    assert.equal(rpgmaker.engine, 'rpg-maker-mv');
    assert.equal(rpgmaker.confidence, 'high');

    const renpyHeader = new TextEncoder().encode("Ren'Py Save Game 8.0\n");
    const renpyBody = pako.deflateRaw(new TextEncoder().encode('{"persistent":{"coins":1}}'));
    const renpyBytes = new Uint8Array(renpyHeader.length + renpyBody.length);
    renpyBytes.set(renpyHeader, 0);
    renpyBytes.set(renpyBody, renpyHeader.length);
    const renpy = await detectIngestRoute(makeFile('slot.save', renpyBytes));
    assert.equal(renpy.engine, 'renpy');
    assert.equal(renpy.confidence, 'high');

    const palworld = await detectIngestRoute(
        makeFile('Player.sav', new Uint8Array([0x47, 0x56, 0x41, 0x53, 0x00, 0x01]))
    );
    assert.equal(palworld.engine, 'palworld');
    assert.ok(palworld.alternateRoutes.some((route) => route.engine === 'unreal'));

    const genericSav = await detectIngestRoute(
        makeFile('profile.sav', new Uint8Array([0x47, 0x56, 0x41, 0x53, 0x00, 0x01]))
    );
    assert.equal(genericSav.engine, 'unreal');
    assert.ok(genericSav.alternateRoutes.some((route) => route.engine === 'palworld'));

    const unityPrefs = await detectIngestRoute(
        makeFile('prefsFile.prefs', new TextEncoder().encode('<prefs />'), 'application/xml')
    );
    assert.equal(unityPrefs.engine, 'unity');

    const unityEditor = editors.find((editor) => editor.slug === 'unity');
    assert.ok(unityEditor);
    assert.match(unityEditor.fileType, /\.prefs/);

    const rvdata2 = await detectIngestRoute(makeFile('Save01.rvdata2', new Uint8Array([4, 8])));
    assert.equal(rvdata2.engine, 'rpg-maker-mv');
    const lsd = await detectIngestRoute(makeFile('Save01.lsd', new Uint8Array([1, 2, 3])));
    assert.equal(lsd.engine, 'rpg-maker-mv');
    const rpgMakerEditor = editors.find((editor) => editor.slug === 'rpg-maker-mv');
    assert.ok(rpgMakerEditor);
    assert.match(rpgMakerEditor.fileType, /\.rvdata2/);
    assert.match(rpgMakerEditor.fileType, /\.lsd/);

    const generic = await detectIngestRoute(makeFile('save.msgpack', new Uint8Array([0x80])));
    assert.equal(generic.engine, 'generic');
    const nrbf = await detectIngestRoute(makeFile('save.nrbf', new Uint8Array([0, 1, 0, 0, 0, 255, 255, 255, 255])));
    assert.equal(nrbf.engine, 'generic');
    const genericEditor = editors.find((editor) => editor.slug === 'generic');
    assert.ok(genericEditor);
    assert.match(genericEditor.fileType, /\.msgpack/);
    assert.match(genericEditor.fileType, /\.nrbf/);

    for (const result of [rpgmaker, renpy, palworld, genericSav, unityPrefs, rvdata2, generic]) {
        const editor = editors.find((item) => item.slug === result.engine);
        assert.ok(editor);
        const ext = result === unityPrefs ? '.prefs' : result === rvdata2 ? '.rvdata2' : makeExtForEngine(result.engine);
        assert.match(editor.fileType, new RegExp(ext.replace('.', '\\.')));
    }

    assert.equal(buildIngestUrl('abc123', 'en'), '/ingest/?uploadToken=abc123');
    assert.equal(buildIngestUrl('abc123', 'ja'), '/ja/ingest/?uploadToken=abc123');
    assert.equal(appendUploadToken('/editor/unreal/', 'abc123'), '/editor/unreal/?uploadToken=abc123');
    assert.equal(
        appendUploadToken('/editor/palworld/?mode=quick', 'abc123'),
        '/editor/palworld/?mode=quick&uploadToken=abc123'
    );
    assert.equal(readUploadToken('?uploadToken=abc123'), 'abc123');
    assert.equal(readUploadToken('?mode=quick'), null);
    assert.equal(localizePath('/contact', 'ja'), '/ja/contact/');

    const localizedEditorPages = ['es', 'ja', 'ko', 'pt', 'ru', 'zh-cn'].map((lang) =>
        readFileSync(new URL(`../../../src/pages/${lang}/editor/[slug].astro`, import.meta.url), 'utf8')
    );
    for (const source of localizedEditorPages) {
        assert.match(source, /EditorPageTemplate/);
        assert.match(source, /from '..\/..\/..\/data\/editors'/);
        assert.doesNotMatch(source, /const engines = \[/);
        assert.doesNotMatch(source, /Astro\.url\.searchParams/);
    }

    const editorAppSource = readFileSync(new URL('../../../src/components/EditorApp.tsx', import.meta.url), 'utf8');
    assert.match(editorAppSource, /const handleFileSelect[\s\S]*setUploadToken\(null\)/);
    assert.match(editorAppSource, /const handleDemo[\s\S]*setUploadToken\(null\)/);
    assert.match(editorAppSource, /onBack=\{\(\) => \{[\s\S]*setUploadToken\(null\)/);

    const ingestClientSource = readFileSync(new URL('../../../src/components/IngestClient.tsx', import.meta.url), 'utf8');
    assert.doesNotMatch(ingestClientSource, /withUploadToken/);
    assert.match(ingestClientSource, /window\.location\.assign\(appendUploadToken/);

    console.log('Ingest detection and route helper suite passed.');
}

function makeExtForEngine(engine: string): string {
    const byEngine: Record<string, string> = {
        'rpg-maker-mv': '.rpgsave',
        unity: '.prefs',
        renpy: '.save',
        unreal: '.sav',
        palworld: '.sav',
        gamemaker: '.json',
        naninovel: '.nson',
        generic: '.msgpack',
    };
    return byEngine[engine];
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
