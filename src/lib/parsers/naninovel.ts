import pako from 'pako';

export type NaniNovelFormat = 'naninovel-json' | 'naninovel-base64' | 'naninovel-gzip' | 'naninovel-nson';

export async function parseNaniNovel(file: File): Promise<{ data: any, type: NaniNovelFormat }> {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Strategy 1: NSON Binary Format (Raw DEFLATE compressed JSON - Naninovel's default)
    // This is the most common format for .nson files
    try {
        // Use inflateRaw which expects raw DEFLATE data (no zlib/gzip header)
        const decompressed = pako.inflateRaw(uint8Array);
        const decoder = new TextDecoder('utf-8');
        const jsonString = decoder.decode(decompressed);
        const data = JSON.parse(jsonString);
        console.log('Parsed as NSON binary format (raw DEFLATE)');
        return { data, type: 'naninovel-nson' };
    } catch (e: any) {
        console.log('NSON binary parsing failed:', e.message);
        // Not NSON binary format, try other strategies
    }

    // For remaining strategies, read as text
    const text = new TextDecoder('utf-8').decode(uint8Array);

    // Strategy 2: Plain JSON
    try {
        const data = JSON.parse(text);
        console.log('Parsed as plain JSON');
        return { data, type: 'naninovel-json' };
    } catch (e) {
        // Not plain JSON
    }

    // Strategy 3: Base64 Encoded JSON
    try {
        const decoded = atob(text);
        const data = JSON.parse(decoded);
        console.log('Parsed as Base64 encoded JSON');
        return { data, type: 'naninovel-base64' };
    } catch (e) {
        // Not Base64
    }

    // Strategy 4: Gzip Compressed (with header)
    try {
        const decompressed = pako.ungzip(uint8Array, { to: 'string' });
        const data = JSON.parse(decompressed);
        console.log('Parsed as Gzip compressed JSON');
        return { data, type: 'naninovel-gzip' };
    } catch (e) {
        // Not Gzip
    }

    throw new Error("Failed to parse NaniNovel file. It might be encrypted or use an unsupported format.");
}

export async function buildNaniNovel(originalFile: File, data: any, format: NaniNovelFormat): Promise<Blob> {
    const jsonString = JSON.stringify(data);

    if (format === 'naninovel-nson') {
        // NSON Binary Format: Raw DEFLATE compressed JSON (no header/wrapper)
        const encoder = new TextEncoder();
        const jsonBytes = encoder.encode(jsonString);
        const compressed = pako.deflateRaw(jsonBytes);
        console.log('Built as NSON binary format (raw DEFLATE)', compressed.length, 'bytes');
        return new Blob([compressed], { type: 'application/octet-stream' });
    } else if (format === 'naninovel-gzip') {
        const compressed = pako.gzip(jsonString);
        return new Blob([compressed], { type: 'application/octet-stream' });
    } else if (format === 'naninovel-base64') {
        const encoded = btoa(jsonString);
        return new Blob([encoded], { type: 'text/plain' });
    } else {
        // Default to JSON
        return new Blob([jsonString], { type: 'application/json' });
    }
}

