import { Buffer } from 'buffer';
// We might need to dynamically import uesavetool or handle it carefully
// because it might depend on Node.js 'fs' which is not available in browser.
// For now, let's try to use it. If it fails, we will fallback to a custom lightweight parser.

// Note: uesavetool might not export types properly or might be CommonJS.
// We'll use 'any' for now to avoid TS errors during prototyping.

export async function parseUnreal(file: File): Promise<any> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check for GVAS header
    const header = buffer.slice(0, 4).toString('utf8');
    if (header !== 'GVAS') {
        throw new Error('Invalid Unreal Engine save file: Missing GVAS header');
    }

    try {
        // Try to use uesavetool if possible
        // Since uesavetool is likely Node-only, we might face issues.
        // Let's try to import it.
        // const { Gvas, Serializer } = await import('uesavetool'); 
        // The above might fail in Vite build if it detects 'fs' usage.

        // ALTERNATIVE: Custom lightweight parser for MVP
        // We will just return a "Parsed" object with metadata we can read easily.
        // Implementing a full GVAS parser in browser JS from scratch is huge.
        // Let's see if we can just return the raw buffer and some metadata for now,
        // and maybe use a library if we can find a browser-compatible one.

        // For MVP, let's try to parse at least the SaveGameVersion and maybe some basic fields if possible.
        // Or, if we really want to support it, we need a library.

        // Let's assume for this step we just validate GVAS and return a placeholder
        // indicating it's a GVAS file, and maybe the raw data.
        // If the user wants to edit, we might need to implement a Hex Editor or specific property editor.

        // However, the goal was "Generic Editor".
        // Let's try to use 'uesavetool' and see if it breaks the build.
        // If it does, we will revert to a simple "GVAS Detected" message.

        const { Gvas, Serializer } = await import('uesavetool');
        const serializer = new Serializer(buffer);
        const gvas = new Gvas();
        gvas.deserialize(serializer);

        return gvas;
    } catch (e: any) {
        console.warn("uesavetool failed or not compatible:", e);
        // Fallback: Return raw data with GVAS type
        return {
            type: 'GVAS (Unreal Engine)',
            _note: 'Full parsing failed or library incompatible with browser. Raw data available.',
            header: 'GVAS',
            size: buffer.length
        };
    }
}

export async function buildUnreal(originalFile: File, data: any): Promise<Blob> {
    // If we used uesavetool and have a Gvas object
    if (data && data.serialize) {
        try {
            const { Serializer } = await import('uesavetool');
            const serializer = new Serializer();
            data.serialize(serializer);
            return new Blob([serializer.buffer], { type: 'application/octet-stream' });
        } catch (e) {
            console.error("Failed to serialize GVAS:", e);
        }
    }

    throw new Error("Saving Unreal Engine files is not fully supported in this browser version yet.");
}
