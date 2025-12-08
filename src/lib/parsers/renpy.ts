import pako from 'pako';
import pickleparser from 'pickleparser';
import { pickleSerialize } from './pickle-serializer';

// Store the original header for each parsed file
const fileHeaders = new Map<string, { header: string, zlibStartIndex: number }>();

export async function parseRenpy(file: File): Promise<any> {
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // Ren'Py saves often start with "Ren'Py Save Game X.X" followed by zlib data
    // We need to find the start of the zlib stream.
    // Zlib streams usually start with 0x78 0x9C (default compression) or similar.
    // Or we can look for the end of the header string.

    let zlibStartIndex = -1;
    let headerStr = '';

    // Simple heuristic: Look for the first 0x78 byte which is common for zlib
    // This is risky but a good first attempt for MVP.
    // A better way is to skip the text header.

    // Headers usually end with a newline or null byte?
    // Let's try to find "Ren'Py Save Game" and skip it.

    const headerPreview = new TextDecoder().decode(uint8Array.slice(0, 100));
    if (headerPreview.startsWith("Ren'Py Save Game")) {
        // Find the first newline
        const newlineIndex = uint8Array.indexOf(10); // \n
        if (newlineIndex !== -1) {
            zlibStartIndex = newlineIndex + 1;
            headerStr = new TextDecoder().decode(uint8Array.slice(0, newlineIndex + 1));
        }
    } else {
        // Maybe it's raw zlib?
        zlibStartIndex = 0;
        headerStr = '';
    }

    if (zlibStartIndex === -1) {
        throw new Error("Could not determine start of Ren'Py save data");
    }

    // Store header info for rebuilding later
    fileHeaders.set(file.name, { header: headerStr, zlibStartIndex });

    try {
        const compressedData = uint8Array.slice(zlibStartIndex);
        const inflated = pako.inflate(compressedData);

        // Now parse pickle
        // pickleparser expects a buffer-like object
        const parser = new pickleparser.Parser();
        // We need to pass the inflated data. pickleparser might need a specific format.
        // Looking at docs/usage (assumed): parser.parse(buffer)

        const result = parser.parse(inflated);
        return result;
    } catch (e: any) {
        console.error("Ren'Py parse error:", e);
        throw new Error("Failed to parse Ren'Py save: " + e.message);
    }
}

/**
 * Build a Ren'Py save file from modified data
 * Uses Protocol 0 (ASCII) Pickle format with zlib compression
 * 
 * WARNING: This is experimental. Ren'Py 8.0+ has security checks that may reject
 * modified save files. Complex Python objects may not serialize correctly.
 */
export async function buildRenpy(originalFile: File, data: any): Promise<Blob> {
    try {
        // Get the original header if available
        const headerInfo = fileHeaders.get(originalFile.name);
        const header = headerInfo?.header || "Ren'Py Save Game 8.0\n";

        console.log('Building Ren\'Py save with header:', header);

        // Serialize data to Pickle Protocol 0 format
        const pickledData = pickleSerialize(data);
        console.log('Pickle serialized, size:', pickledData.length);

        // Compress with zlib
        const compressedData = pako.deflate(pickledData);
        console.log('Zlib compressed, size:', compressedData.length);

        // Combine header + compressed data
        const headerBytes = new TextEncoder().encode(header);
        const fullFile = new Uint8Array(headerBytes.length + compressedData.length);
        fullFile.set(headerBytes, 0);
        fullFile.set(compressedData, headerBytes.length);

        console.log('Final Ren\'Py save size:', fullFile.length);

        return new Blob([fullFile], { type: 'application/octet-stream' });
    } catch (e: any) {
        console.error("Ren'Py build error:", e);
        throw new Error("Failed to build Ren'Py save: " + e.message + ". This format may not be fully supported.");
    }
}

