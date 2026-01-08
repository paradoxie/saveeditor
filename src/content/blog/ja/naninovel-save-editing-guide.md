---
title: "NaniNovel セーブデータ編集ガイド：NSONファイル完全解説"
description: "NaniNovelビジュアルノベルのセーブファイル（.nson）を編集する方法を解説。NSON形式の構造、圧縮アルゴリズム、変数の変更方法、トラブルシューティングまで網羅。"
pubDate: 2026-01-06
tags: ["naninovel", "visual-novel", "guide", "tutorial", "nson"]
author: "SaveEditor Team"
image: "/images/blog/naninovel-cover.webp"
---

## NaniNovelセーブファイルの概要

![NaniNovelセーブエディタ・インターフェース](/images/blog/naninovel-content.webp)

[NaniNovel](https://naninovel.com/)は、Unity ベースの強力なビジュアルノベルエンジンで、インディー開発者やスタジオの間で高い人気を誇っています。通常のUnityセーブとは異なり、NaniNovelは独自の**NSON形式**（`.nson`ファイル）を使用してゲーム状態を保存するため、専門的な処理が必要です。

このガイドでは、ファイル形式の理解から安全なゲーム進行の変更まで、NaniNovelセーブファイルの編集に必要なすべてを解説します。

## NSON ファイル形式の理解

NaniNovelのNSON形式は、基本的に**圧縮されたJSONデータ**です。その特徴を見てみましょう：

### 技術的構造

```
┌─────────────────────────────────┐
│     Raw DEFLATE 圧縮            │
│     （zlibヘッダーなし）          │
├─────────────────────────────────┤
│                                 │
│        JSON ゲーム状態           │
│    - グローバル変数              │
│    - スクリプト位置              │
│    - 選択履歴                   │
│    - 解放コンテンツ              │
│                                 │
└─────────────────────────────────┘
```

### 主な特徴

1. **Raw DEFLATE圧縮**: 標準のzlibとは異なり、ヘッダーなしのRaw DEFLATEを使用
2. **JSONコア**: 基盤となるデータは標準JSON形式で、解凍後は人間が読める
3. **UTF-8エンコーディング**: すべてのテキストはUTF-8形式で保存
4. **暗号化なし**: NaniNovelはデフォルトでセーブファイルを暗号化しない

## NaniNovelセーブの中身

NSONファイルを解凍すると、以下を含む構造化されたJSONオブジェクトが見つかります：

### グローバル状態変数

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

### スクリプト実行状態

- **現在のスクリプト**: 実行中のスクリプトファイル
- **スクリプト行**: 物語内の正確な位置
- **ロールバック履歴**: 元に戻す機能用の以前の状態スタック

### プレイヤーの選択

- **選択履歴**: すべてのプレイヤー決定の記録
- **分岐フラグ**: どのストーリー分岐が訪問されたか
- **解放ギャラリー**: 解放されたCG画像と特典

## ステップバイステップ編集ガイド

### ステップ1: セーブファイルを見つける

NaniNovelのセーブファイルは通常、以下の場所に保存されています：

**Windows:**
```
%AppData%\..\LocalLow\[会社名]\[ゲーム名]\Saves\
```

**macOS:**
```
~/Library/Application Support/[会社名]/[ゲーム名]/Saves/
```

**Linux:**
```
~/.config/unity3d/[会社名]/[ゲーム名]/Saves/
```

### ステップ2: バックアップを作成

変更前に**必ずセーブファイルをバックアップ**してください：

```bash
cp GlobalSaveSlot.nson GlobalSaveSlot.nson.backup
cp SaveSlot0.nson SaveSlot0.nson.backup
```

### ステップ3: エディタにアップロード

1. [NaniNovelセーブエディタ](/ja/editor/naninovel)にアクセス
2. `.nson`ファイルをアップロードエリアにドラッグ＆ドロップ
3. 自動解凍と解析を待つ

エディタはJSON構造をナビゲートしやすいツリービューで表示します。

### ステップ4: 値を変更

一般的な変更には以下が含まれます：

#### 好感度/親密度ポイントの変更

`g_affection_`などのプレフィックスが付いた変数を探します：

```json
"g_affection_character1": 50  →  "g_affection_character1": 100
```

#### 全エンディング解放

エンディングフラグを見つけて`true`に設定：

```json
"g_ending_a_unlocked": false  →  "g_ending_a_unlocked": true
```

#### ゲーム内通貨を追加

通貨変数を見つけます：

```json
"g_coins": 100  →  "g_coins": 99999
```

### ステップ5: ダウンロードして置換

1. **変更したセーブをダウンロード**をクリック
2. 元のファイルを変更版で置き換え
3. ゲームを起動して変更を確認

## 上級者向け: 複数のセーブ形式

NaniNovelはゲーム設定に応じて複数のセーブ形式をサポートしています：

| 形式 | 拡張子 | 圧縮 | サポート |
|------|--------|------|----------|
| NSON（デフォルト） | `.nson` | Raw DEFLATE | ✅ 完全対応 |
| JSON（デバッグ） | `.json` | なし | ✅ 完全対応 |
| Base64 JSON | `.json` | Base64 | ✅ 完全対応 |
| Gzip JSON | `.json` | Gzip | ✅ 完全対応 |

当エディタは4つの形式すべてを自動検出して処理します。

## よくある問題のトラブルシューティング

### セーブファイルが読み込めない

**症状**: ゲームが「破損したセーブ」エラーを表示

**解決策**:
1. 正しいセーブスロットを編集していることを確認
2. JSON構文が有効か確認（コンマや括弧の欠落がないか）
3. バックアップから復元してやり直す

### 変更が反映されない

**症状**: 変更がゲーム内に反映されない

**考えられる原因**:
1. **クラウドセーブの競合**: Steam/Unityクラウド同期を無効化
2. **間違ったファイル**: NaniNovelはグローバル用とスロット用で別ファイルを使用
3. **キャッシュ**: 一部のゲームはセーブデータをメモリにキャッシュ

## 関連ツールとリソース

より高度なセーブ編集のニーズに：

- [Unity PlayerPrefsエディタ](/ja/editor/unity) – 標準Unityセーブを使用するゲーム用
- [Ren'Pyセーブビューア](/ja/editor/renpy) – Pythonベースのビジュアルノベル用
- [セーブファイル拡張子ガイド](/blog/ja/common-save-file-extensions-explained) – すべてのセーブ形式について

## まとめ

NaniNovelのNSON形式は圧縮を使用していますが、その構造を理解すれば基本的にアクセス可能です。当オンラインエディタは解凍と再圧縮の技術的な複雑さを処理し、必要な変更に集中できるようにします。

セーブは必ずバックアップし、問題が発生したりNaniNovelサポートの改善提案がある場合は、[お問い合わせ](/ja/contact)ください。

編集をお楽しみください！

## 関連リソース

- 📖 [NaniNovel 公式ドキュメント](https://naninovel.com/guide/) - 公式ドキュメント
- 🎮 [DDLC ゲームページ](/ja/games/ddlc) - 別の人気ビジュアルノベル
- 📂 [一般的なセーブファイル拡張子の解説](/ja/blog/common-save-file-extensions-explained) - 各種フォーマットを理解
- 🔧 [NaniNovel エディタ](/ja/editor/naninovel) - 本ガイドで使用したツール
- 🎭 [Ren'Py セーブガイド](/ja/blog/renpy-save-editing-guide) - Pythonベースのビジュアルノベルエンジン

---

*最終更新：2026年1月*

### 関連記事

- [Unity PlayerPrefs エディタ](/ja/editor/unity)
- [Ren'Py セーブビューア](/ja/editor/renpy)
- [一般的なセーブファイル拡張子の解説](/ja/blog/common-save-file-extensions-explained)

