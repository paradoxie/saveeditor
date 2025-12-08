---
title: "GameMaker 存档编辑指南：INI 和 JSON 文件完全解析"
description: "掌握 GameMaker Studio 存档文件编辑。学习修改 Undertale、Deltarune 等游戏的 INI 配置和 JSON 存档。"
pubDate: 2025-12-08
tags: ["gamemaker", "undertale", "guide", "tutorial", "ini", "json"]
author: "SaveEditor Team"
image: "/images/blog/gamemaker-cover.webp"
---

## GameMaker 存档文件简介

![GameMaker 存档编辑器界面](/images/blog/gamemaker-content.webp)

**GameMaker Studio**（GMS）是最受欢迎的 2D 游戏引擎之一，支撑着 **Undertale**（传说之下）、**Deltarune**、**Hotline Miami**（迈阿密热线）、**Hyper Light Drifter** 等无数独立游戏大作。

与拥有标准化存档系统的引擎不同，GameMaker 给予开发者完全的数据存储自由。这意味着存档格式变化多样，但大多数属于我们编辑器完全支持的几个常见类别。

## 常见 GameMaker 存档格式

### 1. INI 文件（最常见）

GameMaker 中的 `ini_*` 函数因其简单性而非常流行：

```ini
[player]
name="Frisk"
hp=20
maxhp=20
love=1
gold=50

[flags]
met_sans=1
spared_toriel=1
```

**使用 INI 的游戏**：Undertale（PC版）、Deltarune 第一章

### 2. JSON 文件

现代 GameMaker 游戏通常使用 JSON 存储更复杂的数据：

```json
{
  "player": {
    "name": "Kris",
    "hp": 100,
    "items": ["healing_item", "weapon_01"]
  },
  "chapter": 2,
  "choices": {
    "route": "pacifist"
  }
}
```

**使用 JSON 的游戏**：Deltarune 第二章、较新的 GMS2 游戏

### 3. 二进制文件（ds_map_secure）

一些开发者使用 `ds_map_secure_save()` 创建加密的二进制文件，编辑难度较大但并非不可能。

## 查找 GameMaker 存档文件

### Windows 位置

大多数 GameMaker 游戏将存档保存在：

```
%LocalAppData%\[游戏名]\
```

例如：
- **Undertale**：`%LocalAppData%\UNDERTALE\`
- **Deltarune**：`%LocalAppData%\DELTARUNE\`

### Steam 云存档

许多游戏同步到 Steam 云：

```
%ProgramFiles(x86)%\Steam\userdata\[SteamID]\[AppID]\remote\
```

### macOS

```
~/Library/Application Support/[游戏名]/
```

## Undertale 存档编辑指南

作为最著名的 GameMaker 游戏，Undertale 值得特别关注：

### 文件结构

| 文件 | 用途 |
|------|------|
| `file0` | 主存档数据（无扩展名，INI 格式） |
| `file8` | 永久数据（Flowey 的记忆） |
| `file9` | "真正重置"防护数据 |
| `undertale.ini` | 系统数据（fun 值、设置） |

### file0 中的关键变量

```ini
[General]
Name="Frisk"        ; 玩家名
Love=1              ; LV（暴力等级）
HP=20               ; 当前 HP
MaxHP=20            ; 最大 HP
AT=10               ; 攻击力
DF=10               ; 防御力
Gold=100            ; 金钱
EXP=0               ; 经验值
Room=12             ; 当前房间 ID

[Kills]
kills=0             ; 击杀总数（影响路线）
```

### 修改路线

要切换路线，需要修改多个变量：

#### 和平路线前提
```ini
kills=0
killed_flowey=0
Toriel_state=1
Papyrus_state=1
Undyne_state=1
```

#### 屠杀路线指标
```ini
kills=20+           ; 当前区域击杀数
Fun=66              ; 特殊事件值
```

## 分步编辑指南

### 第一步：定位并备份

1. 导航到游戏的存档文件夹
2. **编辑前务必创建备份**：
   ```bash
   cp file0 file0.backup
   cp undertale.ini undertale.ini.backup
   ```

### 第二步：上传到编辑器

1. 访问我们的 [GameMaker 编辑器](/zh-cn/editor/gamemaker)
2. 上传您的存档文件（`.ini`、`.json` 或文本文件）
3. 编辑器将自动检测格式

### 第三步：进行修改

对于 INI 文件，您将看到分层视图：
- 节（如 `[player]`、`[flags]`）
- 每个节下的键值对

对于 JSON 文件，您将看到完整的对象树。

### 第四步：下载并替换

1. 点击**下载修改后的存档**
2. 替换原始文件
3. 启动游戏验证更改

## 高级：Deltarune 编辑

Deltarune 使用更复杂的存档系统：

### 第一章（基于 INI）

与 Undertale 类似但有新变量：
```ini
[Actors]
actor0_Name="Kris"
actor0_HP=100
actor0_MaxHP=100

[Items]
item0="Broken_Key_A"
item1="ReviveMint"
```

### 第二章+（基于 JSON）

使用嵌套对象的 JSON：
```json
{
  "Recruitment": {
    "recruited_tasque_manager": false,
    "recruited_swatchlings": true
  },
  "Snowgrave": {
    "route_active": false,
    "proceed_count": 0
  }
}
```

## 故障排除

### "存档数据损坏"错误

**原因**：
- 无效的 INI 语法（缺少引号、括号）
- 更改了数据类型（需要数字的地方使用了字符串）
- 删除了必需的节

**解决方案**：从备份恢复并进行较小的更改

### 更改未保存

**可能问题**：
1. **Steam 云**：覆盖您的本地更改
2. **只读文件**：检查文件权限
3. **错误的文件**：某些游戏有多个存档文件

### 游戏加载时崩溃

**可能原因**：
- 无效的房间 ID（Room=999 对应不存在的房间）
- 负数 HP 或属性
- 缺少必需变量

## 寻找变量的技巧

当变量名不明显时：

1. **在游戏中做个更改**然后比较存档文件
2. **搜索游戏 Wiki**了解已知变量
3. **寻找模式**：`kills`、`hp`、`gold`、`flags` 是常见名称

## 相关编辑器

根据游戏引擎，您可能还需要：

- [Unity 存档编辑器](/zh-cn/editor/unity) – 用于 Unity 游戏
- [RPG Maker 编辑器](/zh-cn/editor/rpg-maker-mv) – 用于 RPG Maker 游戏
- [Ren'Py 查看器](/zh-cn/editor/renpy) – 用于视觉小说

## 总结

GameMaker 的灵活性意味着存档编辑没有万能方法，但最常见的格式（INI 和 JSON）得到我们编辑器的良好支持。无论您是想解锁 Undertale 的秘密结局还是只是尝试 Deltarune，关键步骤是：

1. **找到**您的存档文件
2. 编辑前**备份**
3. 用我们的工具**谨慎编辑**
4. 在游戏中**测试**您的更改

如果遇到任何不寻常的存档格式或有改进建议，请[联系我们](/zh-cn/contact)。编辑愉快！
