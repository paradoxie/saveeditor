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
| RPG Maker XP / VX / VX Ace | 🟡 有限稳定 | To the Moon, LISA: The Painful | 支持 `.rxdata`、`.rvdata`、`.rvdata2` 的常见字段有限编辑，如金钱、物品、变量、开关和角色数值；自定义 Ruby 对象和结构变更会被拦截。 |
| RPG Maker 2000 / 2003 | 🟡 稳定受限 | 旧版 RPG_RT 游戏 | `.lsd` 支持金币、物品、角色等级/经验/HP/MP、变量、开关的 LCF 分块保守写回；未知分块保持原样。 |

## Ren'Py

| 引擎 | 稳定性 | 备注 |
|---|---|---|
| Ren'Py | 🟡 有限稳定 | 支持查看 `.save`，并允许保存 `persistent` 下的简单字符串、数字和布尔值；复杂对象、非 persistent 状态和结构变更会被拦截。 |

## Unity

| 引擎 | 稳定性 | 备注 |
|---|---|---|
| Unity PlayerPrefs | 🟢 高 | 基于浏览器的游戏，或使用 PlayerPrefs 的 PC/移动端游戏。 |
| Unity BinaryFormatter | 🟡 中 | 对一些常见的复杂类型支持有限。计划在未来的更新中进行改进。 |

## Unreal Engine (虚幻引擎)

| 引擎 / 格式 | 稳定性 | 备注 |
|---|---|---|
| 标准 GVAS | 🟢 高 | 支持未压缩的标准 Unreal Save Game 属性（如霍格沃茨之遗、幻兽帕鲁等游戏）。 |
| gzip/zlib 包裹的 GVAS | 🟢 高 | 支持解包、编辑与按原包装重建。其他自定义容器会单独显示只读或失败原因。 |

## GameMaker

| 格式 | 稳定性 | 备注 |
|---|---|---|
| INI / 纯文本 | 🟢 高 | 自动检测并展开 `ds_map` 转储或 INI 存档的结构。如果是 Base64 编码，会进行解码显示（例如：传说之下 (Undertale)）。 |

## NaniNovel (VNDS)

| 格式 | 稳定性 | 备注 |
|---|---|---|
| Nanonovel Save (`.nson`) | 🟢 高 | Unity NaniNovel 引擎的 JSON 序列化格式。 |

## 通用竞品格式

| 格式 | 稳定性 | 备注 |
|---|---|---|
| MessagePack / CBOR / BSON / Pickle / CFG | 🟡 有限稳定 | 可解码、编辑并按原容器重建；Pickle 仅限简单 JSON 安全值。 |
| ZIP / Base64 / LZString / gzip/zlib/deflate/BZip2/LZ4/Zstd 包装 | 🟡 有限稳定 | 支持内层 JSON/YAML/TOML/properties/CSV/CFG/XML/text 的解包、编辑与重建。 |
| Flash SOL / SQLite / ES3 / Binary 候选 | 🟡 有限稳定 | SOL、SQLite、ES3 支持有限写回；未知二进制仍显示透明限制。 |
