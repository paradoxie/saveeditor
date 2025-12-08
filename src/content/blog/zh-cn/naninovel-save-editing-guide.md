---
title: "NaniNovel 存档编辑指南：.nson 文件完全解析"
description: "学习如何编辑 NaniNovel 视觉小说存档文件（.nson）。全面指南涵盖 NSON 格式结构、压缩算法、变量修改和故障排除技巧。"
pubDate: 2025-12-08
tags: ["naninovel", "visual-novel", "guide", "tutorial", "nson"]
author: "SaveEditor Team"
image: "/images/blog/naninovel-cover.webp"
---

## NaniNovel 存档文件简介

![NaniNovel 存档编辑器界面](/images/blog/naninovel-content.webp)

[NaniNovel](https://naninovel.com/) 是一款基于 Unity 的强大视觉小说引擎，在独立开发者和工作室中广受欢迎。与传统的 Unity 存档不同，NaniNovel 使用其专有的 **NSON 格式**（`.nson` 文件）来存储游戏状态，需要专门的处理方式。

本完整指南将教您关于编辑 NaniNovel 存档文件的一切 —— 从理解文件格式到安全修改游戏进度。

## 理解 NSON 文件格式

NaniNovel 的 NSON 格式本质上是**压缩的 JSON 数据**。以下是其独特之处：

### 技术结构

```
┌─────────────────────────────────┐
│     Raw DEFLATE 压缩            │
│     （无 zlib 头部）             │
├─────────────────────────────────┤
│                                 │
│        JSON 游戏状态             │
│    - 全局变量                   │
│    - 脚本位置                   │
│    - 选择历史                   │
│    - 已解锁内容                 │
│                                 │
└─────────────────────────────────┘
```

### 关键特性

1. **Raw DEFLATE 压缩**：与标准 zlib 不同，NSON 使用不带头部的原始 DEFLATE
2. **JSON 核心**：底层数据是标准 JSON，解压后可读
3. **UTF-8 编码**：所有文本以 UTF-8 格式存储
4. **无加密**：NaniNovel 默认不加密存档文件

## NaniNovel 存档包含什么？

解压 NSON 文件后，您会发现一个结构化的 JSON 对象，包含：

### 全局状态变量

```json
{
  "GlobalState": {
    "variableMap": {
      "g_affection_sarah": 85,
      "g_story_chapter": 3,
      "g_ending_unlocked": true,
      "g_coins": 1500
    }
  }
}
```

### 脚本执行状态

- **当前脚本**：正在执行的脚本文件
- **脚本行号**：叙事中的精确位置
- **回退历史**：用于撤销功能的先前状态堆栈

### 玩家选择

- **选择历史**：所有玩家决定的记录
- **分支标志**：已访问的故事分支
- **已解锁画廊**：已解锁的 CG 图片和额外内容

## 分步编辑指南

### 第一步：定位存档文件

NaniNovel 存档文件通常存储在：

**Windows:**
```
%AppData%\..\LocalLow\[公司名]\[游戏名]\Saves\
```

**macOS:**
```
~/Library/Application Support/[公司名]/[游戏名]/Saves/
```

**Linux:**
```
~/.config/unity3d/[公司名]/[游戏名]/Saves/
```

### 第二步：创建备份

任何修改前，**务必备份存档文件**：

```bash
cp GlobalSaveSlot.nson GlobalSaveSlot.nson.backup
cp SaveSlot0.nson SaveSlot0.nson.backup
```

### 第三步：上传到编辑器

1. 访问我们的 [NaniNovel 存档编辑器](/zh-cn/editor/naninovel)
2. 将您的 `.nson` 文件拖放到上传区域
3. 等待自动解压和解析

编辑器将以易于导航的树形视图显示 JSON 结构。

### 第四步：修改数值

常见修改包括：

#### 修改好感度/亲密度

查找带有 `g_affection_` 等前缀的变量：

```json
"g_affection_character1": 50  →  "g_affection_character1": 100
```

#### 解锁所有结局

找到结局标志并设为 `true`：

```json
"g_ending_a_unlocked": false  →  "g_ending_a_unlocked": true
"g_ending_b_unlocked": false  →  "g_ending_b_unlocked": true
```

#### 增加游戏货币

找到货币变量：

```json
"g_coins": 100  →  "g_coins": 99999
```

### 第五步：下载并替换

1. 点击**下载修改后的存档**
2. 用修改版替换原始文件
3. 启动游戏验证更改

## 高级：多种存档格式

NaniNovel 根据游戏配置支持多种存档格式：

| 格式 | 扩展名 | 压缩方式 | 支持情况 |
|------|--------|----------|----------|
| NSON（默认） | `.nson` | Raw DEFLATE | ✅ 完全支持 |
| JSON（调试） | `.json` | 无 | ✅ 完全支持 |
| Base64 JSON | `.json` | Base64 | ✅ 完全支持 |
| Gzip JSON | `.json` | Gzip | ✅ 完全支持 |

我们的编辑器自动检测并处理所有四种格式。

## 常见问题排查

### 存档文件无法加载

**症状**：游戏显示"存档损坏"错误

**解决方案**：
1. 确保编辑的是正确的存档槽位
2. 验证 JSON 语法有效（无缺失的逗号或括号）
3. 从备份恢复后重试

### 更改未显示

**症状**：修改未在游戏中反映

**可能原因**：
1. **云存档冲突**：禁用 Steam/Unity 云同步
2. **错误文件**：NaniNovel 对全局存档和槽位存档使用不同文件
3. **缓存**：部分游戏将存档数据缓存在内存中

### 变量名未知

**症状**：找不到想要修改的变量

**提示**：
1. 查看游戏文档或社区 Wiki
2. 在游戏中做个更改，然后比较存档文件
3. 变量名通常遵循 `g_[类别]_[名称]` 的模式

## 相关工具和资源

更高级的存档编辑需求：

- [Unity PlayerPrefs 编辑器](/zh-cn/editor/unity) – 用于使用标准 Unity 存档的游戏
- [Ren'Py 存档查看器](/zh-cn/editor/renpy) – 用于基于 Python 的视觉小说
- [存档文件扩展名指南](/blog/zh-cn/common-save-file-extensions-explained) – 了解所有存档格式

## 总结

NaniNovel 的 NSON 格式虽然使用压缩，但只要理解其结构，基本上是可访问的。我们的在线编辑器处理解压和重新压缩的技术复杂性，让您专注于所需的修改。

记得始终备份存档，如果遇到任何问题或有改进 NaniNovel 支持的建议，请[联系我们](/zh-cn/contact)。

祝编辑愉快！
