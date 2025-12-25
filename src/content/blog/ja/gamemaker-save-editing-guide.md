---
title: "GameMaker セーブ編集ガイド：INI・JSONファイル完全解説"
description: "GameMaker Studioのセーブファイル編集をマスター。Undertale、Deltaruneなどのゲームで、INI設定やJSONセーブの変更方法を詳しく解説。"
pubDate: 2025-12-08
tags: ["gamemaker", "undertale", "guide", "tutorial", "ini", "json"]
author: "SaveEditor Team"
image: "/images/blog/gamemaker-cover.webp"
---

## GameMakerセーブファイルの概要

![GameMakerセーブエディタ・インターフェース](/images/blog/gamemaker-content.webp)

**GameMaker Studio**（GMS）は、2Dゲームで最も人気のあるエンジンの一つで、**Undertale**、**Deltarune**、**Hotline Miami**、**Hyper Light Drifter**など、数え切れないほどのインディーヒット作を支えています。

統一されたセーブシステムを持つエンジンとは異なり、GameMakerは開発者にデータ保存方法の完全な自由を与えています。そのためセーブ形式は様々ですが、ほとんどは当エディタが完全サポートするいくつかの共通カテゴリに分類されます。

## 一般的なGameMakerセーブ形式

### 1. INIファイル（最も一般的）

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

**INIを使用するゲーム**: Undertale（PC版）、Deltarune Chapter 1

### 2. JSONファイル

最新のGameMakerゲームはより複雑なデータにJSONを使用：

```json
{
  "player": {
    "name": "Kris",
    "hp": 100,
    "items": ["healing_item", "weapon_01"]
  },
  "chapter": 2
}
```

**JSONを使用するゲーム**: Deltarune Chapter 2、新しいGMS2タイトル

## GameMakerセーブファイルの場所

### Windows

ほとんどのGameMakerゲームはセーブを以下に保存：

```
%LocalAppData%\[ゲーム名]\
```

例：
- **Undertale**: `%LocalAppData%\UNDERTALE\`
- **Deltarune**: `%LocalAppData%\DELTARUNE\`

### macOS

```
~/Library/Application Support/[ゲーム名]/
```

## Undertaleセーブ編集ガイド

最も有名なGameMakerゲームとして、Undertaleは特別な注目に値します：

### ファイル構造

| ファイル | 目的 |
|----------|------|
| `file0` | メインセーブデータ（拡張子なし、INI形式） |
| `file8` | 永続データ（Floweyの記憶） |
| `undertale.ini` | システムデータ（fun値、設定） |

### file0の主要変数

```ini
[General]
Name="Frisk"        ; プレイヤー名
Love=1              ; LV（暴力のレベル）
HP=20               ; 現在のHP
MaxHP=20            ; 最大HP
Gold=100            ; お金
EXP=0               ; 経験値
Room=12             ; 現在のルームID

[Kills]
kills=0             ; 総キル数（ルートに影響）
```

### ルートの変更

ルートを切り替えるには、複数の変数を変更する必要があります：

#### 平和ルートの前提条件
```ini
kills=0
Toriel_state=1
Papyrus_state=1
Undyne_state=1
```

## ステップバイステップ編集ガイド

### ステップ1: 場所を特定してバックアップ

1. ゲームのセーブフォルダに移動
2. **編集前に必ずバックアップを作成**

### ステップ2: エディタにアップロード

1. [GameMakerエディタ](/ja/editor/gamemaker)にアクセス
2. セーブファイル（`.ini`、`.json`）をアップロード
3. エディタが自動的に形式を検出

### ステップ3: 変更を加える

INIファイルの場合、階層ビューが表示されます：
- セクション（例：`[player]`、`[flags]`）
- 各セクション下のキー・値ペア

### ステップ4: ダウンロードして置換

1. **変更したセーブをダウンロード**をクリック
2. 元のファイルを置換
3. ゲームを起動して変更を確認

## トラブルシューティング

### 「セーブデータが破損しています」エラー

**原因**:
- 無効なINI構文（引用符、括弧の欠落）
- データ型の変更
- 必須セクションの削除

**解決策**: バックアップから復元して小さな変更を加える

### 変更が保存されない

**考えられる問題**:
1. **Steamクラウド**: ローカルの変更を上書き
2. **読み取り専用ファイル**: ファイル権限を確認
3. **間違ったファイル**: 一部のゲームには複数のセーブファイルがある

## 関連エディタ

- [Unityセーブエディタ](/ja/editor/unity) – Unityベースのゲーム用
- [RPG Makerエディタ](/ja/editor/rpg-maker-mv) – RPGツクールタイトル用
- [Ren'Pyビューア](/ja/editor/renpy) – ビジュアルノベル用

## まとめ

GameMakerの柔軟性は、セーブ編集には一つの方法ですべてに対応できるわけではありませんが、最も一般的な形式（INIとJSON）は当エディタで十分サポートされています。

問題が発生したり改善提案がある場合は、[お問い合わせ](/ja/contact)ください。編集をお楽しみください！

## 関連リソース

- 📖 [Undertale Wiki - セーブファイル](https://undertale.fandom.com/wiki/SAVE) - Undertaleコミュニティドキュメント
- 🎮 [Undertale ゲームページ](/ja/games/undertale) - セーブ場所と編集可能項目
- 📂 [一般的なセーブファイル拡張子の解説](/ja/blog/common-save-file-extensions-explained) - 各種フォーマットを理解
- 🔧 [GameMaker エディタ](/ja/editor/gamemaker) - 本ガイドで使用したツール
- 🎭 [RPGツクール セーブ編集ガイド](/ja/blog/how-to-edit-rpg-maker-save) - 別の人気インディーエンジン

---

*最終更新：2025年12月*

### 関連記事

- [一般的なセーブファイル拡張子の解説](/ja/blog/common-save-file-extensions-explained)
- [RPGツクール セーブ編集](/ja/blog/how-to-edit-rpg-maker-save)
- [Undertale セーブ場所](/ja/games/undertale)

