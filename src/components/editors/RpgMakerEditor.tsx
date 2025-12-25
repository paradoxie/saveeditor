import React from 'react';

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
}

export default function RpgMakerEditor({ data, onChange }: RpgMakerEditorProps) {
    // Helper to safely update data
    const updateData = (updater: (prev: RpgMakerData) => void) => {
        // Deep clone for safety
        const newData = JSON.parse(JSON.stringify(data));
        updater(newData);
        onChange(newData);
    };

    return (
        <div className="space-y-6">
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
                    value={data?.party?._gold ?? data?.party?.gold ?? data?.gold ?? 0}
                    onChange={(e) => updateData((newData) => {
                        const newGold = parseInt(e.target.value) || 0;
                        // Update all possible gold locations
                        if (newData.party) {
                            newData.party._gold = newGold;  // RPG Maker MZ
                            newData.party.gold = newGold;   // Some versions
                        } else {
                            newData.gold = newGold; // Fallback
                        }
                    })}
                />
            </div>

            {/* Actor Parameter Sets */}
            {data?.actors?._data && (
                <div className="space-y-6">
                    {data.actors._data
                        .filter((actor) => actor && actor._actorId)
                        .map((actor, index) => {
                            if (!actor) return null;
                            const actorName = actor._name || actor.name || `Actor #${actor._actorId}`;
                            const params = actor._paramPlus || [];

                            // Standard RPG Maker MZ parameters
                            const paramNames = ['MHP', 'MMP', 'ATK', 'DEF', 'MAT', 'MDF', 'AGI', 'LUK'];
                            const actorId = actor._actorId;

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
                                    <div className="mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-600 w-16">Level</span>
                                            <input
                                                type="number"
                                                className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm p-1.5 border"
                                                value={actor._level || actor.level || 1}
                                                onChange={(e) => updateData((newData) => {
                                                    const targetActor = newData.actors?._data.find((a) => a && a._actorId === actorId);
                                                    if (targetActor) {
                                                        const newVal = parseInt(e.target.value) || 1;
                                                        targetActor._level = newVal;
                                                        targetActor.level = newVal;
                                                    }
                                                })}
                                            />
                                        </div>
                                    </div>

                                    {/* Base Parameters Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {paramNames.map((paramName, paramIndex) => (
                                            <div key={paramName} className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-gray-500 w-10">{paramName}</span>
                                                <input
                                                    type="number"
                                                    className="flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm p-1.5 border"
                                                    value={params[paramIndex] || 0}
                                                    onChange={(e) => updateData((newData) => {
                                                        const targetActor = newData.actors?._data.find((a) => a && a._actorId === actorId);
                                                        if (targetActor) {
                                                            if (!targetActor._paramPlus) {
                                                                targetActor._paramPlus = [0, 0, 0, 0, 0, 0, 0, 0];
                                                            }
                                                            targetActor._paramPlus[paramIndex] = parseInt(e.target.value) || 0;
                                                        }
                                                    })}
                                                />
                                            </div>
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
                                                onChange={(e) => updateData((newData) => {
                                                    const targetActor = newData.actors?._data.find((a) => a && a._actorId === actorId);
                                                    if (targetActor) {
                                                        targetActor._hp = parseInt(e.target.value) || 0;
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
                                                onChange={(e) => updateData((newData) => {
                                                    const targetActor = newData.actors?._data.find((a) => a && a._actorId === actorId);
                                                    if (targetActor) {
                                                        targetActor._mp = parseInt(e.target.value) || 0;
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
            {(data?.party?._items || data?.items) && (
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
                    <textarea
                        className="w-full h-32 rounded-lg border-emerald-200 bg-white shadow-sm focus:border-emerald-400 focus:ring-emerald-400 text-sm p-3 border font-mono"
                        value={JSON.stringify(data?.party?._items || data?.items || {}, null, 2)}
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                updateData((newData) => {
                                    if (newData.party) {
                                        newData.party._items = parsed;
                                    }
                                    newData.items = parsed;
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

            {/* Variables Section */}
            {data?.variables && (
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
                            Array.isArray(data.variables)
                                ? data.variables.reduce((acc: any, val: any, idx: number) => {
                                    if (val !== null && val !== 0 && val !== "") {
                                        acc[idx] = val;
                                    }
                                    return acc;
                                }, {})
                                : data.variables,
                            null, 2
                        )}
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                updateData((newData) => {
                                    // If it's an object format, convert back to array
                                    if (Array.isArray(newData.variables)) {
                                        Object.entries(parsed).forEach(([key, value]) => {
                                            const idx = parseInt(key);
                                            if (!isNaN(idx) && newData.variables) {
                                                (newData.variables as any[])[idx] = value;
                                            }
                                        });
                                    } else {
                                        newData.variables = parsed as any;
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
            {data?.switches && (
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
                            // Show only true switches
                            Array.isArray(data.switches)
                                ? data.switches.reduce((acc: any, val: boolean, idx: number) => {
                                    if (val === true) {
                                        acc[idx] = true;
                                    }
                                    return acc;
                                }, {})
                                : data.switches,
                            null, 2
                        )}
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                updateData((newData) => {
                                    if (Array.isArray(newData.switches)) {
                                        Object.entries(parsed).forEach(([key, value]) => {
                                            const idx = parseInt(key);
                                            if (!isNaN(idx) && newData.switches) {
                                                (newData.switches as boolean[])[idx] = value as boolean;
                                            }
                                        });
                                    } else {
                                        newData.switches = parsed as any;
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
