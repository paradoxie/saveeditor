const fs = require('fs');

const content = fs.readFileSync('src/i18n/ui.ts', 'utf8');

// Define the languages to check
const targets = ['en', 'ja', 'pt', 'ko', 'zh-cn', 'es', 'ru'];
const results = {};

targets.forEach(lang => {
    // Find start of block: "    lang: {" or "    'lang': {"
    const startRegex = new RegExp(`\\s+['"]?${lang}['"]?\\s*:\\s*{`);
    const match = content.match(startRegex);

    if (!match) {
        console.error(`❌ Language [${lang}] block not found!`);
        return;
    }

    const startIndex = match.index + match[0].length;
    // Find data until the next line that is just "    }," 
    // This assumes 4-space indentation for the closing brace of the language object
    const rest = content.slice(startIndex);
    const endMatch = rest.match(/^\s{4}\},/m);

    if (!endMatch) {
        console.error(`❌ Language [${lang}] closing brace not found!`);
        return;
    }

    const blockContent = rest.slice(0, endMatch.index);

    // Count keys
    const keys = new Set();
    const lines = blockContent.split('\n');
    lines.forEach(line => {
        const keyMatch = line.match(/^\s*['"](.+?)['"]\s*:/);
        if (keyMatch && !line.trim().startsWith('//')) {
            keys.add(keyMatch[1]);
        }
    });

    results[lang] = keys;
    console.log(`[${lang}] Found ${keys.size} keys.`);
});

// Compare against EN
const enKeys = results['en'];
if (!enKeys) process.exit(1);

let hasMissing = false;
targets.forEach(lang => {
    if (lang === 'en') return;

    const langKeys = results[lang];
    if (!langKeys) return;

    const missing = [...enKeys].filter(k => !langKeys.has(k));
    if (missing.length > 0) {
        console.error(`⚠️  [${lang}] is missing ${missing.length} keys:`, missing);
        hasMissing = true;
    } else {
        console.log(`✅ [${lang}] is fully aligned with EN.`);
    }

    const extra = [...langKeys].filter(k => !enKeys.has(k));
    if (extra.length > 0) {
        console.warn(`ℹ️  [${lang}] has ${extra.length} extra keys (deprecated?):`, extra);
    }
});

if (hasMissing) {
    console.log('FAILED: Some languages are missing keys.');
    process.exit(1);
} else {
    console.log('SUCCESS: All languages are strictly aligned.');
}
