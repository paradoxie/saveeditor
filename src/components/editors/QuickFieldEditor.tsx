import React from 'react';
import { getPreset } from '../../data/capability';
import { getValueAtPath, resolvePresetFields, setPresetFieldValue, setValueAtPath, type BoundPresetField } from '../../lib/presetRuntime';

interface QuickFieldEditorProps {
    data: any;
    onChange: (newData: any) => void;
    readOnly?: boolean;
    canEditPath?: (path: Array<string | number>) => boolean;
    allowItemAdd?: boolean;
    presetSlug?: string;
    supportHref?: string;
    onOpenDiffWizard?: () => void;
}

interface QuickField {
    path: Array<string | number>;
    label: string;
    value: number | boolean | string;
    valueType: 'number' | 'boolean' | 'string';
    group: 'Money' | 'Level & XP' | 'Stats' | 'Items' | 'Flags';
    editable: boolean;
    boundField?: BoundPresetField;
}

const groupStyles = {
    Money: 'from-amber-50 to-yellow-50 border-amber-100',
    'Level & XP': 'from-blue-50 to-cyan-50 border-blue-100',
    Stats: 'from-emerald-50 to-teal-50 border-emerald-100',
    Items: 'from-violet-50 to-purple-50 border-violet-100',
    Flags: 'from-sky-50 to-blue-50 border-sky-100',
};

const groupTerms = {
    Money: ['gold', 'money', 'coin', 'cash', 'fund', 'currency', 'gem'],
    'Level & XP': ['level', 'lvl', 'lv', 'exp', 'xp', 'skill'],
    Stats: ['hp', 'mp', 'health', 'stamina', 'attack', 'atk', 'defense', 'def', 'strength', 'str', 'agility', 'agi'],
    Items: ['item', 'inventory', 'material', 'resource', 'quantity', 'amount'],
    Flags: ['switch', 'flag', 'unlock', 'achievement', 'clear', 'complete'],
};

export default function QuickFieldEditor({ data, onChange, readOnly = false, canEditPath, allowItemAdd = true, presetSlug, supportHref, onOpenDiffWizard }: QuickFieldEditorProps) {
    const [itemId, setItemId] = React.useState('');
    const [itemAmount, setItemAmount] = React.useState('99');
    const [selectedItemMapKey, setSelectedItemMapKey] = React.useState('');
    const preset = React.useMemo(() => getPreset(presetSlug), [presetSlug]);
    const presetFields = React.useMemo(() => resolvePresetFields(data, presetSlug, { canEditPath }), [data, presetSlug, canEditPath]);
    const fields = React.useMemo(() => {
        if (presetFields.length > 0) {
            return presetFields.map((field) => ({
                path: field.path,
                label: field.label,
                value: field.value,
                valueType: field.valueType,
                group: normalizeGroup(field.group),
                editable: field.editable,
                boundField: field,
            }));
        }
        if (preset?.confidence === 'verified') return [];
        return prioritizePresetFields(findQuickFields(data), preset);
    }, [data, preset, presetFields]);
    const itemMaps = React.useMemo(() => findItemMaps(data), [data]);
    const grouped = groupFields(fields);
    const selectedItemMap = itemMaps.find((path) => path.join('.') === selectedItemMapKey) ?? itemMaps[0];
    const selectedItemMapValue = selectedItemMap ? getValueAtPath(data, selectedItemMap) : null;
    const itemKey = itemId.trim();
    const itemExists = Boolean(
        selectedItemMapValue &&
            typeof selectedItemMapValue === 'object' &&
            Object.prototype.hasOwnProperty.call(selectedItemMapValue, itemKey)
    );
    const itemTargetPath = selectedItemMap ? [...selectedItemMap, itemKey] : [];
    const itemBoundField = fields.find((field) => field.boundField && pathsEqual(field.path, itemTargetPath))?.boundField;
    const itemActionAllowed =
        Boolean(selectedItemMap && itemKey) &&
        (allowItemAdd || itemExists) &&
        (!canEditPath || canEditPath(itemTargetPath)) &&
        (presetFields.length === 0 || Boolean(itemBoundField));
    const editableItemFields = grouped.Items.filter((field) => !canEditPath || canEditPath(field.path));

    if (fields.length === 0) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{preset?.confidence === 'verified' ? 'No verified preset fields matched this save.' : 'No common quick-edit fields found.'}</p>
                <p className="mt-1">{preset?.confidence === 'verified' ? 'This save did not match the verified paths for the selected preset. Use the diff wizard or support pack to add evidence.' : 'Use Advanced mode and search for gold, money, level, exp, hp, item, inventory, or flags.'}</p>
                {onOpenDiffWizard && (
                    <button
                        type="button"
                        className="mt-3 mr-2 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                        onClick={onOpenDiffWizard}
                    >
                        Open diff wizard
                    </button>
                )}
                {supportHref && (
                    <a className="mt-3 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100" href={supportHref}>
                        Send anonymized support pack
                    </a>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-900">
                <p className="font-semibold">Quick Edit</p>
                <p className="mt-1 text-indigo-700">
                    {presetFields.length > 0 ? 'Preset-bound fields are active. Writes are guarded by the preset policy.' : 'Auto-detected common fields. Make small edits, keep a backup, then verify in-game.'}
                </p>
            </div>

            {Object.entries(grouped).filter(([, groupFields]) => groupFields.length > 0).map(([group, groupFields]) => (
                <section
                    key={group}
                    className={`bg-gradient-to-br ${groupStyles[group as QuickField['group']]} rounded-xl p-5 border shadow-sm`}
                >
                    <h4 className="text-base font-semibold text-gray-900 mb-4">{group}</h4>
                    {group === 'Items' && itemMaps.length > 0 && (
                        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-violet-200 bg-white p-4 sm:flex-row sm:items-end">
                            {itemMaps.length > 1 && (
                                <label className="block text-sm">
                                    <span className="mb-1 block font-semibold text-gray-800">Item Map</span>
                                    <select
                                        className="w-full rounded-lg border-gray-300 p-2.5"
                                        value={selectedItemMap?.join('.') ?? ''}
                                        disabled={readOnly}
                                        onChange={(event) => setSelectedItemMapKey(event.target.value)}
                                    >
                                        {itemMaps.map((path) => (
                                            <option key={path.join('.')} value={path.join('.')}>
                                                {path.join('.')}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}
                            <label className="block text-sm">
                                <span className="mb-1 block font-semibold text-gray-800">Item ID</span>
                                <input
                                    className="w-full rounded-lg border-gray-300 p-2.5"
                                    value={itemId}
                                    readOnly={readOnly}
                                    onChange={(event) => setItemId(event.target.value)}
                                    placeholder="1"
                                />
                            </label>
                            <label className="block text-sm">
                                <span className="mb-1 block font-semibold text-gray-800">Amount</span>
                                <input
                                    type="number"
                                    className="w-full rounded-lg border-gray-300 p-2.5"
                                    value={itemAmount}
                                    readOnly={readOnly}
                                    onChange={(event) => setItemAmount(event.target.value)}
                                />
                            </label>
                            <button
                                type="button"
                                disabled={readOnly || !itemActionAllowed}
                                className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                                onClick={() => {
                                    const amount = Number(itemAmount);
                                    if (!Number.isFinite(amount) || !selectedItemMap) return;
                                    if (itemBoundField) {
                                        onChange(setPresetFieldValue(data, itemBoundField, amount, { canEditPath }));
                                        return;
                                    }
                                    onChange(setValueAtPath(data, [...selectedItemMap, itemKey], amount));
                                }}
                            >
                                {allowItemAdd ? 'Add / Update Item' : 'Update Existing Item'}
                            </button>
                            <button
                                type="button"
                                disabled={readOnly || editableItemFields.length === 0}
                                className="rounded-lg border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-800 disabled:opacity-50"
                                onClick={() => {
                                    let nextData = data;
                                    for (const field of editableItemFields) {
                                        if (typeof field.value === 'number') {
                                            nextData = updateFieldValue(nextData, field, 99, canEditPath);
                                        }
                                    }
                                    onChange(nextData);
                                }}
                            >
                                Set Visible Items 99
                            </button>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {groupFields.map((field) => (
                            <label key={field.path.join('.')} className="block bg-white rounded-lg border border-gray-200 p-4">
                                <span className="block text-sm font-semibold text-gray-900">{field.label}</span>
                                <span className="block text-xs text-gray-500 font-mono break-all mb-2">
                                    {field.path.join('.')}
                                </span>
                                {field.valueType === 'boolean' ? (
                                    <select
                                        className="block w-full rounded-lg border-gray-300 bg-white p-2.5 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                        value={field.value ? 'true' : 'false'}
                                        disabled={isFieldReadOnly(field, readOnly, canEditPath)}
                                        onChange={(event) => onChange(updateFieldValue(data, field, event.target.value === 'true', canEditPath))}
                                    >
                                        <option value="true">true</option>
                                        <option value="false">false</option>
                                    </select>
                                ) : field.valueType === 'string' ? (
                                    <input
                                        type="text"
                                        className="block w-full rounded-lg border-gray-300 bg-white shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2.5"
                                        value={String(field.value)}
                                        readOnly={isFieldReadOnly(field, readOnly, canEditPath)}
                                        onChange={(event) => onChange(updateFieldValue(data, field, event.target.value, canEditPath))}
                                    />
                                ) : (
                                    <input
                                        type="number"
                                        className="block w-full rounded-lg border-gray-300 bg-white shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2.5"
                                        value={Number(field.value)}
                                        readOnly={isFieldReadOnly(field, readOnly, canEditPath)}
                                        onChange={(event) => {
                                            const nextValue = Number(event.target.value);
                                            if (!Number.isFinite(nextValue)) return;
                                            onChange(updateFieldValue(data, field, nextValue, canEditPath));
                                        }}
                                    />
                                )}
                            </label>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}

function findQuickFields(root: any): QuickField[] {
    const fields: QuickField[] = [];
    const seen = new Set<string>();

    const visit = (value: any, path: Array<string | number>, depth: number) => {
        if (fields.length >= 80 || depth > 8 || value === null || value === undefined) return;

        if (typeof value === 'number' && Number.isFinite(value)) {
            const field = classifyField(path, value);
            const key = path.join('.');
            if (field && !seen.has(key)) {
                fields.push(field);
                seen.add(key);
            }
            return;
        }

        if (typeof value === 'boolean') {
            const field = classifyField(path, value);
            const key = path.join('.');
            if (field && !seen.has(key)) {
                fields.push(field);
                seen.add(key);
            }
            return;
        }

        if (typeof value !== 'object') return;

        const entries = Array.isArray(value) ? Array.from(value.entries()) : Object.entries(value);
        for (const [key, child] of entries) {
            visit(child, [...path, key], depth + 1);
        }
    };

    visit(root, [], 0);
    return fields.sort((a, b) => groupRank(a.group) - groupRank(b.group) || a.path.length - b.path.length);
}

function classifyField(path: Array<string | number>, value: number | boolean): QuickField | null {
    const text = path.join('.').toLowerCase();
    for (const [group, terms] of Object.entries(groupTerms) as Array<[QuickField['group'], string[]]>) {
        if (typeof value === 'boolean' && group !== 'Flags') continue;
        if (typeof value === 'number' && group === 'Flags') continue;
        if (terms.some((term) => text.includes(term))) {
            return {
                path,
                label: humanizePath(path),
                value,
                valueType: typeof value as QuickField['valueType'],
                group,
                editable: true,
            };
        }
    }
    return null;
}

function groupFields(fields: QuickField[]): Record<QuickField['group'], QuickField[]> {
    return fields.reduce(
        (acc, field) => {
            acc[field.group].push(field);
            return acc;
        },
        { Money: [], 'Level & XP': [], Stats: [], Items: [], Flags: [] } as Record<QuickField['group'], QuickField[]>
    );
}

function groupRank(group: QuickField['group']): number {
    return ['Money', 'Level & XP', 'Stats', 'Items', 'Flags'].indexOf(group);
}

function prioritizePresetFields(fields: QuickField[], preset: ReturnType<typeof getPreset> | undefined): QuickField[] {
    if (!preset || preset.confidence !== 'verified') return fields;
    const aliases = preset.fields.flatMap((field) => field.aliases.map((alias) => alias.toLowerCase()));
    return [...fields].sort((a, b) => {
        const aHit = aliases.some((alias) => a.path.join('.').toLowerCase().includes(alias)) ? 0 : 1;
        const bHit = aliases.some((alias) => b.path.join('.').toLowerCase().includes(alias)) ? 0 : 1;
        return aHit - bHit || groupRank(a.group) - groupRank(b.group) || a.path.length - b.path.length;
    });
}

function humanizePath(path: Array<string | number>): string {
    const last = String(path[path.length - 1] ?? 'value');
    return last
        .replace(/^_+/, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isFieldReadOnly(
    field: QuickField,
    readOnly: boolean,
    canEditPath?: (path: Array<string | number>) => boolean
): boolean {
    return readOnly || !field.editable || (canEditPath ? !canEditPath(field.path) : false);
}

function updateFieldValue(
    data: any,
    field: QuickField,
    value: number | boolean | string,
    canEditPath?: (path: Array<string | number>) => boolean
): any {
    if (field.boundField) {
        return setPresetFieldValue(data, field.boundField, value, { canEditPath });
    }
    return setValueAtPath(data, field.path, value);
}

function pathsEqual(a: Array<string | number>, b: Array<string | number>): boolean {
    return a.length === b.length && a.every((part, index) => String(part) === String(b[index]));
}

function findItemMaps(root: any): Array<Array<string | number>> {
    const paths: Array<Array<string | number>> = [];
    const visit = (value: any, path: Array<string | number>, depth: number) => {
        if (paths.length >= 5 || depth > 6 || !value || typeof value !== 'object' || Array.isArray(value)) return;
        const text = path.join('.').toLowerCase();
        const values = Object.values(value);
        if (
            values.length > 0 &&
            values.every((item) => typeof item === 'number' && Number.isFinite(item)) &&
            ['item', 'items', 'inventory', 'weapon', 'armor'].some((term) => text.includes(term))
        ) {
            paths.push(path);
            return;
        }
        for (const [key, child] of Object.entries(value)) {
            visit(child, [...path, key], depth + 1);
        }
    };
    visit(root, [], 0);
    return paths;
}

function normalizeGroup(group: string): QuickField['group'] {
    if (group === 'Inventory') return 'Items';
    if (group === 'Unlocks') return 'Flags';
    if (group === 'Pals') return 'Stats';
    return group as QuickField['group'];
}
