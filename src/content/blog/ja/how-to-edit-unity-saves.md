---
title: "Unity PlayerPrefsとXMLセーブの編集方法 - 完全ガイド"
description: "Android、iOS、PCのUnityゲームのセーブファイルを編集する完全ガイド。PlayerPrefs、XML、JSON、Plistファイルの編集方法を詳しく解説。"
pubDate: 2025-10-15
tags: ["Unity", "ガイド", "チュートリアル", "PlayerPrefs"]
author: "SaveEditor Team"
lang: "ja"
image: "/images/blog/unity-cover.webp"
---

## はじめに

![Unityセーブエディタインターフェース](/images/blog/unity-content.webp)

Unityは世界で最も人気のあるゲームエンジンで、全モバイルゲームの50%以上、そしてPC・コンソールの膨大な数のインディータイトルを動かしています。Unityゲームの進行状況を変更したいと思ったことがあるなら—レベルのアンロック、通貨の追加、または単に実験するため—このガイドで必要な知識をすべて教えます。

他のエンジンが単一のセーブ形式を使用するのとは異なり、Unityゲームはさまざまな方法でデータを保存できます。最も一般的な方法は：

*   **PlayerPrefs**: 組み込みのキーバリューストレージシステム。
*   **XMLファイル**: 構造化されたテキストファイル、モバイルで一般的。
*   **JSONファイル**: 人間が読めるデータ形式。
*   **バイナリファイル**: カスタムシリアライズされたデータ（編集が難しい）。

私たちの**Save Editor Online**は、PlayerPrefs（XML/Plist）、XML、JSON形式をブラウザ内で直接サポートしています。

## Unityセーブの保存場所を理解する

セーブファイルの場所はプラットフォームによって異なります：

### Windows
*   **PlayerPrefs**: `HKCU\Software\[CompanyName]\[ProductName]`のWindowsレジストリに保存されます。直接編集するのは面倒です。
*   **ファイル**: 多くの場合`%AppData%\LocalLow\[CompanyName]\[ProductName]\`またはゲームのインストールフォルダにあります。

### Android
*   **PlayerPrefs（XML）**: `/data/data/[package.name]/shared_prefs/[package.name].v2.playerprefs.xml`にあります。
*   取得にはroot権限またはADBが必要です。

### iOS / macOS
*   **PlayerPrefs（Plist）**: アプリのコンテナ内に`.plist`ファイルとして保存されます。
*   macOSでは、多くの場合`~/Library/Preferences/`にあります。

### Steam Cloud
*   一部のゲームはセーブをSteam Cloudに同期します。編集前にクラウド同期を無効にする必要がある場合があります。

## ステップ1: セーブファイルを見つけて抽出

### Android（Root権限あり）：
1.  rootファイルエクスプローラーを使用します（例：root権限付きのSolid Explorer）。
2.  `/data/data/[package.name]/shared_prefs/`に移動します。
3.  `.xml`ファイルをアクセスできる場所にコピーします（例：ダウンロードフォルダ）。

### Android（Root権限なし、ADB使用）：
1.  スマートフォンで開発者モードを有効にします。
2.  USB経由で接続し、以下を実行：`adb backup -f backup.ab [package.name]`
3.  `android-backup-extractor`などのツールでバックアップを抽出します。

### PC：
1.  ゲームのセーブフォルダに移動します（上記の場所を参照）。
2.  セーブファイルを安全な場所にコピーします。

## ステップ2: バックアップを作成

編集前に、**必ず**セーブファイルのバックアップコピーを作成してください。`savegame.xml.backup`のような名前を付けます。

## ステップ3: オンラインエディタにアップロード

1.  [Unityエディタ](/ja/editor/unity)にアクセスします。
2.  `.xml`、`.plist`、または`.json`ファイルをドラッグ＆ドロップします。
3.  解析が完了するまで待ちます。

エディタはセーブファイル内のすべてのキーと値のツリービューを表示します。

## ステップ4: 値を変更

Unity PlayerPrefsは通常、説明的なキー名で単純な値を保存します：

*   `PlayerLevel`（int）
*   `Coins`または`Gold`（int）
*   `UnlockedLevels`（文字列、多くの場合カンマ区切り）
*   `SoundEnabled`（int、0または1）

値をクリックして編集します。`Coins`を`500`から`99999`に変更すると、ほぼ無限の通貨が得られます。

### 複雑なデータの操作
一部のゲームは、単一のPlayerPrefsキー内にシリアライズされたJSON文字列として複雑なデータを保存します。この場合：
1.  キーを見つけます（例：`SaveData`）。
2.  値をコピーします。
3.  JSONフォーマッターに貼り付けて読みやすくします。
4.  変更したい値を編集します。
5.  変更したJSONを貼り付け直します。

## ステップ5: ダウンロードして置き換え

1.  **変更したセーブをダウンロード**をクリックします。
2.  ファイルを元の場所に転送します：
    *   Androidでは、ファイルマネージャーまたはADB `push`コマンドを使用します。
    *   PCでは、単にコピーして置き換えます。
3.  ゲームを起動して変更を確認します。

## トラブルシューティング

### ゲームが変更をリセットする
*   ゲームがサーバーと同期している可能性があります。オフラインモードでプレイしてみてください。
*   一部のゲームはチェックサムでセーブデータを検証します。これらはバイパスが難しく、より高度な技術が必要です。

### ファイル形式がおかしい
*   正しいファイルを編集していることを確認してください。Unityゲームには複数のセーブファイルがある場合があります。
*   ファイルがバイナリ/暗号化されている場合、エディタは生データを表示する可能性があります。別のセーブメカニズムを探してください。

### Android: 権限が拒否される
*   `shared_prefs`フォルダにアクセスするにはroot権限が必要か、ADBを使用する必要があります。

## よくある質問

**Q: すべてのUnityゲームで動作しますか？**
A: PlayerPrefs（XML/Plist）または標準のJSON/XMLセーブを使用するゲームで動作します。カスタムバイナリ形式または暗号化を使用するゲームはサポートされない場合があります。

**Q: セーブを編集するとBANされますか？**
A: シングルプレイヤーゲームでは、いいえ。オンラインコンポーネントを持つゲームでは、サーバーが不整合を検出した場合、BANになる可能性があります。オンラインゲームでは自己責任で使用してください。

**Q: この方法でアプリ内購入をアンロックできますか？**
A: ゲームがIAPステータスをローカルに保存している場合は可能です。ただし、サーバー検証された購入はバイパスできません。

**Q: AndroidでRoot権限は必要ですか？**
A: ほとんどのPlayerPrefs編集には、はい。代わりに、Root権限なしでADBバックアップを使用できます。

## 上級編: WindowsレジストリのPlayerPrefsを編集

Windowsレジストリに PlayerPrefs を保存するゲームの場合：

1.  `Win+R`を押し、`regedit`と入力してEnterを押します。
2.  `HKEY_CURRENT_USER\Software\[CompanyName]\[ProductName]`に移動します。
3.  `Coins_h[hashcode]`のような名前のキーが表示されます。値はバイナリです。
4.  PlayerPrefs専用ツールを使用するか、バイナリデータを手動でデコードします。

これはファイルベースのセーブより複雑ですが、適切なツールがあれば可能です。

## まとめ

Unityセーブの編集は、非常に簡単（単純なXMLファイル）から非常に難しい（暗号化されたバイナリデータ）まで様々です。私たちの無料オンラインエディタは一般的なケースを自動的に処理し、数秒でゲームの進行状況を変更できます。常にセーブをバックアップし、強化されたゲーム体験をお楽しみください！

## 関連リソース

- 📖 [Unity PlayerPrefs 公式ドキュメント](https://docs.unity3d.com/ScriptReference/PlayerPrefs.html) - 公式ドキュメント
- 🎮 [Stardew Valley ゲームページ](/ja/games/stardew-valley) - 人気Unityゲーム
- 📂 [一般的なセーブファイル拡張子の解説](/ja/blog/common-save-file-extensions-explained) - 各種フォーマットを理解
- 🔧 [Unity エディタ](/ja/editor/unity) - 本ガイドで使用したツール
- 🎭 [Unreal Engine セーブガイド](/ja/blog/how-to-edit-unreal-engine-saves) - 別の人気エンジン

---

*最終更新：2025年12月*

### 関連記事

- [一般的なセーブファイル拡張子の解説](/ja/blog/common-save-file-extensions-explained)
- [Unreal Engine セーブ編集](/ja/blog/how-to-edit-unreal-engine-saves)

