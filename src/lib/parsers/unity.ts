import plist from 'plist';

export async function parseUnity(file: File): Promise<any> {
    const text = await file.text();

    // Detection
    if (text.trim().startsWith('<?xml') && text.includes('<!DOCTYPE plist')) {
        // Plist format (macOS/iOS)
        try {
            return plist.parse(text);
        } catch (e: any) {
            throw new Error("Failed to parse Unity Plist: " + e.message);
        }
    } else if (text.trim().startsWith('<?xml') || text.includes('<map>')) {
        // Android/Linux XML format
        // Format is usually:
        // <map>
        //    <int name="gold" value="100" />
        //    <string name="name" value="Hero" />
        // </map>
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");
            const map = xmlDoc.getElementsByTagName("map")[0];
            if (!map) throw new Error("Invalid Unity XML: No <map> tag found");

            const result: any = {};

            // Helper to parse children
            const parseNode = (node: Element) => {
                const name = node.getAttribute("name");
                const value = node.getAttribute("value");

                if (!name) return;

                if (node.tagName === "int" || node.tagName === "long") {
                    result[name] = parseInt(value || "0");
                } else if (node.tagName === "float") {
                    result[name] = parseFloat(value || "0.0");
                } else if (node.tagName === "string") {
                    // Strings might be in value attribute or text content
                    result[name] = value !== null ? value : node.textContent;
                } else if (node.tagName === "boolean") {
                    result[name] = value === "true" || value === "1";
                }
            };

            for (let i = 0; i < map.children.length; i++) {
                parseNode(map.children[i]);
            }

            return result;
        } catch (e: any) {
            throw new Error("Failed to parse Unity XML: " + e.message);
        }
    } else {
        throw new Error("Unsupported Unity format. Only XML and Plist are supported.");
    }
}

export async function buildUnity(originalFile: File, data: any): Promise<Blob> {
    const text = await originalFile.text();

    if (text.trim().startsWith('<?xml') && text.includes('<!DOCTYPE plist')) {
        // Rebuild Plist
        const newXml = plist.build(data);
        return new Blob([newXml], { type: 'application/x-plist' });
    } else {
        // Rebuild Android XML
        // This is a bit manual string building for MVP
        let xml = '<?xml version=\'1.0\' encoding=\'utf-8\' standalone=\'yes\' ?>\n<map>\n';

        for (const key in data) {
            const value = data[key];
            const type = typeof value;

            if (type === 'number') {
                if (Number.isInteger(value)) {
                    xml += `    <int name="${key}" value="${value}" />\n`;
                } else {
                    xml += `    <float name="${key}" value="${value}" />\n`;
                }
            } else if (type === 'boolean') {
                xml += `    <boolean name="${key}" value="${value}" />\n`;
            } else if (type === 'string') {
                // Escape special chars in string and use value attribute (more common format)
                const escaped = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                xml += `    <string name="${key}" value="${escaped}" />\n`;
            }
        }

        xml += '</map>';
        return new Blob([xml], { type: 'application/xml' });
    }
}
