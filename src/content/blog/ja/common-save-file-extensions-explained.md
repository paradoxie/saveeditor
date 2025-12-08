---
title: "一般的なゲームセーブファイルの拡張子解説 - 完全リファレンス"
description: ".json、.xml、.sav、.rpgsave、.save、.datなど、一般的なゲームセーブファイル形式とその編集方法を理解するための包括的なガイド。"
pubDate: 2025-11-28
tags: ["ガイド", "ファイル形式", "教育", "リファレンス"]
author: "SaveEditor Team"
lang: "ja"
image: "/images/blog/extensions-cover.webp"
---

## はじめに

![一般的なゲームセーブファイルの拡張子](/images/blog/extensions-content.webp)

ゲームのセーブファイルには数十種類の異なる形式があり、それぞれに独自の癖と編集要件があります。扱っているファイル拡張子を理解することは、ゲームセーブの変更を成功させるための第一歩です。

この包括的なガイドでは、遭遇するすべての主要なセーブファイル形式を、単純な人間が読めるテキストファイルから複雑なバイナリ構造まで網羅しています。

## テキストベースの形式（編集が簡単）

### JSON (.json)

**エンジン**: GameMaker、Godot、Unity（カスタム）、多くのインディーゲーム。

JSON（JavaScript Object Notation）は、波括弧とキーバリューペアを使用する人間が読める形式です：

```json
{
  "playerName": "Hero",
  "gold": 5000,
  "level": 25,
  "inventory": ["sword_01", "potion_03"]
}
```

**編集方法**: 任意のテキストエディタ（VS Code、Notepad++）で開きます。値を変更して保存するだけです。構文を壊さないように注意してください（コンマの欠落、閉じていない括弧など）。

**ツール**: [任意のテキストエディタ、または当社の汎用エディタ](/ja/editor/gamemaker)

---

### INI (.ini)

**エンジン**: GameMaker Studio、多くの古いゲーム。

INIファイルは角括弧のセクションとkey=valueペアを使用します：

```ini
[Player]
Name=Hero
Gold=5000

[Settings]
Volume=80
Difficulty=Normal
```

**編集方法**: 非常に簡単です。テキストエディタで開き、値を変更し、保存します。

**ツール**: [任意のテキストエディタ、または当社のGameMakerエディタ](/ja/editor/gamemaker)

---

### XML (.xml, .plist)

**エンジン**: Unity（モバイルでのPlayerPrefs）、多くのクロスプラットフォームゲーム。

XMLはネストされたタグを使用してデータを構造化します：

```xml
<PlayerPrefs>
  <pref name="Coins" type="int">9999</pref>
  <pref name="SoundEnabled" type="int">1</pref>
</PlayerPrefs>
```

**編集方法**: テキストエディタで編集可能ですが、タグ構造に注意してください。閉じタグが欠けているとファイルが壊れます。

**ツール**: [Unityエディタ](/ja/editor/unity)

---

## 圧縮/エンコード形式（中程度の難易度）

### RPG Maker (.rpgsave, .rvdata2)

**エンジン**: RPGツクールMV、MZ（rpgsave）、VX Ace（rvdata2）。

`.rpgsave`ファイルはLZStringで圧縮されたJSONデータです。`.rvdata2`ファイルはRuby Marshal形式を使用します。

解凍しないと、ランダムな文字のように見えます：
```
N4IgLgpgJg5hBOBnEAuGAnGAzA9mKABMQBoRsA...
```

解凍すると、単なるJSONです。

**編集方法**: 解凍、編集、再圧縮するための専用ツールが必要です。

**ツール**: [RPG Makerエディタ](/ja/editor/rpg-maker-mv)

---

### NaniNovel (.nson)

**エンジン**: NaniNovelビジュアルノベルフレームワークを使用するUnityゲーム。

`.nson`ファイルは通常、圧縮またはbase64エンコードされたJSONです。

**編集方法**: 当社のエディタは自動的にエンコーディングを検出し、編集可能なJSONを表示します。

**ツール**: [NaniNovelエディタ](/ja/editor/naninovel)

---

## バイナリ形式（編集が難しい）

### Unreal Engine (.sav)

**エンジン**: Unreal Engine 4 & 5。

GVAS（Game Variable Archive Save）バイナリ形式を使用します。ヘッダー、プロパティツリー、オプションの圧縮が含まれます。

ゲーム例：Palworld、Hogwarts Legacy、Satisfactory、Deep Rock Galactic。

**編集方法**: バイナリをJSONに変換して戻すGVASパーサーが必要です。

**ツール**: [Unreal Engineエディタ](/ja/editor/unreal)

---

### Ren'Py (.save)

**エンジン**: Ren'Pyビジュアルノベルエンジン。

Pythonの`pickle`モジュールを使用してゲーム状態全体をシリアライズします。セキュリティリスクのため安全に変更することが非常に困難です。

ゲーム例：Doki Doki Literature Club、かたわ少女。

**編集方法**: 読み取り専用の閲覧は安全です。変更には慎重な再ピクルまたはゲーム内コンソールの使用が必要です。

**ツール**: [Ren'Pyビューア](/ja/editor/renpy)（読み取り専用）

---

### 汎用バイナリ (.dat, .sav, .bin)

**エンジン**: カスタムエンジン、古いゲーム。

これらのファイルには標準形式がありません。含まれる可能性があるもの：
*   固定サイズのレコード（例：金のために4バイト、レベルのために4バイト）
*   明確なパターンのない様々な構造化されたデータ
*   圧縮または暗号化

**編集方法**: ヘキサエディタ（HxD、010 Editor）を使用します。パターンを探します。多くの場合、ゲーム固有の知識またはコミュニティリサーチが必要です。

**ツール**: ヘキサエディタ（Webベースではない）

---

## プラットフォーム固有の形式

### Windowsレジストリ（PlayerPrefs）

WindowsでのUnityゲームは、PlayerPrefsをレジストリに保存することがよくあります：
```
HKEY_CURRENT_USER\Software\[会社名]\[製品名]
```

値はハッシュベースのキー名とバイナリデータで保存されます。

**編集方法**: `regedit`またはPlayerPrefs専用ツールを使用します。

---

### iOS/macOS .plist

Appleプラットフォームで使用されるProperty Listファイル。XMLまたはバイナリ形式があります。

**編集方法**: XMLの場合、テキストエディタを使用。バイナリの場合、`plutil`で変換：`plutil -convert xml1 file.plist`

---

### SQLite (.db, .sqlite)

一部のゲームはSQLiteデータベースを使用します。

**編集方法**: DB Browser for SQLiteまたは類似のツールを使用します。

---

## クイックリファレンス表

| 拡張子 | 形式タイプ | 難易度 | 当社ツール |
|---|---|---|---|
| `.json` | テキスト（JSON） | 簡単 | [GameMaker](/ja/editor/gamemaker) |
| `.ini` | テキスト（INI） | 簡単 | [GameMaker](/ja/editor/gamemaker) |
| `.xml` | テキスト（XML） | 簡単 | [Unity](/ja/editor/unity) |
| `.plist` | テキスト/バイナリ | 簡単〜中程度 | [Unity](/ja/editor/unity) |
| `.rpgsave` | 圧縮JSON | 中程度 | [RPG Maker](/ja/editor/rpg-maker-mv) |
| `.nson` | エンコードJSON | 中程度 | [NaniNovel](/ja/editor/naninovel) |
| `.sav`（UE） | バイナリ（GVAS） | 難しい | [Unreal](/ja/editor/unreal) |
| `.save`（Ren'Py） | バイナリ（Pickle） | 非常に難しい | [ビューアのみ](/ja/editor/renpy) |
| `.dat`、`.bin` | カスタムバイナリ | 非常に難しい | ヘキサエディタ |

## よくある質問

**Q: セーブファイルの形式を確認するにはどうすればよいですか？**
A: テキストエディタで開きます。読みやすいテキスト/JSON/XMLが表示されたら、テキストベースです。文字化けした文字が表示されたら、バイナリです。

**Q: ここにリストされていない形式の場合はどうすればよいですか？**
A: 当社の汎用エディタで開いてみてください。形式を自動検出する場合があります。それ以外の場合は、ゲーム固有のコミュニティに相談してください。

**Q: すべてのセーブファイルを編集できますか？**
A: ほとんどは技術的に編集可能ですが、暗号化、チェックサム、またはサーバー側の検証を使用するものは編集が実用的ではない場合があります。

**Q: セーブ編集は合法ですか？**
A: 所有するファイルのシングルプレイヤーゲームの場合、はい。オンライン/競争ゲームの変更は利用規約に違反する場合があります。

## まとめ

セーブファイル形式を理解することは、戦いの半分です。単純なJSON、圧縮されたRPG Makerデータ、または複雑なUnreal GVASファイルを扱っているかどうかがわかれば、適切なツールとアプローチを選択できます。

当社のSave Editor Onlineは、ほとんどの一般的な形式を自動的にサポートします。ファイルをアップロードするだけで、残りは私たちにお任せください！

---

*編集を開始: [エディタを選択](/ja)*
