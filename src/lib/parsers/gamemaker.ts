export async function parseGamemaker(file: File): Promise<any> {
    const text = await file.text();

    // Try JSON first
    try {
        const json = JSON.parse(text);
        if (typeof json === 'object' && json !== null) {
            return { type: 'json', data: json };
        }
    } catch (e) {
        // Not JSON, continue to INI
    }

    // Try INI (Simple key=value)
    // Gamemaker INI files usually look like:
    // [Section]
    // key="value"
    // key=123

    const lines = text.split(/\r?\n/);
    const ini: Record<string, any> = {};
    let currentSection = 'default';
    let isIni = false;
    let pendingKey: string | null = null;
    let pendingValue = '';

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;

        // Handle multiline values ending with backslash
        if (pendingKey) {
            pendingValue += trimmed;
            if (pendingValue.endsWith('\\')) {
                pendingValue = pendingValue.slice(0, -1);
                continue;
            }
            if (!ini[currentSection]) ini[currentSection] = {};
            ini[currentSection][pendingKey] = coerceIniValue(unquoteIni(pendingValue));
            pendingKey = null;
            pendingValue = '';
            isIni = true;
            continue;
        }

        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            currentSection = trimmed.slice(1, -1);
            if (!ini[currentSection]) ini[currentSection] = {};
            isIni = true;
            continue;
        }

        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();

            // Remove quotes if present
            if (value.endsWith('\\')) {
                pendingKey = key;
                pendingValue = value.slice(0, -1);
                continue;
            }

            if (!ini[currentSection]) ini[currentSection] = {};

            ini[currentSection][key] = coerceIniValue(unquoteIni(value));
            isIni = true;
        }
    }

    if (isIni) {
        return { type: 'ini', data: ini };
    }

    // If neither, return raw text
    return { type: 'raw', data: text };
}

function unquoteIni(value: string): string {
    const trimmed = value.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        const inner = trimmed.slice(1, -1);
        return inner.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    return trimmed;
}

function coerceIniValue(value: string): any {
    if (value === 'true') return true;
    if (value === 'false') return false;
    const num = Number(value);
    return !isNaN(num) && value !== '' ? num : value;
}

export async function buildGamemaker(originalFile: File, parsed: { type: string, data: any }): Promise<Blob> {
    if (parsed.type === 'json') {
        return new Blob([JSON.stringify(parsed.data, null, 2)], { type: 'application/json' });
    } else if (parsed.type === 'ini') {
        let iniStr = '';
        for (const section in parsed.data) {
            if (section !== 'default') {
                iniStr += `[${section}]\n`;
            }
            for (const key in parsed.data[section]) {
                const value = parsed.data[section][key];
                iniStr += `${key}="${value}"\n`;
            }
            iniStr += '\n';
        }
        return new Blob([iniStr], { type: 'text/plain' });
    } else {
        // Raw text
        return new Blob([parsed.data], { type: 'text/plain' });
    }
}
