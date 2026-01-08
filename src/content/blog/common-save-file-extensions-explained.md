---
title: "Common Game Save File Extensions Explained - Complete Reference"
description: "A comprehensive guide to understanding .json, .xml, .sav, .rpgsave, .save, .dat, and other common game save file formats and how to edit them."
pubDate: 2026-01-01
tags: ["guide", "file-formats", "education", "reference"]
author: "SaveEditor Team"
image: "/images/blog/extensions-cover.webp"
---

## Introduction

![Common Save File Extensions](/images/blog/extensions-content.webp)

Game save files come in dozens of different formats, each with their own quirks and editing requirements. Understanding what file extension you're dealing with is the first step to successfully modifying your game saves.

This comprehensive guide covers all the major save file formats you'll encounter, from simple human-readable text files to complex binary structures.

## Text-Based Formats (Easy to Edit)

### JSON (.json)

**Engines**: GameMaker, Godot, Unity (custom), many indie games.

JSON (JavaScript Object Notation) is a human-readable format that uses curly braces and key-value pairs:

```json
{
  "playerName": "Hero",
  "gold": 5000,
  "level": 25,
  "inventory": ["sword_01", "potion_03"]
}
```

**How to Edit**: Open in any text editor (VS Code, Notepad++). Change values, save, done. Just be careful not to break the syntax (missing commas, unclosed brackets).

**Tool**: [Any text editor, or our Generic Editor](/editor/gamemaker)

---

### INI (.ini)

**Engines**: GameMaker Studio, many older games.

INI files use sections in square brackets with key=value pairs:

```ini
[Player]
Name=Hero
Gold=5000

[Settings]
Volume=80
Difficulty=Normal
```

**How to Edit**: Very straightforward. Open in a text editor, change values, save.

**Tool**: [Any text editor, or our GameMaker Editor](/editor/gamemaker)

---

### XML (.xml, .plist)

**Engines**: Unity (PlayerPrefs on mobile), many cross-platform games.

XML uses nested tags to structure data:

```xml
<PlayerPrefs>
  <pref name="Coins" type="int">9999</pref>
  <pref name="SoundEnabled" type="int">1</pref>
</PlayerPrefs>
```

**How to Edit**: Editable in text editors, but be careful with tag structure. Missing closing tags will break the file.

**Tool**: [Unity Editor](/editor/unity)

---

## Compressed/Encoded Formats (Medium Difficulty)

### RPG Maker (.rpgsave, .rvdata2)

**Engines**: RPG Maker MV, MZ (rpgsave), VX Ace (rvdata2).

`.rpgsave` files are JSON data compressed with LZString. `.rvdata2` files use Ruby Marshal format.

Without decompression, they look like random characters:
```
N4IgLgpgJg5hBOBnEAuGAnGAzA9mKABMQBoRsA...
```

After decompression, they're just JSON.

**How to Edit**: Requires a specialized tool to decompress, edit, and recompress.

**Tool**: [RPG Maker Editor](/editor/rpg-maker-mv)

---

### NaniNovel (.nson)

**Engines**: Unity games using the NaniNovel visual novel framework.

`.nson` files are typically JSON that may be compressed or base64 encoded.

**How to Edit**: Our editor automatically detects the encoding and presents editable JSON.

**Tool**: [NaniNovel Editor](/editor/naninovel)

---

## Binary Formats (Difficult to Edit)

### Unreal Engine (.sav)

**Engines**: Unreal Engine 4 & 5.

Uses the GVAS (Game Variable Archive Save) binary format. Contains a header, property tree, and optional compression.

Games include: Palworld, Hogwarts Legacy, Satisfactory, Deep Rock Galactic.

**How to Edit**: Requires a GVAS parser to convert binary to JSON and back.

**Tool**: [Unreal Engine Editor](/editor/unreal)

---

### Ren'Py (.save)

**Engines**: Ren'Py visual novel engine.

Uses Python's `pickle` module to serialize entire game state. Very difficult to safely modify due to security risks.

Games include: Doki Doki Literature Club, Katawa Shoujo.

**How to Edit**: Read-only viewing is safe. Modification requires careful repickling or use of in-game console.

**Tool**: [Ren'Py Viewer](/editor/renpy) (read-only)

---

### Generic Binary (.dat, .sav, .bin)

**Engines**: Custom engines, older games.

These files have no standard format. They might contain:
*   Fixed-size records (e.g., 4 bytes for gold, 4 bytes for level)
*   Variously structured data with no clear pattern
*   Compression or encryption

**How to Edit**: Use a hex editor (HxD, 010 Editor). Look for patterns. Often requires game-specific knowledge or community research.

**Tool**: Hex editor (not web-based)

---

## Platform-Specific Formats

### Windows Registry (PlayerPrefs)

Unity games on Windows often store PlayerPrefs in the registry at:
```
HKEY_CURRENT_USER\Software\[CompanyName]\[ProductName]
```

Values are stored with hash-based key names and binary data.

**How to Edit**: Use `regedit` or PlayerPrefs-specific tools.

---

### iOS/macOS .plist

Property List files used by Apple platforms. Can be XML or binary format.

**How to Edit**: If XML, use text editor. If binary, use `plutil` to convert: `plutil -convert xml1 file.plist`

---

### SQLite (.db, .sqlite)

Some games use SQLite databases.

**How to Edit**: Use DB Browser for SQLite or similar tools.

---

## Quick Reference Table

| Extension | Format Type | Difficulty | Our Tool |
|---|---|---|---|
| `.json` | Text (JSON) | Easy | [GameMaker](/editor/gamemaker) |
| `.ini` | Text (INI) | Easy | [GameMaker](/editor/gamemaker) |
| `.xml` | Text (XML) | Easy | [Unity](/editor/unity) |
| `.plist` | Text/Binary | Easy-Medium | [Unity](/editor/unity) |
| `.rpgsave` | Compressed JSON | Medium | [RPG Maker](/editor/rpg-maker-mv) |
| `.nson` | Encoded JSON | Medium | [NaniNovel](/editor/naninovel) |
| `.sav` (UE) | Binary (GVAS) | Difficult | [Unreal](/editor/unreal) |
| `.save` (Ren'Py) | Binary (Pickle) | Very Difficult | [Viewer Only](/editor/renpy) |
| `.dat`, `.bin` | Custom Binary | Very Difficult | Hex Editor |

## Frequently Asked Questions

**Q: How do I know what format my save file is?**
A: Open it in a text editor. If you see readable text/JSON/XML, it's text-based. If you see garbled characters, it's binary.

**Q: What if my game's format isn't listed here?**
A: Try opening in our generic editor – it may auto-detect the format. Otherwise, consult game-specific communities.

**Q: Can all save files be edited?**
A: Most can be technically edited, but some use encryption, checksums, or server-side validation that make it impractical.

**Q: Is save editing legal?**
A: For single-player games on files you own, yes. Modifying online/competitive games may violate terms of service.

## Conclusion

Understanding your save file format is half the battle. Once you know whether you're dealing with simple JSON, compressed RPG Maker data, or complex Unreal GVAS files, you can choose the right tool and approach.

Our Save Editor Online supports most common formats automatically – just upload your file and let us handle the rest!

## Further Reading

Explore our detailed guides for each game engine:

- 📖 [RPG Maker Save Editing Guide](/blog/how-to-edit-rpg-maker-save) - .rpgsave and .rvdata2 files
- 📖 [Unity Save Editing Guide](/blog/how-to-edit-unity-saves) - PlayerPrefs and XML files
- 📖 [Unreal Engine Save Guide](/blog/how-to-edit-unreal-engine-saves) - GVAS .sav files
- 📖 [Ren'Py Save Editing Guide](/blog/renpy-save-editing-guide) - Python pickle files
- 📖 [GameMaker Save Editing Guide](/blog/gamemaker-save-editing-guide) - INI and JSON files
- 📖 [NaniNovel Save Editing Guide](/blog/naninovel-save-editing-guide) - .nson files

---

*Last updated: January 2026*

### Start Editing

- [RPG Maker Editor](/editor/rpg-maker-mv)
- [Unity Editor](/editor/unity)
- [Unreal Engine Editor](/editor/unreal)
- [Ren'Py Viewer](/editor/renpy)
- [GameMaker Editor](/editor/gamemaker)
- [NaniNovel Editor](/editor/naninovel)

