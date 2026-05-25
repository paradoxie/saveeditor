import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const roots = ['src/pages', 'src/content', 'src/i18n', 'src/data', 'src/components', 'public'];
const forbidden = [
    /zero risk/i,
    /零风险/,
    /Riesgo Cero/i,
    /リスクゼロ/,
    /ZERO\s*%/,
    /100%\s+(Secure|Safe|Seguro|安全|안전|Безопасно)/i,
    /absolutely safe/i,
    /completely safe/i,
    /绝对安全/,
    /完全安全/,
    /complete privacy/i,
    /your files never leave/i,
    /files never leave/i,
    /never leave your device/i,
    /never uploaded to any server/i,
    /no data is ever uploaded/i,
    /nothing is uploaded/i,
    /world's most trusted/i,
    /100%\s+free/i,
    /completely free/i,
    /プライバシーは完全/,
    /安全な100%/,
    /ファイルはデバイスから離れません/,
    /100%無料/,
    /完全に無料/,
    /无限金币/,
    /文件永不/,
    /永远不会上传到任何服务器/,
    /绝不上传/,
    /完全免费/,
    /最强/,
    /最先进/,
    /資金無限/,
    /unlimited\s+(Gold|resources|Crafting Materials)/i,
    /Safe & Verified/i,
    /最安全/,
    /完全支持/,
    /Ren'Py saves are experimental/i,
    /Ren'Pyセーブは実験的/,
    /Saves Ren'Py são experimentais/i,
    /Ren'Py 세이브는 실험적/,
    /Los guardados de Ren'Py son experimentales/i,
    /Сохранения Ren'Py экспериментальны/i,
    /Ren'Py saves?[^.\n]*read-only/i,
    /Ren'Py 存档[^。\n]*只读/,
    /Ren'Pyセーブ[^。\n]*読み取り専用/,
    /Ren'Py 세이브[^.\n]*읽기 전용/,
    /Ren'Py[^.\n]*только просмотр/i,
    /Ren'Py Viewer/i,
    /Ren'Py 查看器/,
    /Ren'Pyビューア/,
    /Older Ruby Marshal formats \(\.rvdata2\/\.rvdata\/\.rxdata\) are currently not editable/i,
    /旧Ruby Marshal形式 \(\.rvdata2\/\.rvdata\/\.rxdata\) は現在Web版では未対応/,
    /旧版 Ruby Marshal 格式 \(\.rvdata2\/\.rvdata\/\.rxdata\) 目前在网页编辑器中暂不支持/,
    /Formatos Ruby Marshal antigos \(\.rvdata2\/\.rvdata\/\.rxdata\) ainda não são editáveis/i,
    /구형 Ruby Marshal 형식 \(\.rvdata2\/\.rvdata\/\.rxdata\)은 현재 웹 편집에서 지원되지 않습니다/,
    /RPG Maker XP \/ VX \| 🔴 (不支持|非対応|Sin soporte|Sem Suporte|미지원|Не поддерживается)/,
    /Ruby Marshal Data\).*(no son compatibles|não são suportados|지원되지 않습니다|не поддерживаются)/i,
];

async function listFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
        entries.map((entry) => {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) return listFiles(fullPath);
            return /\.(astro|ts|tsx|md)$/.test(entry.name) ? [fullPath] : [];
        })
    );
    return files.flat();
}

async function main() {
    const files = (await Promise.all(roots.map(listFiles))).flat();
    const violations: string[] = [];

    for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        for (const pattern of forbidden) {
            if (pattern.test(content)) {
                violations.push(`${file}: ${pattern}`);
            }
        }
    }

    assert.deepEqual(violations, []);
    console.log('Forbidden claim scan passed.');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
