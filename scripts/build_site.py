"""Build an allowlisted Pages artifact; source archives remain untouched."""
import argparse
import json
import pathlib
import shutil
import zipfile
import hashlib
import re

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

def build(destination, baseline=None):
    destination = pathlib.Path(destination).resolve()
    if destination == ROOT or ROOT in destination.parents:
        raise ValueError('Use a new directory outside the project')
    destination.mkdir(parents=True, exist_ok=False)
    if baseline:
        baseline = pathlib.Path(baseline).resolve()
        if json.loads((baseline / 'js/app-version.json').read_text())['version'] != '58.4':
            raise ValueError('The public baseline must be the verified V58.4 release')
        # Shared assets must be identical; do not silently change the public app's data.
        for folder in ('json', 'images'):
            left = {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT / folder).rglob('*') if p.is_file() and p.name != '.DS_Store'}
            right = {str(p.relative_to(baseline)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (baseline / folder).rglob('*') if p.is_file() and p.name != '.DS_Store'}
            if left != right:
                raise ValueError('Shared '+folder+' assets differ from V58.4; review deployment before changing the public app')
        copy_runtime(baseline, destination)
        pilot = destination / 'pilot'
        pilot.mkdir()
        for folder in ('js', 'info_txt'):
            shutil.copytree(ROOT / folder, pilot / folder, ignore=shutil.ignore_patterns('.DS_Store', '*.md'))
        html = (ROOT / 'index.html').read_text()
        html = html.replace('<head>', '<head>\n<base href="../">', 1)
        html = re.sub(r'((?:src|href)=["\'])js/', r'\1pilot/js/', html)
        html = html.replace("'info_txt/", "'pilot/info_txt/").replace('"info_txt/', '"pilot/info_txt/')
        (pilot / 'index.html').write_text(html)
        offline_manifest(destination, pilot, destination)
        # The pilot must never rewrite the public entry point or release manifest.
        for name in ('index.html', 'js/app-version.json'):
            if (destination / name).read_bytes() != (baseline / name).read_bytes():
                raise ValueError('Public baseline was changed: '+name)
    else:
        copy_runtime(ROOT, destination)
        offline_manifest(destination, destination, destination)
    if list(destination.rglob('*.gdtf')):
        raise ValueError('Runtime build must not contain GDTF archives')
    size = sum(p.stat().st_size for p in destination.rglob('*') if p.is_file())
    if size > 900_000_000:
        raise ValueError(f'Pages artifact exceeds 900 MB budget: {size:,} bytes')
    print(f'Built {destination}: {size:,} bytes; no GDTF archives')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('destination')
    parser.add_argument('--baseline', help='Verified V58.4 source; preserve it publicly and publish the account pilot under /pilot/')
    args = parser.parse_args()
    build(args.destination, args.baseline)
