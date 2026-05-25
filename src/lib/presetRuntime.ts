import { getPreset, type PresetWritePolicy } from '../data/capability';

export interface BoundPresetField {
    id: string;
    label: string;
    group: 'Money' | 'Level & XP' | 'Stats' | 'Items' | 'Flags' | 'Unlocks' | 'Inventory' | 'Pals';
    path: Array<string | number>;
    value: number | boolean | string;
    valueType: 'number' | 'boolean' | 'string';
    writePolicy: PresetWritePolicy;
    editable: boolean;
    confidence: 'verified' | 'candidate' | 'blocked';
    description: string;
}

interface ResolvePresetRuntimeOptions {
    canEditPath?: (path: Array<string | number>) => boolean;
}

export function resolvePresetFields(
    data: unknown,
    presetSlug?: string,
    options: ResolvePresetRuntimeOptions = {}
): BoundPresetField[] {
    const preset = getPreset(presetSlug);
    if (!preset) return [];
    if (preset.engine === 'renpy') {
        return resolveRenpyFields(data, presetSlug, options);
    }
    if (preset.engine === 'palworld') {
        return resolvePalworldFields(data, presetSlug, options);
    }
    return resolveAliasFields(data, presetSlug, options);
}

export function getValueAtPath(root: any, path: Array<string | number>): any {
    let cursor = root;
    for (const key of path) {
        if (cursor === null || cursor === undefined) return undefined;
        cursor = cursor[key as any];
    }
    return cursor;
}

export function setValueAtPath(root: any, path: Array<string | number>, nextValue: number | boolean | string): any {
    if (path.length === 0) return root;
    const nextRoot = cloneContainer(root);
    let cursor = nextRoot;

    for (let i = 0; i < path.length - 1; i += 1) {
        const key = path[i];
        cursor[key as any] = cloneContainer(cursor[key as any]);
        cursor = cursor[key as any];
    }

    cursor[path[path.length - 1] as any] = nextValue;
    return nextRoot;
}

export function setPresetFieldValue(
    root: any,
    field: BoundPresetField,
    nextValue: number | boolean | string,
    options: ResolvePresetRuntimeOptions = {}
): any {
    if (!canWritePresetField(field, nextValue, options)) return root;
    return setValueAtPath(root, field.path, nextValue);
}

export function canWritePresetField(
    field: BoundPresetField,
    nextValue: number | boolean | string,
    options: ResolvePresetRuntimeOptions = {}
): boolean {
    if (!field.editable || field.writePolicy === 'readonly') return false;
    if (options.canEditPath && !options.canEditPath(field.path)) return false;
    if (field.writePolicy === 'persistent-primitive' && field.path[0] !== 'persistent') return false;
    if (field.valueType !== typeof nextValue) return false;
    return typeof nextValue === 'string' || typeof nextValue === 'number' || typeof nextValue === 'boolean';
}

export function executePresetAction(
    root: any,
    actionId: string,
    input: { path?: Array<string | number>; mapPath?: Array<string | number>; value?: number | boolean | string; itemId?: string }
): any {
    const value = input.value ?? 99;
    if (actionId === 'add-item' || actionId === 'all-items-99' || actionId === 'set-weapons-99' || actionId === 'set-armors-99') {
        if (!input.mapPath || typeof value !== 'number' || !Number.isFinite(value)) return root;
        return applyRpgMakerMapAction(root, input.mapPath, value, input.itemId);
    }
    if (!input.path || !canExecutePrimitiveAction(actionId, input.path, value)) return root;
    return setValueAtPath(root, input.path, value);
}

export function applyRpgMakerMapAction(
    root: any,
    mapPath: Array<string | number>,
    nextValue: number,
    itemId?: string
): any {
    if (itemId) {
        return setValueAtPath(root, [...mapPath, itemId], nextValue);
    }
    const current = getValueAtPath(root, mapPath);
    if (!current || typeof current !== 'object' || Array.isArray(current)) return root;
    let nextRoot = root;
    for (const key of Object.keys(current)) {
        if (typeof current[key] === 'number' && Number.isFinite(current[key])) {
            nextRoot = setValueAtPath(nextRoot, [...mapPath, key], nextValue);
        }
    }
    return nextRoot;
}

function resolveRenpyFields(
    data: unknown,
    presetSlug?: string,
    options: ResolvePresetRuntimeOptions = {}
): BoundPresetField[] {
    const preset = getPreset(presetSlug);
    if (!preset) return [];
    const persistent = data && typeof data === 'object' ? (data as any).persistent : null;
    if (!persistent || typeof persistent !== 'object') return [];
    const fields: BoundPresetField[] = [];
    const visit = (value: unknown, path: Array<string | number>, depth: number) => {
        if (fields.length >= 60 || depth > 6) return;
        if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
            const definition = preset.fields.find((field) => {
                if (field.valueType !== typeof value) return false;
                return matchesSelector(path, field.pathSelector);
            });
            if (!definition) return;
            fields.push({
                id: definition.id,
                label: humanizePath(path),
                group: definition.group,
                path,
                value,
                valueType: typeof value as BoundPresetField['valueType'],
                writePolicy: definition.writePolicy,
                editable: definition.writePolicy !== 'readonly' && (!options.canEditPath || options.canEditPath(path)),
                confidence: preset.confidence,
                description: definition.description,
            });
            return;
        }
        if (!value || typeof value !== 'object') return;
        const entries = Array.isArray(value) ? Array.from(value.entries()) : Object.entries(value as Record<string, unknown>);
        for (const [key, child] of entries) {
            visit(child, [...path, key], depth + 1);
        }
    };
    visit(persistent, ['persistent'], 0);
    return dedupeBoundFields(fields);
}

function resolveAliasFields(
    data: unknown,
    presetSlug?: string,
    options: ResolvePresetRuntimeOptions = {}
): BoundPresetField[] {
    const preset = getPreset(presetSlug);
    if (!preset || !data || typeof data !== 'object') return [];
    const fields: BoundPresetField[] = [];
    const visit = (value: unknown, path: Array<string | number>, depth: number) => {
        if (fields.length >= 60 || depth > 7) return;
        if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
            const definition = preset.fields.find((field) => {
                if (field.valueType !== typeof value) return false;
                return matchesSelector(path, field.pathSelector);
            });
            if (!definition) return;
            fields.push({
                id: definition.id,
                label: humanizePath(path),
                group: definition.group,
                path,
                value,
                valueType: typeof value as BoundPresetField['valueType'],
                writePolicy: definition.writePolicy,
                editable: definition.writePolicy !== 'readonly' && (!options.canEditPath || options.canEditPath(path)),
                confidence: preset.confidence,
                description: definition.description,
            });
            return;
        }
        if (!value || typeof value !== 'object') return;
        const entries = Array.isArray(value) ? Array.from(value.entries()) : Object.entries(value as Record<string, unknown>);
        for (const [key, child] of entries) {
            visit(child, [...path, key], depth + 1);
        }
    };
    visit(data, [], 0);
    return dedupeBoundFields(fields);
}

function resolvePalworldFields(
    data: unknown,
    presetSlug?: string,
    options: ResolvePresetRuntimeOptions = {}
): BoundPresetField[] {
    const preset = getPreset(presetSlug);
    const quickFields = data && typeof data === 'object'
        ? ((data as any)._palworld?.quickFields ?? (data as any).jsonView?._palworld?.quickFields)
        : null;
    if (!preset || !Array.isArray(quickFields)) return [];
    return quickFields
        .filter((item: any) => item?.confidence === 'high' && Array.isArray(item.path))
        .map((item: any): BoundPresetField | null => {
            const value = item.value;
            if (typeof value !== 'number' && typeof value !== 'boolean' && typeof value !== 'string') return null;
            const definition = preset.fields.find((field) => field.id === item.id && field.valueType === typeof value);
            if (!definition) return null;
            return {
                id: definition.id,
                label: item.label || definition.label,
                group: definition.group,
                path: item.path,
                value,
                valueType: typeof value as BoundPresetField['valueType'],
                writePolicy: definition.writePolicy,
                editable: definition.writePolicy !== 'readonly' && (!options.canEditPath || options.canEditPath(item.path)),
                confidence: preset.confidence,
                description: definition.description,
            };
        })
        .filter(Boolean) as BoundPresetField[];
}

function dedupeBoundFields(fields: BoundPresetField[]): BoundPresetField[] {
    const seen = new Set<string>();
    return fields.filter((field) => {
        const key = field.path.join('.');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function humanizePath(path: Array<string | number>): string {
    const raw = String(path[path.length - 1] ?? 'value').replace(/^_+/, '');
    return raw
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function matchesSelector(path: Array<string | number>, selector: string[]): boolean {
    if (selector.length === 0) return false;
    const tokens = path.map((part) => normalizeToken(part));
    const selectorTokens = selector.map((part) => normalizeToken(part)).filter(Boolean);
    if (selectorTokens.length === 1 && selectorTokens[0] === 'persistent') {
        return tokens[0] === 'persistent';
    }
    if (selectorTokens[0] === 'persistent') {
        return tokens[0] === 'persistent' && selectorTokens.slice(1).some((selectorToken) => tokenMatches(tokens, selectorToken));
    }
    return selectorTokens.some((selectorToken) => tokenMatches(tokens, selectorToken));
}

function tokenMatches(tokens: string[], selectorToken: string): boolean {
    return tokens.some((pathToken) => pathToken === selectorToken);
}

function canExecutePrimitiveAction(actionId: string, path: Array<string | number>, value: number | boolean | string): boolean {
    const tokens = path.map((part) => normalizeToken(part));
    const last = tokens[tokens.length - 1] ?? '';
    if (actionId === 'set-gold') return typeof value === 'number' && ['gold', 'money'].includes(last);
    if (actionId === 'set-level') return typeof value === 'number' && last === 'level';
    if (actionId === 'set-exp') return typeof value === 'number' && (['exp', 'experience'].includes(last) || tokens.includes('exp'));
    if (actionId === 'set-hp-mp') {
        return typeof value === 'number' && (['hp', 'mp', 'mhp', 'mmp'].includes(last) || tokens.includes('paramplus'));
    }
    if (actionId === 'set-variable') {
        return (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') &&
            tokens.some((token) => token === 'variables' || token === 'variable');
    }
    if (actionId === 'set-switch') return typeof value === 'boolean' && tokens.some((token) => token === 'switches' || token === 'switch');
    return false;
}

function normalizeToken(value: string | number): string {
    return String(value).replace(/^_+/, '').replace(/[^a-z0-9]+/gi, '').toLowerCase();
}

function cloneContainer(value: any): any {
    if (Array.isArray(value)) return [...value];
    if (value && typeof value === 'object') return { ...value };
    return value;
}
