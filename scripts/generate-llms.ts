import { writeFileSync } from 'node:fs';
import { games } from '../src/data/games';
import { getCoverageRows, sampleRecords } from '../src/data/capability';
import { SITE_ORIGIN } from '../src/lib/site';

const origin = (process.env.PUBLIC_SITE_ORIGIN || SITE_ORIGIN).replace(/\/+$/, '');
const rows = getCoverageRows();
const verified = rows.filter((row) => row.confidence === 'verified').length;
const candidate = rows.filter((row) => row.confidence === 'candidate').length;

const llms = `# SaveEditor.top

> Free, browser-based save file editor for compatible local game saves.

For full documentation, see: ${origin}/llms-full.txt

## Core Engines

- RPG Maker MV/MZ/XP/VX/VX Ace/2000/2003
- Ren'Py persistent limited stable write
- Unity PlayerPrefs
- Unreal Engine standard GVAS
- GameMaker INI/JSON
- NaniNovel NSON
- Generic structured inspectors

## Main Sections

- /: Upload and auto-detect a save file
- /formats/: Save format reference
- /compatibility/: Compatibility matrix
- /coverage-proof/: Evidence-backed sample and preset coverage proof
- /games/: ${games.length} game landing pages
- /editor/rpg-maker-mv/: RPG Maker editor
- /editor/renpy/: Ren'Py editor
- /editor/palworld/: Palworld/Unreal workflow
- /editor/generic/: Generic structured inspector
- /zh-cn/: Full Simplified Chinese publishing tier
- /ja/: Full Japanese publishing tier

## Language Coverage

- English: Full
- 简体中文 (/zh-cn/): Full
- 日本語 (/ja/): Full
- 한국어 (/ko/): Short
- Português (/pt/): Short
- Español (/es/): Short
- Русский (/ru/): Short

## Full Locale URLs

- English: ${origin}/games/, ${origin}/formats/, ${origin}/compatibility/, ${origin}/coverage-proof/
- 简体中文: ${origin}/zh-cn/games/, ${origin}/zh-cn/formats/, ${origin}/zh-cn/compatibility/, ${origin}/zh-cn/coverage-proof/
- 日本語: ${origin}/ja/games/, ${origin}/ja/formats/, ${origin}/ja/compatibility/, ${origin}/ja/coverage-proof/

## Privacy

Selected save files are parsed in the browser. Failure diagnostics use anonymized support-pack summaries, not raw save bytes.
`;

const gameRows = games
  .map((game) => `| ${game.name} | ${game.engine} | ${game.format} | /games/${game.slug}/ | /zh-cn/games/${game.slug}/ | /ja/games/${game.slug}/ | ${game.presetConfidence} |`)
  .join('\n');
const coverageRows = rows
  .map((row) => `| ${row.slug} | ${row.engine} | ${row.capability} | ${row.confidence} | ${row.sampleCount} | ${row.latest} |`)
  .join('\n');

const llmsFull = `# SaveEditor.top — Full Documentation for LLMs

> Free, browser-based save file editor for compatible local game saves.
> Selected save files are parsed in the user's browser.

## Site Identity

- **Name**: SaveEditor.top
- **URL**: ${origin}
- **Type**: Free web application
- **Category**: UtilitiesApplication
- **Operating System**: Web Browser
- **Pricing**: Free, no registration required
- **File size limit**: 50 MB per file

## Evidence Status

- **Game pages**: ${games.length}
- **Sample records**: ${sampleRecords.length}
- **Verified presets**: ${verified}
- **Candidate presets**: ${candidate}
- **Coverage proof**: ${origin}/coverage-proof/

## Language Coverage

| Language | URL Prefix | Coverage |
|---|---|---|
| English | / | Full |
| 简体中文 | /zh-cn/ | Full |
| 日本語 | /ja/ | Full |
| 한국어 | /ko/ | Short |
| Português | /pt/ | Short |
| Español | /es/ | Short |
| Русский | /ru/ | Short |

## Published Locale Entrypoints

| Locale | Games | Formats | Compatibility | Coverage proof |
|---|---|---|---|---|
| English | /games/ | /formats/ | /compatibility/ | /coverage-proof/ |
| 简体中文 | /zh-cn/games/ | /zh-cn/formats/ | /zh-cn/compatibility/ | /zh-cn/coverage-proof/ |
| 日本語 | /ja/games/ | /ja/formats/ | /ja/compatibility/ | /ja/coverage-proof/ |

## Game Landing Pages

| Game | Engine | Format | EN URL | ZH URL | JA URL | Preset status |
|---|---|---|---|---|---|---|
${gameRows}

## Coverage Rows

| Preset | Engine | Capability | Status | Samples | Last verified |
|---|---|---|---|---:|---|
${coverageRows}

## Core URLs

- ${origin}/
- ${origin}/formats/
- ${origin}/compatibility/
- ${origin}/coverage-proof/
- ${origin}/games/
- ${origin}/zh-cn/games/
- ${origin}/zh-cn/coverage-proof/
- ${origin}/ja/games/
- ${origin}/ja/coverage-proof/
- ${origin}/editor/rpg-maker-mv/
- ${origin}/editor/renpy/
- ${origin}/editor/palworld/
- ${origin}/editor/generic/

## Safety Boundary

Ren'Py uses Limited stable write for primitive values under persistent. Complex Python objects and non-persistent game state remain guarded.

SaveEditor.top does not claim universal write support. Stable write, stable-limited write, read-only inspection, and blocked scopes are separated in the compatibility matrix and coverage proof page.
`;

writeFileSync('public/llms.txt', llms);
writeFileSync('public/llms-full.txt', llmsFull);
