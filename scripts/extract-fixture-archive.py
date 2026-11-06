"""Read a GDTF once: CRC-check it and extract XML data and artwork."""
import hashlib, json, pathlib, sys, zipfile, xml.etree.ElementTree as ET
from fixture_image_names import image_slug

def extract(source, image_root):
    source = pathlib.Path(source)
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    def tree(node):
        return {'tag': node.tag.split('}')[-1], 'attrs': dict(node.attrib),
                'text': node.text or '', 'children': [tree(child) for child in node]}
    with zipfile.ZipFile(source) as archive:
        if archive.testzip() is not None:
            raise ValueError('Archive CRC failure: ' + str(source))
        names = archive.namelist()
        if len(set(names)) != len(names):
            raise ValueError('Duplicate archive members: ' + str(source))
        description = next(name for name in names if name.lower().endswith('description.xml'))
        document = ET.fromstring(archive.read(description))
        fixture = next(node for node in document.iter() if node.tag.split('}')[-1] == 'FixtureType')
        thumbnail = fixture.get('Thumbnail', 'thumbnail').lower()
        media = {}
        for name in names:
            p = pathlib.PurePosixPath(name)
            if p.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp', '.svg'):
                continue
            if not (not name.lower().startswith('wheels/') and p.stem.lower() in (thumbnail, 'thumbnail')):
                continue
            data = archive.read(name)
            content_hash = hashlib.sha256(data).hexdigest()
            extension = '.png' if data.startswith(b'\x89PNG\r\n\x1a\n') else '.jpg' if data.startswith(b'\xff\xd8\xff') else '.webp' if data[:4]==b'RIFF' and data[8:12]==b'WEBP' else p.suffix.lower()
            folder = pathlib.Path(image_root) / image_slug(fixture.get('Manufacturer','unknown'))
            label = image_slug(fixture.get('LongName') or fixture.get('Name') or source.stem)
            dest = folder / (label + extension)
            index = 2
            while dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest() != content_hash:
                dest = folder / (label + '-' + str(index) + extension)
                index += 1
            dest.parent.mkdir(parents=True, exist_ok=True)
            if not dest.exists(): dest.write_bytes(data)
            if hashlib.sha256(dest.read_bytes()).hexdigest() != content_hash:
                raise ValueError('Extracted image mismatch')
            media[name] = dest.as_posix()
        props = [node for node in document.iter() if node.tag.split('}')[-1] in ('Properties', 'Weight')]
        weights = sorted(set(float(n.get('Weight', n.get('Value', '0'))) for n in props if n.get('Weight') or n.get('Value')))
        beam_powers = sorted(set(float(n.get('PowerConsumption')) for n in document.iter() if n.get('PowerConsumption') and float(n.get('PowerConsumption')) > 0))
        powers = [float(n.get('ElectricalPayLoad')) for n in document.iter() if n.tag.split('}')[-1] == 'WiringObject' and n.get('ComponentType') == 'Consumer' and n.get('ElectricalPayLoad') and float(n.get('ElectricalPayLoad')) > 0]
        return {'tree': tree(document), 'media': media, 'sha256': digest,
                'beamWattCandidates': beam_powers, 'fileName': source.name, 'weightCandidates': weights, 'wattCandidates': powers}

if __name__ == '__main__':
    # A batch avoids starting Python once for every source archive.
    jobs = json.load(sys.stdin)
    for job in jobs:
        result = extract(job['source'], job['imageRoot'])
        pathlib.Path(job['output']).write_text(json.dumps(result), encoding='utf-8')
