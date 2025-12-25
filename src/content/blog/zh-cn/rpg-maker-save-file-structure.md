---
title: "RPG Maker 存档文件结构详解 - MV、MZ、VX Ace 完全指南"
description: "全面了解 RPG Maker 存档文件结构。学习 .rpgsave、.rmmzsave、.rvdata2 格式及其数据存储方式。适合存档编辑和游戏开发。"
pubDate: 2025-12-25
tags: ["rpg-maker", "rpgsave", "guide", "technical"]
author: "SaveEditor Team"
image: "/images/blog/rpg-maker-cover.webp"
---

## 简介

RPG Maker 数十年来一直在赋能游戏创作者，从 MV 和 MZ 到 VX Ace 及更早的版本。无论你是想编辑存档的玩家，还是调试游戏的开发者，了解 **RPG Maker 存档文件结构** 都至关重要。

本指南详细解析 RPG Maker 如何存储存档数据、每个属性的含义，以及如何使用我们的免费 **RPG Maker 存档编辑器** 安全地编辑这些文件。

## 各版本存档格式

| 引擎 | 扩展名 | 格式 | 加密 |
|------|--------|------|------|
| **RPG Maker MZ** | .rmmzsave | JSON (Base64) | 可选 |
| **RPG Maker MV** | .rpgsave | JSON (Base64 + LZString) | 可选 |
| **RPG Maker VX Ace** | .rvdata2 | Ruby Marshal | 无 |
| **RPG Maker VX** | .rvdata | Ruby Marshal | 无 |
| **RPG Maker XP** | .rxdata | Ruby Marshal | 无 |

## RPG Maker MV/MZ 存档结构

MV 和 MZ 存档是最常见且最容易编辑的，它们使用 Base64 编码的 JSON。

### 基本结构

```json
{
  "system": { ... },
  "screen": { ... },
  "timer": { ... },
  "switches": { ... },
  "variables": { ... },
  "selfSwitches": { ... },
  "actors": { ... },
  "party": { ... },
  "map": { ... },
  "player": { ... }
}
```

### 关键属性解析

#### 1. 队伍数据 (`party`)
包含核心游戏状态：

```json
{
  "_gold": 5000,
  "_steps": 12345,
  "_items": { "1": 10, "2": 5 },
  "_weapons": { "1": 1 },
  "_armors": { "1": 1 },
  "_actors": [1, 2, 3, 4]
}
```

- `_gold`：队伍金钱
- `_steps`：步数计数器
- `_items`：物品 ID → 数量映射
- `_weapons`/`_armors`：装备背包
- `_actors`：队伍中角色 ID 顺序

#### 2. 角色数据 (`actors`)
单个角色的属性：

```json
{
  "_hp": 500,
  "_mp": 100,
  "_level": 25,
  "_exp": { "1": 50000 },
  "_skills": [1, 2, 3, 10, 15],
  "_equips": [1, 0, 1, 0, 0],
  "_name": "勇者",
  "_class": 1
}
```

#### 3. 开关 (`switches`)
控制游戏事件的布尔标志：

```json
{
  "1": true,    // 例如："见过国王"
  "2": false,
  "10": true    // 例如："Boss 已击败"
}
```

#### 4. 变量 (`variables`)
游戏逻辑的数值：

```json
{
  "1": 500,     // 例如："任务进度"
  "2": 10,      // 例如："收集的物品"
  "5": 99       // 例如："隐藏计数器"
}
```

## 存档文件位置

### RPG Maker MV/MZ（桌面版）
```
[游戏文件夹]/www/save/
[游戏文件夹]/save/
```

文件命名为 `file1.rpgsave`、`file2.rpgsave` 等。

### RPG Maker MV/MZ（浏览器版）
存档存储在浏览器 `localStorage` 中：
```
RPG [游戏标题]
```

### RPG Maker VX Ace
```
[游戏文件夹]/Save/
```

文件为 `Save01.rvdata2`、`Save02.rvdata2` 等。

## 如何编辑 RPG Maker 存档

### 方法 1：在线编辑器（推荐）

1. 打开我们的 [RPG Maker 存档编辑器](/zh-cn/editor/rpg-maker-mv)
2. 上传你的 `.rpgsave` 或 `.rmmzsave` 文件
3. 在可视化界面中编辑数值
4. 下载并替换原始文件

### 方法 2：手动编辑（高级）

对于 MV/MZ 文件：

1. 用文本编辑器打开文件
2. 复制 Base64 字符串
3. 使用 Base64 解码器解码
4. 对于 MV：使用 LZString 解压
5. 编辑 JSON
6. 反向执行上述过程

我们的在线编辑器自动处理所有这些步骤！

## 常见编辑

### 添加最大金币
将 `party._gold` 设置为你想要的数量（通常最大值为 99999999）。

### 全角色满级
对于 `actors` 中的每个角色，将 `_level` 设置为最大值并相应调整 `_exp`。

### 解锁所有技能
将技能 ID 添加到每个角色的 `_skills` 数组中。

### 完成所有任务
找到相关的开关或变量，将它们设置为"已完成"状态。

### 添加任意物品
在 `party._items` 中添加物品 ID 和数量的条目。

## 故障排除

### "存档文件损坏"错误
- 编辑时 JSON 结构被破坏
- 恢复备份并尝试进行更小的修改
- 使用我们的在线编辑器避免 JSON 语法错误

### 更改未在游戏中显示
- 确保你编辑的是正确的存档槽位
- 某些数值有缓存；可能需要切换地图或重启
- 检查游戏是否启用了加密

## 延伸阅读

通过以下相关指南扩展你的 RPG Maker 知识：

- 📖 [RPG Maker 存档编辑教程](/zh-cn/blog/how-to-edit-rpg-maker-save) - 逐步编辑教程
- 📂 [常见存档扩展名解释](/zh-cn/blog/common-save-file-extensions-explained) - 了解 .rpgsave、.sav 等格式
- 🔧 [RPG Maker 编辑器](/zh-cn/editor/rpg-maker-mv) - 在线编辑工具
- 🎭 [Ren'Py 存档编辑指南](/zh-cn/blog/renpy-save-editing-guide) - 另一个流行的视觉小说引擎

## 总结

了解 **RPG Maker 存档文件结构** 能让你调试游戏、恢复丢失的进度，或者按自己的方式享受游戏。无论是添加金币、满级角色还是解锁内容，我们的免费 **RPG Maker 存档编辑器** 都能让操作安全又简单。

**准备好编辑了吗？** [打开 RPG Maker 存档编辑器 →](/zh-cn/editor/rpg-maker-mv)

---

*最后更新：2025年12月*

### 相关文章

- [RPG Maker 存档编辑教程](/zh-cn/blog/how-to-edit-rpg-maker-save)
- [常见存档文件扩展名详解](/zh-cn/blog/common-save-file-extensions-explained)
- [GameMaker 存档编辑指南](/zh-cn/blog/gamemaker-save-editing-guide)

