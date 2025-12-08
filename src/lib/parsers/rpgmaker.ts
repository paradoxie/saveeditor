
import LZString from 'lz-string';
import pako from 'pako';
import * as fflate from 'fflate';

export interface RPGMakerSave {
    gold: number;
    level: number;
    variables: Record<string, any>;
    switches: boolean[];
    items: Array<{ id: number; amount: number }>;
    party: any;
    actors: any;
    system: any;
}

/**
 * 解析 RPG Maker MV/MZ .rpgsave/.rmmzsave 文件
 * 格式: LZ String 压缩的 JSON, 或者 Zlib 压缩 (pako/fflate), 或者纯 JSON
 */
export async function parseRPGMakerMV(file: File): Promise<RPGMakerSave> {
    const text = await file.text();
    console.log('File size:', file.size);
    // console.log('First 100 chars:', text.substring(0, 100));

    let decompressed: string | null = null;
    let compressionType = 'lzstring'; // 'lzstring', 'pako', 'fflate', 'none'

    try {
        // 1. 尝试 LZ String 解压缩 (最常见)
        console.log('Trying LZString.decompressFromBase64...');
        decompressed = LZString.decompressFromBase64(text);
        if (decompressed) console.log('LZString.decompressFromBase64 success');

        if (!decompressed) {
            console.log('Trying LZString.decompress...');
            decompressed = LZString.decompress(text);
            if (decompressed) console.log('LZString.decompress success');
        }

        // 尝试将文件读取为 BinaryString (Latin-1)，然后尝试 LZString
        // 这对于某些被错误保存为二进制的 LZString 数据有效
        if (!decompressed) {
            console.log('Trying LZString.decompress with BinaryString...');
            const buffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);
            let binaryString = "";
            // 使用堆栈安全的转换方式 (对于大文件，直接 apply 会溢出)
            const chunkSize = 8192;
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
                binaryString += String.fromCharCode.apply(null, Array.from(uint8Array.subarray(i, i + chunkSize)));
            }

            decompressed = LZString.decompress(binaryString);
            if (decompressed) {
                console.log('LZString.decompress (BinaryString) success');
            } else {
                // 同时也尝试 decompressFromBase64，万一它是 Base64 的二进制表示
                decompressed = LZString.decompressFromBase64(binaryString);
                if (decompressed) console.log('LZString.decompressFromBase64 (BinaryString) success');
            }
        }

        // 2. 如果失败，尝试 Zlib 解压缩 (部分 MZ 游戏使用)
        // 但首先，检查是否需要修复 UTF-8 Mojibake 问题
        if (!decompressed) {
            console.log('Trying Zlib (Pako/fflate)...');

            // 关键修复：如果文件被错误地以 UTF-8 编码保存，我们需要逆向这个过程
            // file.text() 会把二进制当作 UTF-8 解码，我们需要提取原始字节值
            console.log('Attempting UTF-8 Mojibake fix...');
            const utf8Text = text; // 已经从 file.text() 读取
            const recoveredBytes = new Uint8Array(utf8Text.length);
            for (let i = 0; i < utf8Text.length; i++) {
                recoveredBytes[i] = utf8Text.charCodeAt(i) & 0xFF;
            }
            console.log('Recovered bytes header:', recoveredBytes.slice(0, 10));

            // 尝试用恢复的字节进行解压
            try {
                console.log('Trying pako.inflate on recovered bytes...');
                const inflated = pako.inflate(recoveredBytes);
                const decoder = new TextDecoder('utf-8');
                decompressed = decoder.decode(inflated);
                compressionType = 'pako-mojibake-fix';
                console.log('Pako inflate (Mojibake fix) success!');
            } catch (e_mojibake: any) {
                console.log('Pako inflate (Mojibake fix) failed:', e_mojibake.message);

                // 也尝试 fflate
                try {
                    console.log('Trying fflate.inflateSync on recovered bytes...');
                    const inflated = fflate.inflateSync(recoveredBytes);
                    const decoder = new TextDecoder('utf-8');
                    decompressed = decoder.decode(inflated);
                    compressionType = 'fflate-mojibake-fix';
                    console.log('fflate inflate (Mojibake fix) success!');
                } catch (e_fflate_moji: any) {
                    console.log('fflate inflate (Mojibake fix) failed:', e_fflate_moji.message);
                }
            }
        }

        // 3. 如果 Mojibake 修复失败，尝试原始二进制解压
        if (!decompressed) {
            console.log('Trying raw binary Zlib (Pako/fflate)...');
            try {
                const buffer = await file.arrayBuffer();
                const uint8Array = new Uint8Array(buffer);
                console.log('Buffer header:', uint8Array.slice(0, 10));

                // 优先尝试 fflate (通常更宽容)
                try {
                    console.log('Trying fflate.unzip...');
                    // fflate.unzip 自动检测 GZIP/Zlib
                    const inflated = fflate.unzipSync(uint8Array);
                    const decoder = new TextDecoder('utf-8');
                    decompressed = decoder.decode(inflated);
                    compressionType = 'fflate';
                    console.log('fflate unzip success');
                } catch (e_fflate) {
                    console.log('fflate unzip failed:', e_fflate);

                    // 尝试 fflate.inflate (强制 Zlib)
                    try {
                        console.log('Trying fflate.inflateSync...');
                        const inflated = fflate.inflateSync(uint8Array);
                        const decoder = new TextDecoder('utf-8');
                        decompressed = decoder.decode(inflated);
                        compressionType = 'fflate';
                        console.log('fflate inflate success');
                    } catch (e_fflate_inf) {
                        console.log('fflate inflate failed:', e_fflate_inf);
                        throw e_fflate_inf; // Throw to trigger Pako fallback
                    }
                }

            } catch (e: any) {
                console.log('fflate failed, trying Pako:', e);

                // Pako Fallback
                try {
                    const buffer = await file.arrayBuffer(); // Re-read buffer as it might have been consumed by fflate
                    const uint8Array = new Uint8Array(buffer);
                    const inflated = pako.inflate(uint8Array);
                    const decoder = new TextDecoder('utf-8');
                    decompressed = decoder.decode(inflated);
                    compressionType = 'pako';
                    console.log('Pako inflate success');
                } catch (e_pako) {
                    console.log('Pako inflate failed:', e_pako);

                    // Pako Raw Fallback
                    try {
                        const buffer = await file.arrayBuffer(); // Re-read buffer as it might have been consumed
                        const uint8Array = new Uint8Array(buffer);
                        const rawBuffer = uint8Array.slice(2);
                        const inflated = pako.inflateRaw(rawBuffer);
                        const decoder = new TextDecoder('utf-8');
                        decompressed = decoder.decode(inflated);
                        compressionType = 'pako-raw';
                        console.log('Pako inflateRaw success');
                    } catch (e_pako_raw) {
                        console.log('Pako inflateRaw failed:', e_pako_raw);

                        // Pako ungzip fallback
                        try {
                            const buffer = await file.arrayBuffer(); // Re-read buffer as it might have been consumed
                            const uint8Array = new Uint8Array(buffer);
                            const inflated = pako.ungzip(uint8Array, { to: 'string' });
                            decompressed = inflated;
                            compressionType = 'pako-gzip';
                            console.log('Pako ungzip success');
                        } catch (e3) {
                            console.log('Pako ungzip failed:', e3);
                        }
                    }
                }
            }
        }

        // 3. 如果都失败，尝试直接解析 JSON (未压缩)
        if (!decompressed) {
            console.log('Trying raw JSON...');
            try {
                JSON.parse(text);
                decompressed = text;
                compressionType = 'none';
                console.log('Raw JSON parse success');
            } catch (e: any) {
                console.log('Raw JSON parse failed:', e.message);
            }
        }

        if (!decompressed) {
            throw new Error('Failed to decompress save file. Unknown compression format.');
        }

        // 4. 解析 JSON
        const saveData = JSON.parse(decompressed);

        // 调试：显示 gold 相关字段
        console.log('Parsed party._gold:', saveData.party?._gold);
        console.log('Parsed party.gold:', saveData.party?.gold);
        console.log('Parsed party keys:', saveData.party ? Object.keys(saveData.party).filter((k: string) => k.toLowerCase().includes('gold')) : 'no party');

        // 保存压缩类型以便重新打包时使用
        (saveData as any)._compressionType = compressionType;

        // 5. 提取核心字段
        return {
            gold: saveData.party?._gold ?? saveData.party?.gold ?? 0,
            level: saveData.actors?._data?.[1]?._level ?? saveData.actors?._data?.[1]?.level ?? 1,
            variables: saveData.variables || {},
            switches: saveData.switches || [],
            items: saveData.party?._items ?? saveData.party?.items ?? {},
            party: saveData.party,
            actors: saveData.actors,
            system: saveData.system,
            ...saveData // 保留原始数据以便完全恢复
        };
    } catch (error) {
        console.error('Parse error:', error);
        throw new Error('Invalid RPG Maker MV/MZ save file');
    }
}

/**
 * 生成修改后的存档
 */
export async function buildRPGMakerMV(
    originalFile: File,
    modifiedData: any
): Promise<Blob> {
    // 只重新解析原始文件以获取压缩类型
    // 用户的 modifiedData 已经包含了所有修改
    const parsed = await parseRPGMakerMV(originalFile);
    const compressionType = (parsed as any)._compressionType || 'lzstring';

    console.log('Building with compression type:', compressionType);
    console.log('modifiedData.party._gold:', modifiedData?.party?._gold);
    console.log('modifiedData.party.gold:', modifiedData?.party?.gold);

    // 使用用户修改后的完整数据
    // 移除我们在 parseRPGMakerMV 返回值中添加的所有便捷字段
    // 这些字段是派生的，不属于原始 JSON 结构
    const saveData = JSON.parse(JSON.stringify(modifiedData)); // Deep clone
    delete saveData._compressionType;
    delete saveData.gold;     // 这是我们添加的便捷字段
    delete saveData.level;    // 这是我们添加的便捷字段
    // 注意：variables, switches, items, party, actors, system 这些来自原始 saveData，应该保留
    // 但如果原始 JSON 没有顶层的 items 字段，我们需要删除它
    // 为了安全起见，让我们只保留原始 RPG Maker 存档应该有的字段
    // RPG Maker MV/MZ 存档通常只有 party, actors, variables, switches 等标准字段

    console.log('saveData keys before serialize:', Object.keys(saveData));
    console.log('saveData.party._gold:', saveData?.party?._gold);

    // 1. 序列化为 JSON
    const json = JSON.stringify(saveData);
    console.log('JSON length:', json.length, 'First 200 chars:', json.substring(0, 200));

    // 2. 根据原始压缩类型进行压缩
    let output: Blob;

    if (compressionType === 'pako-mojibake-fix' || compressionType === 'fflate-mojibake-fix') {
        // 特殊处理：需要逆向 UTF-8 Mojibake 编码
        // 流程：JSON -> Zlib 压缩 -> 每个字节当作 Latin-1 字符 -> 形成字符串
        // 然后浏览器保存时会自动用 UTF-8 编码这个字符串，从而产生 Mojibake
        const encoder = new TextEncoder();
        const jsonBytes = encoder.encode(json);

        // 使用 level: 1 (fastest) 来匹配原始文件的 78 01 头部
        const compressed = pako.deflate(jsonBytes, { level: 1 });

        console.log('Compressed bytes header:', compressed.slice(0, 10));
        console.log('Compressed total length:', compressed.length);

        // 把每个压缩后的字节当作 Latin-1 字符，形成一个字符串
        // 这样当浏览器以 UTF-8 保存这个字符串时，就会产生原始文件的 Mojibake 格式
        let latin1String = '';
        for (let i = 0; i < compressed.length; i++) {
            latin1String += String.fromCharCode(compressed[i]);
        }

        console.log('Latin1 string first 10 charCodes:', [...latin1String.slice(0, 10)].map(c => c.charCodeAt(0)));

        // 保存为一个文本 Blob，浏览器会用 UTF-8 编码它
        output = new Blob([latin1String], { type: 'text/plain;charset=utf-8' });
    } else if (compressionType === 'pako' || compressionType === 'fflate') {
        // 标准 Zlib 压缩（二进制输出）
        const compressed = pako.deflate(json);
        output = new Blob([compressed], { type: 'application/octet-stream' });
    } else if (compressionType === 'none') {
        output = new Blob([json], { type: 'application/json' });
    } else {
        // Default to LZString
        const compressed = LZString.compressToBase64(json);
        output = new Blob([compressed], { type: 'text/plain' });
    }

    return output;
}

