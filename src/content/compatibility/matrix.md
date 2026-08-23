## Save Format Compatibility Matrix

| Engine | Format | Level | canView | canEdit | canSave | reasonCode / Limitations | LastValidated |
|---|---|---|---:|---:|---:|---|---|
| RPG Maker MV/MZ | `.rpgsave`, `.rmmzsave` | Stable | Yes | Yes | Yes | `ok` for supported payloads; compression strategy preserved on export. | 2026-02-07 |
| RPG Maker VX/VX Ace/XP | `.rvdata2`, `.rvdata`, `.rxdata` | Stable-limited | Yes | Yes | Yes | `ok`; guarded Ruby Marshal rebuild for common fields such as gold, items, variables, switches, and actor stats. | 2026-05-25 |
| RPG Maker 2000/2003 | `.lsd` | Stable-limited | Yes | Yes | Yes | Gold, items, actor level/EXP/HP/MP, variables, and switches use source-preserving LCF chunk rebuild; unknown chunks are preserved. | 2026-05-25 |
| Unity | `.xml`, `.plist` PlayerPrefs | Stable | Yes | Yes | Yes | `ok`; source key order and source value type are preserved during rebuild. | 2026-02-07 |
| Unity | Binary plist PlayerPrefs (`bplist00`) | Stable-limited | Yes | Yes | Yes | `ok`; binary plist payloads are rebuilt as binary plist. Unknown binary PlayerPrefs remains blocked as `unsupported_binary_playerprefs`. | 2026-06-09 |
| Ren'Py | `.save` | Stable-limited | Yes | Yes | Yes | `ok`; writes restricted to primitive values under `persistent`. | 2026-05-25 |
| Unreal Engine | Standard GVAS `.sav` | Stable | Yes | Yes | Yes | `standard_gvas`. | 2026-02-07 |
| Unreal Engine | Wrapped GVAS (`gzip`/`zlib`) | Stable | Yes | Yes | Yes | `compressed_repackable`; safe recompression supported for `gzip`/`zlib` only. | 2026-02-07 |
| Unreal Engine | Other wrapped/custom `.sav` | Read-only | Yes | No | No | `compressed_readonly`, `unsupported_container`, `decompression_failed`, `decompression_limit`. | 2026-02-07 |
| Palworld | Player `.sav` | Stable/Guarded | Yes | Yes | Yes | Unreal-compatible mode + heuristic quick fields with confidence and ambiguity tracking. | 2026-02-07 |
| Palworld | `Level.sav` (world) | Read-only | Yes | No | No | `world_file_limited`; inspection-first until safe world mapping is available. | 2026-02-07 |
| GameMaker | `.json`, `.ini` | Stable | Yes | Yes | Yes | `ok`; INI comment/section/key order are preserved, with multiline + escape round-trip coverage in parser regressions. Raw fallback uses `raw_fallback` when structured parse fails. | 2026-02-07 |
| NaniNovel | `.nson/.json/base64/gzip/zlib/base64+gzip` | Stable | Yes | Yes | Yes | `ok`; raw-deflate/json/base64/gzip/zlib/base64+gzip wrappers supported. | 2026-02-07 |
| NaniNovel | Encrypted/custom containers | Unsupported | No | No | No | `likely_encrypted_container`, `unsupported_naninovel_wrapper`. | 2026-02-07 |
| Generic structured | `.msgpack`, `.cbor`, `.bson`, `.yaml/.yml`, `.toml`, `.properties/.props/.conf`, `.csv/.tsv`, `.cfg`, `.xml`, `.sol`, `.es3`, `.pkl/.pickle` | Stable-limited | Yes | Yes | Yes | `ok`; structured payloads are rebuilt in the same container. Key-value formats preserve comments and block deletes of existing keys. `.xml` is editable as text in the Generic editor path. `.sol` supports standard Flash SharedObject AMF0 payloads. `.es3` supports unencrypted JSON and gzip JSON containers. `.pkl` export is limited to simple JSON-safe values. | 2026-06-09 |
| Generic database | `.db/.sqlite/.sqlite3/.db3/.s3db/.sl3/.sqlitedb` | Stable-limited | Yes | Yes | Yes | `ok`; browser-side SQLite import/export updates existing visible rows in the original database. Schema changes, row inserts, deletes, and row identity edits are blocked. | 2026-06-09 |
| Generic containers | `.zip`, `.json.gz`, `.yaml.gz/.yml.gz`, `.json.zlib`, `.yaml.zlib`, `.json.deflate`, `.json.bz2`, `.json.lz4`, `.json.zst/.json.zstd`, `.json.b64/.json.base64`, `.json.lzstring` | Stable-limited | Yes | Yes | Yes | `ok`; supported wrapped JSON/YAML/TOML/properties/CSV/CFG/XML/text payloads are unpacked locally, edited, then rebuilt into the original wrapper. ZIP export preserves unsupported archive entries and blocks editable entry add/delete. Other compressed payloads are read-only until the inner format is proven. | 2026-06-09 |
| Generic binary | `.dat` | Read-only | Yes | No | No | `read_only_generic`; recognized with transparent reason and disabled export. | 2026-05-25 |
