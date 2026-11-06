"""Build an allowlisted Pages artifact; source archives remain untouched."""
import argparse
import json
import pathlib
import shutil
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]

def build(destination):
    destination = pathlib.Path(destination).resolve()
    if destination == ROOT or ROOT in destination.parents:
        raise ValueError('Use a new directory outside the project')
    destination.mkdir(parents=True, exist_ok=False)
    for name in ('index.html', '.nojekyll', 'json', 'images', 'info_txt', 'js'):
        source = ROOT / name
        target = destination / name
        if source.is_dir():
            shutil.copytree(source, target, ignore=shutil.ignore_patterns('.DS_Store', '*.md'))
        else:
            shutil.copy2(source, target)
    if list(destination.rglob('*.gdtf')):
        raise ValueError('Runtime build must not contain GDTF archives')
    size = sum(p.stat().st_size for p in destination.rglob('*') if p.is_file())
    if size > 900_000_000:
        raise ValueError(f'Pages artifact exceeds 900 MB budget: {size:,} bytes')
    print(f'Built {destination}: {size:,} bytes; no GDTF archives')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('destination')
    build(parser.parse_args().destination)
