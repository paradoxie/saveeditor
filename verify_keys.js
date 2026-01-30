const fs = require('fs');
const content = fs.readFileSync('src/i18n/ui.ts', 'utf8');

function extractKeys(lang) {
    // Escape the language code for regex (though es, ru etc are safe)
    // We look for 'lang: {' 
    // We count matching indentation or brackets to find the end block? 
    // Since the structure is consistent, we can look for the next language key start.

    const langStart = content.indexOf(`${lang}: {`);
    if (langStart === -1) {
        // Try quoted
        const langStartQuoted = content.indexOf(`'${lang}': {`);
        if (langStartQuoted === -1) return new Set();
        return parseBlock(content, langStartQuoted);
    }
    return parseBlock(content, langStart);
}

function parseBlock(fullText, startIndex) {
    const keys = new Set();
    let bracketCount = 0;
    let inBlock = false;
    let parsing = true;
    let index = startIndex;

    while (parsing && index < fullText.length) {
        const char = fullText[index];
        if (char === '{') {
            bracketCount++;
            inBlock = true;
        } else if (char === '}') {
            bracketCount--;
            if (bracketCount === 0 && inBlock) {
                parsing = false;
            }
        }

        index++;
    }

    const blockBody = fullText.substring(startIndex, index);
    const lines = blockBody.split('\n');
    lines.forEach(line => {
        // Regex to find keys:  'key.name': 'Value',
        const match = line.match(/^\s*['"](.+?)['"]\s*:/);
        if (match) {
            keys.add(match[1]);
        }
    });

    return keys;
}

const enKeys = extractKeys('en');
const languages = ['ja', 'pt', 'es', 'ru', 'zh-cn', 'ko'];

let allGood = true;

languages.forEach(lang => {
    const keys = extractKeys(lang);
    if (keys.size === 0) {
        console.error(`ERROR: Could not find keys for [${lang}]`);
        allGood = false;
        return;
    }

    const missing = [...enKeys].filter(k => !keys.has(k));
    if (missing.length > 0) {
        console.error(`[${lang}] MISSING ${missing.length} keys:`, missing);
        allGood = false;
    } else {
        console.log(`[${lang}] OK: ${keys.size} keys.`);
    }

    // Optional: Check for Extra keys
    const extra = [...keys].filter(k => !enKeys.has(k));
    if (extra.length > 0) {
        console.warn(`[${lang}] has ${extra.length} EXTRA keys (likely deprecated).`);
    }
});

if (allGood) console.log("VERIFICATION SUCCESS: All languages have complete key coverage.");
