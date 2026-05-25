import React from 'react';
import { executePresetAction } from '../../lib/presetRuntime';

export interface RpgMakerActor {
    _actorId: number;
    _name: string;
    name?: string;
    _level: number;
    level?: number;
    _hp: number;
    _mp: number;
    _paramPlus: number[];
    [key: string]: any;
}

export interface RpgMakerParty {
    _gold?: number;
    gold?: number;
    _items: Record<string, number>;
    [key: string]: any;
}

export interface RpgMakerData {
    party?: RpgMakerParty;
    gold?: number;
    actors?: {
        _data: (RpgMakerActor | null)[];
    };
    items?: Record<string, number>;
    variables?: (number | string | null)[] | Record<string, number | string>;
    switches?: boolean[] | Record<string, boolean>;
    [key: string]: any;
}

interface RpgMakerEditorProps {
    data: RpgMakerData;
    onChange: (newData: RpgMakerData) => void;
    readOnly?: boolean;
}

interface GameFolderContext {
    items: Record<string, string>;
    weapons: Record<string, string>;
    armors: Record<string, string>;
    actors: Record<string, string>;
    variables: Record<string, string>;
    switches: Record<string, string>;
    maps: Record<string, string>;
}

const emptyFolderContext: GameFolderContext = {
    items: {},
    weapons: {},
    armors: {},
    actors: {},
    variables: {},
    switches: {},
    maps: {},
};

export default function RpgMakerEditor({ data, onChange, readOnly = false }: RpgMakerEditorProps) {
    const [folderContext, setFolderContext] = React.useState<GameFolderContext>(emptyFolderContext);
    const [itemId, setItemId] = React.useState('1');
    const [itemAmount, setItemAmount] = React.useState('99');
    const root = getSaveRoot(data);
    const party = root?.party;
    const itemsMap = party?._items || party?.items || root?._items || root?.items || data?.items;
    const weaponsMap = party?._weapons || root?._weapons;
    const armorsMap = party?._armors || root?._armors;
    const variables = root?.variables || root?._variables || data?.variables;
    const switches = root?.switches || root?._switches || data?.switches;
    const actors = root?.actors || root?._actors || data?.actors;
    const isLcf200x = String(root?._format || data?._format || '').includes('2000/2003');
    const lcfEditable = new Set<string>(Array.isArray(root?._lcf?.editable) ? root._lcf.editable : []);
    const canEditGold = !isLcf200x || lcfEditable.has('gold');
    const canEditItems = !isLcf200x || lcfEditable.has('items');
    const canEditVariables = !isLcf200x || lcfEditable.has('variables');
    const canEditSwitches = !isLcf200x || lcfEditable.has('switches');
    const canEditActors = !isLcf200x || lcfEditable.has('actors');
    const itemCatalog = isLcf200x
        ? mergeNameMaps(folderContext.items, folderContext.weapons, folderContext.armors)
        : folderContext.items;
    const itemOptions = Object.entries(itemCatalog).slice(0, 250);
    const actorDataPath = resolveActorDataPath(root);

    // Helper to safely update data
    const updateData = (updater: (prev: RpgMakerData) => void) => {
        if (readOnly) return;
        // Deep clone for safety
        const newData = JSON.parse(JSON.stringify(data));
        updater(newData);
        onChange(newData);
    };

    const handleFolderFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        const next: GameFolderContext = { ...emptyFolderContext };

        for (const file of files) {
            const name = file.name.toLowerCase();
            const path = ((file as any).webkitRelativePath || file.name).toLowerCase();
            if (
                !path.includes('/data/') &&
                !name.match(/^(items|weapons|armors|actors|system|mapinfos)\.(json|rvdata2|rvdata|rxdata)$/) &&
                name !== 'rpg_rt.ldb'
            ) continue;
            try {
                if (name === 'rpg_rt.ldb') {
                    const { parseLcfDatabaseNames } = await import('../../lib/parsers/lcf');
                    const maps = parseLcfDatabaseNames(new Uint8Array(await file.arrayBuffer()));
                    next.items = { ...next.items, ...(maps.items || {}) };
                    next.weapons = { ...next.weapons, ...(maps.weapons || {}) };
                    next.armors = { ...next.armors, ...(maps.armors || {}) };
                    next.actors = { ...next.actors, ...(maps.actors || {}) };
                    next.variables = { ...next.variables, ...(maps.variables || {}) };
                    next.switches = { ...next.switches, ...(maps.switches || {}) };
                    continue;
                }

                const parsed = await readDatabaseFile(file);
                if (name.startsWith('items.')) next.items = extractNameMap(parsed);
                if (name.startsWith('weapons.')) next.weapons = extractNameMap(parsed);
                if (name.startsWith('armors.')) next.armors = extractNameMap(parsed);
                if (name.startsWith('actors.')) next.actors = extractNameMap(parsed);
                if (name.startsWith('mapinfos.')) next.maps = extractMapNames(parsed);
                if (name.startsWith('system.')) {
                    next.variables = extractIndexedNames(parsed?.variables || parsed?._variables);
                    next.switches = extractIndexedNames(parsed?.switches || parsed?._switches);
                }
            } catch {
                // Ignore database files the browser cannot decode.
            }
        }

        setFolderContext(next);
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h4 className="text-base font-semibold text-gray-800">RPG Maker Folder Mode</h4>
                        <p className="text-xs text-gray-500">Optional: choose the game folder to label item, actor, variable, and switch IDs locally, including RPG_RT.ldb for RPG Maker 2000/2003.</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                        Open Game Folder
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={handleFolderFiles}
                            {...({ webkitdirectory: 'true', directory: '' } as any)}
                        />
                    </label>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                    Loaded names: items {Object.keys(folderContext.items).length}, weapons {Object.keys(folderContext.weapons).length}, armors {Object.keys(folderContext.armors).length}, actors {Object.keys(folderContext.actors).length}, variables {Object.keys(folderContext.variables).length}, switches {Object.keys(folderContext.switches).length}, maps {Object.keys(folderContext.maps).length}.
                </p>
            </div>

            {/* Gold Editor */}
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-5 border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <span className="text-xl">💰</span>
                    </div>
                    <label className="text-base font-semibold text-gray-800">Gold / Money</label>
                </div>
                <input
                    type="number"
                    className="block w-full max-w-xs rounded-lg border-amber-200 bg-white shadow-sm focus:border-amber-400 focus:ring-amber-400 text-lg p-3 border font-medium"
                    value={party?._gold ?? party?.gold ?? root?._gold ?? data?.gold ?? 0}
                    readOnly={readOnly || root?._readOnly || !canEditGold}
                    onChange={(e) => updateData((newData) => {
                        const newGold = parseInt(e.target.value) || 0;
                        for (const path of resolveGoldPaths(getSaveRoot(newData))) {
                            executePrimitiveOnRoot(newData, 'set-gold', path, newGold);
                        }
                    })}
                />
            </div>

            {/* Actor Parameter Sets */}
            {actors?._data && canEditActors && (
                <div className="space-y-6">
                    {actors._data
                        .filter((actor: any) => actor && actor._actorId)
                        .map((actor: any, index: number) => {
                            if (!actor) return null;
                            const actorName = folderContext.actors[actor._actorId] || actor._name || actor.name || `Actor #${actor._actorId}`;
                            const params = actor._paramPlus || [];

                            // RPG Maker 2000/2003 stores actor modifiers differently from MV/MZ.
                            const paramNames = isLcf200x
                                ? ['HP Mod', 'MP Mod', 'Attack', 'Defense', 'Spirit', 'Unused', 'Agility', 'Unused']
                                : ['MHP', 'MMP', 'ATK', 'DEF', 'MAT', 'MDF', 'AGI', 'LUK'];
                            const actorId = actor._actorId;
                            const actorBasePath = actorDataPath ? [...actorDataPath, index] : null;

                            return (
                                <div key={actorId || index} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-primary-200">
                                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
                                            <span className="text-lg font-bold text-primary-600">#{actorId}</span>
                                        </div>
                                        <h4 className="text-base font-semibold text-gray-800">
                                            {actorName}
                                        </h4>
                                    </div>

                                    {/* Level */}
                                    <div className="mb-4 grid gap-3 sm:grid-cols-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-600 w-16">Level</span>
                                            <input
                                                type="number"
                                                className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm p-1.5 border"
                                                value={actor._level || actor.level || 1}
                                                readOnly={readOnly}
                                                onChange={(e) => updateData((newData) => {
                                                    const newVal = parseInt(e.target.value) || 1;
                                                    if (actorBasePath) {
                                                        executePrimitiveOnRoot(newData, 'set-level', [...actorBasePath, '_level'], newVal);
                                                        executePrimitiveOnRoot(newData, 'set-level', [...actorBasePath, 'level'], newVal);
                                                    }
                                                })}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-600 w-16">EXP</span>
                                            <input
                                                type="number"
                                                className="w-28 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm p-1.5 border"
                                                value={getActorExp(actor)}
                                                readOnly={readOnly}
                                                onChange={(e) => updateData((newData) => {
                                                    const newVal = parseInt(e.target.value) || 0;
                                                    if (!actorBasePath) return;
                                                    for (const path of resolveActorExpPaths(actor, actorBasePath, actorId)) {
                                                        executePrimitiveOnRoot(newData, 'set-exp', path, newVal);
                                                    }
                                                })}
                                            />
                                        </div>
                                    </div>

                                    {/* Base Parameters Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {paramNames.map((paramName, paramIndex) => (
                                            isLcf200x && paramName === 'Unused' ? null : (
                                            <div key={paramName} className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-gray-500 w-10">{paramName}</span>
                                                <input
                                                    type="number"
                                                    className="flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm p-1.5 border"
                                                    value={params[paramIndex] || 0}
                                                    readOnly={readOnly}
                                                    onChange={(e) => updateData((newData) => {
                                                        if (actorBasePath) {
                                                            ensureActorParamPlus(newData, actorBasePath);
                                                            executePrimitiveOnRoot(newData, 'set-hp-mp', [...actorBasePath, '_paramPlus', paramIndex], parseInt(e.target.value) || 0);
                                                        }
                                                    })}
                                                />
                                            </div>
                                            )
                                        ))}
                                    </div>

                                    {/* HP/MP Display */}
                                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-green-600 w-10">HP</span>
                                            <input
                                                type="number"
                                                className="flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm p-1.5 border"
                                                value={actor._hp ?? 0}
                                                readOnly={readOnly}
                                                onChange={(e) => updateData((newData) => {
                                                    if (actorBasePath) {
                                                        executePrimitiveOnRoot(newData, 'set-hp-mp', [...actorBasePath, '_hp'], parseInt(e.target.value) || 0);
                                                    }
                                                })}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-blue-600 w-10">MP</span>
                                            <input
                                                type="number"
                                                className="flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm p-1.5 border"
                                                value={actor._mp ?? 0}
                                                readOnly={readOnly}
                                                onChange={(e) => updateData((newData) => {
                                                    if (actorBasePath) {
                                                        executePrimitiveOnRoot(newData, 'set-hp-mp', [...actorBasePath, '_mp'], parseInt(e.target.value) || 0);
                                                    }
                                                })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}

            {/* Inventory Section */}
            {itemsMap && canEditItems && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <span className="text-xl">📦</span>
                        </div>
                        <div>
                            <h4 className="text-base font-semibold text-gray-800">Inventory (Items)</h4>
                            <p className="text-xs text-gray-500">Format: {"{"}"itemId": quantity, ...{"}"}</p>
                        </div>
                    </div>
                    <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-emerald-200 bg-white p-4 sm:grid-cols-[1fr_120px_auto_auto] sm:items-end">
                        <label className="block text-sm">
                            <span className="mb-1 block font-semibold text-gray-800">Item</span>
                            {itemOptions.length > 0 ? (
                                <select
                                    className="w-full rounded-lg border-gray-300 p-2.5"
                                    value={itemId}
                                    disabled={readOnly}
                                    onChange={(event) => setItemId(event.target.value)}
                                >
                                    {itemOptions.map(([id, name]) => (
                                        <option key={id} value={id}>{id}: {name}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    className="w-full rounded-lg border-gray-300 p-2.5"
                                    value={itemId}
                                    readOnly={readOnly}
                                    onChange={(event) => setItemId(event.target.value)}
                                    placeholder="Item ID"
                                />
                            )}
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
                            disabled={readOnly || !itemId}
                            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                            onClick={() => updateData((newData) => {
                                const mapPath = resolveInventoryPath(getSaveRoot(newData));
                                if (!mapPath) return;
                                executeMapOnRoot(newData, 'add-item', mapPath, Number(itemAmount), itemId);
                            })}
                        >
                            Add / Update
                        </button>
                        <button
                            type="button"
                            disabled={readOnly}
                            className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 disabled:opacity-50"
                            onClick={() => updateData((newData) => {
                                const mapPath = resolveInventoryPath(getSaveRoot(newData));
                                if (!mapPath) return;
                                executeMapOnRoot(newData, 'all-items-99', mapPath, 99);
                                for (const key of Object.keys(itemCatalog)) {
                                    executeMapOnRoot(newData, 'add-item', mapPath, 99, key);
                                }
                            })}
                        >
                            All Items 99
                        </button>
                    </div>
                    <textarea
                        className="w-full h-32 rounded-lg border-emerald-200 bg-white shadow-sm focus:border-emerald-400 focus:ring-emerald-400 text-sm p-3 border font-mono"
                        value={JSON.stringify(itemsMap || {}, null, 2)}
                        readOnly={readOnly}
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                updateData((newData) => {
                                    replaceInventoryMapWithRuntime(newData, resolveInventoryPath(getSaveRoot(newData)), parsed, 'add-item');
                                });
                            } catch (err) {
                                // Invalid JSON, ignore
                            }
                        }}
                    />
                    <p className="text-xs text-emerald-700 mt-3 bg-emerald-100/50 p-2 rounded-lg flex items-center gap-2">
                        <span>💡</span> Item names are stored in the game's data/Items.json file.
                    </p>
                </div>
            )}

            {(weaponsMap || armorsMap) && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {weaponsMap && <InventoryMapEditor title="Weapons" values={weaponsMap} names={folderContext.weapons} readOnly={readOnly} onChange={(next) => updateData((newData) => replaceInventoryMapWithRuntime(newData, resolveWeaponsPath(getSaveRoot(newData)), next, 'set-weapons-99'))} />}
                    {armorsMap && <InventoryMapEditor title="Armors" values={armorsMap} names={folderContext.armors} readOnly={readOnly} onChange={(next) => updateData((newData) => replaceInventoryMapWithRuntime(newData, resolveArmorsPath(getSaveRoot(newData)), next, 'set-armors-99'))} />}
                </div>
            )}

            {/* Variables Section */}
            {variables && canEditVariables && (
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-5 border border-violet-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                            <span className="text-xl">🔧</span>
                        </div>
                        <div>
                            <h4 className="text-base font-semibold text-gray-800">Variables</h4>
                            <p className="text-xs text-gray-500">Game variables for story progression, quests, etc.</p>
                        </div>
                    </div>
                    <textarea
                        className="w-full h-32 rounded-lg border-violet-200 bg-white shadow-sm focus:border-violet-400 focus:ring-violet-400 text-sm p-3 border font-mono"
                        value={JSON.stringify(
                            // Show non-null variables as an object for easier editing
                            Array.isArray(variables)
                                ? variables.reduce((acc: any, val: any, idx: number) => {
                                    if (folderContext.variables[idx] || (val !== null && val !== 0 && val !== "")) {
                                        acc[folderContext.variables[idx] ? `${idx}: ${folderContext.variables[idx]}` : idx] = val;
                                    }
                                    return acc;
                                }, {})
                                : variables,
                            null, 2
                        )}
                        readOnly={readOnly}
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                updateData((newData) => {
                                    const nextRoot = getSaveRoot(newData);
                                    const targetVariables = nextRoot?._variables || nextRoot?.variables || newData.variables;
                                    const variablePath = resolveVariablesPath(nextRoot);
                                    // If it's an object format, convert back to array
                                    if (Array.isArray(targetVariables) && variablePath) {
                                        Object.entries(parsed).forEach(([key, value]) => {
                                            const idx = parseInt(key);
                                            if (!isNaN(idx)) {
                                                executePrimitiveOnRoot(newData, 'set-variable', [...variablePath, idx], value as any);
                                            }
                                        });
                                    } else if (targetVariables && typeof targetVariables === 'object' && variablePath) {
                                        Object.entries(parsed).forEach(([key, value]) => {
                                            executePrimitiveOnRoot(newData, 'set-variable', [...variablePath, key], value as any);
                                        });
                                    }
                                });
                            } catch (err) {
                                // Invalid JSON, ignore
                            }
                        }}
                    />
                    <p className="text-xs text-violet-700 mt-3 bg-violet-100/50 p-2 rounded-lg flex items-center gap-2">
                        <span>💡</span> Variable names are stored in the game's data/System.json file.
                    </p>
                </div>
            )}

            {/* Switches Section */}
            {switches && canEditSwitches && (
                <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-5 border border-sky-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
                            <span className="text-xl">🏚️</span>
                        </div>
                        <div>
                            <h4 className="text-base font-semibold text-gray-800">Switches</h4>
                            <p className="text-xs text-gray-500">Boolean flags for game events. Shows only enabled switches.</p>
                        </div>
                    </div>
                    <textarea
                        className="w-full h-24 rounded-lg border-sky-200 bg-white shadow-sm focus:border-sky-400 focus:ring-sky-400 text-sm p-3 border font-mono"
                        value={JSON.stringify(
                            // Named switches are shown even when false so Folder Mode does not silently flip flags.
                            Array.isArray(switches)
                                ? switches.reduce((acc: any, val: boolean, idx: number) => {
                                    if (folderContext.switches[idx] || val === true) {
                                        acc[folderContext.switches[idx] ? `${idx}: ${folderContext.switches[idx]}` : idx] = val;
                                    }
                                    return acc;
                                }, {})
                                : switches,
                            null, 2
                        )}
                        readOnly={readOnly}
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                updateData((newData) => {
                                    const nextRoot = getSaveRoot(newData);
                                    const targetSwitches = nextRoot?._switches || nextRoot?.switches || newData.switches;
                                    const switchPath = resolveSwitchesPath(nextRoot);
                                    if (Array.isArray(targetSwitches) && switchPath) {
                                        Object.entries(parsed).forEach(([key, value]) => {
                                            const idx = parseInt(key);
                                            if (!isNaN(idx) && typeof value === 'boolean') {
                                                executePrimitiveOnRoot(newData, 'set-switch', [...switchPath, idx], value);
                                            }
                                        });
                                    } else if (targetSwitches && typeof targetSwitches === 'object' && switchPath) {
                                        Object.entries(parsed).forEach(([key, value]) => {
                                            if (typeof value === 'boolean') {
                                                executePrimitiveOnRoot(newData, 'set-switch', [...switchPath, key], value);
                                            }
                                        });
                                    }
                                });
                            } catch (err) {
                                // Invalid JSON, ignore
                            }
                        }}
                    />
                </div>
            )}
        </div>
    );

}

function getSaveRoot(data: any): any {
    return data?.data && data?._format ? data.data : data;
}

function syncSaveRoot(data: any, root: any): void {
    if (data?.data && data?._format) {
        data.data = root;
        return;
    }
    Object.keys(data).forEach((key) => delete data[key]);
    Object.assign(data, root);
}

function executePrimitiveOnRoot(data: any, actionId: string, path: Array<string | number>, value: number | boolean | string): void {
    const nextRoot = executePresetAction(getSaveRoot(data), actionId, { path, value });
    syncSaveRoot(data, nextRoot);
}

function executeMapOnRoot(data: any, actionId: string, mapPath: Array<string | number>, value: number, itemId?: string): void {
    const nextRoot = executePresetAction(getSaveRoot(data), actionId, { mapPath, value, itemId });
    syncSaveRoot(data, nextRoot);
    const root = getSaveRoot(data);
    if (mapPath.join('.') === 'party._items' && root?.party?._items) data.items = root.party._items;
    else if (mapPath.join('.') === 'party.items' && root?.party?.items) data.items = root.party.items;
    else if (mapPath.join('.') === '_items' && root?._items) data.items = root._items;
    else if (mapPath.join('.') === 'items' && root?.items) data.items = root.items;
}

function resolveGoldPaths(root: any): Array<Array<string | number>> {
    const paths: Array<Array<string | number>> = [];
    if (root?.party?._gold !== undefined) paths.push(['party', '_gold']);
    if (root?.party?.gold !== undefined) paths.push(['party', 'gold']);
    if (root?._gold !== undefined) paths.push(['_gold']);
    if (root?.gold !== undefined || paths.length === 0) paths.push(['gold']);
    return paths;
}

function resolveActorDataPath(root: any): Array<string | number> | null {
    if (Array.isArray(root?.actors?._data)) return ['actors', '_data'];
    if (Array.isArray(root?._actors?._data)) return ['_actors', '_data'];
    return null;
}

function resolveActorExpPaths(actor: any, actorBasePath: Array<string | number>, actorId: number): Array<Array<string | number>> {
    const paths: Array<Array<string | number>> = [];
    if (actor?._exp && typeof actor._exp === 'object') paths.push([...actorBasePath, '_exp', actorId]);
    else paths.push([...actorBasePath, '_exp']);
    if (actor?.exp !== undefined) paths.push([...actorBasePath, 'exp']);
    return paths;
}

function ensureActorParamPlus(data: any, actorBasePath: Array<string | number>): void {
    const root = getSaveRoot(data);
    let actor = root;
    for (const key of actorBasePath) actor = actor?.[key as any];
    if (actor && !Array.isArray(actor._paramPlus)) actor._paramPlus = [0, 0, 0, 0, 0, 0, 0, 0];
}

function getInventoryMap(root: any): Record<string, number> | undefined {
    return root?.party?._items || root?.party?.items || root?._items || root?.items;
}

function resolveInventoryPath(root: any): Array<string | number> | null {
    if (root?.party?._items !== undefined) return ['party', '_items'];
    if (root?.party?.items !== undefined) return ['party', 'items'];
    if (root?._items !== undefined) return ['_items'];
    if (root?.items !== undefined) return ['items'];
    return null;
}

function resolveWeaponsPath(root: any): Array<string | number> | null {
    if (root?.party?._weapons !== undefined) return ['party', '_weapons'];
    if (root?._weapons !== undefined) return ['_weapons'];
    return null;
}

function resolveArmorsPath(root: any): Array<string | number> | null {
    if (root?.party?._armors !== undefined) return ['party', '_armors'];
    if (root?._armors !== undefined) return ['_armors'];
    return null;
}

function replaceInventoryMapWithRuntime(data: any, mapPath: Array<string | number> | null, next: Record<string, number>, actionId: string): void {
    if (!mapPath) return;
    for (const [id, amount] of Object.entries(next)) {
        executeMapOnRoot(data, actionId, mapPath, amount, id);
    }
}

function resolveVariablesPath(root: any): Array<string | number> | null {
    if (root?._variables !== undefined) return ['_variables'];
    if (root?.variables !== undefined) return ['variables'];
    return null;
}

function resolveSwitchesPath(root: any): Array<string | number> | null {
    if (root?._switches !== undefined) return ['_switches'];
    if (root?.switches !== undefined) return ['switches'];
    return null;
}

function getActorExp(actor: any): number {
    if (typeof actor?._exp === 'number') return actor._exp;
    if (typeof actor?.exp === 'number') return actor.exp;
    if (actor?._exp && typeof actor._exp === 'object') return Number(actor._exp[actor._actorId] ?? 0);
    return 0;
}

function extractIndexedNames(value: any): Record<string, string> {
    if (!value) return {};
    const result: Record<string, string> = {};
    if (Array.isArray(value)) {
        value.forEach((name, index) => {
            if (name) result[String(index)] = String(name);
        });
    }
    return result;
}

function extractNameMap(value: any): Record<string, string> {
    const result: Record<string, string> = {};
    const list = Array.isArray(value) ? value : Array.isArray(value?._data) ? value._data : [];
    list.forEach((item: any, index: number) => {
        if (!item) return;
        const id = item.id ?? item._id ?? item._actorId ?? index;
        const name = item.name ?? item._name;
        if (id && name) result[String(id)] = String(name);
    });
    return result;
}

function extractMapNames(value: any): Record<string, string> {
    const result: Record<string, string> = {};
    const entries = value && typeof value === 'object' ? Object.entries(value) : [];
    for (const [id, item] of entries) {
        const name = (item as any)?.name ?? (item as any)?._name;
        if (name) result[String(id)] = String(name);
    }
    return result;
}

function mergeNameMaps(...maps: Array<Record<string, string>>): Record<string, string> {
    return Object.assign({}, ...maps);
}

async function readDatabaseFile(file: File): Promise<any> {
    if (file.name.toLowerCase().endsWith('.json')) return JSON.parse(await file.text());
    const { parseRubyMarshal } = await import('../../lib/parsers/ruby-marshal');
    return parseRubyMarshal(new Uint8Array(await file.arrayBuffer()));
}

function InventoryMapEditor({ title, values, names, readOnly, onChange }: {
    title: string;
    values: Record<string, number>;
    names: Record<string, string>;
    readOnly: boolean;
    onChange: (next: Record<string, number>) => void;
}) {
    const [id, setId] = React.useState(Object.keys(values)[0] || '1');
    const [amount, setAmount] = React.useState('99');
    const options = Object.entries(names).slice(0, 250);

    return (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5">
            <h4 className="mb-3 text-base font-semibold text-gray-800">{title}</h4>
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_100px_auto_auto]">
                {options.length > 0 ? (
                    <select className="rounded-lg border-gray-300 p-2.5" value={id} disabled={readOnly} onChange={(event) => setId(event.target.value)}>
                        {options.map(([key, name]) => <option key={key} value={key}>{key}: {name}</option>)}
                    </select>
                ) : (
                    <input className="rounded-lg border-gray-300 p-2.5" value={id} readOnly={readOnly} onChange={(event) => setId(event.target.value)} />
                )}
                <input type="number" className="rounded-lg border-gray-300 p-2.5" value={amount} readOnly={readOnly} onChange={(event) => setAmount(event.target.value)} />
                <button
                    type="button"
                    disabled={readOnly || !id}
                    className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    onClick={() => onChange({ ...values, [id]: Number(amount) })}
                >
                    Add / Update
                </button>
                <button
                    type="button"
                    disabled={readOnly}
                    className="rounded-lg border border-indigo-300 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-800 disabled:opacity-50"
                    onClick={() => {
                        const ids = new Set([...Object.keys(values), ...Object.keys(names)]);
                        onChange(Object.fromEntries(Array.from(ids).map((key) => [key, 99])));
                    }}
                >
                    All {title} 99
                </button>
            </div>
            <textarea
                className="h-28 w-full rounded-lg border-indigo-200 bg-white p-3 font-mono text-sm"
                value={JSON.stringify(values, null, 2)}
                readOnly={readOnly}
                onChange={(event) => {
                    try {
                        onChange(JSON.parse(event.target.value));
                    } catch {
                        // Invalid JSON, ignore
                    }
                }}
            />
        </div>
    );
}
