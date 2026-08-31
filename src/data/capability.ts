import type { FormatFamily, ParserEngine, RoundTripSupportLevel } from '../lib/parsers/types';

export type SampleKind = 'synthetic-fixture' | 'real-anonymized' | 'structure-only';
export type PrivacyLevel = 'public-fixture' | 'private-regression' | 'structure-only';
export type EvidenceScope = 'engine-core' | 'format-core' | 'game-specific';
export type PresetConfidence = 'verified' | 'candidate' | 'blocked';
export type PresetValueType = 'number' | 'boolean' | 'string';
export type PresetWritePolicy = 'write' | 'persistent-primitive' | 'readonly';
export type PresetActionType = 'set-map-values' | 'add-map-entry' | 'set-primitive';

export interface SampleRecord {
    id: string;
    gameSlug: string;
    engine: ParserEngine;
    format: string;
    platform: string;
    gameVersion: string;
    sampleKind: SampleKind;
    privacyLevel: PrivacyLevel;
    evidenceScope: EvidenceScope;
    appliesTo: string[];
    capability: RoundTripSupportLevel | 'read-only';
    verifiedFeatures: string[];
    reasonCode: string;
    parserTestIds: string[];
    verifiedAt: string;
}

export interface PresetField {
    id: string;
    label: string;
    group: 'Money' | 'Level & XP' | 'Stats' | 'Items' | 'Flags' | 'Unlocks' | 'Inventory' | 'Pals';
    pathSelector: string[];
    valueType: PresetValueType;
    writePolicy: PresetWritePolicy;
    aliases: string[];
    confidence: PresetConfidence;
    icon: string;
    description: string;
    min?: number;
    max?: number;
}

export interface PresetAction {
    id: string;
    label: string;
    actionType: PresetActionType;
    targetGroup: PresetField['group'];
    value: number | boolean | string;
    guard: string;
    requiresFolderContext: boolean;
}

export interface GamePreset {
    slug: string;
    engine: ParserEngine;
    formatFamily: FormatFamily;
    fields: PresetField[];
    actions: PresetAction[];
    requiredContext: string[];
    sampleRecordIds: string[];
    limits: string[];
}

export interface ResolvedPreset extends GamePreset {
    confidence: PresetConfidence;
    verifiedFeatures: string[];
    candidateFeatures: string[];
    evidenceScope: EvidenceScope[];
    samples: SampleRecord[];
}

export const sampleRecords: SampleRecord[] = [
    {
        id: 'fixture-rpgmaker-mv-core',
        gameSlug: 'rpg-maker',
        engine: 'rpgmaker',
        format: '.rpgsave/.rmmzsave',
        platform: 'synthetic',
        gameVersion: 'MV/MZ fixture',
        sampleKind: 'synthetic-fixture',
        privacyLevel: 'public-fixture',
        evidenceScope: 'format-core',
        appliesTo: ['rpg-maker'],
        capability: 'stable',
        verifiedFeatures: ['Gold', 'Level', 'EXP', 'HP/MP', 'Items', 'Weapons', 'Armors', 'Variables', 'Switches'],
        reasonCode: 'ok',
        parserTestIds: ['test:parsers:fidelity', 'test:parsers:benchmark'],
        verifiedAt: '2026-05-25',
    },
    {
        id: 'fixture-rpgmaker-ruby-core',
        gameSlug: 'rpg-maker',
        engine: 'rpgmaker',
        format: '.rvdata2/.rvdata/.rxdata',
        platform: 'synthetic',
        gameVersion: 'Ruby Marshal fixture',
        sampleKind: 'synthetic-fixture',
        privacyLevel: 'public-fixture',
        evidenceScope: 'format-core',
        appliesTo: ['rpg-maker'],
        capability: 'stable-limited',
        verifiedFeatures: ['Gold', 'Items', 'Weapons', 'Armors', 'Variables', 'Switches', 'Actor stats'],
        reasonCode: 'ok',
        parserTestIds: ['test:parsers:smoke', 'test:parsers:benchmark'],
        verifiedAt: '2026-05-25',
    },
    {
        id: 'fixture-rpgmaker-lcf-core',
        gameSlug: 'rpg-maker',
        engine: 'rpgmaker',
        format: '.lsd',
        platform: 'synthetic',
        gameVersion: 'RPG Maker 2000/2003 fixture',
        sampleKind: 'synthetic-fixture',
        privacyLevel: 'public-fixture',
        evidenceScope: 'format-core',
        appliesTo: ['rpg-maker'],
        capability: 'stable-limited',
        verifiedFeatures: ['Gold', 'Items', 'Variables', 'Switches', 'Actor stats'],
        reasonCode: 'ok',
        parserTestIds: ['test:parsers:smoke', 'test:parsers:benchmark'],
        verifiedAt: '2026-05-25',
    },
    {
        id: 'fixture-renpy-engine-core',
        gameSlug: 'renpy-engine',
        engine: 'renpy',
        format: '.save/persistent',
        platform: 'synthetic',
        gameVersion: 'RenPy persistent fixture',
        sampleKind: 'synthetic-fixture',
        privacyLevel: 'public-fixture',
        evidenceScope: 'format-core',
        appliesTo: ['renpy-engine'],
        capability: 'stable-limited',
        verifiedFeatures: ['Persistent booleans', 'Seen text flags', 'Primitive counters'],
        reasonCode: 'restricted_write_scope',
        parserTestIds: ['test:parsers:smoke', 'test:parsers:benchmark'],
        verifiedAt: '2026-05-25',
    },
    {
        id: 'fixture-palworld-player',
        gameSlug: 'palworld',
        engine: 'palworld',
        format: '.sav',
        platform: 'synthetic',
        gameVersion: 'GVAS player fixture',
        sampleKind: 'synthetic-fixture',
        privacyLevel: 'public-fixture',
        evidenceScope: 'game-specific',
        appliesTo: ['palworld'],
        capability: 'stable',
        verifiedFeatures: ['Player level', 'Inventory', 'Technology points', 'Pals summary'],
        reasonCode: 'standard_gvas',
        parserTestIds: ['test:parsers:quickfields', 'test:unreal'],
        verifiedAt: '2026-05-25',
    },
    {
        id: 'fixture-palworld-world-readonly',
        gameSlug: 'palworld',
        engine: 'palworld',
        format: 'Level.sav',
        platform: 'synthetic',
        gameVersion: 'GVAS world fixture',
        sampleKind: 'synthetic-fixture',
        privacyLevel: 'public-fixture',
        evidenceScope: 'game-specific',
        appliesTo: ['palworld'],
        capability: 'read-only',
        verifiedFeatures: ['World save detected as read-only'],
        reasonCode: 'world_file_limited',
        parserTestIds: ['test:parsers:quickfields', 'test:unreal'],
        verifiedAt: '2026-05-25',
    },
    {
        id: 'fixture-unity-playerprefs',
        gameSlug: 'stardew-valley',
        engine: 'unity',
        format: '.xml/.plist',
        platform: 'synthetic',
        gameVersion: 'PlayerPrefs fixture',
        sampleKind: 'synthetic-fixture',
        privacyLevel: 'public-fixture',
        evidenceScope: 'game-specific',
        appliesTo: ['stardew-valley'],
        capability: 'stable',
        verifiedFeatures: ['Money', 'Skills & experience', 'Inventory'],
        reasonCode: 'ok',
        parserTestIds: ['test:parsers:fidelity', 'test:parsers:unity-binary'],
        verifiedAt: '2026-05-25',
    },
    {
        id: 'fixture-generic-structured',
        gameSlug: 'generic-formats',
        engine: 'generic',
        format: '.msgpack/.cbor/.bson/.sqlite/.sqlite3/.sol/.cfg/.yaml/.toml/.csv/.zip/.gz/.zlib/.deflate/.bz2/.lz4/.zstd/.b64/.lzstring/.xml/.es3/.pkl',
        platform: 'synthetic',
        gameVersion: 'generic format fixtures',
        sampleKind: 'synthetic-fixture',
        privacyLevel: 'public-fixture',
        evidenceScope: 'engine-core',
        appliesTo: ['generic-formats'],
        capability: 'stable-limited',
        verifiedFeatures: ['Structured parse', 'Edit', 'Same-container export'],
        reasonCode: 'ok',
        parserTestIds: ['test:parsers:smoke', 'test:parsers:benchmark'],
        verifiedAt: '2026-06-09',
    },
    {
        id: 'fixture-generic-nrbf',
        gameSlug: 'generic-formats',
        engine: 'generic',
        format: 'NRBF/BinaryFormatter signature in .nrbf/.bin/.gd/.dat/.sav',
        platform: 'synthetic and .NET fixture',
        gameVersion: 'MS-NRBF format fixture',
        sampleKind: 'synthetic-fixture',
        privacyLevel: 'public-fixture',
        evidenceScope: 'format-core',
        appliesTo: ['generic-formats'],
        capability: 'stable-limited',
        verifiedFeatures: ['Object graph parse', 'Existing scalar edits', 'CLR primitive type preservation', 'Object reference preservation', 'Schema-verified export'],
        reasonCode: 'ok',
        parserTestIds: ['test:parsers:nrbf'],
        verifiedAt: '2026-08-31',
    },
    {
        id: 'fixture-generic-readonly',
        gameSlug: 'generic-formats',
        engine: 'generic',
        format: 'unknown .dat and custom binary candidates',
        platform: 'synthetic',
        gameVersion: 'generic read-only candidates',
        sampleKind: 'synthetic-fixture',
        privacyLevel: 'public-fixture',
        evidenceScope: 'engine-core',
        appliesTo: ['generic-formats'],
        capability: 'read-only',
        verifiedFeatures: ['Structured inspection', 'Read-only transparency'],
        reasonCode: 'read_only_generic',
        parserTestIds: ['test:parsers:benchmark'],
        verifiedAt: '2026-06-09',
    },
];

const rpgMakerFields: PresetField[] = [
    field('gold', 'Gold / Money', 'Money', ['gold', '_gold'], 'number', 'write', ['gold', 'money', 'clams', 'mags'], '💰', 'Edit party currency fields.'),
    field('level', 'Level', 'Level & XP', ['level', '_level'], 'number', 'write', ['level', 'lvl'], '📈', 'Edit actor level fields.'),
    field('exp', 'EXP', 'Level & XP', ['exp', '_exp'], 'number', 'write', ['exp', 'xp'], '📈', 'Edit actor experience fields.'),
    field('hp', 'HP / MP', 'Stats', ['_hp', '_mp', 'hp', 'mp'], 'number', 'write', ['hp', 'mp', 'health'], '❤️', 'Edit visible HP/MP and parameter fields.'),
    field('items', 'Items / Inventory', 'Items', ['_items', 'items'], 'number', 'write', ['item', 'inventory'], '🎒', 'Edit item quantities by ID or folder names.'),
    field('weapons', 'Weapons', 'Items', ['_weapons', 'weapons'], 'number', 'write', ['weapon'], '⚔️', 'Edit weapon quantities where present.'),
    field('armors', 'Armors', 'Items', ['_armors', 'armors'], 'number', 'write', ['armor'], '🛡️', 'Edit armor quantities where present.'),
    field('variables', 'Variables', 'Flags', ['_variables', 'variables'], 'number', 'write', ['variable'], '🔢', 'Edit numeric story variables cautiously.'),
    field('switches', 'Switches / Flags', 'Flags', ['_switches', 'switches'], 'boolean', 'write', ['switch', 'flag'], '🚩', 'Toggle boolean event flags.'),
];

const renpyFields: PresetField[] = [
    field('seen-flags', 'Seen Text Flags', 'Unlocks', ['persistent', '_seen'], 'boolean', 'persistent-primitive', ['seen', 'read'], '📖', 'Inspect and edit primitive seen flags.'),
    field('persistent-booleans', 'Persistent Booleans', 'Unlocks', ['persistent'], 'boolean', 'persistent-primitive', ['persistent', 'unlock', 'gallery'], '🖼️', 'Edit primitive persistent booleans only.'),
    field('persistent-counters', 'Persistent Counters', 'Unlocks', ['persistent'], 'number', 'persistent-primitive', ['counter', 'seen', 'route'], '🔢', 'Edit primitive persistent counters only.'),
];

const palworldFields: PresetField[] = [
    field('player-level', 'Player Level', 'Level & XP', ['level', 'playerLevel'], 'number', 'write', ['level', 'player'], '📈', 'Edit high-confidence player level candidates.'),
    field('technology-points', 'Technology Points', 'Stats', ['technologyPoint', 'techPoints'], 'number', 'write', ['technology', 'techpoint'], '🧪', 'Edit high-confidence technology point fields.'),
    field('inventory', 'Inventory Quantities', 'Inventory', ['inventory', 'itemContainer'], 'number', 'write', ['inventory', 'quantity', 'count'], '🎒', 'Edit high-confidence player inventory quantities.'),
    field('pals-summary', 'Pals Summary', 'Pals', ['pals', 'characterContainer'], 'string', 'readonly', ['pal', 'pals'], '🦎', 'Show Pal candidates without low-confidence write controls.'),
];

export const gamePresets: GamePreset[] = [
    preset('rpg-maker', 'rpgmaker', 'rpgmaker', rpgMakerFields, ['fixture-rpgmaker-mv-core', 'fixture-rpgmaker-ruby-core', 'fixture-rpgmaker-lcf-core'], ['Folder Mode improves item, actor, variable, and switch labels.']),
    preset('renpy-engine', 'renpy', 'renpy', renpyFields, ['fixture-renpy-engine-core'], ['Engine-level preset: writes are limited to primitive values under persistent.']),
    preset('unity-engine', 'unity', 'unity', [
        field('money', 'Gold & Money', 'Money', ['money', 'gold'], 'number', 'write', ['money', 'gold'], '💰', 'Edit exposed money fields.'),
        field('level', 'Level & EXP', 'Level & XP', ['level', 'experience'], 'number', 'write', ['level', 'experience'], '📈', 'Edit exposed level and experience fields.'),
        field('inventory', 'Inventory & Items', 'Inventory', ['items', 'inventory'], 'number', 'write', ['item', 'inventory'], '🎒', 'Edit visible inventory quantities.'),
    ], [], ['Candidate engine preset: game-specific Unity structures still need samples.']),
    preset('gamemaker-engine', 'gamemaker', 'generic-structured', [
        field('money', 'Money', 'Money', ['money', 'gold'], 'number', 'write', ['money', 'gold'], '💰', 'Edit visible currency fields.'),
        field('stats', 'Stats', 'Stats', ['hp', 'level', 'exp'], 'number', 'write', ['hp', 'level', 'exp'], '📈', 'Edit visible stats fields.'),
        field('flags', 'Flags', 'Flags', ['flag', 'switch'], 'boolean', 'write', ['flag', 'switch'], '🚩', 'Edit visible flags cautiously.'),
    ], [], ['Candidate engine preset: raw text structures vary by game.']),
    ...['fear-and-hunger', 'ib', 'yume-nikki', 'the-witchs-house', 'ao-oni', 'mogeko-castle', 'misao', 'off', 'wadanohara', 'pocket-mirror', 'hello-charlotte'].map((slug) =>
        preset(slug, 'rpgmaker', 'rpgmaker', rpgMakerFields, ['fixture-rpgmaker-mv-core', 'fixture-rpgmaker-ruby-core', 'fixture-rpgmaker-lcf-core'], ['Shared RPG Maker coverage is available, but game-specific proof is still pending.'])
    ),
    preset('omori', 'rpgmaker', 'rpgmaker', rpgMakerFields, ['fixture-rpgmaker-mv-core'], ['Exact labels require the game folder. Story variables are game-specific and should be changed gradually.']),
    preset('lisa-the-painful', 'rpgmaker', 'rpgmaker', rpgMakerFields, ['fixture-rpgmaker-ruby-core'], ['Ruby Marshal editing is limited to common fields. Story flags remain fragile.']),
    preset('to-the-moon', 'rpgmaker', 'rpgmaker', rpgMakerFields, ['fixture-rpgmaker-ruby-core'], ['Older Ruby Marshal saves expose fewer named fields. Variable-driven progress must be changed carefully.']),
    preset('mad-father', 'rpgmaker', 'rpgmaker', rpgMakerFields, ['fixture-rpgmaker-ruby-core'], ['Different releases may use different RPG Maker generations.']),
    preset('oneshot', 'rpgmaker', 'rpgmaker', rpgMakerFields, ['fixture-rpgmaker-mv-core', 'fixture-rpgmaker-ruby-core'], ['Meta progression may live outside the visible slot file.']),
    preset('katawa-shoujo', 'renpy', 'renpy', renpyFields, [], ['Candidate preset only. Verified write coverage is not yet backed by a Katawa Shoujo sample.']),
    ...['teaching-feeling', 'being-a-dik', 'summertime-saga'].map((slug) =>
        preset(slug, 'renpy', 'renpy', renpyFields, [], ['Candidate preset only. Verified write coverage is not yet backed by a game-specific sample.'])
    ),
    preset('palworld', 'palworld', 'unreal', palworldFields, ['fixture-palworld-player', 'fixture-palworld-world-readonly'], ['Player saves use high-confidence fields; world saves remain read-only.']),
    preset('stardew-valley', 'unity', 'unity', [
        field('money', 'Gold & Money', 'Money', ['money', 'gold'], 'number', 'write', ['money', 'gold'], '💰', 'Edit exposed XML money fields.'),
        field('skills', 'Skills & Experience', 'Level & XP', ['experience', 'level'], 'number', 'write', ['skill', 'experience'], '📈', 'Edit visible skill and experience values.'),
        field('inventory', 'Inventory & Items', 'Inventory', ['items', 'inventory'], 'number', 'write', ['item', 'inventory'], '🎒', 'Edit visible inventory quantities.'),
    ], ['fixture-unity-playerprefs'], ['Use the raw farm XML, not SaveGameInfo.']),
    preset('ddlc', 'renpy', 'renpy', renpyFields, [], ['Candidate preset only. Verified write coverage is not yet backed by a DDLC-specific sample.']),
    preset('undertale', 'gamemaker', 'generic-structured', [
        field('money', 'Money', 'Money', ['money', 'gold', 'geo'], 'number', 'write', ['money', 'gold', 'geo'], '💰', 'Edit visible currency fields.'),
        field('stats', 'Stats', 'Stats', ['hp', 'level', 'exp'], 'number', 'write', ['hp', 'level', 'exp'], '📈', 'Edit visible stats fields.'),
        field('flags', 'Flags', 'Flags', ['flag', 'switch'], 'boolean', 'write', ['flag', 'switch'], '🚩', 'Edit visible flags cautiously.'),
    ], [], ['Candidate preset: field names depend on game version and save slot.']),
    preset('hollow-knight', 'unity', 'unity', [
        field('money', 'Money', 'Money', ['money', 'gold', 'geo'], 'number', 'write', ['money', 'gold', 'geo'], '💰', 'Edit visible currency fields.'),
        field('stats', 'Stats', 'Stats', ['hp', 'level', 'exp'], 'number', 'write', ['hp', 'level', 'exp'], '📈', 'Edit visible stats fields.'),
        field('flags', 'Flags', 'Flags', ['flag', 'switch'], 'boolean', 'write', ['flag', 'switch'], '🚩', 'Edit visible flags cautiously.'),
    ], [], ['Candidate preset: field names depend on the save slot and game version.']),
];

export function getPreset(slug?: string): ResolvedPreset | undefined {
    if (!slug) return undefined;
    const presetItem = gamePresets.find((item) => item.slug === slug);
    if (!presetItem) return undefined;
    const samples = presetItem.sampleRecordIds
        .map((id) => sampleRecords.find((sample) => sample.id === id))
        .filter(Boolean) as SampleRecord[];
    const confidence = resolvePresetConfidence(presetItem, samples);
    const sampleFeatures = Array.from(new Set(samples.flatMap((sample) => sample.verifiedFeatures)));
    const verifiedFeatures = confidence === 'verified' ? sampleFeatures : [];
    const candidateFeatures = confidence === 'verified' ? [] : Array.from(new Set(presetItem.fields.map((fieldItem) => fieldItem.label)));
    const evidenceScope = Array.from(new Set(samples.map((sample) => sample.evidenceScope)));
    return {
        ...presetItem,
        confidence,
        fields: presetItem.fields.map((item) => ({
            ...item,
            confidence: confidence === 'verified' ? item.confidence : confidence === 'blocked' ? 'blocked' : 'candidate',
        })),
        verifiedFeatures,
        candidateFeatures,
        evidenceScope,
        samples,
    };
}

export function getPresetEditableItems(slug?: string) {
    const presetItem = getPreset(slug);
    if (!presetItem || presetItem.confidence === 'blocked') return null;
    return presetItem.fields.map((item) => ({
        icon: item.icon,
        name: item.label,
        desc: item.description,
    }));
}

export function getPresetQuickTargets(slug?: string): string[] | null {
    const presetItem = getPreset(slug);
    if (!presetItem || presetItem.confidence === 'blocked') return null;
    return presetItem.fields.map((item) => item.label);
}

export function getCoverageRows() {
    return gamePresets.map((presetItem) => {
        const resolved = getPreset(presetItem.slug)!;
        return {
            slug: resolved.slug,
            engine: resolved.engine,
            family: resolved.formatFamily,
            confidence: resolved.confidence,
            realSampleCount: resolved.samples.filter((sample) => sample.sampleKind === 'real-anonymized').length,
            syntheticFixtureCount: resolved.samples.filter((sample) => sample.sampleKind === 'synthetic-fixture').length,
            structureOnlyCount: resolved.samples.filter((sample) => sample.sampleKind === 'structure-only').length,
            sampleCount: resolved.samples.length,
            latest: resolved.samples.map((sample) => sample.verifiedAt).sort().at(-1) || 'pending',
            capability: resolved.samples.some((sample) => sample.capability === 'stable')
                ? 'stable'
                : resolved.samples.some((sample) => sample.capability === 'stable-limited')
                    ? 'stable-limited'
                    : 'read-only',
            verifiedFeatures: resolved.verifiedFeatures,
            candidateFeatures: resolved.candidateFeatures,
            evidenceScope: resolved.evidenceScope,
            limits: resolved.limits,
        };
    });
}

function resolvePresetConfidence(presetItem: GamePreset, samples: SampleRecord[]): PresetConfidence {
    if (presetItem.fields.every((fieldItem) => fieldItem.writePolicy === 'readonly')) return 'blocked';
    if (samples.length === 0) return 'candidate';
    if (presetItem.slug === 'rpg-maker' || presetItem.slug.endsWith('-engine')) {
        return samples.some((sample) =>
            (sample.evidenceScope === 'engine-core' || sample.evidenceScope === 'format-core') &&
            sample.appliesTo.includes(presetItem.slug)
        ) ? 'verified' : 'candidate';
    }
    return samples.some((sample) =>
        sample.evidenceScope === 'game-specific' &&
        sample.sampleKind === 'real-anonymized' &&
        sample.appliesTo.includes(presetItem.slug)
    )
        ? 'verified'
        : 'candidate';
}

function field(
    id: string,
    label: PresetField['label'],
    group: PresetField['group'],
    pathSelector: string[],
    valueType: PresetValueType,
    writePolicy: PresetWritePolicy,
    aliases: string[],
    icon: string,
    description: string
): PresetField {
    return { id, label, group, pathSelector, valueType, writePolicy, aliases, confidence: writePolicy === 'readonly' ? 'blocked' : 'verified', icon, description };
}

function preset(
    slug: string,
    engine: ParserEngine,
    formatFamily: FormatFamily,
    fields: PresetField[],
    sampleRecordIds: string[],
    limits: string[]
): GamePreset {
    return {
        slug,
        engine,
        formatFamily,
        fields,
        actions: defaultActions(engine),
        requiredContext: engine === 'rpgmaker' ? ['Game folder or Data files recommended'] : [],
        sampleRecordIds,
        limits,
    };
}

function defaultActions(engine: ParserEngine): PresetAction[] {
    if (engine === 'rpgmaker') {
        return [
            { id: 'set-gold', label: 'Gold', actionType: 'set-primitive', targetGroup: 'Money', value: 0, guard: 'party-currency-only', requiresFolderContext: false },
            { id: 'set-level', label: 'Level', actionType: 'set-primitive', targetGroup: 'Level & XP', value: 1, guard: 'actor-level-only', requiresFolderContext: false },
            { id: 'set-exp', label: 'EXP', actionType: 'set-primitive', targetGroup: 'Level & XP', value: 0, guard: 'actor-exp-only', requiresFolderContext: false },
            { id: 'set-hp-mp', label: 'HP / MP', actionType: 'set-primitive', targetGroup: 'Stats', value: 1, guard: 'actor-stats-only', requiresFolderContext: false },
            { id: 'all-items-99', label: 'All Items 99', actionType: 'set-map-values', targetGroup: 'Items', value: 99, guard: 'inventory-map-only', requiresFolderContext: false },
            { id: 'add-item', label: 'Add Item by ID/name', actionType: 'add-map-entry', targetGroup: 'Items', value: 99, guard: 'item-map-only', requiresFolderContext: false },
            { id: 'set-weapons-99', label: 'All Weapons 99', actionType: 'set-map-values', targetGroup: 'Items', value: 99, guard: 'weapon-map-only', requiresFolderContext: false },
            { id: 'set-armors-99', label: 'All Armors 99', actionType: 'set-map-values', targetGroup: 'Items', value: 99, guard: 'armor-map-only', requiresFolderContext: false },
            { id: 'set-variable', label: 'Variable', actionType: 'set-primitive', targetGroup: 'Flags', value: 0, guard: 'variable-entry-only', requiresFolderContext: false },
            { id: 'set-switch', label: 'Switch', actionType: 'set-primitive', targetGroup: 'Flags', value: true, guard: 'switch-entry-only', requiresFolderContext: false },
        ];
    }
    if (engine === 'renpy') {
        return [
            { id: 'unlock-persistent-booleans', label: 'Unlock primitive persistent flags', actionType: 'set-primitive', targetGroup: 'Unlocks', value: true, guard: 'persistent-primitive-only', requiresFolderContext: false },
        ];
    }
    return [];
}
