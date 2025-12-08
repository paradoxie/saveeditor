import React from 'react';
import ReactJson from 'react-json-view';

interface JsonEditorProps {
    data: object;
    onChange: (newData: object) => void;
}

export default function JsonEditor({ data, onChange }: JsonEditorProps) {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [matches, setMatches] = React.useState<Set<string>>(new Set());

    // Debounce search to avoid freezing on large files
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (!searchTerm) {
                setMatches(new Set());
                return;
            }

            const newMatches = new Set<string>();
            const term = searchTerm.toLowerCase();

            const search = (obj: any, path: string[]) => {
                if (!obj) return false;

                let hasMatch = false;

                // Check current key/value
                if (path.length > 0) {
                    const key = path[path.length - 1];
                    if (String(key).toLowerCase().includes(term)) hasMatch = true;
                }

                if (typeof obj !== 'object') {
                    if (String(obj).toLowerCase().includes(term)) hasMatch = true;
                }

                // If object/array, traverse children
                if (typeof obj === 'object') {
                    Object.entries(obj).forEach(([k, v]) => {
                        const childHasMatch = search(v, [...path, k]);
                        if (childHasMatch) hasMatch = true;
                    });
                }

                if (hasMatch) {
                    // Add this path and all parent paths to matches
                    // namespace in react-json-view is array of keys
                    // We need to store the stringified namespace to match against
                    // But react-json-view passes namespace as array in collapsed callback
                    // Let's store the JSON string of the path array
                    newMatches.add(JSON.stringify(path));
                }

                return hasMatch;
            };

            search(data, []);
            setMatches(newMatches);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, data]);

    const handleEdit = (edit: any) => {
        onChange(edit.updated_src);
    };

    const handleAdd = (add: any) => {
        onChange(add.updated_src);
    };

    const handleDelete = (del: any) => {
        onChange(del.updated_src);
    };

    const shouldCollapse = (field: any) => {
        if (!searchTerm) return false; // Default: expand all levels

        // field.namespace is the path to the parent of the current key
        // field.name is the current key
        // So the full path to this node is [...field.namespace, field.name]
        const fullPath = [...field.namespace, field.name];

        // If this node is in matches, we should EXPAND it (return false)
        // But wait, 'collapsed' true means collapsed.
        // If matches has this path, it means this node OR its children have a match.
        // So we should expand it.
        if (matches.has(JSON.stringify(fullPath))) return false;

        return true; // Collapse non-matching nodes
    };

    return (
        <div className="space-y-2">
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search keys or values..."
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-md px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <div className="absolute right-3 top-2.5 text-xs text-gray-400">
                        {matches.size > 0 ? `${matches.size} matches found` : 'No matches'}
                    </div>
                )}
            </div>
            <div className="json-editor-container bg-gray-900 rounded-lg p-4 overflow-auto max-h-[600px] text-sm font-mono">
                <ReactJson
                    src={data}
                    theme="monokai"
                    onEdit={handleEdit}
                    onAdd={handleAdd}
                    onDelete={handleDelete}
                    displayDataTypes={false}
                    displayObjectSize={true}
                    enableClipboard={true}
                    indentWidth={2}
                    collapsed={searchTerm ? (shouldCollapse as any) : 3}
                    name={false}
                />
            </div>
        </div>
    );
}
