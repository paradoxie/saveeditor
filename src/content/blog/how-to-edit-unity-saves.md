---
title: "How to Edit Unity PlayerPrefs and XML Saves - Complete Guide"
description: "A complete guide to modifying Unity game save files on Android, iOS, and PC. Learn how to edit PlayerPrefs, XML, JSON, and Plist files for any Unity game."
pubDate: 2026-01-04
tags: ["unity", "guide", "tutorial", "playerprefs"]
author: "SaveEditor Team"
image: "/images/blog/unity-cover.webp"
---

## Introduction

![Unity Save Editor Interface](/images/blog/unity-content.webp)

Unity is the world's most popular game engine, powering over 50% of all mobile games and a huge number of indie titles on PC and console. If you've ever wanted to modify your progress in a Unity game – whether to unlock levels, add currency, or just experiment – this guide will teach you everything you need to know.

Unlike some engines that use a single save format, Unity games can store data in many different ways. The most common methods are:

*   **PlayerPrefs**: A built-in key-value storage system.
*   **XML files**: Structured text files, common on mobile.
*   **JSON files**: Human-readable data format.
*   **Binary files**: Custom serialized data (harder to edit).

Our **Save Editor Online** supports PlayerPrefs (XML/Plist), XML, and JSON formats directly in your browser.

## Understanding Unity Save Locations

The location of save files depends on the platform:

### Windows
*   **PlayerPrefs**: Stored in the Windows Registry under `HKCU\Software\[CompanyName]\[ProductName]`. This is tricky to edit directly.
*   **Files**: Often in `%AppData%\LocalLow\[CompanyName]\[ProductName]\` or the game's install folder.

### Android
*   **PlayerPrefs (XML)**: Located at `/data/data/[package.name]/shared_prefs/[package.name].v2.playerprefs.xml`.
*   Requires root access or ADB to retrieve.

### iOS / macOS
*   **PlayerPrefs (Plist)**: Stored as `.plist` files in the app's container.
*   On macOS, often in `~/Library/Preferences/`.

### Steam Cloud
*   Some games sync saves to Steam Cloud. You may need to disable cloud sync before editing.

## Step 1: Locate and Extract Your Save File

### For Android (Rooted):
1.  Use a root file explorer (e.g., Solid Explorer with root access).
2.  Navigate to `/data/data/[package.name]/shared_prefs/`.
3.  Copy the `.xml` file to a location you can access (e.g., Download folder).

### For Android (Non-Rooted with ADB):
1.  Enable Developer Mode on your phone.
2.  Connect via USB and run: `adb backup -f backup.ab [package.name]`
3.  Extract the backup using a tool like `android-backup-extractor`.

### For PC:
1.  Navigate to the game's save folder (see locations above).
2.  Copy the save file to a safe location.

## Step 2: Create a Backup

Before editing, **always** create a backup copy of your save file. Name it something like `savegame.xml.backup`.

## Step 3: Upload to the Online Editor

1.  Go to our [Unity Editor](/editor/unity).
2.  Drag and drop your `.xml`, `.plist`, or `.json` file.
3.  Wait for parsing to complete.

The editor will display a tree view of all keys and values in the save file.

## Step 4: Modify Values

Unity PlayerPrefs typically store simple values with descriptive key names:

*   `PlayerLevel` (int)
*   `Coins` or `Gold` (int)
*   `UnlockedLevels` (string, often comma-separated)
*   `SoundEnabled` (int, 0 or 1)

Click on a value to edit it. Change `Coins` from `500` to `99999` to give yourself near-infinite currency.

### Working with Complex Data
Some games store complex data as serialized JSON strings within a single PlayerPrefs key. In this case:
1.  Find the key (e.g., `SaveData`).
2.  Copy the value.
3.  Paste it into a JSON formatter to make it readable.
4.  Edit the values you want.
5.  Paste the modified JSON back.

## Step 5: Download and Replace

1.  Click **Download Modified Save**.
2.  Transfer the file back to its original location:
    *   On Android, use your file manager or ADB `push` command.
    *   On PC, simply copy and replace.
3.  Launch the game and verify your changes.

## Troubleshooting

### The game resets my changes
*   The game might be syncing with a server. Try playing in offline mode.
*   Some games validate save data with checksums. These are harder to bypass and require more advanced techniques.

### The file format looks wrong
*   Make sure you're editing the correct file. Unity games can have multiple save files.
*   If the file is binary/encrypted, our editor may display raw data. Look for a different save mechanism.

### Android: Permission denied
*   You need root access or must use ADB to access the `shared_prefs` folder.

## Frequently Asked Questions

**Q: Does this work for all Unity games?**
A: It works for games that use PlayerPrefs (XML/Plist) or standard JSON/XML saves. Games with custom binary formats or encryption may not be supported.

**Q: Will editing saves get me banned?**
A: For single-player games, no. For games with online components, modifying saves could result in a ban if the server detects inconsistencies. Use at your own risk for online games.

**Q: Can I unlock in-app purchases this way?**
A: Potentially, if the game stores IAP status locally. However, server-validated purchases cannot be bypassed.

**Q: Is root access required on Android?**
A: For most PlayerPrefs editing, yes. Alternatively, you can use ADB backups without root.

## Advanced: Editing Windows Registry PlayerPrefs

For games that store PlayerPrefs in the Windows Registry:

1.  Press `Win+R`, type `regedit`, press Enter.
2.  Navigate to `HKEY_CURRENT_USER\Software\[CompanyName]\[ProductName]`.
3.  You'll see keys with names like `Coins_h[hashcode]`. The values are binary.
4.  Use a PlayerPrefs-specific tool or manually decode the binary data.

This is more complex than file-based saves, but possible with the right tools.

## Conclusion

Editing Unity saves can range from trivially easy (simple XML files) to quite challenging (encrypted binary data). Our free online editor handles the common cases automatically, letting you modify your game progress in seconds. Always back up your saves, and enjoy your enhanced gaming experience!

## Further Reading

Expand your Unity save editing knowledge:

- 📖 [Unity Manual - PlayerPrefs](https://docs.unity3d.com/ScriptReference/PlayerPrefs.html) - Official Unity documentation
- 🎮 [Stardew Valley Game Page](/games/stardew-valley) - Popular Unity game save locations
- 🎮 [Hollow Knight Game Page](/games/hollow-knight) - Another Unity game guide
- 📂 [Common Save File Extensions](/blog/common-save-file-extensions-explained) - Understanding .xml, .plist, and more
- 🔧 [Unity Editor](/editor/unity) - The online tool used in this guide
- 🎭 [Unreal Engine Save Guide](/blog/how-to-edit-unreal-engine-saves) - Another popular game engine

---

*Last updated: January 2026*

### Related Articles

- [Common Save File Extensions Explained](/blog/common-save-file-extensions-explained)
- [How to Edit Unreal Engine Saves](/blog/how-to-edit-unreal-engine-saves)
- [Stardew Valley Save Editing](/games/stardew-valley)

