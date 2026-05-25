export interface DiffCandidate {
    path: Array<string | number>;
    before: string | number | boolean | null;
    after: string | number | boolean | null;
    valueType: 'string' | 'number' | 'boolean' | 'null';
    confidence: 'high' | 'medium' | 'low';
    aliases: string[];
}

export interface DiffProposal {
    status: 'ok' | 'rejected';
    reason?: string;
    candidates: DiffCandidate[];
    presetProposal?: {
        confidence: 'candidate';
        fields: Array<{
            label: string;
            pathSelector: string[];
            valueType: DiffCandidate['valueType'];
            aliases: string[];
        }>;
    };
}

const MAX_DIFFS = 80;

export interface DiffBuildInput {
    before: unknown;
    after: unknown;
    beforeLabel?: string;
    afterLabel?: string;
}

export function buildDiffProposal({ before, after }: DiffBuildInput): DiffProposal {
    const candidates: DiffCandidate[] = [];
    diffValue(before, after, [], candidates);

    if (candidates.length === 0) {
        return { status: 'rejected', reason: 'No primitive value changes were found.', candidates: [] };
    }

    if (candidates.length > MAX_DIFFS) {
        return {
            status: 'rejected',
            reason: 'Too many fields changed. Make one small in-game change and compare again.',
            candidates: candidates.slice(0, MAX_DIFFS),
        };
    }

    return {
        status: 'ok',
        candidates,
        presetProposal: {
            confidence: 'candidate',
            fields: candidates
                .filter((candidate) => candidate.confidence !== 'low')
                .slice(0, 24)
                .map((candidate) => ({
                    label: humanizePath(candidate.path),
                    pathSelector: candidate.path.map(String),
                    valueType: candidate.valueType,
                    aliases: candidate.aliases,
                })),
        },
    };
}

function diffValue(before: unknown, after: unknown, path: Array<string | number>, out: DiffCandidate[]): void {
    if (out.length > MAX_DIFFS) return;
    if (Object.is(before, after)) return;

    if (isPrimitive(before) && isPrimitive(after)) {
        out.push({
            path,
            before,
            after,
            valueType: valueType(after),
            confidence: confidenceForPath(path),
            aliases: aliasesForPath(path),
        });
        return;
    }

    if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return;
    const keys = new Set<string | number>();
    if (Array.isArray(before) || Array.isArray(after)) {
        const max = Math.max(Array.isArray(before) ? before.length : 0, Array.isArray(after) ? after.length : 0);
        for (let i = 0; i < max; i += 1) keys.add(i);
    } else {
        for (const key of Object.keys(before as Record<string, unknown>)) keys.add(key);
        for (const key of Object.keys(after as Record<string, unknown>)) keys.add(key);
    }

    for (const key of keys) {
        diffValue((before as any)[key], (after as any)[key], [...path, key], out);
    }
}

function isPrimitive(value: unknown): value is string | number | boolean | null {
    return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function valueType(value: string | number | boolean | null): DiffCandidate['valueType'] {
    if (value === null) return 'null';
    return typeof value as DiffCandidate['valueType'];
}

function confidenceForPath(path: Array<string | number>): DiffCandidate['confidence'] {
    const text = path.join('.').toLowerCase();
    if (/(gold|money|coin|level|exp|hp|mp|item|inventory|weapon|armor|switch|flag|persistent|gallery|unlock|tech)/.test(text)) {
        return 'high';
    }
    if (path.length <= 5) return 'medium';
    return 'low';
}

function aliasesForPath(path: Array<string | number>): string[] {
    return path
        .map(String)
        .filter((part) => /[a-zA-Z]/.test(part))
        .map((part) => part.replace(/^_+/, '').toLowerCase())
        .slice(-4);
}

function humanizePath(path: Array<string | number>): string {
    const raw = String(path[path.length - 1] ?? 'value').replace(/^_+/, '');
    return raw
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}
