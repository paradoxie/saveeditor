---
title: "How to Edit Unreal Engine Save Files (.sav) - Complete GVAS Guide"
description: "Compatibility-first guide for Unreal Engine 4/5 `.sav` workflows. Learn GVAS parsing, safe browser limits, and when to switch to dedicated game-specific tools."
pubDate: 2026-01-05
updatedDate: 2026-03-12
tags: ["unreal-engine", "gvas", "guide", "palworld", "hogwarts-legacy"]
author: "Paradox"
image: "/images/blog/unreal-cover.webp"
---

> **Support Status (February 2026):** The web editor currently focuses on **standard, unencrypted GVAS** files. Containerized/compressed game-specific variants may be read-only or unsupported for safe rebuild.

## Introduction

![Unreal Engine Save Editor Interface](/images/blog/unreal-content.webp)

Unreal Engine is one of the most powerful game engines in the world, used by AAA studios and indie developers alike. Games like **Palworld**, **Hogwarts Legacy**, **Satisfactory**, and **Deep Rock Galactic** all use Unreal Engine and store their save data in a proprietary binary format.

If you want to inspect Unreal save data and cautiously edit compatible files, this guide walks through the practical workflow. Unlike simple JSON or XML files, UE saves require specialized parsers. Our web editor focuses on standard GVAS and degrades to read-only when safe rebuild is not possible.

## What is the GVAS Format?

Unreal Engine uses a binary serialization format called **GVAS** (Game Variable Archive Save) for its save files. These files typically have the `.sav` extension.

A GVAS file contains:

*   **Header**: Magic bytes (`GVAS`), save game version, engine version, and custom version data.
*   **Properties**: A hierarchical structure of typed properties (IntProperty, StrProperty, ArrayProperty, StructProperty, etc.).
*   **Footer**: Optional checksum or padding.

Because it's binary, you can't simply open a `.sav` file in Notepad. You need a parser that understands the GVAS structure.

## Common Games Using GVAS Saves

| Game | Save Location | Notes |
|---|---|---|
| **Palworld** | `%LocalAppData%\Pal\Saved\SaveGames\` | Complex nested structures |
| **Hogwarts Legacy** | `%LocalAppData%\Hogwarts Legacy\Saved\SaveGames\` | Standard UE5 format |
| **Satisfactory** | `%LocalAppData%\FactoryGame\Saved\SaveGames\` | Very large files |
| **Deep Rock Galactic** | `%LocalAppData%\FSD\Saved\SaveGames\` | Player progression |
| **It Takes Two** | Steam Cloud folder | Co-op save data |

## Step 1: Locate Your Save File

Most Unreal Engine games store saves in:

```
%LocalAppData%\[GameName]\Saved\SaveGames\
```

For example, Palworld saves are at:
```
C:\Users\[YourName]\AppData\Local\Pal\Saved\SaveGames\[SteamID]\
```

You'll find files like `Level.sav`, `Players\[PlayerID].sav`, etc.

## Step 2: Create a Backup

**Critical**: Always copy your `.sav` file before editing. Binary files are unforgiving – one wrong byte can corrupt the entire save.

Create a folder called `Backups` and copy your save files there before proceeding.

## Step 3: Upload to the Online Editor

1.  Navigate to our [Unreal Engine Save Editor](/editor/unreal).
2.  Drag and drop your `.sav` file.
3.  Wait for the GVAS parser to process the file.

Our editor attempts to parse standard GVAS data into a navigable JSON tree. For custom containers/encryption, it will switch to read-only or fail safely.

## Step 4: Navigate and Edit Properties

Once parsed, you'll see a hierarchical view of all properties:

### Common Properties to Look For:

*   **Inventory**: Usually an ArrayProperty containing item IDs and quantities.
*   **PlayerStats**: StructProperty with health, stamina, level, etc.
*   **Currency/Money**: IntProperty with names like `Gold`, `Credits`, or `Money`.
*   **Unlocks**: BoolProperty or ArrayProperty tracking unlocked items/abilities.

Click on a property to expand and edit its value. For numeric properties, simply change the number. For strings, you can modify text values.

### Example: Editing Palworld Pal Data

Palworld stores captured Pals as complex nested structures. To modify a Pal:

1.  Navigate to `CharacterSaveParameterMap`.
2.  Find your Pal by its internal ID.
3.  Expand its properties to find level, stats, skills.
4.  Modify the values as desired.

## Step 5: Download and Replace

1.  Click **Download Modified Save** if the editor shows a compatible editable mode.
2.  The tool will attempt to rebuild a binary GVAS file from your changes.
3.  If the editor is read-only, use a dedicated game-specific tool instead.
4.  Replace the original file only after validating with backups.

## Troubleshooting

### The editor shows "GVAS parsing failed"
*   Some games use modified GVAS formats with custom compression or encryption.
*   Try a community-specific tool for that game if available.

### My save is corrupted after editing
*   Restore your backup.
*   Make sure you only changed values, not property names or types.
*   Some games recalculate checksums; they may reject tampered saves.

### Values reset after loading
*   The game may have server-side validation (common in multiplayer modes).
*   Some values are derived from others on load (e.g., max HP from level).

## Alternative Tools

If the online editor doesn't support your specific game, consider these alternatives:

*   **uesave-rs**: A Rust-based command-line tool that can convert `.sav` to `.json` and back.
*   **Palworld Save Tools**: Community tools specifically for Palworld saves.
*   **UAssetGUI**: For editing other Unreal Engine asset files.

## Frequently Asked Questions

**Q: Is this safe to use?**
A: The selected file is parsed in your browser and is not uploaded to our parser server.

**Q: Will this work for multiplayer saves?**
A: For co-op saves where you're the host, often yes. For dedicated server games, saves are usually server-side and inaccessible.

**Q: Can I transfer saves between platforms?**
A: GVAS format is cross-platform, but games may embed platform-specific data. Transfer is possible but not guaranteed.

**Q: What if my game uses a custom save format?**
A: If it's not standard GVAS, you may need game-specific modding tools.

## Conclusion

Editing Unreal Engine saves still requires understanding GVAS boundaries. Use the web editor for standard, parseable variants, and switch to game-specific tooling when files are containerized or cannot be safely rebuilt.

Remember: always back up your saves, never edit multiplayer/competitive games unfairly, and happy modding!

## Further Reading

Expand your Unreal Engine save editing knowledge:

- 📖 [Palworld Save Editing Guide](/blog/palworld-save-editing-guide) - Dedicated Palworld tutorial
- 📖 [uesave-rs on GitHub](https://github.com/trumank/uesave-rs) - Open-source GVAS parser
- 🎮 [Palworld Game Page](/games/palworld) - Save locations and editable items
- 📂 [Common Save File Extensions](/blog/common-save-file-extensions-explained) - Understanding .sav and other formats
- 🔧 [Unreal Engine Editor](/editor/unreal) - The online tool used in this guide
- 🎭 [Unity Save Editing Guide](/blog/how-to-edit-unity-saves) - Another popular game engine

---

*Last updated: January 2026*

### Related Articles

- [Palworld Save Editing Guide](/blog/palworld-save-editing-guide)
- [Common Save File Extensions Explained](/blog/common-save-file-extensions-explained)
- [How to Edit Unity Saves](/blog/how-to-edit-unity-saves)
