/**
 * Centralized editor/engine data for editor landing pages.
 * Used by: src/pages/editor/[slug].astro and all localized variants.
 *
 * To add a new engine editor, simply add a new entry to this array.
 */

export interface EditorData {
  slug: string;
  name: string;
  fileType: string;
  title: string;
  description: string;
  keywords: string;
  features: string[];
  instructions: string[];
}

export const editors: EditorData[] = [
  {
    slug: 'rpg-maker-mv',
    name: 'RPG Maker MV/MZ',
    fileType: '.rpgsave, .rmmzsave, .rvdata2, .rvdata, .rxdata, .lsd',
    title: 'RPG Maker SaveEditor.top - Free .rpgsave & .rmmzsave Editor',
    description:
      'Free RPG Maker save editor. Edit .rpgsave (MV), .rmmzsave (MZ), and common fields in older .rvdata2, .rvdata, and .rxdata Ruby Marshal files. No download, browser-based rpg save editor.',
    keywords:
      'rpg maker save editor, rpg save editor, rpgsave editor, .rpgsave editor online, rpg maker mv save editor, rpg maker mz save editor, rmmzsave editor, edit rpgsave file',
    features: [
      'Edit Gold / Money',
      'Modify Character Stats (Level, EXP, HP, MP)',
      'Unlock Items and Weapons',
      'Edit Game Variables and Switches',
    ],
    instructions: [
      'Locate your save file (usually in the game folder under `www/save/`)',
      'Upload the `.rpgsave`, `.rmmzsave`, `.rvdata2`, `.rvdata`, `.rxdata`, or `.lsd` file above',
      'Edit your gold, stats, and variables',
      'Ruby Marshal exports are limited to common fields; unsupported structural edits are blocked.',
    ],
  },
  {
    slug: 'unity',
    name: 'Unity',
    fileType: '.xml, .plist, .prefs',
    title: 'Unity Save Editor | Edit PlayerPrefs Online',
    description:
      'Free online Unity save editor. Modify Unity PlayerPrefs (.xml, .plist, .prefs) for Android, iOS and PC games. Edit game settings and unlock levels directly in your browser.',
    keywords:
      'unity save editor, unity playerprefs editor, edit unity xml save, unity plist editor',
    features: [
      'Edit PlayerPrefs Data',
      'Modify Game Settings',
      'Unlock Levels and Achievements',
      'Cross-platform Support (Android XML, iOS Plist)',
    ],
    instructions: [
      'Locate your Unity save file (often in `AppData` or game folder)',
      'Upload the `.xml`, `.plist`, or `.prefs` file',
      'Modify the values in the editor',
      'Download and replace the original file',
    ],
  },
  {
    slug: 'renpy',
    name: "Ren'Py",
    fileType: '.save',
    title: "Ren'Py SaveEditor.top - Free .save File Editor & Viewer",
    description:
      "Free Ren'Py save editor. Edit supported persistent fields and view .save files online. Works with DDLC, visual novels & more with guarded export boundaries.",
    keywords:
      "renpy save editor, ren'py save editor, .save editor, .save file editor, renpy save modifier, edit renpy save file, ddlc save editor, visual novel save editor",
    features: [
      "View & Edit Ren'Py Save Data",
      'Modify Game Variables and Flags',
      'Inspect History and Playtime',
      'Limited stable export for persistent primitive fields',
    ],
    instructions: [
      "Find your Ren'Py save files (usually in `game/saves/`)",
      'Upload the `.save` file',
      'Edit supported primitive fields under persistent',
      'Download the rebuilt file after unsupported Python objects and non-persistent edits are blocked.',
    ],
  },
  {
    slug: 'unreal',
    name: 'Unreal Engine',
    fileType: '.sav',
    title: 'Unreal Engine Save Editor - Free .sav Editor | Palworld, GVAS',
    description:
      'Browser-based Unreal .sav inspector for standard GVAS files. View data safely, edit supported structures, and export with safe rebuild for supported wrappers.',
    keywords:
      'unreal engine save editor, palworld save editor, .sav editor, sav file editor, gvas editor online, uesave editor, edit unreal save file',
    features: [
      'Parse Standard GVAS (.sav)',
      'Detect zlib/gzip/raw-deflate wrappers',
      'Read-only fallback for unsupported containers',
      'Safe rebuild for standard and supported wrapped GVAS files',
    ],
    instructions: [
      "Locate your `.sav` file in the game's save directory",
      'Upload the file to the editor',
      'If parsing succeeds, edit supported fields in JSON view',
      'For complex game-specific containers or encrypted saves, use dedicated tools when read-only mode is shown.',
    ],
  },
  {
    slug: 'palworld',
    name: 'Palworld',
    fileType: '.sav',
    title: 'Palworld Save Editor | Safe GVAS Viewer for .sav',
    description:
      'Palworld-focused save workflow for `.sav` files. Best for inspecting standard GVAS data and applying cautious, backup-first edits.',
    keywords:
      'palworld save editor, palworld .sav, palworld gvas, palworld save tools',
    features: [
      'Steam `.sav` upload with format checks',
      'Structured GVAS JSON inspection',
      'Read-only fallback for unsupported variants',
      'Links to dedicated Palworld community tooling',
    ],
    instructions: [
      'Backup your entire SaveGames folder before editing',
      'Upload your player `.sav` (or `Level.sav`) file',
      'Check the mode banner (editable vs read-only)',
      'Use dedicated Palworld tools when this editor reports unsupported structure',
    ],
  },
  {
    slug: 'gamemaker',
    name: 'GameMaker',
    fileType: '.ini, .json',
    title: 'GameMaker Save Editor | Edit INI & JSON Saves',
    description:
      'GameMaker save editor online. Modify compatible .ini and .json save files for GameMaker Studio 1 & 2 games. Edit health, inventory, and stats in your browser.',
    keywords:
      'gamemaker save editor, edit gamemaker save, undertale save editor, gamemaker ini editor',
    features: [
      'Edit INI Configuration Files',
      'Modify JSON Save Data',
      'Raw Text Fallback for Custom Formats',
      'Compatible with GameMaker Studio 1 & 2',
    ],
    instructions: [
      'Find your save file (often `save.ini` or `save.json`)',
      'Upload it to the editor',
      'Change values like money, health, or unlocked items',
      'Save and replace the original file',
    ],
  },
  {
    slug: 'naninovel',
    name: 'NaniNovel',
    fileType: '.nson',
    title: 'NaniNovel Save Editor | Edit .nson Files',
    description:
      'Free NaniNovel save editor. Edit .nson visual novel files online. Modify game state, script flags, variables, and player choices instantly in your browser.',
    keywords: 'naninovel save editor, edit .nson file, visual novel save editor',
    features: [
      'Parse .nson Files',
      'Edit Game State JSON',
      'Modify Global Variables',
      'Support for Compressed Saves',
    ],
    instructions: [
      'Locate your `.nson` save file',
      'Upload it to the editor',
      'Modify the JSON data',
      'Download the updated file',
    ],
  },
  {
    slug: 'generic',
    name: 'Generic Save Editor',
    fileType: '.sol, .db, .sqlite, .sqlite3, .msgpack, .mpack, .cbor, .bson, .yaml, .toml, .csv, .zip, .gz, .zlib, .deflate, .bz2, .bzip2, .lz4, .zst, .zstd, .b64, .base64, .lzstring, .xml, .es3, .dat, .nrbf, .bytes, .bin, .gd, .pkl, .pickle, .cfg',
    title: 'Generic Save Format Editor | ZIP, Base64, Zstd, SQLite',
    description:
      'Browser editor for supported generic save formats such as NRBF/BinaryFormatter object graphs, ZIP-wrapped structured files, Base64, LZString, gzip/zlib/deflate/BZip2/LZ4/Zstd wrappers, Flash SOL, SQLite, MessagePack, CBOR, BSON, YAML, TOML, CSV, Easy Save 3 JSON, Godot CFG, XML text, and simple Python pickle.',
    keywords:
      'save file editor, zip save editor, base64 save editor, sqlite save editor, sol save editor, msgpack save editor, cbor save editor, bson save editor, yaml save editor, es3 save editor',
    features: [
      'Edit supported structured formats',
      'Export rebuilt files in the same container',
      'Edit existing NRBF scalar values without changing the CLR schema',
      'Explain unsupported export cases clearly',
    ],
    instructions: [
      'Upload the save or database file',
      'Review the detected format and support status',
      'Edit visible values when saving is enabled',
      'Download the rebuilt file',
    ],
  },
];
