# Save Format Compatibility Matrix

| Engine | Format | Level | canView | canEdit | canSave | reasonCode / Limitations | LastValidated |
|---|---|---|---:|---:|---:|---|---|
| RPG Maker MV/MZ | `.rpgsave`, `.rmmzsave` | Stable | Yes | Yes | Yes | `ok` for supported payloads; compression strategy preserved on export. | 2026-02-07 |
| RPG Maker VX/VX Ace/XP | `.rvdata2`, `.rvdata`, `.rxdata` | Unsupported | No | No | No | `unsupported_ruby_marshal` (Ruby Marshal not implemented in web editor). | 2026-02-07 |
| Unity | `.xml`, `.plist` PlayerPrefs | Stable | Yes | Yes | Yes | `ok`; source key order and source value type are preserved during rebuild. | 2026-02-07 |
| Unity | Binary PlayerPrefs | Unsupported | No | No | No | `unsupported_binary_plist`, `unsupported_binary_playerprefs` (strategyized detection). | 2026-02-07 |
| Ren'Py | `.save` | Experimental | Yes | Yes | Yes | `ok`; writes restricted to primitive values under `persistent`. | 2026-02-07 |
| Unreal Engine | Standard GVAS `.sav` | Stable | Yes | Yes | Yes | `standard_gvas`. | 2026-02-07 |
| Unreal Engine | Wrapped GVAS (`gzip`/`zlib`) | Stable | Yes | Yes | Yes | `compressed_repackable`; safe recompression supported for `gzip`/`zlib` only. | 2026-02-07 |
| Unreal Engine | Other wrapped/custom `.sav` | Read-only | Yes | No | No | `compressed_readonly`, `unsupported_container`, `decompression_failed`, `decompression_limit`. | 2026-02-07 |
| Palworld | Player `.sav` | Stable/Guarded | Yes | Yes | Yes | Unreal-compatible mode + heuristic quick fields with confidence and ambiguity tracking. | 2026-02-07 |
| Palworld | `Level.sav` (world) | Read-only | Yes | No | No | `world_file_limited`; inspection-first until safe world mapping is available. | 2026-02-07 |
| GameMaker | `.json`, `.ini` | Stable | Yes | Yes | Yes | `ok`; INI comment/section/key order are preserved, with multiline + escape round-trip coverage in parser regressions. Raw fallback uses `raw_fallback` when structured parse fails. | 2026-02-07 |
| NaniNovel | `.nson/.json/base64/gzip/zlib/base64+gzip` | Stable | Yes | Yes | Yes | `ok`; raw-deflate/json/base64/gzip/zlib/base64+gzip wrappers supported. | 2026-02-07 |
| NaniNovel | Encrypted/custom containers | Unsupported | No | No | No | `likely_encrypted_container`, `unsupported_naninovel_wrapper`. | 2026-02-07 |
