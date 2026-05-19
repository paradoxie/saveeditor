import assert from 'node:assert/strict';
import { getLangFromPathname, getLangPrefix, localizePath } from '../../../src/i18n/utils';

async function main() {
    assert.equal(getLangFromPathname('/ja/editor/unity/'), 'ja');
    assert.equal(getLangFromPathname('/editor/unity/'), 'en');
    assert.equal(getLangPrefix('ja'), '/ja');
    assert.equal(getLangPrefix('en'), '');
    assert.equal(localizePath('/blog', 'en'), '/blog/');
    assert.equal(localizePath('/blog', 'ru'), '/ru/blog/');
    assert.equal(localizePath('/ru/blog', 'en'), '/blog/');

    console.log('Localized path helper suite passed.');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
