"""Organise stored fixture definitions by manufacturer and readable fixture name."""
import collections
import hashlib
import json
import os
import pathlib
import re
from fixture_image_names import image_slug

ROOT = pathlib.Path(__file__).resolve().parents[1]

def main():
    owners = collections.defaultdict(set)
    catalogues = sorted((ROOT / 'json/fixtures').glob('*.json'))
    for file in catalogues:
        data = json.loads(file.read_text())
        for fixture in data['fixtures']:
            if fixture.get('details'):
                owners[fixture['details']].add((data['manufacturer'], fixture['fixture']))
    existing = {p.relative_to(ROOT).as_posix() for p in (ROOT / 'json/fixture-details').rglob('*.json')}
    if set(owners) != existing:
        raise ValueError('Stored definitions and catalogue references do not match')
    mapping, hashes, destinations = {}, {}, collections.defaultdict(list)
    for old, identities in sorted(owners.items()):
        makers = sorted({image_slug(maker) for maker, _ in identities})
        names = sorted({image_slug(name) for _, name in identities})
        label = '--'.join(names)
        digest = hashlib.sha256((ROOT / old).read_bytes()).hexdigest()
        if len(label) > 180:
            label = (os.path.commonprefix(names).rsplit('-', 1)[0] or 'fixture') + '-shared-' + digest[:12]
        folder = 'json/fixture-details/' + '--'.join(makers)
        new = folder + '/' + label + '.json'
        mapping[old], hashes[old] = new, digest
        destinations[new].append(old)
    for destination, sources in destinations.items():
        if len(sources) > 1:
            for old in sources:
                mapping[old] = destination[:-5] + '-' + hashes[old][:12] + '.json'
    if len(set(mapping.values())) != len(mapping):
        raise ValueError('Duplicate definition destinations')
    for old, new in mapping.items():
        if old != new and (ROOT / new).exists():
            raise ValueError('Destination already exists: ' + new)
    for old, new in mapping.items():
        if old != new:
            (ROOT / new).parent.mkdir(parents=True, exist_ok=True)
            (ROOT / old).rename(ROOT / new)
        assert hashlib.sha256((ROOT / new).read_bytes()).hexdigest() == hashes[old], new
    audit = ROOT / 'outputs/fixture-data/extraction-audit.json'
    for file in catalogues + ([audit] if audit.exists() else []):
        text = file.read_text()
        updated = re.sub(r'"json/fixture-details/[^\"]+"', lambda m: json.dumps(mapping.get(json.loads(m[0]), json.loads(m[0]))), text)
        if updated != text:
            file.write_text(updated)
    for folder in sorted((ROOT / 'json/fixture-details').rglob('*'), reverse=True):
        if folder.is_dir() and not any(folder.iterdir()):
            folder.rmdir()
    print(f'Checked {len(mapping)} stored definitions; renamed {sum(a != b for a, b in mapping.items())}. All definition bytes preserved.')
    return mapping

if __name__ == '__main__':
    main()
