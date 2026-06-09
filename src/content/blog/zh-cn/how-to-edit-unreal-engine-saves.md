---
title: "Unreal Engine 存档编辑指南 (.sav) - GVAS 格式完整教程"
description: "面向 Unreal Engine 4/5 `.sav` 的兼容性指南。重点讲解 GVAS 的安全解析流程，以及何时应切换到游戏专用工具。"
pubDate: 2026-01-05
updatedDate: 2026-03-12
tags: ["unreal-engine", "gvas", "guide", "palworld", "hogwarts-legacy"]
author: "Paradox"
image: "/images/blog/unreal-cover.webp"
---

> **兼容性说明（2026年2月）：** 当前在线编辑器优先支持**标准、未加密 GVAS**。部分游戏特定容器或压缩变体会进入只读，或暂不支持安全重建。

## 简介

![Unreal Engine 存档编辑器界面](/images/blog/unreal-content.webp)

Unreal Engine 是常见的高规格游戏引擎之一，被 AAA 工作室和独立开发者广泛使用。像**幻兽帕鲁**、**霍格沃茨之遗**、**幸福工厂**和**深岩银河**等游戏都使用 Unreal Engine，并以专有的二进制格式存储存档数据。

如果您希望查看 Unreal 存档结构并在兼容文件中谨慎修改，本指南会给出一套可落地流程。与简单 JSON/XML 不同，UE 存档需要专门解析器。我们的网页编辑器优先处理标准 GVAS，在无法安全重建时会自动转入只读。

## 什么是 GVAS 格式？

Unreal Engine 使用一种名为 **GVAS**（Game Variable Archive Save，游戏变量存档保存）的二进制序列化格式来存储存档文件。这些文件通常具有 `.sav` 扩展名。

GVAS 文件包含：

*   **头部**：魔术字节（`GVAS`）、存档游戏版本、引擎版本和自定义版本数据。
*   **属性**：类型化属性的层级结构（IntProperty、StrProperty、ArrayProperty、StructProperty 等）。
*   **尾部**：可选的校验和或填充。

因为它是二进制的，您不能简单地在记事本中打开 `.sav` 文件。您需要一个理解 GVAS 结构的解析器。

## 使用 GVAS 存档的常见游戏

| 游戏 | 存档位置 | 备注 |
|---|---|---|
| **幻兽帕鲁** | `%LocalAppData%\Pal\Saved\SaveGames\` | 复杂的嵌套结构 |
| **霍格沃茨之遗** | `%LocalAppData%\Hogwarts Legacy\Saved\SaveGames\` | 标准 UE5 格式 |
| **幸福工厂** | `%LocalAppData%\FactoryGame\Saved\SaveGames\` | 非常大的文件 |
| **深岩银河** | `%LocalAppData%\FSD\Saved\SaveGames\` | 玩家进度 |
| **双人成行** | Steam 云存档文件夹 | 合作存档数据 |

## 步骤 1：定位您的存档文件

大多数 Unreal Engine 游戏将存档存储在：

```
%LocalAppData%\[游戏名]\Saved\SaveGames\
```

例如，幻兽帕鲁的存档位于：
```
C:\Users\[您的用户名]\AppData\Local\Pal\Saved\SaveGames\[SteamID]\
```

您将看到 `Level.sav`、`Players\[玩家ID].sav` 等文件。

## 步骤 2：创建备份

**关键**：编辑前务必复制您的 `.sav` 文件。二进制文件是不可原谅的——一个错误的字节就可能损坏整个存档。

创建一个名为 `Backups` 的文件夹，在继续之前将存档文件复制到那里。

## 步骤 3：上传到在线编辑器

1.  导航到我们的 [Unreal Engine 存档编辑器](/zh-cn/editor/unreal)。
2.  拖放您的 `.sav` 文件。
3.  等待 GVAS 解析器处理文件。

我们的编辑器会优先尝试将标准 GVAS 解析为可导航的 JSON。若遇到自定义容器或加密，通常会切换为只读或安全失败。

## 步骤 4：导航和编辑属性

解析后，您将看到所有属性的层级视图：

### 要查找的常见属性：

*   **Inventory（物品栏）**：通常是包含物品 ID 和数量的 ArrayProperty。
*   **PlayerStats（玩家状态）**：包含生命值、耐力、等级等的 StructProperty。
*   **Currency/Money（货币/金钱）**：名称类似 `Gold`、`Credits` 或 `Money` 的 IntProperty。
*   **Unlocks（解锁）**：跟踪已解锁物品/能力的 BoolProperty 或 ArrayProperty。

点击属性可展开并编辑其值。对于数值属性，只需更改数字。对于字符串，您可以修改文本值。

### 示例：编辑幻兽帕鲁的帕鲁数据

幻兽帕鲁将捕获的帕鲁存储为复杂的嵌套结构。要修改帕鲁：

1.  导航到 `CharacterSaveParameterMap`。
2.  通过其内部 ID 找到您的帕鲁。
3.  展开其属性以找到等级、属性、技能。
4.  按需修改数值。

## 步骤 5：下载并替换

1.  若编辑器显示为可编辑兼容模式，再点击**下载修改后的存档**。
2.  工具会尝试根据你的修改重建二进制 GVAS。
3.  若当前为只读模式，请改用游戏专用工具。
4.  仅在完成备份并验证后再替换原文件。

## 故障排除

### 编辑器显示"GVAS 解析失败"
*   某些游戏使用修改过的 GVAS 格式，带有自定义压缩或加密。
*   如果可用，尝试使用该游戏的社区特定工具。

### 编辑后存档损坏
*   恢复您的备份。
*   确保您只更改了值，而不是属性名称或类型。
*   某些游戏会重新计算校验和；它们可能拒绝被篡改的存档。

### 加载后值被重置
*   游戏可能有服务器端验证（在多人模式中常见）。
*   某些值是在加载时从其他值派生的（例如，从等级计算最大生命值）。

## 替代工具

如果在线编辑器不支持您的特定游戏，请考虑以下替代方案：

*   **uesave-rs**：一个基于 Rust 的命令行工具，可以将 `.sav` 转换为 `.json` 并转回来。
*   **Palworld Save Tools**：专门用于幻兽帕鲁存档的社区工具。
*   **UAssetGUI**：用于编辑其他 Unreal Engine 资产文件。

## 常见问题

**问：使用这个安全吗？**
答：主编辑流程会在浏览器内解析兼容文件。

**问：这适用于多人游戏存档吗？**
答：对于您作为主机的合作游戏，通常可以。对于专用服务器游戏，存档通常在服务器端且无法访问。

**问：我可以在平台之间转移存档吗？**
答：GVAS 格式是跨平台的，但游戏可能嵌入了平台特定的数据。转移是可能的，但不能保证。

**问：如果我的游戏使用自定义存档格式怎么办？**
答：如果它不是标准 GVAS，您可能需要游戏特定的模组工具。

## 结语

编辑 Unreal 存档的关键不只是“能不能改”，而是先判断是否属于可安全重建的结构。标准 GVAS 可在网页端处理；遇到容器化或重封装受限的变体，应切换到对应游戏专用工具。

记住：始终备份您的存档，永远不要在多人/竞技游戏中不公平地编辑，祝您改装愉快！

## 延伸阅读

- 📖 [幻兽帕鲁存档编辑指南](/zh-cn/blog/palworld-save-editing-guide) - 专门的帕鲁教程
- 📖 [uesave-rs on GitHub](https://github.com/trumank/uesave-rs) - 开源 GVAS 解析器
- 🎮 [幻兽帕鲁游戏页面](/zh-cn/games/palworld) - 存档位置和可编辑项
- 📂 [常见存档扩展名详解](/zh-cn/blog/common-save-file-extensions-explained) - 了解各种格式
- 🔧 [Unreal 编辑器](/zh-cn/editor/unreal) - 本指南使用的工具

---

*最后更新：2026年1月*

### 相关文章

- [幻兽帕鲁存档编辑指南](/zh-cn/blog/palworld-save-editing-guide)
- [常见存档文件扩展名详解](/zh-cn/blog/common-save-file-extensions-explained)
