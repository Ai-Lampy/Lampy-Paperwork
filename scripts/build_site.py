"""Build an allowlisted Pages artifact; source archives remain untouched."""
import argparse
import json
import pathlib
import shutil
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]

def referenced_gdtf_sources():
    references = set()

    def collect(value):
        if isinstance(value, dict):
            for item in value.values():
                collect(item)
        elif isinstance(value, list):
            for item in value:
                collect(item)
        elif isinstance(value, str) and value.startswith('fixtures/') and value.endswith('.gdtf'):
            relative = pathlib.PurePosixPath(value)
            if relative.is_absolute() or '..' in relative.parts:
                raise ValueError(f'Unsafe GDTF reference: {value}')
            references.add(relative)

    for source in sorted((ROOT / 'json').rglob('*.json')):
        with source.open(encoding='utf-8') as handle:
            collect(json.load(handle))

    sources = []
    for reference in sorted(references, key=str):
        source = ROOT / 'gdtf' / pathlib.Path(*reference.parts)
        if not source.is_file():
            raise FileNotFoundError(f'Missing referenced GDTF: {source.relative_to(ROOT)}')
        sources.append(source)
    return sources

def build(destination):
    destination = pathlib.Path(destination).resolve()
    if destination == ROOT or ROOT in destination.parents and destination != ROOT / '_site':
        raise ValueError('Use _site or a directory outside the project')
    destination.mkdir(parents=True, exist_ok=False)
    for name in ('index.html', '.nojekyll', 'json', 'images', 'info_txt', 'js'):
        source = ROOT / name
        target = destination / name
        if source.is_dir():
            shutil.copytree(source, target, ignore=shutil.ignore_patterns('.DS_Store', '*.md'))
        else:
            shutil.copy2(source, target)
    count = 0
    for source in referenced_gdtf_sources():
        target = destination / source.relative_to(ROOT)
        target.parent.mkdir(parents=True, exist_ok=True)
        try:
            with zipfile.ZipFile(source) as original, zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as packed:
                for entry in original.infolist():
                    content = original.read(entry)
                    entry.compress_type = zipfile.ZIP_DEFLATED
                    packed.writestr(entry, content, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
        except zipfile.BadZipFile as error:
            raise ValueError(f'Invalid referenced GDTF archive: {source.relative_to(ROOT)}') from error
        # Validate every extracted byte, not just the ZIP structure.
        with zipfile.ZipFile(source) as original, zipfile.ZipFile(target) as packed:
            assert original.namelist() == packed.namelist(), source
            for name in original.namelist():
                assert original.read(name) == packed.read(name), (source, name)
        count += 1
    size = sum(p.stat().st_size for p in destination.rglob('*') if p.is_file())
    if size > 900_000_000:
        raise ValueError(f'Pages artifact exceeds 900 MB budget: {size:,} bytes')
    print(f'Built {destination}: {size:,} bytes; {count} GDTF archives verified')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('destination')
    build(parser.parse_args().destination)
