---
title: '互換性マトリックス'
subtitle: '現在サポートされているエンジンと形式の概要。'
---

## 汎用フォーマット

| 形式 | 拡張子 | 説明 |
|---|---|---|
| JSON | `.json` / `.sav` | 構造化されたテキスト。多数のゲームエンジンやWebゲームで使用されています。 |
| XML | `.xml` | タグベースのテキスト形式。Flashゲームや古いタイトルで一般的です。 |
| INI | `.ini` | シンプルなキーバリュー設定ファイル。小規模なゲームでよく使われます。 |

## RPG Maker (RPGツクール) シリーズ

| エンジン | 安定性 | テスト済みのゲーム例 | 備考 |
|---|---|---|---|
| RPG Maker MV / MZ | 🟢 高 | Omori, OneShot, Lisa | `rpgsave` はLZString圧縮されたJSONです。 |
| RPG Maker XP / VX | 🔴 非対応 | To the Moon | `rxdata` および `rvdata2` (Ruby Marshal Data) は、ブラウザでの安全で正確な逆シリアライズが難しいため、現在サポートしていません。 |

## Ren'Py

| エンジン | 安定性 | 備考 |
|---|---|---|
| Ren'Py | 🟡 中 | 複雑なPython Pickles (zlib圧縮) を解析します。変数タイプに大きく依存しているため、値の構造を変更するとゲームが破損する可能性があります。 |

## Unity

| エンジン | 安定性 | 備考 |
|---|---|---|
| Unity PlayerPrefs | 🟢 高 | ブラウザベース、またはPlayerPrefsを使用するPC/モバイルゲーム。 |
| Unity BinaryFormatter | 🟡 中 | いくつかの一般的な複雑な型の限られたサポート。将来のアップデートで改善を予定。 |

## Unreal Engine

| エンジン / フォーマット | 安定性 | 備考 |
|---|---|---|
| 標準 GVAS | 🟢 高 | 未圧縮の标准的な Unreal Save Game のプロパティをサポート（Hogwarts Legacy、Palworld などのゲーム）。 |
| 圧縮 GVAS | 🟡 中 | zlib圧縮（例: Deep Rock Galactic）を自動的に検出し解凍します。ただし、インゲームのセーブを再構築するための安全性がまだ保証されていないため、現在「閲覧のみ」のモードとなります。 |

## GameMaker

| フォーマット | 安定性 | 備考 |
|---|---|---|
| INI / プレーンテキスト | 🟢 高 | `ds_map` のダンプやINIセーブの構造を自動的に検出して展開。Base64でエンコードされている場合はデコードして表示します（例: Undertale）。 |

## NaniNovel (VNDS)

| フォーマット | 安定性 | 備考 |
|---|---|---|
| Nanonovel Save (`.nson`) | 🟢 高 | Unity NaniNovelエンジン用のJSONのシリアライズ形式。 |
