"""Build an allowlisted Pages artifact; source archives remain untouched."""
import argparse
import pathlib
import shutil
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]

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
    for source in sorted((ROOT / 'gdtf').rglob('*.gdtf')):
        target = destination / source.relative_to(ROOT)
        target.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(source) as original, zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as packed:
            for entry in original.infolist():
                content = original.read(entry)
                entry.compress_type = zipfile.ZIP_DEFLATED
                packed.writestr(entry, content, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
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
