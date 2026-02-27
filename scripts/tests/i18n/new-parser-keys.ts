import assert from 'node:assert/strict';
import { languages, ui } from '../../../src/i18n/ui';

const requiredKeys = [
    'editor.unityReasonBinaryPlist',
    'editor.unityReasonBinaryPlayerPrefs',
    'editor.naninovelReasonLikelyEncrypted',
    'editor.naninovelReasonUnsupportedWrapper',
] as const;

function main() {
    const allLangs = Object.keys(languages) as Array<keyof typeof ui>;

    for (const lang of allLangs) {
        const dict = ui[lang];
        assert.ok(dict, `Missing i18n dictionary for language: ${lang}`);

        for (const key of requiredKeys) {
            assert.equal(
                typeof dict[key],
                'string',
                `Missing translation for key "${key}" in language "${lang}".`
            );
            assert.ok(dict[key].trim().length > 0, `Empty translation for key "${key}" in language "${lang}".`);
        }
    }

    console.log(`i18n parser-key coverage passed for ${allLangs.length} languages.`);
}

main();
