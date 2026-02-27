---
title: '各大引擎兼容性矩阵'
subtitle: '目前支持的引擎和格式的概述。'
---

## 通用格式

| 格式 | 扩展名 | 说明 |
|---|---|---|
| JSON | `.json` / `.sav` | 结构化文本。被许多游戏引擎和网页游戏使用。 |
| XML | `.xml` | 基于标签的文本格式。在 Flash 游戏和较早的游戏中很常见。 |
| INI | `.ini` | 简单的键值对配置文件。常用于小规模的独立游戏。 |

## RPG Maker (RPG制作大师) 系列

| 引擎 | 稳定性 | 测试过的游戏示例 | 备注 |
|---|---|---|---|
| RPG Maker MV / MZ | 🟢 高 | Omori, OneShot, Lisa | `rpgsave` 是经过 LZString 压缩的 JSON。 |
| RPG Maker XP / VX | 🔴 不支持 | To the Moon | 由于在浏览器端进行安全且准确的反序列化存在困难，目前暂不支持 `rxdata` 和 `rvdata2` (Ruby Marshal Data)。 |

## Ren'Py

| 引擎 | 稳定性 | 备注 |
|---|---|---|
| Ren'Py | 🟡 中 | 解析复杂的 Python Pickles（zlib压缩）。由于高度依赖变量类型，修改值的结构可能会导致游戏损坏。 |

## Unity

| 引擎 | 稳定性 | 备注 |
|---|---|---|
| Unity PlayerPrefs | 🟢 高 | 基于浏览器的游戏，或使用 PlayerPrefs 的 PC/移动端游戏。 |
| Unity BinaryFormatter | 🟡 中 | 对一些常见的复杂类型支持有限。计划在未来的更新中进行改进。 |

## Unreal Engine (虚幻引擎)

| 引擎 / 格式 | 稳定性 | 备注 |
|---|---|---|
| 标准 GVAS | 🟢 高 | 支持未压缩的标准 Unreal Save Game 属性（如霍格沃茨之遗、幻兽帕鲁等游戏）。 |
| 压缩 GVAS | 🟡 中 | 自动检测并解压 zlib 压缩（例如：深岩银河）。但因为目前无法保证能安全地重新构建打包为游戏可识别的存档，因此以“只读”模式呈现。 |

## GameMaker

| 格式 | 稳定性 | 备注 |
|---|---|---|
| INI / 纯文本 | 🟢 高 | 自动检测并展开 `ds_map` 转储或 INI 存档的结构。如果是 Base64 编码，会进行解码显示（例如：传说之下 (Undertale)）。 |

## NaniNovel (VNDS)

| 格式 | 稳定性 | 备注 |
|---|---|---|
| Nanonovel Save (`.nson`) | 🟢 高 | Unity NaniNovel 引擎的 JSON 序列化格式。 |
