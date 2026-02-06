import type { UnrealParseResult } from './unreal';
import { buildUnreal, parseUnreal } from './unreal';

export type PalworldFileRole = 'player' | 'world' | 'unknown';
export type PalworldFieldId = 'gold' | 'techPoints' | 'playerLevel' | 'hp' | 'stamina';
export type PalworldInsightNote =
    | 'read_only'
    | 'no_stable_quick_fields'
    | 'quick_scan_limited'
    | 'world_file_limited'
    | 'heuristic_quick_fields';

export interface PalworldQuickField {
    id: PalworldFieldId;
    path: Array<string | number>;
    value: number;
    confidence: 'high' | 'medium';
}

export interface PalworldInsights {
    fileRole: PalworldFileRole;
    quickFields: PalworldQuickField[];
    notes: PalworldInsightNote[];
}

export interface PalworldParseResult extends UnrealParseResult {
    game: 'palworld';
    _palworld: PalworldInsights;
}

interface Candidate {
    key: string;
    normalizedKey: string;
    value: number;
    path: Array<string | number>;
    normalizedPath: string[];
}

interface FieldRule {
    id: PalworldFieldId;
    includes: string[];
    exact?: string[];
    context?: string[];
    exclude?: string[];
}

const MAX_ROLE_SCAN_NODES = 20_000;
const MAX_QUICK_SCAN_NODES = 120_000;
const MAX_QUICK_SCAN_DEPTH = 14;
const MAX_QUICK_CANDIDATES = 4_000;

const FIELD_RULES: FieldRule[] = [
    {
        id: 'gold',
        includes: ['gold', 'money', 'currency'],
        exact: ['gold', 'money'],
        context: ['inventory', 'player', 'character', 'saveparameter', 'wallet', 'state'],
        exclude: ['pal', 'monster', 'enemy', 'boss'],
    },
    {
        id: 'techPoints',
        includes: ['technologypoint', 'techpoint', 'technologypoints', 'techtreepoint'],
        context: ['player', 'technology', 'character', 'saveparameter', 'state'],
        exclude: ['pal', 'monster', 'enemy', 'boss'],
    },
    {
        id: 'playerLevel',
        includes: ['level', 'playerlevel'],
        exact: ['level', 'playerlevel'],
        context: ['player', 'character', 'status', 'saveparameter'],
        exclude: ['pal', 'monster', 'enemy', 'boss'],
    },
    {
        id: 'hp',
        includes: ['hp', 'health', 'currenthp', 'maxhp'],
        context: ['player', 'character', 'status', 'saveparameter', 'parameter'],
        exclude: ['pal', 'monster', 'enemy', 'boss'],
    },
    {
        id: 'stamina',
        includes: ['stamina', 'sp', 'maxstamina', 'currentstamina'],
        context: ['player', 'character', 'status', 'saveparameter', 'parameter'],
        exclude: ['pal', 'monster', 'enemy', 'boss'],
    },
];

function normalizeKey(input: string): string {
    return input.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function includesToken(text: string, tokens: readonly string[]): boolean {
    return tokens.some((token) => text.includes(token));
}

function scanForRoleTokens(root: unknown, tokens: readonly string[]): boolean {
    const stack: unknown[] = [root];
    const visited = new WeakSet<object>();
    let visitedNodes = 0;

    while (stack.length > 0) {
        const node = stack.pop();
        visitedNodes += 1;
        if (visitedNodes > MAX_ROLE_SCAN_NODES) {
            return false;
        }

        if (typeof node === 'string') {
            if (includesToken(node.toLowerCase(), tokens)) {
                return true;
            }
            continue;
        }

        if (!node || typeof node !== 'object') {
            continue;
        }

        if (visited.has(node)) {
            continue;
        }
        visited.add(node);

        if (Array.isArray(node)) {
            for (let index = node.length - 1; index >= 0; index -= 1) {
                stack.push(node[index]);
            }
            continue;
        }

        const entries = Object.entries(node as Record<string, unknown>);
        for (let index = entries.length - 1; index >= 0; index -= 1) {
            const [key, value] = entries[index];
            if (includesToken(normalizeKey(key), tokens)) {
                return true;
            }
            stack.push(value);
        }
    }

    return false;
}

function detectFileRole(fileName: string, json: unknown): PalworldFileRole {
    const normalizedName = fileName.toLowerCase();
    const normalizedBaseName = normalizedName.split(/[\\/]/).pop() ?? normalizedName;

    // Prefer player heuristics first to avoid false world matches like "player-level-*.sav".
    if (normalizedBaseName.includes('player') || normalizedBaseName.includes('localdata')) return 'player';
    if (normalizedBaseName === 'level.sav' || normalizedBaseName.startsWith('level')) return 'world';

    if (scanForRoleTokens(json, ['worldsavedata', 'levelsavedata'])) return 'world';
    if (scanForRoleTokens(json, ['playersavedata', 'playersaveparameter'])) return 'player';
    return 'unknown';
}

interface CandidateScanResult {
    candidates: Candidate[];
    truncated: boolean;
}

function collectNumericCandidates(root: unknown): CandidateScanResult {
    const candidates: Candidate[] = [];
    const stack: Array<{ node: unknown; path: Array<string | number>; depth: number }> = [
        { node: root, path: [], depth: 0 },
    ];
    const visited = new WeakSet<object>();
    let visitedNodes = 0;
    let truncated = false;

    while (stack.length > 0) {
        const current = stack.pop();
        if (!current) break;

        visitedNodes += 1;
        if (visitedNodes > MAX_QUICK_SCAN_NODES) {
            truncated = true;
            break;
        }

        const { node, path, depth } = current;
        if (typeof node === 'number' && Number.isFinite(node) && path.length > 0) {
            const last = path[path.length - 1];
            if (typeof last === 'string') {
                candidates.push({
                    key: last,
                    normalizedKey: normalizeKey(last),
                    value: node,
                    path,
                    normalizedPath: path
                        .filter((part): part is string => typeof part === 'string')
                        .map((part) => normalizeKey(part)),
                });

                if (candidates.length >= MAX_QUICK_CANDIDATES) {
                    truncated = true;
                    break;
                }
            }
            continue;
        }

        if (depth >= MAX_QUICK_SCAN_DEPTH) {
            continue;
        }

        if (Array.isArray(node)) {
            for (let index = node.length - 1; index >= 0; index -= 1) {
                stack.push({ node: node[index], path: [...path, index], depth: depth + 1 });
            }
            continue;
        }

        if (!node || typeof node !== 'object') {
            continue;
        }

        if (visited.has(node)) {
            continue;
        }
        visited.add(node);

        const entries = Object.entries(node as Record<string, unknown>);
        for (let index = entries.length - 1; index >= 0; index -= 1) {
            const [key, value] = entries[index];
            stack.push({ node: value, path: [...path, key], depth: depth + 1 });
        }
    }

    return { candidates, truncated };
}

function scoreCandidate(candidate: Candidate, rule: FieldRule): number {
    if (rule.exclude?.some((token) => candidate.normalizedPath.some((seg) => seg.includes(token)))) {
        return 0;
    }

    const contextMatched = rule.context?.some(
        (ctx) => candidate.normalizedPath.some((seg) => seg.includes(ctx))
    ) ?? false;
    if (rule.context && !contextMatched) {
        return 0;
    }

    let score = 0;

    if (rule.exact?.includes(candidate.normalizedKey)) score += 60;
    if (rule.includes.some((token) => candidate.normalizedKey.includes(token))) score += 40;

    score += 20;
    if (candidate.normalizedPath.some((seg) => seg.includes('player'))) score += 5;
    if (candidate.path.length < 8) score += 5;

    if (rule.id === 'playerLevel' && candidate.value >= 1 && candidate.value <= 200) score += 10;
    if ((rule.id === 'hp' || rule.id === 'stamina') && candidate.value >= 1 && candidate.value <= 100000) score += 5;
    if (rule.id === 'techPoints' && candidate.value >= 0 && candidate.value <= 100000) score += 5;

    return score;
}

interface QuickFieldAnalysis {
    quickFields: PalworldQuickField[];
    scanLimited: boolean;
}

function analyzePalworldQuickFields(jsonView: unknown): QuickFieldAnalysis {
    const { candidates, truncated } = collectNumericCandidates(jsonView);
    if (candidates.length === 0) return { quickFields: [], scanLimited: truncated };

    const fields: PalworldQuickField[] = [];
    const usedPaths = new Set<string>();

    FIELD_RULES.forEach((rule) => {
        let best: { candidate: Candidate; score: number } | null = null;

        for (const candidate of candidates) {
            const score = scoreCandidate(candidate, rule);
            if (score < 55) continue;

            if (!best || score > best.score) {
                best = { candidate, score };
            }
        }

        if (!best) return;

        const pathKey = best.candidate.path.join('.');
        if (usedPaths.has(pathKey)) return;
        usedPaths.add(pathKey);

        fields.push({
            id: rule.id,
            path: best.candidate.path,
            value: best.candidate.value,
            confidence: best.score >= 90 ? 'high' : 'medium',
        });
    });

    return { quickFields: fields, scanLimited: truncated };
}

export function extractPalworldQuickFields(jsonView: unknown): PalworldQuickField[] {
    return analyzePalworldQuickFields(jsonView).quickFields;
}

export async function parsePalworld(file: File): Promise<PalworldParseResult> {
    const unreal = await parseUnreal(file);
    const fileRole = detectFileRole(file.name, unreal.jsonView);
    const shouldRunQuickFieldDetection = fileRole !== 'world';
    const {
        quickFields,
        scanLimited,
    } = shouldRunQuickFieldDetection
        ? analyzePalworldQuickFields(unreal.jsonView)
        : { quickFields: [] as PalworldQuickField[], scanLimited: false };

    const notes: PalworldInsightNote[] = [];
    if (unreal.mode !== 'full') {
        notes.push('read_only');
    }
    if (fileRole === 'world') {
        notes.push('world_file_limited');
    }
    if (quickFields.length === 0) {
        notes.push('no_stable_quick_fields');
    } else {
        notes.push('heuristic_quick_fields');
    }
    if (scanLimited) {
        notes.push('quick_scan_limited');
    }

    const enriched = unreal as PalworldParseResult;
    enriched.game = 'palworld';
    enriched._palworld = {
        fileRole,
        quickFields,
        notes,
    };

    return enriched;
}

export async function buildPalworld(originalFile: File, data: PalworldParseResult | any): Promise<Blob> {
    return buildUnreal(originalFile, data);
}
