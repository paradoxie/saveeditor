---
title: "Unity PlayerPrefs 和 XML 存档编辑指南 - 完整教程"
description: "完整的 Unity 游戏存档修改指南，适用于 Android、iOS 和 PC。学习如何编辑任何 Unity 游戏的 PlayerPrefs、XML、JSON 和 Plist 文件。"
pubDate: 2026-01-04
tags: ["unity", "guide", "tutorial", "playerprefs"]
author: "SaveEditor Team"
image: "/images/blog/unity-cover.webp"
---

## 简介

![Unity 存档编辑器界面](/images/blog/unity-content.webp)

Unity 是世界上最流行的游戏引擎，为超过 50% 的移动游戏和大量 PC 及主机独立游戏提供支持。如果您想修改 Unity 游戏中的进度——无论是解锁关卡、添加货币还是只是进行实验——本指南将教您需要知道的一切。

与某些使用单一存档格式的引擎不同，Unity 游戏可以用多种不同的方式存储数据。最常见的方法包括：

*   **PlayerPrefs**：内置的键值存储系统。
*   **XML 文件**：结构化文本文件，在移动端很常见。
*   **JSON 文件**：人类可读的数据格式。
*   **二进制文件**：自定义序列化数据（较难编辑）。

我们的 **Save Editor Online** 直接在您的浏览器中支持 PlayerPrefs（XML/Plist）、XML 和 JSON 格式。

## 了解 Unity 存档位置

存档文件的位置取决于平台：

### Windows
*   **PlayerPrefs**：存储在 Windows 注册表中 `HKCU\Software\[公司名]\[产品名]`。直接编辑比较困难。
*   **文件**：通常在 `%AppData%\LocalLow\[公司名]\[产品名]\` 或游戏的安装文件夹中。

### Android
*   **PlayerPrefs (XML)**：位于 `/data/data/[包名]/shared_prefs/[包名].v2.playerprefs.xml`。
*   需要 root 权限或 ADB 才能获取。

### iOS / macOS
*   **PlayerPrefs (Plist)**：以 `.plist` 文件形式存储在应用容器中。
*   在 macOS 上，通常在 `~/Library/Preferences/`。

### Steam 云存档
*   某些游戏会将存档同步到 Steam 云端。编辑前可能需要禁用云同步。

## 步骤 1：定位并提取存档文件

### Android（已 Root）：
1.  使用具有 root 权限的文件管理器（例如 Solid Explorer）。
2.  导航到 `/data/data/[包名]/shared_prefs/`。
3.  将 `.xml` 文件复制到您可以访问的位置（例如 Download 文件夹）。

### Android（未 Root，使用 ADB）：
1.  在手机上启用开发者模式。
2.  通过 USB 连接并运行：`adb backup -f backup.ab [包名]`
3.  使用 `android-backup-extractor` 等工具提取备份。

### PC：
1.  导航到游戏的存档文件夹（参见上面的位置）。
2.  将存档文件复制到安全的位置。

## 步骤 2：创建备份

编辑前，**务必**创建存档文件的备份副本。命名为类似 `savegame.xml.backup` 的名称。

## 步骤 3：上传到在线编辑器

1.  前往我们的 [Unity 编辑器](/zh-cn/editor/unity)。
2.  拖放您的 `.xml`、`.plist` 或 `.json` 文件。
3.  等待解析完成。

编辑器将显示存档文件中所有键和值的树状视图。

## 步骤 4：修改数值

Unity PlayerPrefs 通常以描述性的键名存储简单值：

*   `PlayerLevel`（整数）
*   `Coins` 或 `Gold`（整数）
*   `UnlockedLevels`（字符串，通常以逗号分隔）
*   `SoundEnabled`（整数，0 或 1）

点击一个值进行编辑。将 `Coins` 从 `500` 改为 `99999` 可以给自己几乎无限的货币。

### 处理复杂数据
某些游戏将复杂数据作为序列化的 JSON 字符串存储在单个 PlayerPrefs 键中。在这种情况下：
1.  找到该键（例如 `SaveData`）。
2.  复制该值。
3.  粘贴到 JSON 格式化工具中使其可读。
4.  编辑您想要的值。
5.  将修改后的 JSON 粘贴回去。

## 步骤 5：下载并替换

1.  点击**下载修改后的存档**。
2.  将文件传回其原始位置：
    *   在 Android 上，使用文件管理器或 ADB 的 `push` 命令。
    *   在 PC 上，直接复制并替换。
3.  启动游戏并验证您的更改。

## 故障排除

### 游戏重置了我的更改
*   游戏可能正在与服务器同步。尝试在离线模式下游玩。
*   某些游戏使用校验和验证存档数据。这些较难绕过，需要更高级的技术。

### 文件格式看起来不对
*   确保您正在编辑正确的文件。Unity 游戏可以有多个存档文件。
*   如果文件是二进制/加密的，我们的编辑器可能显示原始数据。寻找不同的存档机制。

### Android：权限被拒绝
*   您需要 root 权限或必须使用 ADB 才能访问 `shared_prefs` 文件夹。

## 常见问题

**问：这适用于所有 Unity 游戏吗？**
答：适用于使用 PlayerPrefs（XML/Plist）或标准 JSON/XML 存档的游戏。具有自定义二进制格式或加密的游戏可能不受支持。

**问：编辑存档会导致我被封禁吗？**
答：对于单机游戏，不会。对于有在线组件的游戏，如果服务器检测到不一致，修改存档可能导致封禁。在线游戏请自行承担风险。

**问：我可以用这种方式解锁内购吗？**
答：如果游戏在本地存储 IAP 状态，可能可以。但是，服务器验证的购买无法绕过。

**问：Android 需要 root 权限吗？**
答：对于大多数 PlayerPrefs 编辑，需要。或者，您可以使用 ADB 备份而无需 root。

## 高级：编辑 Windows 注册表中的 PlayerPrefs

对于将 PlayerPrefs 存储在 Windows 注册表中的游戏：

1.  按 `Win+R`，输入 `regedit`，按回车。
2.  导航到 `HKEY_CURRENT_USER\Software\[公司名]\[产品名]`。
3.  您将看到名称类似 `Coins_h[哈希码]` 的键。值是二进制的。
4.  使用 PlayerPrefs 专用工具或手动解码二进制数据。

这比基于文件的存档更复杂，但使用正确的工具是可能的。

## 结语

编辑 Unity 存档的难度从非常简单（简单的 XML 文件）到相当困难（加密的二进制数据）不等。我们的免费在线编辑器自动处理常见情况，让您在几秒钟内修改游戏进度。始终备份您的存档，享受增强的游戏体验！

## 延伸阅读

- 📖 [Unity PlayerPrefs 官方文档](https://docs.unity3d.com/ScriptReference/PlayerPrefs.html) - Unity 官方文档
- 🎮 [星露谷物语游戏页面](/zh-cn/games/stardew-valley) - 热门 Unity 游戏
- 📂 [常见存档扩展名详解](/zh-cn/blog/common-save-file-extensions-explained) - 了解各种格式
- 🔧 [Unity 编辑器](/zh-cn/editor/unity) - 本指南使用的工具
- 🎭 [Unreal Engine 存档指南](/zh-cn/blog/how-to-edit-unreal-engine-saves) - 另一款流行引擎

---

*最后更新：2026年1月*

### 相关文章

- [常见存档文件扩展名详解](/zh-cn/blog/common-save-file-extensions-explained)
- [Unreal Engine 存档编辑](/zh-cn/blog/how-to-edit-unreal-engine-saves)

