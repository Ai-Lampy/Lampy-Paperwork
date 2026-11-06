# GDTF reference workflow

GDTF archives are temporary reference inputs. The runtime library lives in `json/fixtures/`, `json/fixture-details/` and `images/fixtures/`.

For a new or revised fixture, extract and verify the name, modes, DMX footprints, parameter counts, thumbnail, watts and weight. Preserve reviewed catalogue values when a source disagrees; record the discrepancy and leave unavailable values unknown. Store the source filename and SHA-256 as provenance. Check the extracted data before deleting the input archive.

`scripts/extract-fixture-archive.py` reads reference archives, checks CRCs and extracts JSON and artwork. `scripts/extract-fixture-data.cjs` is the one-time legacy-catalogue migrator used for V56; do not rerun it against the migrated catalogue. `scripts/validate-fixture-data.py` checks the stored library. Its `--sources` option verifies the migration audit against the original archives before removal.

The app does not fetch or embed library GDTFs. It retains GDTFs attached to imported MVR files in the project and may include those attachments in subsequent MVR exports. Changing a fixture mode clears its old attachment reference. Lampy fixture identity, mode and channel count are stored in MVR user data when no GDTF is included.

The local extraction audit is `outputs/fixture-data/extraction-audit.json`.

Use `python3 scripts/fixture_image_names.py` to organise artwork into manufacturer folders with readable fixture names. Shared artwork retains one copy. Run `node scripts/compress-fixture-images.cjs` for lossless PNG compression; it verifies decoded pixels and preserves ancillary image metadata. Image checksums and fixture identities are stored separately in `json/fixture_image_manifest.json`.
