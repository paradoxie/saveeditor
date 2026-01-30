#!/usr/bin/env node

/**
 * scaffold_language.js
 * 
 * Usage: node scaffold_language.js <lang_code> <lang_name>
 * Example: node scaffold_language.js es Español
 * 
 * This script automates:
 * 1. Creating src/pages/<lang>/ directory
 * 2. Copying src/pages/ja/index.astro -> src/pages/<lang>/index.astro
 * 3. Injection into src/i18n/ui.ts (languages export and ui export)
 * 4. Injection into src/pages/[lang]/games.astro (getStaticPaths)
 * 5. Injection into src/pages/[lang]/formats.astro (getStaticPaths)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node scaffold_language.js <lang_code> <lang_name>');
    process.exit(1);
}

const [langCode, langName] = args;
const rootDir = process.cwd();

// --- Helper Functions ---

function readFile(filePath) {
    return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

function writeFile(filePath, content) {
    fs.writeFileSync(path.join(rootDir, filePath), content, 'utf8');
    console.log(`Updated: ${filePath}`);
}

// --- 1. Create Directory & Copy Index ---

const targetDir = path.join(rootDir, 'src/pages', langCode);
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`Created directory: src/pages/${langCode}`);
}

const sourceIndex = path.join(rootDir, 'src/pages/ja/index.astro');
const targetIndex = path.join(targetDir, 'index.astro');

if (fs.existsSync(sourceIndex)) {
    let content = fs.readFileSync(sourceIndex, 'utf8');
    // Replace lang="ja" with lang="<new_lang>"
    content = content.replace(/lang="ja"/g, `lang="${langCode}"`);
    fs.writeFileSync(targetIndex, content, 'utf8');
    console.log(`Created: src/pages/${langCode}/index.astro (copied from ja)`);
} else {
    console.warn('Warning: Source index (ja) not found. Skipping index creation.');
}

// --- 2. Update src/i18n/ui.ts ---

try {
    const uiPath = 'src/i18n/ui.ts';
    let uiContent = readFile(uiPath);

    // Add to languages export
    if (!uiContent.includes(`'${langCode}':`)) {
        const langInsertionPoint = uiContent.indexOf('};');
        if (langInsertionPoint !== -1) {
            // Find the last key to append properly
            const languagesBlock = uiContent.match(/export const languages = \{([\s\S]*?)\};/)[1];
            uiContent = uiContent.replace(languagesBlock, `${languagesBlock}    '${langCode}': '${langName}',\n`);
            console.log(`Updated languages list in ${uiPath}`);
        }
    }

    // Add to ui export
    if (!uiContent.includes(`${langCode}: {`)) {
        // Find 'en' block to copy keys (optional, but good for structure)
        // For now, just adding an empty block or a TODO block
        const uiInsertionPoint = uiContent.lastIndexOf('};');
        // We want to insert before the last }; which closes 'export const ui = { ... };'
        // But ui object ends with }; as well. 
        // Let's use a simpler regex to find the end of the ui object.

        // Strategy: Append at the end of ui object, before the closing brace
        const lastBraceIndex = uiContent.lastIndexOf('}');
        // There might be a semicolon
        const lastSemicolonIndex = uiContent.lastIndexOf(';');

        // We'll append a placeholder block
        const newBlock = `
    ${langCode}: {
        'nav.home': 'Home', // TODO: Translate
        // Copy other keys from 'en' manually or run a full script
    },`;

        // Insert before the last closing brace of the file (assuming it's the ui object)
        // Actually ui.ts ends with }; usually.
        // Let's rely on the user to fill this in, but we can append it securely if we find specific markers.
        // Simplifying for checking: just log instruction if regex is too risky.
        console.log(`NOTE: Please manualy add '${langCode}' to the 'ui' object in src/i18n/ui.ts. Script skipped complex regex injection to avoid breaking code.`);
    }

    writeFile(uiPath, uiContent);
} catch (e) {
    console.error('Error updating ui.ts:', e);
}

// --- 3. Update Dynamic Routes (Games & Formats) ---

const filesToUpdate = [
    'src/pages/[lang]/games.astro',
    'src/pages/[lang]/formats.astro'
];

filesToUpdate.forEach(file => {
    try {
        let content = readFile(file);
        if (!content.includes(`{ params: { lang: '${langCode}' } }`)) {
            // Look for the array return
            const insertionMarker = '{ params: { lang: \'zh-cn\' } },'; // Assuming zh-cn is there
            if (content.includes(insertionMarker)) {
                content = content.replace(insertionMarker, `${insertionMarker}\n    { params: { lang: '${langCode}' } },`);
                writeFile(file, content);
            } else {
                // Fallback: look for generic array end
                content = content.replace(/];/g, `    { params: { lang: '${langCode}' } },\n  ];`);
                writeFile(file, content);
            }
        }
    } catch (e) {
        console.error(`Error updating ${file}:`, e);
    }
});

console.log(`\nSuccess! ${langName} (${langCode}) scaffolded.`);
console.log(`NEXT STEPS:`);
console.log(`1. Open src/i18n/ui.ts and fill in translations for '${langCode}'.`);
console.log(`2. Translate content in src/pages/${langCode}/index.astro.`);
