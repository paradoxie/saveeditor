/**
 * Centralized game data for game landing pages.
 * Used by: src/pages/games/[slug].astro and all localized variants.
 *
 * To add a new game, simply add a new entry to this array.
 * No other file modifications are needed — all [slug].astro pages
 * import from this single source of truth.
 */

export interface GameFaq {
  question: string;
  answer: string;
}

export interface EditableItem {
  icon: string;
  name: string;
  desc: string;
}

export interface RelatedGuide {
  title: string;
  url: string;
}

export interface GameData {
  slug: string;
  name: string;
  seoDescription?: string;
  seoContent?: string;
  engine: string;
  format: string;
  editorPath: string;
  emoji: string;
  image: string;
  description: string;
  saveLocations: {
    windows: string;
    mac: string;
    linux: string;
  };
  editableItems: EditableItem[];
  faq: GameFaq[];
  relatedGuides: RelatedGuide[];
}

export const games: GameData[] = [
  {
    slug: 'stardew-valley',
    name: 'Stardew Valley',
    seoDescription:
      'Best free online Stardew Valley save editor (No Download). Edit .xml saves, gold, inventory & skills instantly. Safe, local processing for PC/Mobile.',
    seoContent: `
      <h2>Why use our Stardew Valley Save Editor?</h2>
      <p>This automated tool simplifies save editing by parsing the complex XML structure of Stardew Valley save files. Unlike manual text editing which risks file corruption, our editor validates data integrity before saving, ensuring your farm data remains safe.</p>
      <h3>Key Features</h3>
      <ul>
          <li><strong>Instant Resource Editing:</strong> Add unlimited Gold, Qi Gems, and Casino Coins instantly.</li>
          <li><strong>Inventory Management:</strong> Add any item (Prismatic Shards, Galaxy Sword) directly to your backpack or chest.</li>
          <li><strong>Skill Maxing:</strong> Level up Farming, Mining, Foraging, Fishing, and Combat to Level 10 immediately.</li>
          <li><strong>Relationship Modification:</strong> Max out hearts with any villager or bachelor/bachelorette.</li>
      </ul>
      <h3>Safe & Local Processing</h3>
      <p>Your save files are processed entirely within your browser using JavaScript. <strong>No data is ever uploaded to a remote server</strong>, ensuring complete privacy and security for your save data. We do use Google Analytics and AdSense for site performance and ads; see our Privacy and Cookie policies.</p>
      <h3>Supported Platforms</h3>
      <p>Fully compatible with PC (Steam/GOG), Mac, Linux, and Mobile (Android/iOS) save files. For Switch/Console saves, you must first export them using a homebrew tool to get the raw file.</p>
    `,
    engine: 'Unity (XML)',
    format: '.xml',
    editorPath: '/editor/unity',
    emoji: '🌾',
    image: '/images/games/stardew-valley.webp',
    description: 'The beloved farming simulation RPG by ConcernedApe.',
    saveLocations: {
      windows: '%appdata%\\StardewValley\\Saves',
      mac: '~/Library/Application Support/StardewValley/Saves',
      linux: '~/.config/StardewValley/Saves',
    },
    editableItems: [
      { icon: '💰', name: 'Gold & Money', desc: 'Edit your farm income' },
      { icon: '🎒', name: 'Inventory & Items', desc: 'Add any item to your bag' },
      { icon: '❤️', name: 'Relationships', desc: 'Modify friendship hearts' },
      { icon: '📈', name: 'Skills & Experience', desc: 'Level up farming, mining, etc.' },
      { icon: '🏆', name: 'Achievements', desc: 'Unlock community center bundles' },
      { icon: '🗓️', name: 'Time & Season', desc: 'Change the current date' },
    ],
    faq: [
      {
        question: 'Where is my Stardew Valley save file?',
        answer:
          'On Windows, your saves are in %appdata%\\StardewValley\\Saves. Each save folder is named after your farmer (e.g., FarmerName_123456789).',
      },
      {
        question: 'Can I edit multiplayer saves?',
        answer:
          'Yes, but you should only edit your own save as the host. Be careful not to corrupt shared farm data.',
      },
      {
        question: 'Will editing break my game?',
        answer:
          'Always backup your save first! Our editor validates changes, but some extreme modifications might cause issues.',
      },
      {
        question: 'Is this safe for Steam achievements?',
        answer:
          'Yes, Steam cannot detect save editing for single-player games. Your achievements will work normally.',
      },
      {
        question: 'Can I edit saves on Android or iOS?',
        answer:
          'Yes! You can use this editor on mobile browsers. For Android, you just need to locate your save file. iOS requires file access via the Files app.',
      },
      {
        question: 'How do I backup my Stardew Valley save?',
        answer:
          'Before editing, simply copy your entire save folder (e.g., FarmerName_123) to a safe location like your Desktop. If anything goes wrong, just paste it back.',
      },
      {
        question: 'What if my file says "Invalid"?',
        answer:
          'Ensure you are uploading the correct file (SaveGameInfo is NOT the save file). You need the file named like "FarmerName_123456". Also check if your game version is supported.',
      },
    ],
    relatedGuides: [{ title: 'How to Edit Unity Saves', url: '/blog/how-to-edit-unity-saves' }],
  },
  {
    slug: 'palworld',
    name: 'Palworld',
    seoDescription:
      'Online Palworld `.sav` workflow for standard GVAS saves. Inspect data safely, attempt cautious edits on compatible files, and keep dedicated tools ready for complex variants.',
    seoContent: `
      <h2>Advanced Palworld Save Editing</h2>
      <p>Our Palworld workflow focuses on <strong>safe inspection first</strong>. It works best with standard GVAS saves and may switch to read-only mode for containerized or custom variants.</p>
      <h3>What may be editable in compatible saves:</h3>
      <ul>
          <li><strong>Pals:</strong> Inspect passive skills, stats, and progression fields where exposed in standard GVAS data.</li>
          <li><strong>Player:</strong> Adjust selected progression values when the structure is parseable and safe to rebuild.</li>
          <li><strong>Base & Items:</strong> Review inventory/base structures before making conservative edits and testing with backups.</li>
      </ul>
      <h3>Game Pass vs Steam</h3>
      <p>Steam <code>.sav</code> files are usually easier to inspect. Xbox/Game Pass saves often use additional containers; convert/decrypt first and expect read-only fallback in many cases.</p>
    `,
    engine: 'Unreal Engine (GVAS)',
    format: '.sav',
    editorPath: '/editor/palworld',
    emoji: '🦎',
    image: '/images/games/palworld.webp',
    description: 'The viral creature-collecting survival game by Pocketpair.',
    saveLocations: {
      windows: '%localappdata%\\Pal\\Saved\\SaveGames',
      mac: '~/Library/Application Support/Pal/Saved/SaveGames',
      linux:
        '~/.steam/steam/steamapps/compatdata/1623730/pfx/drive_c/users/steamuser/AppData/Local/Pal/Saved/SaveGames',
    },
    editableItems: [
      { icon: '💰', name: 'Gold', desc: 'Inspect or adjust currency fields in compatible saves' },
      { icon: '🦎', name: 'Pals', desc: 'Review Pal structures; edit carefully when parseable' },
      { icon: '📈', name: 'Player Stats', desc: 'Potentially adjust level/HP/stamina in supported variants' },
      { icon: '🎒', name: 'Inventory', desc: 'Inspect item arrays and test conservative edits' },
      { icon: '⚔️', name: 'Equipment', desc: 'Check equipment records for compatible save structures' },
      { icon: '🏠', name: 'Base Progress', desc: 'View base-related data where it is exposed in GVAS' },
    ],
    faq: [
      {
        question: 'Where are Palworld save files located?',
        answer:
          'Windows: %localappdata%\\Pal\\Saved\\SaveGames. Each world has its own folder with Level.sav (world data) and Players folder (player data).',
      },
      {
        question: 'Can I edit Palworld saves on Steam Deck?',
        answer:
          'Yes! The save location is in the Proton prefix folder. You can access it via Desktop Mode or transfer files to a PC for editing.',
      },
      {
        question: 'Will editing break multiplayer saves?',
        answer:
          'Be careful with multiplayer saves. Editing your player data should be safe, but modifying world/server data can cause sync issues.',
      },
      {
        question: 'How do I backup Palworld saves?',
        answer:
          'Copy the entire SaveGames folder before editing. Palworld auto-saves frequently, so make backups before making changes.',
      },
      {
        question: 'Can I add any Pal to my collection?',
        answer:
          'Sometimes. If your save parses as standard GVAS, you can edit exposed Pal entries. For many server/world variants, dedicated Palworld scripts are still required.',
      },
      {
        question: 'Is save editing bannable in Palworld?',
        answer:
          'Palworld is primarily a single-player/co-op game without anti-cheat. However, use caution on dedicated servers as admins may have rules against cheating.',
      },
    ],
    relatedGuides: [
      { title: 'Palworld Save Editing Guide', url: '/blog/palworld-save-editing-guide' },
      { title: 'How to Edit Unreal Engine Saves', url: '/blog/how-to-edit-unreal-engine-saves' },
    ],
  },
  {
    slug: 'undertale',
    name: 'Undertale',
    seoDescription:
      'Free Undertale Save Editor (No Install). Edit file0 & undertale.ini. Change HP, Gold, EXP, FUN value & Genocide flags. Web-based tool.',
    seoContent: `
      <h2>Undertale Save File Editor (file0 & undertale.ini)</h2>
      <p>Undertale uses two main files for saving data: <code>file0</code> (your active save slot) and <code>undertale.ini</code> (meta-data and persistent flags). Our editor can modify both.</p>
      <h3>Common Edits</h3>
      <ul>
          <li><strong>Genocide/Pacifist Route:</strong> Reset or trigger route-specific flags to change the story path without replaying.</li>
          <li><strong>FUN Value:</strong> Edit the 'fun' variable in <code>undertale.ini</code> to trigger random events (like Gaster followers).</li>
          <li><strong>Battle Stats:</strong> Modify HP, ATK, DEF, and EXP to make battles easier or harder.</li>
      </ul>
      <h3>How to use</h3>
      <p>Simply upload your <code>file0</code> to edit your current stats. To change "meta" events or reset the True Pacifist check, edit the <code>undertale.ini</code> file.</p>
    `,
    engine: 'GameMaker',
    format: 'file0, undertale.ini',
    editorPath: '/editor/gamemaker',
    emoji: '❤️',
    image: '/images/games/undertale.webp',
    description: 'The iconic indie RPG by Toby Fox where no one has to die.',
    saveLocations: {
      windows: '%localappdata%\\UNDERTALE',
      mac: '~/Library/Application Support/com.tobyfox.undertale/',
      linux: '~/.config/UNDERTALE',
    },
    editableItems: [
      { icon: '❤️', name: 'HP & LV', desc: 'Change health and LOVE level' },
      { icon: '🎒', name: 'Inventory', desc: 'Edit items in your inventory' },
      { icon: '💰', name: 'Gold (G)', desc: 'Modify your money' },
      { icon: '📍', name: 'Save Location', desc: 'Change your save point' },
      { icon: '🎮', name: 'Game Flags', desc: 'Toggle story progression' },
      { icon: '👤', name: 'Character Name', desc: 'Change the fallen human name' },
    ],
    faq: [
      {
        question: 'Where are Undertale save files?',
        answer:
          'Windows: %localappdata%\\UNDERTALE. Mac: ~/Library/Application Support/com.tobyfox.undertale/. The main files are file0 (save data) and undertale.ini (config).',
      },
      {
        question: 'How do I do a True Reset?',
        answer:
          'After a True Reset, the game treats you as a new player. You can edit your save to restore your previous state, or simply modify the "fun" value to see different events.',
      },
      {
        question: 'Can I change my FUN value?',
        answer:
          'Yes, edit the "fun" value in the `undertale.ini` file. This controls random events like the Gaster followers or the wrong number song.',
      },
      {
        question: 'Is it safe to edit the Genocide route?',
        answer:
          'Editing flags related to the Genocide route is possible but complex. Back up your `system_information_962` and `963` files before attempting significant changes.',
      },
      {
        question: 'Does this work with the Switch/PS4 version?',
        answer:
          'Directly, no. Consoles encrypt save files. However, if you can export your save (using a hacked console or cross-save tool) to PC format, you can edit it here.',
      },
      {
        question: 'What is file0?',
        answer:
          'file0 contains your actual save game data. Each line represents a game variable like HP, items, story flags, etc.',
      },
      {
        question: 'Can I change my route mid-game?',
        answer:
          'Yes! By editing game flags you can switch between Pacifist, Neutral, and Genocide routes.',
      },
    ],
    relatedGuides: [
      { title: 'GameMaker Save Editing Guide', url: '/blog/gamemaker-save-editing-guide' },
    ],
  },
  {
    slug: 'ddlc',
    name: 'Doki Doki Literature Club',
    seoDescription:
      'Doki Doki Literature Club Save Editor. Edit .save files, persistent data, and poem words. Unlock all CGs and Endings online.',
    seoContent: `
      <h2>DDLC Save & Persistent Data Editor</h2>
      <p>In Doki Doki Literature Club, manipulating files is part of the game. This editor allows you to modify the Ren'Py save data <code>.save</code> and the <code>persistent</code> file.</p>
      <h3>Unlock Everything</h3>
      <p>By editing the <code>persistent</code> data, you can instantly unlocking all CGs (images) in the gallery, all music tracks, and seen scenes without playing through every route multiple times.</p>
      <h3>Poem Minigame</h3>
      <p>You can edit the variables related to the poem minigame to ensure your poems always appeal to your chosen character (Sayori, Natsuki, or Yuri).</p>
    `,
    engine: "Ren'Py",
    format: '.save, persistent',
    editorPath: '/editor/renpy',
    emoji: '📚',
    image: '/images/games/ddlc.webp',
    description: 'A psychological horror visual novel that is not what it seems.',
    saveLocations: {
      windows: '%appdata%\\RenPy\\DDLC-1454445547',
      mac: '~/Library/RenPy/DDLC-1454445547',
      linux: '~/.renpy/DDLC-1454445547',
    },
    editableItems: [
      { icon: '📖', name: 'Story Progress', desc: 'Jump to any chapter' },
      { icon: '📝', name: 'Poem Variables', desc: 'Change poem word selections' },
      { icon: '❤️', name: 'Character Affinity', desc: 'Modify relationship with characters' },
      { icon: '🎮', name: 'Game Flags', desc: 'Toggle story events' },
      { icon: '🖼️', name: 'CG Gallery', desc: 'Unlock all gallery images' },
      { icon: '🔊', name: 'Music Room', desc: 'Unlock all music tracks' },
    ],
    faq: [
      {
        question: 'Where is my DDLC save?',
        answer:
          'Windows: %appdata%\\RenPy\\DDLC-1454445547. For DDLC Plus: %appdata%\\..\\LocalLow\\Team Salvato\\Doki Doki Literature Club Plus',
      },
      {
        question: 'Can I skip to a specific ending?',
        answer:
          'Yes! By editing story flags and persistent data, you can access different endings or replay specific scenes.',
      },
      {
        question: 'What is persistent data?',
        answer:
          'The persistent file stores data that remains across all saves, like unlocked CGs, completed playthroughs, and certain meta events.',
      },
      {
        question: 'Is file manipulation part of the game?',
        answer:
          'Yes! DDLC actually encourages players to manipulate game files as part of its meta-narrative. Our editor makes this easier.',
      },
    ],
    relatedGuides: [
      { title: "Ren'Py Save Editing Guide", url: '/blog/renpy-save-editing-guide' },
    ],
  },
  {
    slug: 'hollow-knight',
    name: 'Hollow Knight',
    engine: 'Unity',
    format: 'user#.dat',
    editorPath: '/editor/unity',
    emoji: '🪲',
    image: '/images/games/hollow-knight.webp',
    description: 'The acclaimed Metroidvania by Team Cherry.',
    saveLocations: {
      windows: '%appdata%\\..\\LocalLow\\Team Cherry\\Hollow Knight',
      mac: '~/Library/Application Support/unity.Team Cherry.Hollow Knight',
      linux: '~/.config/unity3d/Team Cherry/Hollow Knight',
    },
    editableItems: [
      { icon: '💰', name: 'Geo', desc: 'Edit your currency' },
      { icon: '❤️', name: 'Health Masks', desc: 'Modify max HP' },
      { icon: '💎', name: 'Soul', desc: 'Change soul meter' },
      { icon: '🗡️', name: 'Nail Upgrades', desc: 'Unlock nail levels' },
      { icon: '✨', name: 'Charms', desc: 'Edit charm notches and unlocks' },
      { icon: '🗺️', name: 'Map Progress', desc: 'Reveal map areas' },
    ],
    faq: [
      {
        question: 'Where are Hollow Knight saves?',
        answer:
          'Windows: %appdata%\\..\\LocalLow\\Team Cherry\\Hollow Knight. Files are named user1.dat, user2.dat, etc. for each save slot.',
      },
      {
        question: 'Can I backup before editing?',
        answer:
          'Always! Copy your user#.dat file before making changes. You can also find .bak backup files in the same folder.',
      },
      {
        question: 'Will this work with mods?',
        answer:
          'Most mods are compatible, but some save-modifying mods might conflict. Backup first!',
      },
      {
        question: 'Can I unlock all charms?',
        answer:
          'Yes, you can edit charm unlocks and increase your notch count through save editing.',
      },
    ],
    relatedGuides: [{ title: 'How to Edit Unity Saves', url: '/blog/how-to-edit-unity-saves' }],
  },
  {
    slug: 'rpg-maker',
    name: 'RPG Maker Games',
    seoDescription:
      'Free RPG Maker MV/MZ SaveEditor.Online. Edit .rpgsave and .rmmzsave files. Modify gold, items, stats, switches & variables in any RPG Maker game.',
    seoContent: `
      <h2>RPG Maker MV/MZ Save Editor</h2>
      <p>RPG Maker MV and MZ games store save data in <code>.rpgsave</code> and <code>.rmmzsave</code> files, which are Base64-encoded JSON. Our editor automatically decodes these files, providing a clean tree view of all game data.</p>
      <h3>What You Can Edit</h3>
      <ul>
          <li><strong>Gold & Party Data:</strong> Instantly change party gold, steps, and playtime values.</li>
          <li><strong>Actor Stats:</strong> Modify HP, MP, Level, EXP, attack, defense, and all other parameters for every party member.</li>
          <li><strong>Switches & Variables:</strong> Toggle game switches and edit variables that control story progression, side quests, and unlocks.</li>
          <li><strong>Inventory:</strong> Add or remove items, weapons, and armor by editing the items/weapons/armors arrays.</li>
      </ul>
      <h3>Privacy First</h3>
      <p>Your save files are processed entirely in your browser. <strong>No data is ever uploaded</strong>. We use Google Analytics and AdSense for site analytics and ads; see our Privacy and Cookie policies.</p>
    `,
    engine: 'RPG Maker (MV/MZ)',
    format: '.rpgsave, .rmmzsave',
    editorPath: '/editor/rpg-maker-mv',
    emoji: '🕯️',
    image: '/images/games/stardew-valley.webp',
    description: 'Thousands of indie RPGs built with RPG Maker MV and MZ.',
    saveLocations: {
      windows: 'Game folder/www/save or Game folder/save',
      mac: 'Game.app/Contents/Resources/app.nw/save',
      linux: 'Game folder/save',
    },
    editableItems: [
      { icon: '💰', name: 'Gold', desc: 'Edit party gold' },
      { icon: '👥', name: 'Party Stats', desc: 'Change HP, MP, Level, EXP' },
      { icon: '🎒', name: 'Inventory', desc: 'Add and remove items' },
      { icon: '⚔️', name: 'Equipment', desc: 'Modify weapons and armor' },
      { icon: '✨', name: 'Skills', desc: 'Learn any skill' },
      { icon: '🎮', name: 'Switches & Variables', desc: 'Edit game logic' },
    ],
    faq: [
      {
        question: 'Where are RPG Maker saves?',
        answer:
          'Most RPG Maker MV/MZ games store saves in the www/save or save folder within the game directory. Browser games use localStorage.',
      },
      {
        question: 'Why is my save showing weird numbers?',
        answer:
          'RPG Maker saves are encoded in JSON or Marshal format. Our editor decodes them automatically for easy editing.',
      },
      {
        question: 'Can I edit all RPG Maker games?',
        answer:
          'We support MV (.rpgsave) and MZ (.rmmzsave) formats in this web editor. Older Ruby Marshal formats (.rvdata2/.rvdata/.rxdata) are not editable here yet.',
      },
      {
        question: 'How do switches work?',
        answer:
          'Switches are on/off flags that developers use to track story progress. Editing these can unlock content or skip sections.',
      },
    ],
    relatedGuides: [
      { title: 'How to Edit RPG Maker Saves', url: '/blog/how-to-edit-rpg-maker-save' },
    ],
  },
];
