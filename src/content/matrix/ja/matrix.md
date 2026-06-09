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
| RPG Maker XP / VX / VX Ace | 🟡 限定安定 | To the Moon, LISA: The Painful | `.rxdata`、`.rvdata`、`.rvdata2` の一般項目に限り編集できます。ゴールド、アイテム、変数、スイッチ、アクター値に対応し、独自Rubyオブジェクトや構造変更はブロックします。 |
| RPG Maker 2000 / 2003 | 🟡 安定・限定 | 古い RPG_RT ゲーム | `.lsd` はゴールド、アイテム、アクターのレベル/EXP/HP/MP、変数、スイッチを LCF チャンク保持で限定書き戻しできます。不明チャンクは保持します。 |

## Ren'Py

| エンジン | 安定性 | 備考 |
|---|---|---|
| Ren'Py | 🟡 限定安定 | `.save` を表示し、`persistent` 内の単純な文字列・数値・真偽値のみ保存できます。複雑なオブジェクト、非 persistent 状態、構造変更はブロックします。 |

## Unity

| エンジン | 安定性 | 備考 |
|---|---|---|
| Unity PlayerPrefs | 🟢 高 | ブラウザベース、またはPlayerPrefsを使用するPC/モバイルゲーム。 |
| Unity BinaryFormatter | 🟡 中 | いくつかの一般的な複雑な型の限られたサポート。将来のアップデートで改善を予定。 |

## Unreal Engine

| エンジン / フォーマット | 安定性 | 備考 |
|---|---|---|
| 標準 GVAS | 🟢 高 | 未圧縮の标准的な Unreal Save Game のプロパティをサポート（Hogwarts Legacy、Palworld などのゲーム）。 |
| gzip/zlib ラップ GVAS | 🟢 高 | 解凍、編集、元の gzip/zlib ラッパーでの再構築に対応します。その他の独自コンテナは別途、閲覧専用または失敗理由を表示します。 |

## GameMaker

| フォーマット | 安定性 | 備考 |
|---|---|---|
| INI / プレーンテキスト | 🟢 高 | `ds_map` のダンプやINIセーブの構造を自動的に検出して展開。Base64でエンコードされている場合はデコードして表示します（例: Undertale）。 |

## NaniNovel (VNDS)

| フォーマット | 安定性 | 備考 |
|---|---|---|
| Nanonovel Save (`.nson`) | 🟢 高 | Unity NaniNovelエンジン用のJSONのシリアライズ形式。 |

## 汎用競合フォーマット

| 形式 | 安定性 | 備考 |
|---|---|---|
| MessagePack / CBOR / BSON / Pickle / CFG | 🟡 限定安定 | デコード、編集、元コンテナでの再構築に対応。Pickle は単純な JSON 安全値に限定されます。 |
| ZIP / Base64 / LZString / gzip/zlib/deflate/BZip2/LZ4/Zstd ラッパー | 🟡 限定安定 | 内部の JSON/YAML/TOML/properties/CSV/CFG/XML/text を展開、編集、再構築できます。 |
| Flash SOL / SQLite / ES3 / Binary 候補 | 🟡 限定安定 | SOL、SQLite、ES3 は限定的な書き戻しに対応。未知のバイナリは透明な制限表示になります。 |
