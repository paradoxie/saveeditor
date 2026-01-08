---
title: "RPGツクール セーブファイル構造解説 - MV、MZ、VX Ace ガイド"
description: "RPGツクールのセーブファイル構造を完全解説。.rpgsave、.rmmzsave、.rvdata2 フォーマットとデータ保存方法を学びます。セーブ編集とゲーム開発に最適。"
pubDate: 2026-01-05
tags: ["rpg-maker", "rpgsave", "guide", "technical"]
author: "SaveEditor Team"
image: "/images/blog/rpg-maker-cover.webp"
---

## はじめに

RPGツクールは数十年にわたりゲームクリエイターを支えてきました。MV や MZ から VX Ace や古いバージョンまで。セーブを編集したいプレイヤーでも、ゲームをデバッグしたい開発者でも、**RPGツクールのセーブファイル構造** を理解することは非常に重要です。

このガイドでは、RPGツクールがセーブデータをどのように保存するか、各プロパティの意味、そして無料の **RPGツクール セーブエディタ** を使って安全に編集する方法を詳しく説明します。

## バージョン別セーブフォーマット

| エンジン | 拡張子 | フォーマット | 暗号化 |
|---------|--------|-------------|--------|
| **RPGツクール MZ** | .rmmzsave | JSON (Base64) | オプション |
| **RPGツクール MV** | .rpgsave | JSON (Base64 + LZString) | オプション |
| **RPGツクール VX Ace** | .rvdata2 | Ruby Marshal | なし |

## RPGツクール MV/MZ セーブ構造

MV と MZ のセーブは最も一般的で編集しやすいです。Base64 エンコードされた JSON を使用します。

### 基本構造

```json
{
  "system": { ... },
  "switches": { ... },
  "variables": { ... },
  "actors": { ... },
  "party": { ... },
  "map": { ... },
  "player": { ... }
}
```

### 主要プロパティ解説

#### 1. パーティデータ (`party`)
コアゲーム状態を含みます：

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

- `_gold`：パーティのお金
- `_items`：アイテム ID → 数量マップ
- `_actors`：パーティ内のアクター ID 順序

#### 2. アクターデータ (`actors`)
個々のキャラクターステータス：

```json
{
  "_hp": 500,
  "_mp": 100,
  "_level": 25,
  "_skills": [1, 2, 3, 10, 15],
  "_name": "勇者",
  "_class": 1
}
```

#### 3. スイッチ (`switches`)
ゲームイベントを制御するブールフラグ：

```json
{
  "1": true,    // 例："王様と会った"
  "10": true    // 例："ボス撃破"
}
```

## セーブファイルの場所

### RPGツクール MV/MZ（デスクトップ）
```
[ゲームフォルダ]/www/save/
[ゲームフォルダ]/save/
```

ファイル名は `file1.rpgsave`、`file2.rpgsave` など。

### RPGツクール VX Ace
```
[ゲームフォルダ]/Save/
```

ファイルは `Save01.rvdata2`、`Save02.rvdata2` など。

## RPGツクールセーブの編集方法

### 方法 1：オンラインエディタ（推奨）

1. [RPGツクール セーブエディタ](/ja/editor/rpg-maker-mv) を開く
2. `.rpgsave` または `.rmmzsave` ファイルをアップロード
3. ビジュアルインターフェースで値を編集
4. ダウンロードして元のファイルを置き換え

### 一般的な編集

- **最大ゴールド追加**：`party._gold` を希望の金額に設定
- **全キャラ最大レベル**：各アクターの `_level` を最大に設定
- **全スキル解放**：各アクターの `_skills` 配列にスキル ID を追加

## トラブルシューティング

### 「セーブファイル破損」エラー
- 編集中に JSON 構造が壊れた
- バックアップを復元して小さな変更から試す
- オンラインエディタを使用して JSON 構文エラーを回避

### 変更がゲームに反映されない
- 正しいセーブスロットを編集しているか確認
- 一部の値はキャッシュされている；マップ移動や再起動が必要な場合も
- ゲームに暗号化が有効になっていないか確認

## 関連記事

- 📖 [RPGツクール セーブ編集チュートリアル](/ja/blog/how-to-edit-rpg-maker-save)
- 📂 [一般的なセーブファイル拡張子の説明](/ja/blog/common-save-file-extensions-explained)
- 🔧 [RPGツクール エディタ](/ja/editor/rpg-maker-mv)
- 🎭 [Ren'Py セーブ編集ガイド](/ja/blog/renpy-save-editing-guide)

## まとめ

**RPGツクールのセーブファイル構造** を理解することで、ゲームのデバッグ、失ったプログレスの復旧、または自分なりの方法でゲームを楽しむことができます。ゴールド追加、ステータス最大化、コンテンツ解放など、無料の **RPGツクール セーブエディタ** で安全かつ簡単に行えます。

**編集する準備はできましたか？** [RPGツクール セーブエディタを開く →](/ja/editor/rpg-maker-mv)

---

*最終更新：2026年1月*

### 関連記事

- [RPGツクール セーブ編集チュートリアル](/ja/blog/how-to-edit-rpg-maker-save)
- [一般的なセーブファイル拡張子の解説](/ja/blog/common-save-file-extensions-explained)
- [GameMaker セーブ編集ガイド](/ja/blog/gamemaker-save-editing-guide)

