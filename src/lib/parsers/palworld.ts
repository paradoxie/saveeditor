import { makeOutcome, type ParseOutcome } from './types';
import type { UnrealParseOutcome, UnrealParseResult } from './unreal';
import { buildUnreal, parseUnreal } from './unreal';

export type PalworldFileRole = 'player' | 'world' | 'unknown';
export type PalworldFieldId = 'gold' | 'goldItem' | 'techPoints' | 'playerLevel' | 'hp' | 'stamina' | 'inventoryItem';
export type PalworldInsightNote =
    | 'read_only'
    | 'no_stable_quick_fields'
    | 'quick_scan_limited'
    | 'world_file_limited'
    | 'heuristic_quick_fields'
    | 'quick_fields_ambiguous';

export interface PalworldQuickField {
    id: PalworldFieldId;
    path: Array<string | number>;
    value: number;
    confidence: 'high' | 'medium';
    score: number;
    evidence: string[];
}

export interface PalworldInsights {
    fileRole: PalworldFileRole;
    quickFields: PalworldQuickField[];
    notes: PalworldInsightNote[];
    palsSummary?: {
        candidateCount: number;
        candidates: PalworldPalCandidate[];
    };
}

export interface PalworldPalCandidate {
    path: Array<string | number>;
    label: string;
    level?: number;
    confidence: 'high' | 'medium';
}

export interface PalworldParseResult extends UnrealParseResult {
    game: 'palworld';
    _palworld: PalworldInsights;
}

export type PalworldParseOutcome = ParseOutcome<PalworldParseResult>;

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

interface QuickFieldStats {
    detected: number;
    high: number;
    medium: number;
    ambiguous: number;
    scanLimited: boolean;
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
        id: 'goldItem',
        includes: ['goldcoin', 'moneyitem', 'coin'],
        exact: ['goldcoin', 'coin'],
        context: ['inventory', 'item', 'player', 'container'],
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
    {
        id: 'inventoryItem',
        includes: ['itemnum', 'quantity', 'count', 'stack'],
        context: ['inventory', 'itemcontainer', 'item', 'slot', 'player'],
        exclude: ['pal', 'monster', 'enemy', 'boss'],
    },
];

function normalizeKey(input: string): string {
    return input.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getRuleThreshold(ruleId: PalworldFieldId): number {
    if (ruleId === 'hp' || ruleId === 'stamina') return 65;
    if (ruleId === 'inventoryItem' || ruleId === 'goldItem') return 85;
    return 70;
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

interface CandidateScore {
    score: number;
    evidence: string[];
}

function scoreCandidate(candidate: Candidate, rule: FieldRule): CandidateScore | null {
    if (rule.exclude?.some((token) => candidate.normalizedPath.some((seg) => seg.includes(token)))) {
        return null;
    }

    const contextMatched =
        rule.context?.some((ctx) => candidate.normalizedPath.some((seg) => seg.includes(ctx))) ??
        false;
    if (rule.context && !contextMatched) {
        return null;
    }

    let score = 0;
    const evidence: string[] = [];

    if (rule.exact?.includes(candidate.normalizedKey)) {
        score += 60;
        evidence.push('exact-key-match');
    }
    if (rule.includes.some((token) => candidate.normalizedKey.includes(token))) {
        score += 40;
        evidence.push('token-key-match');
    }

    score += 20;
    evidence.push('numeric-leaf');
    if (candidate.normalizedPath.some((seg) => seg.includes('player'))) {
        score += 5;
        evidence.push('player-context');
    }
    if (candidate.path.length < 8) {
        score += 5;
        evidence.push('short-path');
    }

    if (rule.id === 'playerLevel' && candidate.value >= 1 && candidate.value <= 200) {
        score += 10;
        evidence.push('level-range');
    }
    if ((rule.id === 'hp' || rule.id === 'stamina') && candidate.value >= 1 && candidate.value <= 100000) {
        score += 5;
        evidence.push('attribute-range');
    }
    if (rule.id === 'techPoints' && candidate.value >= 0 && candidate.value <= 100000) {
        score += 5;
        evidence.push('tech-range');
    }
    if ((rule.id === 'inventoryItem' || rule.id === 'goldItem') && candidate.value >= 0 && candidate.value <= 999999) {
        score += 8;
        evidence.push('inventory-range');
    }

    return { score, evidence };
}

interface QuickFieldAnalysis {
    quickFields: PalworldQuickField[];
    scanLimited: boolean;
    stats: QuickFieldStats;
}

export function analyzePalworldQuickFields(jsonView: unknown): QuickFieldAnalysis {
    const { candidates, truncated } = collectNumericCandidates(jsonView);
    if (candidates.length === 0) {
        return {
            quickFields: [],
            scanLimited: truncated,
            stats: {
                detected: 0,
                high: 0,
                medium: 0,
                ambiguous: 0,
                scanLimited: truncated,
            },
        };
    }

    const fields: PalworldQuickField[] = [];
    const usedPaths = new Set<string>();
    const stats: QuickFieldStats = {
        detected: 0,
        high: 0,
        medium: 0,
        ambiguous: 0,
        scanLimited: truncated,
    };

    FIELD_RULES.forEach((rule) => {
        const scored = candidates
            .map((candidate) => {
                const scoredCandidate = scoreCandidate(candidate, rule);
                if (!scoredCandidate) return null;
                return {
                    candidate,
                    score: scoredCandidate.score,
                    evidence: scoredCandidate.evidence,
                };
            })
            .filter(
                (
                    item
                ): item is {
                    candidate: Candidate;
                    score: number;
                    evidence: string[];
                } => !!item
            )
            .filter((item) => item.score >= getRuleThreshold(rule.id))
            .sort((a, b) => b.score - a.score);

        const best = scored[0];
        if (!best) return;

        const secondBestDifferentPath = scored.find(
            (item) => item.candidate.path.join('.') !== best.candidate.path.join('.')
        );
        const scoreGap = secondBestDifferentPath ? best.score - secondBestDifferentPath.score : Number.POSITIVE_INFINITY;
        const isAmbiguous = scoreGap < 8;

        const pathKey = best.candidate.path.join('.');
        if (usedPaths.has(pathKey)) return;
        usedPaths.add(pathKey);

        const confidence: PalworldQuickField['confidence'] =
            best.score >= 90 && !isAmbiguous ? 'high' : 'medium';

        if (isAmbiguous) {
            stats.ambiguous += 1;
        }
        if (confidence === 'high') {
            stats.high += 1;
        } else {
            stats.medium += 1;
        }

        fields.push({
            id: rule.id,
            path: best.candidate.path,
            value: best.candidate.value,
            confidence,
            score: best.score,
            evidence: [
                ...best.evidence,
                `threshold>=${getRuleThreshold(rule.id)}`,
                isAmbiguous ? `ambiguous-gap=${Math.max(0, scoreGap)}` : 'clear-gap',
            ],
        });
    });

    stats.detected = fields.length;
    return { quickFields: fields, scanLimited: truncated, stats };
}

export function extractPalworldQuickFields(jsonView: unknown): PalworldQuickField[] {
    return analyzePalworldQuickFields(jsonView).quickFields;
}

export function summarizePalworldPals(root: unknown): { candidateCount: number; candidates: PalworldPalCandidate[] } {
    const stack: Array<{ node: unknown; path: Array<string | number> }> = [{ node: root, path: [] }];
    const visited = new WeakSet<object>();
    let candidateCount = 0;
    let visitedNodes = 0;
    const candidates: PalworldPalCandidate[] = [];

    while (stack.length > 0 && visitedNodes < MAX_QUICK_SCAN_NODES) {
        const current = stack.pop();
        if (!current) break;
        const { node, path } = current;
        visitedNodes += 1;
        if (!node || typeof node !== 'object') continue;
        if (visited.has(node)) continue;
        visited.add(node);

        if (Array.isArray(node)) {
            for (let index = node.length - 1; index >= 0; index -= 1) stack.push({ node: node[index], path: [...path, index] });
            continue;
        }

        const record = node as Record<string, unknown>;
        const palCandidate = extractPalCandidate(record, path);
        if (palCandidate) {
            candidateCount += 1;
            if (candidates.length < 20) candidates.push(palCandidate);
        }

        for (const [key, value] of Object.entries(record)) {
            stack.push({ node: value, path: [...path, key] });
        }
    }

    return { candidateCount, candidates };
}

function extractPalCandidate(record: Record<string, unknown>, path: Array<string | number>): PalworldPalCandidate | null {
    const entries = Object.entries(record);
    const getByTerms = (terms: string[]) => {
        const entry = entries.find(([key]) => terms.some((term) => normalizeKey(key).includes(term)));
        return entry?.[1];
    };
    const labelValue = getByTerms(['palid', 'palname', 'nickname', 'characterid', 'speciesid']);
    const levelValue = getByTerms(['level']);
    const hasPalContext = entries.some(([key, value]) => {
        const normalized = normalizeKey(key);
        return normalized.includes('pal') || (typeof value === 'string' && normalizeKey(value).includes('pal'));
    }) || path.some((part) => typeof part === 'string' && normalizeKey(part).includes('pal'));

    if (!hasPalContext || (labelValue === undefined && levelValue === undefined)) return null;
    const label = labelValue === undefined ? 'Pal candidate' : String(labelValue);
    const level = typeof levelValue === 'number' && Number.isFinite(levelValue) ? levelValue : undefined;
    return {
        path,
        label,
        level,
        confidence: labelValue !== undefined && level !== undefined ? 'high' : 'medium',
    };
}

export async function parsePalworld(file: File): Promise<PalworldParseOutcome> {
    const unrealOutcome: UnrealParseOutcome = await parseUnreal(file);
    const unreal = unrealOutcome.data;
    if (!unrealOutcome.capabilities.canView || !unreal) {
        return makeOutcome({
            engine: 'palworld',
            format: 'sav',
            mode: unrealOutcome.mode,
            reasonCode: unrealOutcome.reasonCode,
            reason: unrealOutcome.reason || 'This Palworld candidate could not be parsed as a standard GVAS save.',
            capabilities: {
                canView: false,
                canEdit: false,
                canSave: false,
                roundTripSupport: 'none',
            },
            data: null as any,
            warnings: unrealOutcome.warnings,
            diagnostics: unrealOutcome.diagnostics,
        });
    }

    const fileRole = detectFileRole(file.name, unreal.jsonView);
    const shouldRunQuickFieldDetection = fileRole !== 'world';
    const { quickFields, scanLimited, stats } = shouldRunQuickFieldDetection
        ? analyzePalworldQuickFields(unreal.jsonView)
        : {
              quickFields: [] as PalworldQuickField[],
              scanLimited: false,
              stats: {
                  detected: 0,
                  high: 0,
                  medium: 0,
                  ambiguous: 0,
                  scanLimited: false,
              } as QuickFieldStats,
          };

    const notes: PalworldInsightNote[] = [];
    if (!unrealOutcome.capabilities.canSave) {
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
    if (stats.ambiguous > 0) {
        notes.push('quick_fields_ambiguous');
    }

    const enriched = unreal as PalworldParseResult;
    enriched.game = 'palworld';
    enriched._palworld = {
        fileRole,
        quickFields,
        notes,
        palsSummary: shouldRunQuickFieldDetection ? summarizePalworldPals(unreal.jsonView) : undefined,
    };

    const worldLimited = fileRole === 'world';

    return makeOutcome({
        engine: 'palworld',
        format: 'sav',
        mode: unrealOutcome.mode,
        reasonCode: unrealOutcome.reasonCode,
        reason: worldLimited
            ? 'World-level Palworld saves are inspection-first. Editing and saving are disabled until safe world mapping is available.'
            : unrealOutcome.reason,
        capabilities: {
            canView: unrealOutcome.capabilities.canView,
            canEdit: worldLimited ? false : unrealOutcome.capabilities.canEdit,
            canSave: worldLimited ? false : unrealOutcome.capabilities.canSave,
            requiresExperimental: worldLimited ? false : unrealOutcome.capabilities.requiresExperimental,
            roundTripSupport: worldLimited ? 'none' : unrealOutcome.capabilities.roundTripSupport,
        },
        data: enriched,
        warnings: worldLimited
            ? ['World save detected: quick edit and save export are disabled for safety.']
            : unrealOutcome.warnings,
        diagnostics: {
            ...unrealOutcome.diagnostics,
            fileRole,
            quickFieldCount: quickFields.length,
            scanLimited,
            quickFieldStats: stats,
        },
    });
}

export async function buildPalworld(originalFile: File, data: PalworldParseResult | any): Promise<Blob> {
    const payload = data?.engine ? data?.data : data;
    const role = payload?._palworld?.fileRole ?? detectFileRole(originalFile.name, payload?.jsonView ?? payload);
    if (role === 'world') {
        throw new Error('Palworld world saves are read-only in this editor. Safe world-file writing is not enabled.');
    }
    return buildUnreal(originalFile, payload);
}
