"""Build an allowlisted Pages artifact; source archives remain untouched."""
import argparse
import json
import pathlib
import shutil
import hashlib

ROOT = pathlib.Path(__file__).resolve().parents[1]

RUNTIME = ('index.html', '.nojekyll', 'json', 'images', 'info_txt', 'js')

def copy_runtime(source_root, destination):
    for name in RUNTIME:
        source = source_root / name
        target = destination / name
        if source.is_dir():
            shutil.copytree(source, target, ignore=shutil.ignore_patterns('.DS_Store', '*.md'))
        else:
            shutil.copy2(source, target)

def offline_manifest(destination, app_dir, shared_root):
    # HTML responses can gain Cloudflare challenge scripts in transit. Serve the
    # offline shell as plain text so its exact build hash remains verifiable.
    shell = app_dir / 'offline-shell.txt'
    shutil.copy2(app_dir / 'index.html', shell)
    assets = [shell]
    assets += [p for folder in ('js', 'info_txt') for p in (app_dir / folder).rglob('*') if p.is_file()]
    # Catalogue summaries support offline editing. Large detailed fixture definitions
    # and images are cached when used, rather than downloading hundreds of MB at setup.
    assets += [p for p in (shared_root / 'json').rglob('*.json') if 'fixture-details' not in p.relative_to(shared_root).parts]
    import os
    entries = [{'url':os.path.relpath(p, app_dir), 'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(set(assets))]
    version = json.loads((app_dir / 'js/app-version.json').read_text())['version']
    manifest = {'version':version, 'sharedBase':os.path.relpath(shared_root, app_dir) + '/', 'assets':entries}
    (app_dir / 'offline-manifest.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
    shutil.copy2(ROOT / 'sw.js', app_dir / 'sw.js')

def build(destination):
    destination = pathlib.Path(destination).resolve()
    if destination == ROOT or ROOT in destination.parents:
        raise ValueError('Use a new directory outside the project')
    destination.mkdir(parents=True, exist_ok=False)
    copy_runtime(ROOT, destination)
    offline_manifest(destination, destination, destination)
    for name in ('index.html', 'js/app-version.json'):
        if (destination / name).read_bytes() != (ROOT / name).read_bytes():
            raise ValueError('Public release differs from source: '+name)
    if list(destination.rglob('*.gdtf')):
        raise ValueError('Runtime build must not contain GDTF archives')
    size = sum(p.stat().st_size for p in destination.rglob('*') if p.is_file())
    if size > 900_000_000:
        raise ValueError(f'Pages artifact exceeds 900 MB budget: {size:,} bytes')
    print(f'Built {destination}: {size:,} bytes; no GDTF archives')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('destination')
    args = parser.parse_args()
    build(args.destination)
