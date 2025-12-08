/**
 * Pickle Protocol 0 (ASCII) Serializer for JavaScript
 * 
 * This is a simplified implementation that handles basic types:
 * - None -> None
 * - Boolean -> bool
 * - Number -> float/int
 * - String -> str
 * - Array -> list
 * - Object -> dict
 * 
 * Protocol 0 uses ASCII opcodes making it human-readable.
 */

// Pickle Protocol 0 opcodes
const MARK = '(';
const STOP = '.';
const POP = '0';
const DUP = '2';
const FLOAT = 'F';
const INT = 'I';
const LONG = 'L';
const NONE = 'N';
const DICT = 'd';
const LIST = 'l';
const APPEND = 'a';
const SETITEM = 's';
const TUPLE = 't';
const STRING = 'S';  // Using single-quoted string
const UNICODE = 'V'; // Unicode string
const GET = 'g';
const PUT = 'p';
const REDUCE = 'R';

/**
 * Serialize a JavaScript object to Python Pickle Protocol 0 format
 */
export function pickleSerialize(obj: any): Uint8Array {
    const lines: string[] = [];
    let memo = 0;
    const memoMap = new Map<any, number>();

    function serialize(value: any): void {
        // Handle null/undefined -> None
        if (value === null || value === undefined) {
            lines.push(NONE);
            return;
        }

        // Handle boolean
        if (typeof value === 'boolean') {
            // In Protocol 0, True/False are represented as I01 and I00
            lines.push(INT + (value ? '01' : '00') + '\n');
            return;
        }

        // Handle number
        if (typeof value === 'number') {
            if (Number.isInteger(value) && Math.abs(value) < 2147483647) {
                // Integer
                lines.push(INT + value.toString() + '\n');
            } else {
                // Float
                lines.push(FLOAT + value.toString() + '\n');
            }
            return;
        }

        // Handle string
        if (typeof value === 'string') {
            // Use Unicode opcode for proper Unicode support
            // Escape special characters
            let escaped = '';
            for (const char of value) {
                const code = char.charCodeAt(0);
                if (code < 32 || code >= 127 || char === '\\') {
                    // Use \\uXXXX escape
                    escaped += '\\u' + code.toString(16).padStart(4, '0');
                } else {
                    escaped += char;
                }
            }
            lines.push(UNICODE + escaped + '\n');
            return;
        }

        // Handle array -> list
        if (Array.isArray(value)) {
            lines.push(MARK);
            lines.push(LIST);
            const memoId = memo++;
            lines.push(PUT + memoId.toString() + '\n');

            for (const item of value) {
                serialize(item);
                lines.push(APPEND);
            }
            return;
        }

        // Handle object -> dict
        if (typeof value === 'object') {
            lines.push(MARK);
            lines.push(DICT);
            const memoId = memo++;
            lines.push(PUT + memoId.toString() + '\n');

            for (const [key, val] of Object.entries(value)) {
                serialize(key);
                serialize(val);
                lines.push(SETITEM);
            }
            return;
        }

        // Fallback to string representation
        serialize(String(value));
    }

    serialize(obj);
    lines.push(STOP);

    // Join and encode
    const pickleString = lines.join('');
    const encoder = new TextEncoder();
    return encoder.encode(pickleString);
}

/**
 * Wrap pickled data with Ren'Py save file header and zlib compression
 */
export function createRenpySave(pickledData: Uint8Array, version: string = '8.0'): Uint8Array {
    // Import pako dynamically isn't ideal, so this function expects the caller to handle compression
    // This just returns the pickled data; actual compression is done in buildRenpy
    return pickledData;
}
