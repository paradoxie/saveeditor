---
title: "游戏存档文件扩展名详解 - 完整参考指南"
description: "全面了解 .json、.xml、.sav、.rpgsave、.save、.dat 等常见游戏存档文件格式及其编辑方法。"
pubDate: 2025-11-28
tags: ["guide", "file-formats", "education", "reference"]
author: "SaveEditor Team"
image: "/images/blog/extensions-cover.webp"
---

## 简介

![常见游戏存档文件扩展名](/images/blog/extensions-content.webp)

游戏存档文件有数十种不同的格式，每种都有其独特的特点和编辑要求。了解您正在处理的文件扩展名是成功修改游戏存档的第一步。

本完整指南涵盖了您会遇到的所有主要存档文件格式，从简单的人类可读文本文件到复杂的二进制结构。

## 文本格式（易于编辑）

### JSON (.json)

**引擎**：GameMaker、Godot、Unity（自定义）、许多独立游戏。

JSON（JavaScript 对象表示法）是一种人类可读的格式，使用花括号和键值对：

```json
{
  "playerName": "Hero",
  "gold": 5000,
  "level": 25,
  "inventory": ["sword_01", "potion_03"]
}
```

**编辑方法**：用任何文本编辑器（VS Code、Notepad++）打开。修改数值，保存即可。只需注意不要破坏语法（缺少逗号、未闭合的括号）。

**工具**：[任何文本编辑器，或我们的通用编辑器](/zh-cn/editor/gamemaker)

---

### INI (.ini)

**引擎**：GameMaker Studio、许多较老的游戏。

INI 文件使用方括号中的节名和键=值对：

```ini
[Player]
Name=Hero
Gold=5000

[Settings]
Volume=80
Difficulty=Normal
```

**编辑方法**：非常简单。用文本编辑器打开，修改数值，保存。

**工具**：[任何文本编辑器，或我们的 GameMaker 编辑器](/zh-cn/editor/gamemaker)

---

### XML (.xml, .plist)

**引擎**：Unity（移动端 PlayerPrefs）、许多跨平台游戏。

XML 使用嵌套标签来组织数据：

```xml
<PlayerPrefs>
  <pref name="Coins" type="int">9999</pref>
  <pref name="SoundEnabled" type="int">1</pref>
</PlayerPrefs>
```

**编辑方法**：可以用文本编辑器编辑，但要注意标签结构。缺少闭合标签会导致文件损坏。

**工具**：[Unity 编辑器](/zh-cn/editor/unity)

---

## 压缩/编码格式（中等难度）

### RPG Maker (.rpgsave, .rvdata2)

**引擎**：RPG Maker MV、MZ（rpgsave）、VX Ace（rvdata2）。

`.rpgsave` 文件是使用 LZString 压缩的 JSON 数据。`.rvdata2` 文件使用 Ruby Marshal 格式。

未解压时，它们看起来像随机字符：
```
N4IgLgpgJg5hBOBnEAuGAnGAzA9mKABMQBoRsA...
```

解压后，它们就是普通的 JSON。

**编辑方法**：需要专门的工具来解压、编辑和重新压缩。

**工具**：[RPG Maker 编辑器](/zh-cn/editor/rpg-maker-mv)

---

### NaniNovel (.nson)

**引擎**：使用 NaniNovel 视觉小说框架的 Unity 游戏。

`.nson` 文件通常是可能被压缩或 base64 编码的 JSON。

**编辑方法**：我们的编辑器会自动检测编码并呈现可编辑的 JSON。

**工具**：[NaniNovel 编辑器](/zh-cn/editor/naninovel)

---

## 二进制格式（编辑困难）

### Unreal Engine (.sav)

**引擎**：Unreal Engine 4 和 5。

使用 GVAS（游戏变量存档保存）二进制格式。包含头部、属性树和可选的压缩。

代表游戏：幻兽帕鲁、霍格沃茨之遗、幸福工厂、深岩银河。

**编辑方法**：需要 GVAS 解析器将二进制转换为 JSON 再转回来。

**工具**：[Unreal Engine 编辑器](/zh-cn/editor/unreal)

---

### Ren'Py (.save)

**引擎**：Ren'Py 视觉小说引擎。

使用 Python 的 `pickle` 模块来序列化整个游戏状态。由于安全风险，很难安全地修改。

代表游戏：心跳文学部、片轮少女。

**编辑方法**：只读查看是安全的。修改需要仔细重新序列化或使用游戏内控制台。

**工具**：[Ren'Py 查看器](/zh-cn/editor/renpy)（只读）

---

### 通用二进制 (.dat, .sav, .bin)

**引擎**：自定义引擎、较老的游戏。

这些文件没有标准格式。它们可能包含：
*   固定大小的记录（例如，4 字节的金币，4 字节的等级）
*   各种结构的数据，没有明确的模式
*   压缩或加密

**编辑方法**：使用十六进制编辑器（HxD、010 Editor）。寻找规律。通常需要游戏特定的知识或社区研究。

**工具**：十六进制编辑器（非网页版）

---

## 平台特定格式

### Windows 注册表 (PlayerPrefs)

Windows 上的 Unity 游戏通常将 PlayerPrefs 存储在注册表中：
```
HKEY_CURRENT_USER\Software\[公司名]\[产品名]
```

值以基于哈希的键名和二进制数据存储。

**编辑方法**：使用 `regedit` 或 PlayerPrefs 专用工具。

---

### iOS/macOS .plist

Apple 平台使用的属性列表文件。可以是 XML 或二进制格式。

**编辑方法**：如果是 XML，使用文本编辑器。如果是二进制，使用 `plutil` 转换：`plutil -convert xml1 file.plist`

---

### SQLite (.db, .sqlite)

一些游戏使用 SQLite 数据库。

**编辑方法**：使用 DB Browser for SQLite 或类似工具。

---

## 快速参考表

| 扩展名 | 格式类型 | 难度 | 我们的工具 |
|---|---|---|---|
| `.json` | 文本 (JSON) | 简单 | [GameMaker](/zh-cn/editor/gamemaker) |
| `.ini` | 文本 (INI) | 简单 | [GameMaker](/zh-cn/editor/gamemaker) |
| `.xml` | 文本 (XML) | 简单 | [Unity](/zh-cn/editor/unity) |
| `.plist` | 文本/二进制 | 简单-中等 | [Unity](/zh-cn/editor/unity) |
| `.rpgsave` | 压缩 JSON | 中等 | [RPG Maker](/zh-cn/editor/rpg-maker-mv) |
| `.nson` | 编码 JSON | 中等 | [NaniNovel](/zh-cn/editor/naninovel) |
| `.sav` (UE) | 二进制 (GVAS) | 困难 | [Unreal](/zh-cn/editor/unreal) |
| `.save` (Ren'Py) | 二进制 (Pickle) | 非常困难 | [仅查看](/zh-cn/editor/renpy) |
| `.dat`, `.bin` | 自定义二进制 | 非常困难 | 十六进制编辑器 |

## 常见问题

**问：我怎么知道我的存档文件是什么格式？**
答：用文本编辑器打开它。如果你看到可读的文本/JSON/XML，它就是文本格式。如果你看到乱码，它就是二进制格式。

**问：如果我的游戏格式不在这里列出怎么办？**
答：尝试在我们的通用编辑器中打开——它可能会自动检测格式。否则，请查阅游戏特定的社区。

**问：所有存档文件都可以编辑吗？**
答：大多数在技术上可以编辑，但有些使用加密、校验和或服务器端验证，使得编辑不切实际。

**问：编辑存档合法吗？**
答：对于您拥有的单机游戏文件，是的。修改在线/竞技游戏可能违反服务条款。

## 结语

了解您的存档文件格式是成功的一半。一旦您知道您是在处理简单的 JSON、压缩的 RPG Maker 数据还是复杂的 Unreal GVAS 文件，您就可以选择正确的工具和方法。

我们的 Save Editor Online 自动支持大多数常见格式——只需上传您的文件，让我们处理其余的事情！

---

*开始编辑：[选择您的编辑器](/zh-cn)*
