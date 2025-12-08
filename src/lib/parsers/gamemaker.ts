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

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;

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
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }

            if (!ini[currentSection]) ini[currentSection] = {};

            // Try to parse number
            const num = Number(value);
            ini[currentSection][key] = !isNaN(num) ? num : value;
            isIni = true;
        }
    }

    if (isIni) {
        return { type: 'ini', data: ini };
    }

    // If neither, return raw text
    return { type: 'raw', data: text };
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
