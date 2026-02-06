# Unreal/Palworld Fixture Specs

Add real-world save samples here to run parser regression checks.

## Baseline Fixtures (Committed)

These files are versioned in repo and run on every `npm run test:unreal`:

- `01-standard-unreal.json` -> `standard-gvas.sav` (`full`, savable)
- `02-standard-palworld.json` -> `Level.sav` (`full`, savable via palworld parser path)
- `03-gzip-readonly.json` -> `gzip-gvas.sav` (`unsupported_compressed`, read-only)
- `04-fake-container.json` -> `fake-compressed.sav` (`unsupported_compressed`, read-only)
- `05-not-gvas.json` -> `plain.sav` (`not_gvas`, not savable)

## Files

1. Place binary save file, e.g. `palworld-level.sav`
2. Add a JSON spec file next to it, e.g. `palworld-level.json`

Example spec:

```json
{
  "file": "palworld-level.sav",
  "parser": "palworld",
  "expectMode": "unsupported_compressed",
  "expectCanSave": false
}
```

## Supported Keys

- `file`: save filename in this folder
- `parser`: `"unreal"` (default) or `"palworld"`
- `expectMode`: one of `full`, `partial`, `unsupported_compressed`, `not_gvas`
- `expectCanSave`: optional boolean assertion
- `expectReasonCode`: optional assertion:
  - `standard_gvas`
  - `compressed_readonly`
  - `gvas_parse_failed`
  - `decompression_limit`
  - `unsupported_container`
  - `decompression_failed`
  - `not_gvas`

## Recommended Workflow

1. Keep each sample small and anonymized.
2. Add one spec per behavior you need to lock.
3. Run `npm run test:unreal` and verify your new spec executes in fixture output.
