---
title: "Unreal Engineのセーブファイル(.sav)を編集する方法 - 完全GVASガイド"
description: "Unreal Engine 4および5のセーブファイルを編集する包括的なガイド。GVASフォーマットを解析し、Palworld、Hogwarts Legacy、Satisfactoryなどのゲームを編集する方法を学びます。"
pubDate: 2026-01-05
tags: ["Unreal Engine", "GVAS", "ガイド", "Palworld", "Hogwarts Legacy"]
author: "SaveEditor Team"
lang: "ja"
image: "/images/blog/unreal-cover.webp"
---

## はじめに

![Unreal Engineセーブエディタインターフェース](/images/blog/unreal-content.webp)

Unreal Engineは世界で最も強力なゲームエンジンの一つで、AAAスタジオからインディー開発者まで幅広く使用されています。**Palworld**、**Hogwarts Legacy**、**Satisfactory**、**Deep Rock Galactic**などのゲームはすべてUnreal Engineを使用し、独自のバイナリ形式でセーブデータを保存しています。

Unreal Engineゲームでインベントリを編集したり、リソースを増やしたり、機能をアンロックしたい場合、このガイドでプロセスを順を追って説明します。単純なJSONやXMLファイルとは異なり、UEセーブは解析に専門的なツールが必要です。それがまさに私たちの**Save Editor Online**が提供するものです。

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

私たちのエディタはブラウザ互換のGVASパーサーを使用して、バイナリデータをナビゲート可能なJSONツリーに変換します。

## ステップ4: プロパティをナビゲートして編集

解析されると、すべてのプロパティの階層ビューが表示されます：

### 探すべき一般的なプロパティ：

*   **Inventory**: アイテムIDと数量を含むArrayProperty。
*   **PlayerStats**: 体力、スタミナ、レベルなどを含むStructProperty。
*   **Currency/Money**: `Gold`、`Credits`、`Money`などの名前のIntProperty。
*   **Unlocks**: アンロックされたアイテム/能力を追跡するBoolPropertyまたはArrayProperty。

プロパティをクリックして展開し、値を編集します。数値プロパティの場合は、単に数字を変更します。文字列の場合は、テキスト値を変更できます。

## ステップ5: ダウンロードして置き換え

1.  **変更したセーブをダウンロード**をクリックします。
2.  エディタが変更を加えたバイナリGVASファイルを再構築します。
3.  セーブフォルダ内の元のファイルを置き換えます。
4.  ゲームを起動してセーブをロードします！

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

Unreal Engineセーブの編集にはGVASバイナリ形式の理解が必要ですが、適切なツールがあれば完全に達成可能です。Palworldでレアアイテムをスポーンさせたい場合でも、Hogwarts Legacyでステータスを最大にしたい場合でも、単にゲームメカニクスを実験したい場合でも、私たちの無料オンラインエディタで誰でもアクセスできるようになります。

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

