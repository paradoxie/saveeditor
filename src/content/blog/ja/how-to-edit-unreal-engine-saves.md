---
title: "Unreal Engineのセーブファイル(.sav)を編集する方法 - 完全GVASガイド"
description: "Unreal Engine 4/5 の `.sav` 向け互換性重視ガイド。GVAS 解析の安全な進め方と、専用ツールへ切り替える判断基準を解説します。"
pubDate: 2026-01-05
tags: ["Unreal Engine", "GVAS", "ガイド", "Palworld", "Hogwarts Legacy"]
author: "SaveEditor Team"
lang: "ja"
image: "/images/blog/unreal-cover.webp"
---

> **対応状況（2026年2月）：** 現在のWebエディタは**標準・非暗号化GVAS**を優先対応しています。ゲーム固有の圧縮/コンテナ形式は読み取り専用または未対応になる場合があります。

## はじめに

![Unreal Engineセーブエディタインターフェース](/images/blog/unreal-content.webp)

Unreal Engineは世界で最も強力なゲームエンジンの一つで、AAAスタジオからインディー開発者まで幅広く使用されています。**Palworld**、**Hogwarts Legacy**、**Satisfactory**、**Deep Rock Galactic**などのゲームはすべてUnreal Engineを使用し、独自のバイナリ形式でセーブデータを保存しています。

Unreal Engineゲームのセーブを確認し、互換ファイルを慎重に編集したい場合に、このガイドは実運用フローを示します。単純なJSONやXMLとは異なり、UEセーブには専用パーサーが必要です。私たちのWebエディタは標準GVASを優先し、安全な再構築が難しい場合は読み取り専用に切り替えます。

## GVAS形式とは？

Unreal Engineはセーブファイルに**GVAS**（Game Variable Archive Save）と呼ばれるバイナリシリアライズ形式を使用します。これらのファイルは通常`.sav`という拡張子を持ちます。

GVASファイルには以下が含まれます：

*   **ヘッダー**: マジックバイト（`GVAS`）、セーブゲームバージョン、エンジンバージョン、カスタムバージョンデータ。
*   **プロパティ**: 型付きプロパティの階層構造（IntProperty、StrProperty、ArrayProperty、StructPropertyなど）。
*   **フッター**: オプションのチェックサムまたはパディング。

バイナリなので、`.sav`ファイルをメモ帳で開くことはできません。GVAS構造を理解するパーサーが必要です。

## GVASセーブを使用する一般的なゲーム

| ゲーム | セーブ場所 | 備考 |
|---|---|---|
| **Palworld** | `%LocalAppData%\Pal\Saved\SaveGames\` | 複雑なネスト構造 |
| **Hogwarts Legacy** | `%LocalAppData%\Hogwarts Legacy\Saved\SaveGames\` | 標準UE5形式 |
| **Satisfactory** | `%LocalAppData%\FactoryGame\Saved\SaveGames\` | 非常に大きなファイル |
| **Deep Rock Galactic** | `%LocalAppData%\FSD\Saved\SaveGames\` | プレイヤー進行状況 |

## ステップ1: セーブファイルを探す

ほとんどのUnreal Engineゲームは以下にセーブを保存します：

```
%LocalAppData%\[GameName]\Saved\SaveGames\
```

例えば、Palworldのセーブは以下にあります：
```
C:\Users\[YourName]\AppData\Local\Pal\Saved\SaveGames\[SteamID]\
```

`Level.sav`、`Players\[PlayerID].sav`などのファイルが見つかります。

## ステップ2: バックアップを作成

**重要**: 編集前に必ず`.sav`ファイルをコピーしてください。バイナリファイルは容赦がありません。1バイトでも間違えるとセーブ全体が破損する可能性があります。

`Backups`というフォルダを作成し、進める前にセーブファイルをそこにコピーしてください。

## ステップ3: オンラインエディタにアップロード

1.  [Unreal Engineセーブエディタ](/ja/editor/unreal)にアクセスします。
2.  `.sav`ファイルをドラッグ＆ドロップします。
3.  GVASパーサーがファイルを処理するまで待ちます。

私たちのエディタは標準GVASの解析を優先し、可能な場合にJSONツリーとして表示します。ゲーム固有の圧縮・コンテナ形式では読み取り専用になる場合があります。

## ステップ4: プロパティをナビゲートして編集

解析されると、すべてのプロパティの階層ビューが表示されます：

### 探すべき一般的なプロパティ：

*   **Inventory**: アイテムIDと数量を含むArrayProperty。
*   **PlayerStats**: 体力、スタミナ、レベルなどを含むStructProperty。
*   **Currency/Money**: `Gold`、`Credits`、`Money`などの名前のIntProperty。
*   **Unlocks**: アンロックされたアイテム/能力を追跡するBoolPropertyまたはArrayProperty。

プロパティをクリックして展開し、値を編集します。数値プロパティの場合は、単に数字を変更します。文字列の場合は、テキスト値を変更できます。

## ステップ5: ダウンロードして置き換え

1.  エディタが互換モード（編集可能）を表示した場合のみ、**変更したセーブをダウンロード**をクリックします。
2.  ツールは変更内容からGVASの再構築を試みます。
3.  読み取り専用モードの場合は、ゲーム専用ツールを使用してください。
4.  バックアップ確認後にのみ元ファイルを置き換えてください。

## トラブルシューティング

### エディタが「GVAS解析に失敗しました」と表示する
*   一部のゲームは、カスタム圧縮または暗号化を使用した変更されたGVAS形式を使用しています。
*   そのゲーム専用のコミュニティツールがあれば試してください。

### 編集後にセーブが破損する
*   バックアップを復元してください。
*   値のみを変更し、プロパティ名やタイプは変更していないことを確認してください。
*   一部のゲームはチェックサムを再計算します。改ざんされたセーブを拒否する場合があります。

### ロード後に値がリセットされる
*   ゲームにサーバー側の検証がある可能性があります（マルチプレイヤーモードで一般的）。
*   一部の値はロード時に他の値から導出されます（例：レベルからの最大HP）。

## 代替ツール

オンラインエディタが特定のゲームをサポートしていない場合、これらの代替手段を検討してください：

*   **uesave-rs**: `.sav`を`.json`に変換してまた戻すことができるRustベースのコマンドラインツール。
*   **Palworld Save Tools**: Palworldセーブ専用のコミュニティツール。
*   **UAssetGUI**: 他のUnreal Engineアセットファイルを編集するため。

## よくある質問

**Q: これは安全に使用できますか？**
A: はい。すべての解析はブラウザ内で行われます。ファイルがサーバーにアップロードされることはありません。

**Q: マルチプレイヤーセーブで動作しますか？**
A: ホストであるCo-opセーブの場合、多くの場合はい。専用サーバーゲームの場合、セーブは通常サーバー側にあり、アクセスできません。

**Q: プラットフォーム間でセーブを転送できますか？**
A: GVAS形式はクロスプラットフォームですが、ゲームがプラットフォーム固有のデータを埋め込んでいる場合があります。転送は可能ですが保証されません。

**Q: ゲームがカスタムセーブ形式を使用している場合は？**
A: 標準GVASでない場合は、ゲーム固有のModdingツールが必要になる場合があります。

## まとめ

Unreal Engineセーブ編集では、GVASの互換境界を理解することが重要です。標準GVASはWebエディタで扱い、コンテナ化や再構築不可のケースはゲーム専用ツールへ切り替えるのが安全です。

覚えておいてください：常にセーブをバックアップし、マルチプレイヤー/競争ゲームを不公平に編集せず、楽しいModdingを！

## 関連リソース

- 📖 [Palworld セーブ編集ガイド](/ja/blog/palworld-save-editing-guide) - 専用Palworldチュートリアル
- 📖 [uesave-rs on GitHub](https://github.com/trumank/uesave-rs) - オープンソースGVASパーサー
- 📂 [一般的なセーブファイル拡張子の解説](/ja/blog/common-save-file-extensions-explained) - 各種フォーマットを理解
- 🔧 [Unreal エディタ](/ja/editor/unreal) - 本ガイドで使用したツール

---

*最終更新：2026年1月*

### 関連記事

- [Palworld セーブ編集ガイド](/ja/blog/palworld-save-editing-guide)
- [一般的なセーブファイル拡張子の解説](/ja/blog/common-save-file-extensions-explained)
