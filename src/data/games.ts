/**
 * Centralized game data for game landing pages.
 * Used by: src/pages/games/[slug].astro and all localized variants.
 *
 * Canonical fields live here. Localized game pages merge locale overlays
 * on top of this registry rather than re-defining capability claims.
 */
import { getPreset, getPresetEditableItems, getPresetQuickTargets } from './capability';

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

export interface SourceRef {
  title: string;
  url: string;
}

export interface GameData {
  slug: string;
  name: string;
  seoTitleByLocale: Record<GamePageLocale, string>;
  seoDescriptionByLocale: Record<GamePageLocale, string>;
  longTailTermsByLocale: Record<GamePageLocale, string[]>;
  imageAltByLocale: Record<GamePageLocale, string>;
  lastModified: string;
  seoDescription?: string;
  seoContent?: string;
  engine: string;
  format: string;
  editorPath: string;
  presetSlug?: string;
  emoji: string;
  image: string;
  description: string;
  saveLocations: {
    windows: string;
    mac: string;
    linux: string;
  };
  editorVerifiedItems: EditableItem[];
  editorQuickEditTargets: string[];
  presetConfidence: 'verified' | 'candidate' | 'blocked' | 'none';
  editableItems: EditableItem[];
  supportLimits: string[];
  failureReasons: string[];
  quickEditTargets: string[];
  backupSteps: string[];
  sourceRefs: SourceRef[];
  faq: GameFaq[];
  relatedGuides: RelatedGuide[];
}

export type GamePageLocale = 'en' | 'zh-cn' | 'ja';
export type LocalizedGameData = GameData & { nameLocal: string };

type GeneratedGameField =
  | 'editorVerifiedItems'
  | 'editorQuickEditTargets'
  | 'presetConfidence'
  | 'supportLimits'
  | 'failureReasons'
  | 'quickEditTargets'
  | 'backupSteps'
  | 'sourceRefs'
  | 'seoTitleByLocale'
  | 'seoDescriptionByLocale'
  | 'longTailTermsByLocale'
  | 'imageAltByLocale'
  | 'lastModified';
type GameDataInput = Omit<GameData, GeneratedGameField> &
  Partial<Pick<GameData, 'supportLimits' | 'failureReasons' | 'quickEditTargets' | 'backupSteps' | 'sourceRefs' | 'lastModified'>>;

function getSafeGameImage(image: string): string {
  return image;
}

function getDefaultSupportLimits(game: Pick<GameData, 'format'>): string[] {
  return [
    `Best results require the listed ${game.format} file format.`,
    'Keep a backup before replacing your original save.',
    'Encrypted, compressed, or game-specific containers may open read-only or fail to parse.',
  ];
}

function getDefaultFailureReasons(): string[] {
  return [
    'Wrong file selected, such as a metadata, backup, or cloud placeholder file.',
    'The game uses encryption, a checksum, or a custom container not exposed to the browser.',
    'The file is too large or was edited while the game was still running.',
  ];
}

function getDefaultBackupSteps(): string[] {
  return [
    'Close the game before copying the save.',
    'Copy the original save folder to a separate backup location.',
    'Replace only one save slot first and verify in-game before making more changes.',
  ];
}

function buildSeoTitleByLocale(game: Pick<GameData, 'name' | 'format'>): Record<GamePageLocale, string> {
  return {
    en: `${game.name} Save Editor - ${game.format} Save File Location & Quick Edit`,
    'zh-cn': `${game.name} 存档编辑器 - ${game.format} 存档位置与存档修改`,
    ja: `${game.name} セーブエディタ - ${game.format} セーブ場所とセーブ改造`,
  };
}

function buildSeoDescriptionByLocale(game: Pick<GameData, 'name' | 'format' | 'engine'> & { seoDescription?: string }): Record<GamePageLocale, string> {
  return {
    en: game.seoDescription ?? `Free ${game.name} save editor for ${game.format}. Find the save file location, edit compatible ${game.engine} fields, and review support limits before replacing your save.`,
    'zh-cn': `${game.name} 在线存档编辑器。查看 ${game.format} 存档位置、${game.engine} 可编辑字段、支持限制、失败原因和上传入口。`,
    ja: `${game.name} オンラインセーブエディタ。${game.format} のセーブ場所、${game.engine} の編集候補、制限、失敗理由、アップロード入口を確認できます。`,
  };
}

function buildLongTailTermsByLocale(game: Pick<GameData, 'name' | 'format' | 'engine'>): Record<GamePageLocale, string[]> {
  return {
    en: [
      `${game.name} save editor`,
      `${game.name} save file location`,
      `${game.name} save folder`,
      `${game.name} save slot editor`,
      `edit ${game.name} save`,
      `${game.format} save editor`,
      `${game.engine} save editor`,
      `${game.name} no download save editor`,
      `${game.name} quick edit`,
      `${game.name} backup save`,
      `${game.name} browser save editor`,
    ],
    'zh-cn': [
      `${game.name} 存档编辑器`,
      `${game.name} 存档位置`,
      `${game.name} 存档路径`,
      `${game.name} 存档目录`,
      `${game.name} 存档修改`,
      `${game.format} 存档编辑器`,
      `${game.engine} 存档编辑`,
      `${game.name} 备份存档`,
      `${game.name} 无需下载 存档编辑器`,
      `${game.name} Quick Edit`,
    ],
    ja: [
      `${game.name} セーブエディタ`,
      `${game.name} セーブ場所`,
      `${game.name} セーブフォルダ`,
      `${game.name} セーブ改造`,
      `${game.name} セーブデータ編集`,
      `${game.format} セーブエディタ`,
      `${game.engine} セーブ編集`,
      `${game.name} バックアップ`,
      `${game.name} ダウンロード不要 セーブエディタ`,
      `${game.name} Quick Edit`,
    ],
  };
}

function buildImageAltByLocale(game: Pick<GameData, 'name' | 'format'>): Record<GamePageLocale, string> {
  return {
    en: `${game.name} save editor hero artwork for ${game.format} files`,
    'zh-cn': `${game.name} ${game.format} 存档编辑器配图`,
    ja: `${game.name} ${game.format} セーブエディタ用ビジュアル`,
  };
}

function buildReferenceList(sourceRefs: SourceRef[]): string {
  if (sourceRefs.length === 0) return '';
  return `
    <h3>Reference links</h3>
    <ul>
      ${sourceRefs.slice(0, 3).map((ref) => `<li><a href="${ref.url}" rel="nofollow noopener" target="_blank">${ref.title}</a></li>`).join('')}
    </ul>
  `;
}

function buildDefaultSeoContent(game: Pick<GameData, 'name' | 'format' | 'engine' | 'quickEditTargets' | 'editorQuickEditTargets' | 'supportLimits' | 'failureReasons' | 'backupSteps' | 'sourceRefs'>): string {
  const quickTargets = (game.editorQuickEditTargets.length > 0 ? game.editorQuickEditTargets : game.quickEditTargets).slice(0, 8);
  const supportLimits = game.supportLimits.length > 0 ? game.supportLimits : getDefaultSupportLimits(game);
  const failureReasons = game.failureReasons.length > 0 ? game.failureReasons : getDefaultFailureReasons();
  const backupSteps = game.backupSteps.length > 0 ? game.backupSteps : getDefaultBackupSteps();
  return `
    <h2>${game.name} save editor workflow</h2>
    <p>Use this page to find your ${game.format} save file, back it up, and edit only the ${game.engine} fields that the browser can safely rebuild. Quick Edit targets show the fastest path; everything else should be verified in-game after a small change.</p>
    <h3>Common quick edit targets</h3>
    <ul>
      ${quickTargets.map((target) => `<li>${target}</li>`).join('')}
    </ul>
    <h3>Backup-first workflow</h3>
    <ul>
      ${backupSteps.map((step) => `<li>${step}</li>`).join('')}
    </ul>
    <h3>Support limits</h3>
    <ul>
      ${supportLimits.map((item) => `<li>${item}</li>`).join('')}
    </ul>
    <h3>Common failure reasons</h3>
    <ul>
      ${failureReasons.map((item) => `<li>${item}</li>`).join('')}
    </ul>
    ${buildReferenceList(game.sourceRefs)}
  `;
}

function withPageRequirements(game: GameDataInput): GameData {
  const presetSlug = game.presetSlug ?? game.slug;
  const preset = getPreset(presetSlug);
  const presetEditableItems = getPresetEditableItems(presetSlug);
  const presetQuickTargets = getPresetQuickTargets(presetSlug);
  const supportLimits = game.supportLimits ?? getDefaultSupportLimits(game);
  const failureReasons = game.failureReasons ?? getDefaultFailureReasons();
  const backupSteps = game.backupSteps ?? getDefaultBackupSteps();
  const sourceRefs = game.sourceRefs ?? [];
  return {
    ...game,
    image: getSafeGameImage(game.image),
    presetSlug,
    seoTitleByLocale: buildSeoTitleByLocale(game),
    seoDescriptionByLocale: buildSeoDescriptionByLocale(game),
    longTailTermsByLocale: buildLongTailTermsByLocale(game),
    imageAltByLocale: buildImageAltByLocale(game),
    lastModified: game.lastModified ?? '2026-05-25',
    editorVerifiedItems: preset?.confidence === 'verified' ? (presetEditableItems ?? []) : [],
    editorQuickEditTargets: presetQuickTargets ?? [],
    presetConfidence: preset?.confidence ?? 'none',
    seoContent: game.seoContent ?? buildDefaultSeoContent({
      ...game,
      supportLimits,
      failureReasons,
      backupSteps,
      sourceRefs,
      editorQuickEditTargets: presetQuickTargets ?? [],
      quickEditTargets: game.quickEditTargets ?? game.editableItems.map((item) => item.name),
    }),
    editableItems: game.editableItems,
    supportLimits,
    failureReasons,
    quickEditTargets: game.quickEditTargets ?? game.editableItems.map((item) => item.name),
    backupSteps,
    sourceRefs,
  };
}

const capabilityLabelMap: Record<GamePageLocale, Record<string, string>> = {
  en: {},
  'zh-cn': {
    'Gold / Money': '金钱',
    Level: '等级',
    EXP: '经验',
    'HP / MP': 'HP / MP',
    'Items / Inventory': '物品 / 背包',
    Weapons: '武器',
    Armors: '护甲',
    Variables: '变量',
    'Switches / Flags': '开关 / 标志',
    'Actor stats': '角色属性',
  },
  ja: {
    'Gold / Money': 'お金',
    Level: 'レベル',
    EXP: '経験値',
    'HP / MP': 'HP / MP',
    'Items / Inventory': 'アイテム / インベントリ',
    Weapons: '武器',
    Armors: '防具',
    Variables: '変数',
    'Switches / Flags': 'スイッチ / フラグ',
    'Actor stats': 'アクターステータス',
  },
};

const capabilityDescMap: Record<GamePageLocale, Record<string, string>> = {
  en: {},
  'zh-cn': {
    'Edit party currency fields.': '编辑队伍金钱字段。',
    'Edit actor level fields.': '编辑角色等级字段。',
    'Edit actor experience fields.': '编辑角色经验字段。',
    'Edit visible HP/MP and parameter fields.': '编辑可见的 HP/MP 与参数字段。',
    'Edit item quantities by ID or folder names.': '按 ID 或文件夹名称编辑物品数量。',
    'Edit weapon quantities where present.': '在存在该字段时编辑武器数量。',
    'Edit armor quantities where present.': '在存在该字段时编辑护甲数量。',
    'Edit numeric story variables cautiously.': '谨慎编辑数值型剧情变量。',
    'Toggle boolean event flags.': '切换布尔型事件开关。',
  },
  ja: {
    'Edit party currency fields.': 'パーティ所持金の項目を編集します。',
    'Edit actor level fields.': 'アクターのレベル項目を編集します。',
    'Edit actor experience fields.': 'アクターの経験値項目を編集します。',
    'Edit visible HP/MP and parameter fields.': '表示されている HP/MP と各種パラメータを編集します。',
    'Edit item quantities by ID or folder names.': 'ID またはフォルダ名ベースでアイテム数を編集します。',
    'Edit weapon quantities where present.': '存在する場合に武器数を編集します。',
    'Edit armor quantities where present.': '存在する場合に防具数を編集します。',
    'Edit numeric story variables cautiously.': '数値型のストーリー変数を慎重に編集します。',
    'Toggle boolean event flags.': 'ブール型イベントフラグを切り替えます。',
  },
};

const presetConfidenceLabelMap: Record<GamePageLocale, Record<GameData['presetConfidence'], string>> = {
  en: {
    verified: 'verified',
    candidate: 'candidate',
    blocked: 'blocked',
    none: 'none',
  },
  'zh-cn': {
    verified: '已验证',
    candidate: '候选',
    blocked: '已阻止',
    none: '无',
  },
  ja: {
    verified: '確認済み',
    candidate: '候補',
    blocked: 'ブロック',
    none: 'なし',
  },
};

export function localizeCapabilityItems(items: EditableItem[], locale: GamePageLocale): EditableItem[] {
  if (locale === 'en') return items;
  return items.map((item) => ({
    ...item,
    name: capabilityLabelMap[locale][item.name] ?? item.name,
    desc: capabilityDescMap[locale][item.desc] ?? item.desc,
  }));
}

export function localizeCapabilityTargets(targets: string[], locale: GamePageLocale): string[] {
  if (locale === 'en') return targets;
  return targets.map((target) => capabilityLabelMap[locale][target] ?? target);
}

export function localizePresetConfidence(confidence: GameData['presetConfidence'], locale: GamePageLocale): string {
  return presetConfidenceLabelMap[locale][confidence] ?? confidence;
}

const localeText = {
  'zh-cn': {
    genericDescription: (name: string, engine: string) => `${name} 的 ${engine} 存档编辑工作流，优先说明真实可编辑字段、限制和失败原因。`,
    genericSeo: (name: string, format: string) => `${name} 在线存档编辑器。查看 ${format} 存档位置、可编辑字段、支持限制、失败原因、备份步骤、替换注意事项和上传入口，按浏览器端流程安全修改。`,
    seoHeading: (name: string) => `${name} 存档编辑指南`,
    seoBody: (name: string, format: string, engine: string) =>
      `${name} 页面面向真实玩家的存档修改流程：先找到 ${format} 存档，备份原文件，再用浏览器本地解析。编辑器会按 ${engine} 的已验证能力显示 Quick Edit 字段；没有证据的字段会保持候选或只读说明。`,
    seoListTitle: '本页覆盖',
    locationQuestion: (name: string) => `${name} 存档在哪里？`,
    locationAnswer: (game: GameData) => `Windows 常见路径：${game.saveLocations.windows}。macOS 和 Linux 路径请参考本页存档位置区块。`,
    editableQuestion: (name: string) => `${name} 可以修改哪些字段？`,
    editableAnswer: (game: GameData) => `优先使用 Quick Edit 中显示的字段：${game.editorQuickEditTargets.length > 0 ? game.editorQuickEditTargets.join('、') : game.quickEditTargets.join('、')}。候选字段需要小步修改并进游戏验证。`,
    failureQuestion: '为什么会解析失败？',
    failureAnswer: '常见原因是选错文件、平台封装、加密/校验、游戏正在运行或文件过大。失败时请使用匿名 support pack 回流结构摘要。',
    relatedGuideTitle: (title: string) => title
      .replace('How to Edit RPG Maker Saves', 'RPG Maker 存档编辑指南')
      .replace('RPG Maker Save Editing Guide', 'RPG Maker 存档编辑指南')
      .replace('RPG Maker Save File Structure', 'RPG Maker 存档结构说明')
      .replace("Ren'Py Save Editing Guide", "Ren'Py 存档编辑指南")
      .replace('How to Edit Unity Saves', 'Unity 存档编辑指南')
      .replace('GameMaker Save Editing Guide', 'GameMaker 存档编辑指南')
      .replace('Palworld Save Editing Guide', 'Palworld 存档编辑指南')
      .replace('How to Edit Unreal Engine Saves', 'Unreal Engine 存档编辑指南'),
    supportLimits: (game: GameData) => [
      `最佳效果需要上传本页列出的 ${game.format} 原始存档。`,
      '替换原文件前必须保留备份，并优先只修改一个存档槽。',
      '加密、校验、平台容器或游戏自定义结构可能进入只读或解析失败。',
    ],
    failureReasons: [
      '上传了元数据、备份、云占位文件或错误平台的容器文件。',
      '游戏使用浏览器端暂不能安全重建的加密、校验或自定义结构。',
      '文件过大，或在游戏仍运行、仍自动保存时被编辑。',
    ],
    backupSteps: [
      '关闭游戏，避免自动保存覆盖修改。',
      '复制整个存档文件夹到单独备份位置。',
      '先替换一个存档槽并进游戏验证，再继续修改其他文件。',
    ],
  },
  ja: {
    genericDescription: (name: string, engine: string) => `${name} の ${engine} セーブ編集ワークフロー。編集可能な項目、制限、失敗理由を明確に表示します。`,
    genericSeo: (name: string, format: string) => `${name} オンラインセーブエディタ。${format} の保存場所、編集候補、制限、失敗理由、バックアップ手順、置き換え時の注意点、アップロード入口を確認できます。`,
    seoHeading: (name: string) => `${name} セーブ編集ガイド`,
    seoBody: (name: string, format: string, engine: string) =>
      `${name} ページでは、${format} セーブを見つけてバックアップし、ブラウザ内で解析する流れをまとめています。Quick Edit は ${engine} の検証済み能力に基づいて表示され、証拠が足りない項目は候補または読み取り専用として扱います。`,
    seoListTitle: 'このページで確認できること',
    locationQuestion: (name: string) => `${name} のセーブはどこですか？`,
    locationAnswer: (game: GameData) => `Windows の主な場所は ${game.saveLocations.windows} です。macOS と Linux は本ページの保存場所セクションを確認してください。`,
    editableQuestion: (name: string) => `${name} では何を編集できますか？`,
    editableAnswer: (game: GameData) => `Quick Edit に表示される項目を優先してください: ${game.editorQuickEditTargets.length > 0 ? game.editorQuickEditTargets.join('、') : game.quickEditTargets.join('、')}。候補項目は小さく変更し、ゲーム内で確認してください。`,
    failureQuestion: '解析に失敗する理由は？',
    failureAnswer: '主な理由は、誤ったファイル、プラットフォーム固有コンテナ、暗号化/チェックサム、ゲーム実行中の編集、またはファイルサイズです。失敗時は匿名 support pack で構造概要を共有できます。',
    relatedGuideTitle: (title: string) => title
      .replace('How to Edit RPG Maker Saves', 'RPGツクール セーブ編集ガイド')
      .replace('RPG Maker Save Editing Guide', 'RPGツクール セーブ編集ガイド')
      .replace('RPG Maker Save File Structure', 'RPGツクール セーブ構造ガイド')
      .replace("Ren'Py Save Editing Guide", "Ren'Py セーブ編集ガイド")
      .replace('How to Edit Unity Saves', 'Unity セーブ編集ガイド')
      .replace('GameMaker Save Editing Guide', 'GameMaker セーブ編集ガイド')
      .replace('Palworld Save Editing Guide', 'Palworld セーブ編集ガイド')
      .replace('How to Edit Unreal Engine Saves', 'Unreal Engine セーブ編集ガイド'),
    supportLimits: (game: GameData) => [
      `最良の結果には、このページに記載された ${game.format} の元セーブが必要です。`,
      '元ファイルを置き換える前にバックアップを残し、まず1つのスロットだけで確認してください。',
      '暗号化、チェックサム、プラットフォーム固有コンテナ、ゲーム固有構造は読み取り専用または解析失敗になる場合があります。',
    ],
    failureReasons: [
      'メタデータ、バックアップ、クラウドプレースホルダー、または別プラットフォームのコンテナを選択しています。',
      'ブラウザで安全に再構築できない暗号化、チェックサム、独自構造が使われています。',
      'ファイルが大きすぎる、またはゲーム実行中/自動保存中に編集されています。',
    ],
    backupSteps: [
      'ゲームを終了し、自動保存による上書きを避けます。',
      'セーブフォルダ全体を別の場所へコピーします。',
      'まず1つのスロットだけを置き換え、ゲーム内で確認してから続けます。',
    ],
  },
};

const localeSeoOverlays: Record<Exclude<GamePageLocale, 'en'>, Record<string, Partial<Pick<GameData, 'description' | 'seoDescription' | 'seoContent' | 'faq'>>>> = {
  'zh-cn': {
    'stardew-valley': {
      description: 'ConcernedApe 开发的农场模拟 RPG。',
      seoDescription: '星露谷物语在线存档编辑器。查看农场存档位置，修改金币、背包、技能、友谊和任务字段，先复制原档再在浏览器中小步验证。',
      seoContent: `
        <h2>星露谷物语存档编辑指南</h2>
        <p>星露谷物语存档是 XML 结构，适合先用 Quick Edit 定位金币、物品、技能、友谊等常见字段，再进入高级视图核对上下文。</p>
        <h3>建议流程</h3>
        <ul>
          <li>上传真正的农场存档文件，不要上传 SaveGameInfo。</li>
          <li>先改金币或单个物品数量，进游戏验证后再继续。</li>
          <li>多人农场建议只编辑主机备份出来的文件。</li>
        </ul>
      `,
    },
    palworld: {
      description: 'Pocketpair 开发的生存驯宠游戏。',
      seoDescription: 'Palworld .sav 在线检查与编辑入口。Player 存档优先显示高置信 Quick Panel，Level.sav/world 文件保持只读说明，并提示备份、替换和失败原因。',
      seoContent: `
        <h2>Palworld 存档编辑边界</h2>
        <p>Palworld 的 Player 存档和 world/Level.sav 风险不同。本页优先引导玩家上传 Players 目录下的个人存档；世界文件只做结构检查和失败原因说明。</p>
        <h3>当前重点</h3>
        <ul>
          <li>Player save：显示高置信的等级、经验、科技点、背包和 Pals 摘要。</li>
          <li>Level.sav/world：保持只读，避免破坏世界和服务器状态。</li>
          <li>失败回流：使用匿名 support pack 提供格式签名和结构摘要。</li>
        </ul>
      `,
    },
    undertale: {
      description: 'Toby Fox 的经典独立 RPG。',
      seoDescription: 'Undertale 在线存档编辑器。查看 file0 与 undertale.ini 位置，修改 HP、金币、EXP、FUN 和剧情标志前先备份。',
    },
    ddlc: {
      description: 'Team Salvato 的心理恐怖视觉小说。',
      seoDescription: 'DDLC Ren’Py 存档编辑入口。以 persistent primitive 为稳定写入边界，复杂 Python 对象保持只读。',
    },
    'hollow-knight': {
      description: 'Team Cherry 的银河恶魔城动作冒险游戏。',
      seoDescription: 'Hollow Knight 在线存档编辑器。查看 user#.dat 存档位置，检查 Geo、面具、灵魂、护符、地图进度和 Godhome 相关字段，替换前保留备份。',
    },
    'rpg-maker': {
      description: '覆盖 MV/MZ、XP/VX/VX Ace 与 2000/2003 的 RPG Maker 存档编辑入口。',
      seoDescription: 'RPG Maker 在线存档编辑器。支持 .rpgsave/.rmmzsave/.rvdata2/.rvdata/.rxdata/.lsd 的可证明能力和 Quick Edit。',
      seoContent: `
        <h2>RPG Maker 全代际存档编辑</h2>
        <p>RPG Maker 页面聚合现代 JSON、旧 Ruby Marshal 和 2000/2003 LCF 存档。Folder Mode 可读取 Data 文件或 RPG_RT.ldb，把物品、武器、护甲、角色、变量和开关 ID 映射成名称。</p>
        <h3>常见可改字段</h3>
        <ul>
          <li>队伍金钱、角色等级、经验、HP/MP 和参数。</li>
          <li>物品、武器、护甲数量，以及 All Items 99。</li>
          <li>变量和开关，建议只修改已理解的字段。</li>
        </ul>
      `,
    },
    omori: {
      description: 'OMOCAT 制作的心理恐怖 RPG。',
      seoDescription: 'OMORI 在线存档编辑器。定位 .rpgsave 存档文件，检查金钱、队伍、物品、变量、开关和剧情进度字段，按 RPG Maker MV 结构备份后再修改并进游戏验证。',
    },
    'lisa-the-painful': {
      description: 'Dingaling Productions 制作的末世叙事 RPG。',
      seoDescription: 'LISA: The Painful 在线存档编辑器。查看 .rvdata2 存档路径，检查金钱、队伍、物品、角色状态和变量字段，按 VX Ace 结构谨慎修改。',
    },
    oneshot: {
      description: 'Future Cat 制作的解谜冒险 RPG。',
      seoDescription: 'OneShot 在线存档编辑器。查看 .rpgsave 与 .rvdata2 存档位置，检查背包、地图、变量和剧情开关字段，替换前保留原始备份。',
    },
    'fear-and-hunger': {
      description: 'Miro Haverinen 制作的黑暗地牢 RPG。',
      seoDescription: 'Fear & Hunger 在线存档编辑器。定位 RPG Maker 存档文件，检查队伍状态、物品、银币、地图变量和事件开关，先复制备份再修改。',
    },
    ib: {
      description: 'kouri 制作的美术馆恐怖冒险游戏。',
      seoDescription: 'Ib 在线存档编辑器。查看 RPG Maker 存档位置，检查物品、角色状态、剧情变量、开关和结局相关字段，适合先备份后做小范围修改。',
    },
    'yume-nikki': {
      description: 'Kikiyama 制作的梦境探索 RPG。',
      seoDescription: '梦日记在线存档编辑器。定位 RPG Maker 存档文件，查看效果收集、地图位置、变量和开关状态，保留原档后再替换测试。',
    },
    'the-witchs-house': {
      description: 'Fummy 制作的日式恐怖解谜 RPG。',
      seoDescription: '魔女之家在线存档编辑器。查看 RPG Maker 存档路径，检查物品、位置、剧情变量和机关开关，修改前复制备份并进游戏验证。',
    },
    'ao-oni': {
      description: 'noprops 制作的经典日式恐怖 RPG。',
      seoDescription: '青鬼在线存档编辑器。定位 RPG Maker 存档文件，检查钥匙道具、地图位置、逃脱进度、变量和开关字段，先备份再替换。',
    },
    'mogeko-castle': {
      description: 'Deep-Sea Prisoner 制作的 RPG Maker 冒险游戏。',
      seoDescription: 'Mogeko Castle 在线存档编辑器。查看 RPG Maker 存档位置，检查物品、角色状态、剧情变量和开关字段，使用备份文件测试修改结果。',
    },
    misao: {
      description: 'Sen 制作的校园恐怖 RPG Maker 游戏。',
      seoDescription: '操 Misao 在线存档编辑器。定位 .rpgsave、.rvdata2 或旧版 RPG Maker 存档，检查物品、角色状态、地图变量和剧情开关。',
    },
  },
  ja: {
    'stardew-valley': {
      description: 'ConcernedApe による農場シミュレーション RPG。',
      seoDescription: 'スターデューバレーのオンラインセーブエディタ。農場セーブの場所を確認し、ゴールド、インベントリ、スキル、友好度をバックアップ前提で少しずつ編集できます。',
      seoContent: `
        <h2>スターデューバレー セーブ編集ガイド</h2>
        <p>スターデューバレーのセーブは XML 形式です。Quick Edit でゴールド、アイテム、スキル、友好度などを見つけ、必要に応じて詳細表示で確認できます。</p>
        <h3>推奨手順</h3>
        <ul>
          <li>SaveGameInfo ではなく、農場名のセーブファイルを選択します。</li>
          <li>最初はゴールドや単一アイテムなど小さな変更だけを試します。</li>
          <li>マルチプレイ農場はホスト側のバックアップを必ず残してください。</li>
        </ul>
      `,
    },
    palworld: {
      description: 'Pocketpair によるサバイバル・モンスター育成ゲーム。',
      seoDescription: 'Palworld .sav のオンライン確認/編集入口。Player セーブは高信頼 Quick Panel、Level.sav/world は読み取り専用で扱います。',
      seoContent: `
        <h2>Palworld セーブ編集の境界</h2>
        <p>Palworld は Player セーブと world/Level.sav でリスクが異なります。本ページでは Players フォルダ内の個人セーブを優先し、ワールドファイルは構造確認と失敗理由の表示に限定します。</p>
        <h3>現在の重点</h3>
        <ul>
          <li>Player save: レベル、経験値、テクノロジーポイント、インベントリ、Pals 概要。</li>
          <li>Level.sav/world: ワールドやサーバー状態を壊さないため読み取り専用。</li>
          <li>失敗時: 匿名 support pack で形式署名と構造概要を共有。</li>
        </ul>
      `,
    },
    undertale: {
      description: 'Toby Fox による代表的なインディー RPG。',
      seoDescription: 'Undertale オンラインセーブエディタ。file0 と undertale.ini の場所、HP、G、EXP、FUN、ルートフラグを確認できます。',
    },
    ddlc: {
      description: 'Team Salvato による心理ホラー系ビジュアルノベル。',
      seoDescription: 'DDLC Ren’Py セーブ編集入口。安定書き込みは persistent primitive に限定し、複雑な Python オブジェクトは保護します。',
    },
    'hollow-knight': {
      description: 'Team Cherry によるメトロイドヴァニア。',
      seoDescription: 'Hollow Knight オンラインセーブエディタ。user#.dat の保存場所、Geo、仮面、ソウル、チャーム、マップ進行、Godhome 関連データ、バックアップ手順を確認できます。',
    },
    'rpg-maker': {
      description: 'MV/MZ、XP/VX/VX Ace、2000/2003 を対象にした RPGツクール セーブ編集入口。',
      seoDescription: 'RPGツクール オンラインセーブエディタ。.rpgsave/.rmmzsave/.rvdata2/.rvdata/.rxdata/.lsd の検証済み能力を表示します。',
      seoContent: `
        <h2>RPGツクール世代別セーブ編集</h2>
        <p>RPGツクールページは、現代の JSON、旧 Ruby Marshal、2000/2003 LCF セーブをまとめて扱います。Folder Mode では Data ファイルや RPG_RT.ldb を読み、アイテム、武器、防具、アクター、変数、スイッチの ID を名前へ対応付けます。</p>
        <h3>主な編集項目</h3>
        <ul>
          <li>所持金、レベル、経験値、HP/MP、各種パラメータ。</li>
          <li>アイテム、武器、防具数と All Items 99。</li>
          <li>変数とスイッチ。意味が分かる項目だけを小さく変更してください。</li>
        </ul>
      `,
    },
  },
};

export function localizeGamePage(game: GameData, locale: GamePageLocale, nameLocal = game.name): LocalizedGameData {
  if (locale === 'en') return { ...game, nameLocal: game.name };
  const text = localeText[locale];
  const overlay = localeSeoOverlays[locale][game.slug] ?? {};
  const baseSeoDescription = overlay.seoDescription ?? text.genericSeo(nameLocal, game.format);
  const localizedSeoDescription = baseSeoDescription.includes(game.format)
    ? baseSeoDescription
    : locale === 'zh-cn'
      ? `${baseSeoDescription} 覆盖 ${game.format} 存档位置、存档修改和支持边界。`
      : `${baseSeoDescription} ${game.format} のセーブ場所、編集候補、対応範囲も確認できます。`;
  const localized: LocalizedGameData = {
    ...game,
    nameLocal,
    description: overlay.description ?? text.genericDescription(nameLocal, game.engine),
    seoDescription: localizedSeoDescription,
    seoTitleByLocale: buildSeoTitleByLocale({ ...game, name: nameLocal }),
    seoDescriptionByLocale: {
      ...buildSeoDescriptionByLocale({ ...game, name: nameLocal }),
      [locale]: localizedSeoDescription,
    },
    longTailTermsByLocale: buildLongTailTermsByLocale({ ...game, name: nameLocal }),
    imageAltByLocale: buildImageAltByLocale({ ...game, name: nameLocal }),
    seoContent: overlay.seoContent ?? buildLocalizedSeoContent(game, locale, nameLocal),
    editableItems: localizeCapabilityItems(game.editableItems, locale),
    editorVerifiedItems: localizeCapabilityItems(game.editorVerifiedItems, locale),
    quickEditTargets: localizeCapabilityTargets(game.quickEditTargets, locale),
    editorQuickEditTargets: localizeCapabilityTargets(game.editorQuickEditTargets, locale),
    supportLimits: text.supportLimits(game),
    failureReasons: text.failureReasons,
    backupSteps: text.backupSteps,
    faq: overlay.faq ?? [
      { question: text.locationQuestion(nameLocal), answer: text.locationAnswer(game) },
      { question: text.editableQuestion(nameLocal), answer: text.editableAnswer(game) },
      { question: text.failureQuestion, answer: text.failureAnswer },
    ],
    relatedGuides: game.relatedGuides.map((guide) => ({
      ...guide,
      title: text.relatedGuideTitle(guide.title),
    })),
  };
  return localized;
}

function buildLocalizedSeoContent(game: GameData, locale: Exclude<GamePageLocale, 'en'>, nameLocal: string): string {
  const text = localeText[locale];
  const targets = localizeCapabilityTargets(game.editorQuickEditTargets.length > 0 ? game.editorQuickEditTargets : game.quickEditTargets, locale);
  const limits = game.supportLimits.length > 0 ? game.supportLimits : locale === 'zh-cn' ? localeText['zh-cn'].supportLimits(game) : localeText.ja.supportLimits(game);
  const failures = game.failureReasons.length > 0 ? game.failureReasons : locale === 'zh-cn' ? localeText['zh-cn'].failureReasons : localeText.ja.failureReasons;
  return `
    <h2>${text.seoHeading(nameLocal)}</h2>
    <p>${text.seoBody(nameLocal, game.format, game.engine)}</p>
    <h3>${text.seoListTitle}</h3>
    <ul>
      ${targets.slice(0, 8).map((target) => `<li>${target}</li>`).join('')}
    </ul>
    <h3>${locale === 'zh-cn' ? '支持限制' : '対応範囲'}</h3>
    <ul>
      ${limits.slice(0, 3).map((item) => `<li>${item}</li>`).join('')}
    </ul>
    <h3>${locale === 'zh-cn' ? '常见失败原因' : 'よくある失敗理由'}</h3>
    <ul>
      ${failures.slice(0, 3).map((item) => `<li>${item}</li>`).join('')}
    </ul>
  `;
}

const rpgMakerExpansionDetails: Record<string, {
  saveLocations: GameData['saveLocations'];
  sourceRefs: SourceRef[];
}> = {
  'fear-and-hunger': {
    saveLocations: {
      windows: 'Steam/steamapps/common/Fear & Hunger/www/save',
      mac: 'Fear & Hunger.app/Contents/Resources/app.nw/save',
      linux: 'Steam/steamapps/common/Fear & Hunger/www/save or Proton game folder/www/save',
    },
    sourceRefs: [{ title: 'Steam community save folder discussion', url: 'https://steamcommunity.com/app/1002300/discussions/0/4034727291137434477/' }],
  },
  ib: {
    saveLocations: {
      windows: 'Game install folder/save or game folder with Save*.rvdata2',
      mac: 'Game app resources/save or Wine/Proton game folder',
      linux: 'Game install folder/save or Proton prefix game folder',
    },
    sourceRefs: [{ title: 'Steam store page', url: 'https://store.steampowered.com/app/1901370/Ib/' }],
  },
  'yume-nikki': {
    saveLocations: {
      windows: 'Steam/steamapps/common/YumeNikki or game folder with RPG_RT save files',
      mac: 'Wine/Proton wrapper game folder',
      linux: 'Steam/steamapps/common/YumeNikki or Proton prefix game folder',
    },
    sourceRefs: [{ title: 'SteamDB app metadata', url: 'https://steamdb.info/app/650700/' }],
  },
  'the-witchs-house': {
    saveLocations: {
      windows: 'Steam/steamapps/common/The Witchs House MV/www/save',
      mac: 'The Witchs House MV.app/Contents/Resources/app.nw/save',
      linux: 'Steam/steamapps/common/The Witchs House MV/www/save or Proton prefix',
    },
    sourceRefs: [{ title: 'Steam store page', url: 'https://store.steampowered.com/app/885810/The_Witchs_House_MV/' }],
  },
  'ao-oni': {
    saveLocations: {
      windows: 'Game install folder with Save*.lsd or Save*.rvdata files',
      mac: 'Wine/Proton wrapper game folder',
      linux: 'Game install folder or Proton prefix game folder',
    },
    sourceRefs: [{ title: 'RPG Maker 2000/2003 format reference', url: 'https://github.com/EasyRPG/liblcf' }],
  },
  'mogeko-castle': {
    saveLocations: {
      windows: 'Game install folder with Save*.rvdata2 files',
      mac: 'Wine/Proton wrapper game folder',
      linux: 'Game install folder or Proton prefix game folder',
    },
    sourceRefs: [{ title: 'RPG Maker Wiki game profile', url: 'https://rpgmaker.fandom.com/wiki/Mogeko_Castle' }],
  },
  misao: {
    saveLocations: {
      windows: 'Steam/steamapps/common/Misao Definitive Edition/www/save',
      mac: 'Misao.app/Contents/Resources/app.nw/save',
      linux: 'Steam/steamapps/common/Misao Definitive Edition/www/save or Proton prefix',
    },
    sourceRefs: [{ title: 'Steam store page', url: 'https://store.steampowered.com/app/691450/Misao_Definitive_Edition/' }],
  },
  off: {
    saveLocations: {
      windows: 'Game install folder with Save*.rxdata or Save*.rvdata files',
      mac: 'Wine/Proton wrapper game folder',
      linux: 'Game install folder or Proton prefix game folder',
    },
    sourceRefs: [{ title: 'OFF Steam Cloud save paths', url: 'https://steamdb.info/app/3339880/ufs/' }],
  },
  wadanohara: {
    saveLocations: {
      windows: 'Game install folder with Save*.rvdata2 files',
      mac: 'Wine/Proton wrapper game folder',
      linux: 'Game install folder or Proton prefix game folder',
    },
    sourceRefs: [{ title: 'RPG Maker Wiki game profile', url: 'https://rpgmaker.fandom.com/wiki/Wadanohara_and_the_Great_Blue_Sea' }],
  },
  'pocket-mirror': {
    saveLocations: {
      windows: 'Game install folder with Save*.rvdata2 files',
      mac: 'Wine/Proton wrapper game folder',
      linux: 'Game install folder or Proton prefix game folder',
    },
    sourceRefs: [{ title: 'Steam store page', url: 'https://store.steampowered.com/app/1899060/Pocket_Mirror__GoldenerTraum/' }],
  },
  'hello-charlotte': {
    saveLocations: {
      windows: 'Game install folder with Save*.rvdata2 files',
      mac: 'Wine/Proton wrapper game folder',
      linux: 'Game install folder or Proton prefix game folder',
    },
    sourceRefs: [{ title: 'Steam store page', url: 'https://store.steampowered.com/app/557630/Hello_Charlotte_EP2_Requiem_Aeternam_Deo/' }],
  },
};

const rpgMakerCustomImages: Record<string, string> = {
  'fear-and-hunger': '/images/games/fear-and-hunger.webp',
  ib: '/images/games/ib.webp',
  'yume-nikki': '/images/games/yume-nikki.webp',
  'the-witchs-house': '/images/games/the-witchs-house.webp',
  'ao-oni': '/images/games/ao-oni.webp',
  'mogeko-castle': '/images/games/mogeko-castle.webp',
  misao: '/images/games/misao.webp',
  off: '/images/games/off.webp',
  wadanohara: '/images/games/wadanohara.webp',
  'pocket-mirror': '/images/games/pocket-mirror.webp',
  'hello-charlotte': '/images/games/hello-charlotte.webp',
};

const rpgMakerExpansionGames: GameDataInput[] = [
  ['fear-and-hunger', 'Fear & Hunger', 'Fear & Hunger save files usually use RPG Maker MV/MZ style save data.'],
  ['ib', 'Ib', 'Ib is a RPG Maker horror adventure where inventory, switches, and variables are common edit targets.'],
  ['yume-nikki', 'Yume Nikki', 'Yume Nikki saves are best handled as RPG Maker state data with cautious switch and item edits.'],
  ['the-witchs-house', "The Witch's House", "The Witch's House progress is typically controlled by RPG Maker items, switches, and variables."],
  ['ao-oni', 'Ao Oni', 'Ao Oni save editing focuses on RPG Maker inventory, location, and event flags.'],
  ['mogeko-castle', 'Mogeko Castle', 'Mogeko Castle save files are RPG Maker saves where event flags and inventory matter most.'],
  ['misao', 'Misao', 'Misao editing focuses on RPG Maker switches, variables, and inventory state.'],
  ['off', 'OFF', 'OFF saves are RPG Maker data where money, party stats, and variables are common targets.'],
  ['wadanohara', 'Wadanohara and the Great Blue Sea', 'Wadanohara save editing focuses on RPG Maker items, actor stats, and flags.'],
  ['pocket-mirror', 'Pocket Mirror', 'Pocket Mirror save files are RPG Maker data with progress flags and inventory state.'],
  ['hello-charlotte', 'Hello Charlotte', 'Hello Charlotte save files are usually RPG Maker data with story flags and inventory fields.'],
].map(([slug, name, description]) => ({
  slug,
  name,
  seoDescription: `${name} online save editor. Find save paths, edit RPG Maker money, EXP, items, variables, switches, and understand guarded export limits.`,
  engine: 'RPG Maker',
  format: '.rpgsave, .rvdata2, .rvdata, .rxdata, .lsd',
  editorPath: '/editor/rpg-maker-mv',
  emoji: '🎮',
  image: rpgMakerCustomImages[slug] ?? '/images/games/rpg-maker.webp',
  description,
  saveLocations: rpgMakerExpansionDetails[slug].saveLocations,
  editableItems: [
    { icon: '💰', name: 'Gold / Money', desc: 'Edit exposed party currency fields' },
    { icon: '📈', name: 'Level / EXP', desc: 'Adjust actor level and experience fields' },
    { icon: '🎒', name: 'Items / Inventory', desc: 'Add or increase item quantities' },
    { icon: '🧰', name: 'Weapons / Armors', desc: 'Adjust equipment counts where present' },
    { icon: '🔢', name: 'Variables', desc: 'Edit story and puzzle variables cautiously' },
    { icon: '🚩', name: 'Switches / Flags', desc: 'Toggle simple event flags after backup' },
  ],
  supportLimits: [
    `${name} support depends on the exact RPG Maker generation and save file exported by the game.`,
    'Folder Mode can label item, actor, variable, and switch IDs when the game Data folder is selected.',
    'Encrypted, packed, or custom-scripted saves may open read-only or reject unsafe structural changes.',
  ],
  failureReasons: [
    `${name} may store progress in a different slot, config file, or persistent system file.`,
    'The uploaded file may be a backup, metadata file, or a packed executable resource.',
    'A custom script may add checksums or object structures that are intentionally guarded.',
  ],
  quickEditTargets: ['Gold', 'Level', 'EXP', 'Items', 'Weapons', 'Armors', 'Variables', 'Switches'],
  backupSteps: ['Close the game.', 'Copy the full save folder.', 'Edit one slot first and verify in-game.'],
  sourceRefs: rpgMakerExpansionDetails[slug].sourceRefs,
  faq: [
    {
      question: `Where is the ${name} save file?`,
      answer: 'Check the game folder for www/save, save, or Save. Steam and translated releases may use different folder names.',
    },
    {
      question: `What can I edit in ${name}?`,
      answer: 'Common targets are money, actor stats, inventory counts, variables, and switches. Folder Mode improves labels when Data files are available.',
    },
  ],
  relatedGuides: [{ title: 'RPG Maker Save Editing Guide', url: '/blog/how-to-edit-rpg-maker-save' }],
}));

const renpyCustomImages: Record<string, string> = {
  'teaching-feeling': '/images/games/teaching-feeling.webp',
  'being-a-dik': '/images/games/being-a-dik.webp',
  'summertime-saga': '/images/games/summertime-saga.webp',
};

const renpyExpansionGames: GameDataInput[] = [
  ['teaching-feeling', 'Teaching Feeling'],
  ['being-a-dik', 'Being a DIK'],
  ['summertime-saga', 'Summertime Saga'],
].map(([slug, name]) => ({
  slug,
  name,
  seoDescription: `${name} Ren'Py save editor. Find save paths, inspect persistent data, edit primitive unlock flags, and avoid unsafe pickle edits.`,
  engine: "Ren'Py",
  format: '.save, persistent',
  editorPath: '/editor/renpy',
  emoji: '📖',
  image: renpyCustomImages[slug] ?? '/images/games/ddlc.webp',
  description: `${name} uses Ren'Py-style save and persistent data on many desktop builds.`,
  saveLocations: {
    windows: `%appdata%\\RenPy\\${name.replace(/[^A-Za-z0-9]+/g, '')}`,
    mac: `~/Library/RenPy/${name.replace(/[^A-Za-z0-9]+/g, '')}`,
    linux: `~/.renpy/${name.replace(/[^A-Za-z0-9]+/g, '')}`,
  },
  editableItems: [
    { icon: '🖼️', name: 'Gallery Unlocks', desc: 'Edit simple persistent unlock flags' },
    { icon: '📖', name: 'Seen Text', desc: 'Inspect read-progress flags' },
    { icon: '🎮', name: 'Route Flags', desc: 'Review primitive route-related fields' },
    { icon: '🔢', name: 'Counters', desc: 'Edit primitive number fields under persistent' },
  ],
  supportLimits: [
    `${name} saving is stable-limited: only primitive values under persistent are writable.`,
    'Full Ren’Py game state, complex Python objects, and non-persistent structures remain guarded.',
    'Some releases rename the RenPy folder or store extra state outside the selected file.',
  ],
  failureReasons: [
    'The uploaded file contains unsupported Python pickle objects.',
    'The edit touches non-persistent session or game state.',
    `${name} may regenerate or validate some persistent values on launch.`,
  ],
  quickEditTargets: ['Persistent booleans', 'Gallery flags', 'Seen text flags', 'Primitive counters'],
  backupSteps: ['Close the game.', 'Copy the RenPy save folder.', 'Edit persistent first and verify in-game.'],
  sourceRefs: [{ title: 'Ren’Py persistent data', url: 'https://www.renpy.org/doc/html/persistent.html' }],
  faq: [
    {
      question: `Can this edit every ${name} save value?`,
      answer: 'No. The stable path is primitive persistent data only; complex Python objects and non-persistent game state are blocked.',
    },
  ],
  relatedGuides: [{ title: "Ren'Py Save Editing Guide", url: '/blog/renpy-save-editing-guide' }],
}));

const gameInputs: GameDataInput[] = [
  ...rpgMakerExpansionGames,
  ...renpyExpansionGames,
  {
    slug: 'stardew-valley',
    name: 'Stardew Valley',
    seoDescription:
      'Free online Stardew Valley save editor (No Download). Edit .xml saves, gold, inventory and skills with backup-first local processing for PC/Mobile.',
    seoContent: `
      <h2>Why use our Stardew Valley Save Editor?</h2>
      <p>This automated tool simplifies save editing by parsing the complex XML structure of Stardew Valley save files. Unlike manual text editing which risks file corruption, our editor validates data integrity before saving, ensuring your farm data remains safe.</p>
      <h3>Key Features</h3>
      <ul>
          <li><strong>Resource Editing:</strong> Adjust Gold, Qi Gems, and Casino Coins after backing up your farm.</li>
          <li><strong>Inventory Management:</strong> Add any item (Prismatic Shards, Galaxy Sword) directly to your backpack or chest.</li>
          <li><strong>Skill Maxing:</strong> Level up Farming, Mining, Foraging, Fishing, and Combat to Level 10 immediately.</li>
          <li><strong>Relationship Modification:</strong> Max out hearts with any villager or bachelor/bachelorette.</li>
      </ul>
      <h3>Safe & Local Processing</h3>
      <p>The main editor processes compatible save files in your browser using JavaScript. We do use Google Analytics and AdSense for site performance and ads; see our Privacy and Cookie policies.</p>
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
    sourceRefs: [
      { title: 'Stardew Valley Wiki - Saves', url: 'https://stardewvalleywiki.com/Saves' },
      { title: 'Stardew Valley Wiki - Locate your save files', url: 'https://stardewvalleywiki.com/Modding:Player_Guide/Troubleshooting#Locate_your_save_files' },
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
    sourceRefs: [
      { title: 'Palworld save game data location', url: 'https://www.pcgamingwiki.com/wiki/Palworld#Save_game_data_location' },
      { title: 'Palworld Steam Cloud metadata', url: 'https://steamdb.info/app/1623730/ufs/' },
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
    sourceRefs: [
      { title: 'Undertale save game data location', url: 'https://www.pcgamingwiki.com/wiki/Undertale#Save_game_data_location' },
      { title: 'Undertale Steam Cloud metadata', url: 'https://steamdb.info/app/391540/ufs/' },
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
    sourceRefs: [
      { title: "Ren'Py persistent data", url: 'https://www.renpy.org/doc/html/persistent.html' },
      { title: 'DDLC save game data location', url: 'https://www.pcgamingwiki.com/wiki/Doki_Doki_Literature_Club!#Save_game_data_location' },
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
    sourceRefs: [
      { title: 'Hollow Knight save game data location', url: 'https://www.pcgamingwiki.com/wiki/Hollow_Knight#Save_game_data_location' },
      { title: 'Hollow Knight Steam Cloud metadata', url: 'https://steamdb.info/app/367520/ufs/' },
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
      <h3>Browser-Side Parsing</h3>
      <p>The main editor parses compatible save files in your browser. We use Google Analytics and AdSense for site analytics and ads; see our Privacy and Cookie policies.</p>
    `,
    engine: 'RPG Maker (MV/MZ)',
    format: '.rpgsave, .rmmzsave, .rvdata2, .rvdata, .rxdata, .lsd',
    editorPath: '/editor/rpg-maker-mv',
    emoji: '🕯️',
    image: '/images/games/rpg-maker.webp',
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
          'MV (.rpgsave) and MZ (.rmmzsave) support editing and export. Older Ruby Marshal formats (.rvdata2/.rvdata/.rxdata) support limited editing for common fields such as gold, items, variables, switches, and actor stats.',
      },
      {
        question: 'How do switches work?',
        answer:
          'Switches are on/off flags that developers use to track story progress. Editing these can unlock content or skip sections.',
      },
    ],
    sourceRefs: [
      { title: 'EasyRPG liblcf format reference', url: 'https://github.com/EasyRPG/liblcf' },
      { title: 'RPG Maker project file overview', url: 'https://www.rpgmakerweb.com/blog/what-files-make-up-a-game-project' },
    ],
    relatedGuides: [
      { title: 'How to Edit RPG Maker Saves', url: '/blog/how-to-edit-rpg-maker-save' },
    ],
  },
  {
    slug: 'omori',
    name: 'OMORI',
    seoDescription:
      'OMORI save editor for RPG Maker MV .rpgsave files. Find the save folder, edit clams, items, stats, variables, and understand common load failures.',
    engine: 'RPG Maker MV',
    format: '.rpgsave',
    editorPath: '/editor/rpg-maker-mv',
    emoji: '💡',
    image: '/images/games/omori.webp',
    description: 'A psychological RPG built with RPG Maker MV.',
    saveLocations: {
      windows: 'Steam/steamapps/common/OMORI/www/save',
      mac: 'OMORI.app/Contents/Resources/app.nw/www/save',
      linux: 'Steam/steamapps/common/OMORI/www/save',
    },
    editableItems: [
      { icon: '💰', name: 'Clams', desc: 'Edit money-like values in party data' },
      { icon: '🎒', name: 'Inventory', desc: 'Adjust item quantities by ID' },
      { icon: '📈', name: 'Stats & EXP', desc: 'Change actor level, EXP, HP, MP, and parameters' },
      { icon: '🎮', name: 'Switches & Variables', desc: 'Inspect route and story flags carefully' },
    ],
    supportLimits: [
      'Steam PC saves are usually file1.rpgsave, file2.rpgsave, file3.rpgsave, and global.rpgsave.',
      'Game Pass and console saves may use platform containers and are not the same as Steam .rpgsave files.',
      'Story variables are game-specific; edit small values and verify in-game.',
    ],
    failureReasons: [
      'Uploading SaveGameInfo or global.rpgsave when you meant to edit a slot file.',
      'Replacing a slot that the game has not created yet.',
      'Using a console or Game Pass container instead of a raw .rpgsave file.',
    ],
    quickEditTargets: ['Clams', 'Items', 'Actor level', 'EXP', 'HP/MP', 'Switches', 'Variables'],
    backupSteps: [
      'Close OMORI.',
      'Copy the entire www/save folder.',
      'Edit one file slot first, then restore from backup if the slot does not appear.',
    ],
    sourceRefs: [
      { title: 'Community save location guide', url: 'https://gamertagzero.com/omori-savefile-location-and-how-to-switch-saves/' },
    ],
    faq: [
      {
        question: 'Which OMORI file should I upload?',
        answer: 'Upload file1.rpgsave, file2.rpgsave, or file3.rpgsave for a normal slot. global.rpgsave stores shared metadata.',
      },
      {
        question: 'Why does my save not appear in-game?',
        answer: 'The game may require the slot to exist first. Create a save in that slot, close the game, then replace that slot file.',
      },
    ],
    relatedGuides: [{ title: 'RPG Maker Save Editing Guide', url: '/blog/how-to-edit-rpg-maker-save' }],
  },
  {
    slug: 'lisa-the-painful',
    name: 'LISA: The Painful',
    seoDescription:
      'LISA: The Painful save editor for RPG Maker VX Ace .rvdata2 files. Edit mags, items, actor stats, variables, and switches with backup-first guidance.',
    engine: 'RPG Maker VX Ace',
    format: '.rvdata2',
    editorPath: '/editor/rpg-maker-mv',
    emoji: '🛢️',
    image: '/images/games/lisa-the-painful.webp',
    description: 'A cult RPG Maker VX Ace title with Ruby Marshal save files.',
    saveLocations: {
      windows: 'Steam/steamapps/common/LISA',
      mac: 'Steam/steamapps/common/LISA/LISA.app/Contents/Resources',
      linux: 'Steam/steamapps/common/LISA',
    },
    editableItems: [
      { icon: '💰', name: 'Mags / Money', desc: 'Edit party gold-like values' },
      { icon: '🎒', name: 'Items', desc: 'Adjust item, weapon, and armor quantities by ID' },
      { icon: '📈', name: 'Actor Stats', desc: 'Inspect level, EXP, HP, and parameter fields' },
      { icon: '🎮', name: 'Variables & Switches', desc: 'Edit story flags conservatively' },
    ],
    supportLimits: [
      'Supported as limited Ruby Marshal editing for common RPG Maker fields.',
      'Game scripts can store custom Ruby objects that should remain unchanged.',
      'Pain Mode and story flags can be fragile; edit one value at a time.',
    ],
    failureReasons: [
      'The file is not a raw .rvdata2 save.',
      'The save contains an unsupported custom Ruby Marshal type.',
      'A story flag was changed to an invalid combination.',
    ],
    quickEditTargets: ['Mags', 'Items', 'Weapons', 'Armors', 'EXP', 'Stats', 'Switches', 'Variables'],
    backupSteps: ['Close the game.', 'Copy every Save*.rvdata2 file.', 'Test the edited copy in a separate slot first.'],
    sourceRefs: [{ title: 'Steam Cloud save paths', url: 'https://steamdb.info/app/335670/ufs/' }],
    faq: [
      {
        question: 'Can .rvdata2 files be saved after editing?',
        answer: 'Yes, common RPG Maker fields are rebuilt with limited Ruby Marshal support. Keep backups because custom objects are intentionally guarded.',
      },
      {
        question: 'Can I edit all items?',
        answer: 'You can update visible item ID quantities. Additions should be tested carefully because item IDs are game-specific.',
      },
    ],
    relatedGuides: [{ title: 'RPG Maker Save File Structure', url: '/blog/rpg-maker-save-file-structure' }],
  },
  {
    slug: 'to-the-moon',
    name: 'To the Moon',
    seoDescription:
      'To the Moon save editor for RPG Maker XP/VX-style saves. Locate save files, inspect Ruby Marshal data, and edit common money/items/variables fields.',
    engine: 'RPG Maker XP/VX',
    format: '.rxdata, .rvdata',
    editorPath: '/editor/rpg-maker-mv',
    emoji: '🌙',
    image: '/images/games/to-the-moon.webp',
    description: 'A classic story-driven RPG Maker title.',
    saveLocations: {
      windows: 'Game install folder or Documents/My Games/To the Moon',
      mac: 'Game app resources or ~/Library/Application Support',
      linux: 'Game install folder or Proton prefix',
    },
    editableItems: [
      { icon: '🎮', name: 'Variables', desc: 'Inspect story and event variables' },
      { icon: '🚩', name: 'Switches', desc: 'Review boolean event flags' },
      { icon: '🎒', name: 'Items', desc: 'Adjust visible item quantities where present' },
      { icon: '📈', name: 'Stats', desc: 'Edit actor values if the save exposes them' },
    ],
    supportLimits: [
      'Supported as limited Ruby Marshal editing for exposed RPG Maker XP/VX fields.',
      'Story progress is mostly variable-driven; unknown variables should be changed one at a time.',
      'Steam, GOG, and mobile ports may place saves in different folders.',
    ],
    failureReasons: [
      'The selected file is not a raw .rxdata or .rvdata save.',
      'The save includes a custom Ruby object type that the browser guard blocks.',
      'A story variable was changed to a value the event script does not expect.',
    ],
    quickEditTargets: ['Variables', 'Switches', 'Items', 'Actor stats'],
    backupSteps: ['Close the game.', 'Copy the whole save folder.', 'Edit one slot and verify before replacing more saves.'],
    sourceRefs: [{ title: 'Steam Cloud save paths', url: 'https://steamdb.info/app/206440/ufs/' }],
    faq: [
      {
        question: 'Why are some fields hard to understand?',
        answer: 'Older RPG Maker games often store numeric IDs without names. Compare before/after saves to identify the right variable.',
      },
    ],
    relatedGuides: [{ title: 'RPG Maker Save File Structure', url: '/blog/rpg-maker-save-file-structure' }],
  },
  {
    slug: 'mad-father',
    name: 'Mad Father',
    seoDescription:
      'Mad Father save editor guide. Find RPG Maker save files, inspect variables, flags, endings, inventory, and common parse limitations.',
    engine: 'RPG Maker',
    format: '.rvdata2, .rpgsave',
    editorPath: '/editor/rpg-maker-mv',
    emoji: '🩸',
    image: '/images/games/mad-father.webp',
    description: 'A horror adventure with RPG Maker save data across versions.',
    saveLocations: {
      windows: 'Game install folder/save or game-specific AppData folder',
      mac: 'Game app resources/save or ~/Library/Application Support',
      linux: 'Game folder/save or Proton prefix',
    },
    editableItems: [
      { icon: '🎮', name: 'Ending Flags', desc: 'Inspect switches and variables related to endings' },
      { icon: '🎒', name: 'Inventory', desc: 'Edit visible item quantities' },
      { icon: '📍', name: 'Progress', desc: 'Review map and event state fields' },
      { icon: '🚩', name: 'Switches', desc: 'Toggle simple boolean flags carefully' },
    ],
    supportLimits: [
      'Supported by raw RPG Maker save format, not by game title alone.',
      'Different releases may use .rvdata2 or .rpgsave; upload the actual slot file.',
      'Ending flags can conflict with map state if edited out of sequence.',
    ],
    failureReasons: [
      'The release uses a different RPG Maker generation than the file you uploaded.',
      'The uploaded file is a config, global, or metadata file rather than a slot save.',
      'A switch or variable combination no longer matches the current map event.',
    ],
    quickEditTargets: ['Inventory', 'Variables', 'Switches', 'Progress flags'],
    backupSteps: ['Close the game.', 'Back up the save folder and config files together.', 'Test one edited slot before continuing.'],
    sourceRefs: [{ title: 'Steam Cloud save paths', url: 'https://steamdb.info/app/483980/ufs/' }],
    faq: [
      {
        question: 'Which Mad Father version is supported?',
        answer: 'Raw RPG Maker save files are supported by format. Remakes or platform releases may store data differently.',
      },
    ],
    relatedGuides: [{ title: 'RPG Maker Save Editing Guide', url: '/blog/how-to-edit-rpg-maker-save' }],
  },
  {
    slug: 'oneshot',
    name: 'OneShot',
    seoDescription:
      'OneShot save editor for RPG Maker saves. Locate save files, inspect variables, switches, inventory, and understand reset limitations.',
    engine: 'RPG Maker',
    format: '.rpgsave, .rvdata2',
    editorPath: '/editor/rpg-maker-mv',
    emoji: '💡',
    image: '/images/games/oneshot.webp',
    description: 'A meta puzzle RPG with sensitive progress and flag data.',
    saveLocations: {
      windows: 'Game install folder/save and AppData locations used by the game',
      mac: '~/Library/Application Support or game app resources',
      linux: '~/.config or Steam Proton prefix',
    },
    editableItems: [
      { icon: '🚩', name: 'Flags', desc: 'Inspect puzzle and route flags' },
      { icon: '🎒', name: 'Inventory', desc: 'Review item state' },
      { icon: '🎮', name: 'Variables', desc: 'Edit simple numeric variables carefully' },
      { icon: '📍', name: 'Progress', desc: 'Inspect map and event state' },
    ],
    supportLimits: [
      'OneShot uses meta progression; backup both save files and related app data.',
      'Some route state may live outside the visible save slot.',
      'Only edit small, understood fields.',
    ],
    failureReasons: [
      'The uploaded save does not include the meta-progress file the game also reads.',
      'A flag was changed without the matching map or event state.',
      'The platform release stores save data outside the visible slot file.',
    ],
    quickEditTargets: ['Flags', 'Variables', 'Inventory', 'Progress'],
    backupSteps: ['Close OneShot.', 'Back up both save slots and app data folders.', 'Restore the full backup if route state looks inconsistent.'],
    sourceRefs: [{ title: 'Steam Cloud save paths', url: 'https://steamdb.info/app/420530/ufs/' }],
    faq: [
      {
        question: 'Can this reset or skip OneShot routes?',
        answer: 'Some route state may be outside the uploaded save. Back up all game data before changing flags.',
      },
    ],
    relatedGuides: [{ title: 'RPG Maker Save Editing Guide', url: '/blog/how-to-edit-rpg-maker-save' }],
  },
  {
    slug: 'katawa-shoujo',
    name: 'Katawa Shoujo',
    seoDescription:
      'Katawa Shoujo Ren’Py save editor. Find save locations, edit persistent unlocks, CG gallery flags, and understand Ren’Py limitations.',
    engine: "Ren'Py",
    format: '.save, persistent',
    editorPath: '/editor/renpy',
    emoji: '📖',
    image: '/images/games/katawa-shoujo.webp',
    description: 'A classic Ren’Py visual novel with persistent unlock data.',
    saveLocations: {
      windows: '%appdata%\\RenPy\\Katawa Shoujo',
      mac: '~/Library/RenPy/Katawa Shoujo',
      linux: '~/.renpy/Katawa Shoujo',
    },
    editableItems: [
      { icon: '🖼️', name: 'Gallery Unlocks', desc: 'Edit simple persistent unlock flags' },
      { icon: '📖', name: 'Seen Text', desc: 'Inspect persistent reading progress' },
      { icon: '🎮', name: 'Route Flags', desc: 'Review simple route-related values' },
      { icon: '🔊', name: 'Music Unlocks', desc: 'Edit simple persistent booleans where visible' },
    ],
    supportLimits: [
      'Stable saving is limited to primitive fields under persistent.',
      'Full Ren’Py game state, Python objects, and non-persistent structures remain guarded.',
      'Some games may reject modified saves through their own validation.',
    ],
    failureReasons: [
      'The uploaded file contains unsupported Python pickle objects.',
      'The edit touches non-persistent game state.',
      'The game validates or regenerates persistent data on launch.',
    ],
    quickEditTargets: ['Persistent booleans', 'Unlock flags', 'Gallery state', 'Seen text flags'],
    backupSteps: ['Close the game.', 'Copy the RenPy save folder.', 'Edit persistent first, then verify unlocks in-game.'],
    sourceRefs: [{ title: 'Ren’Py persistent data', url: 'https://www.renpy.org/doc/html/persistent.html' }],
    faq: [
      {
        question: 'Can I unlock every route from a .save file?',
        answer: 'Use persistent fields when available. Full in-save story state is intentionally guarded because Ren’Py uses Python pickle.',
      },
    ],
    relatedGuides: [{ title: "Ren'Py Save Editing Guide", url: '/blog/renpy-save-editing-guide' }],
  },
];

export const games: GameData[] = gameInputs.map(withPageRequirements);
