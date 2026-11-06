"""Validate stored fixtures, including byte/definition comparison before source removal."""
import argparse, hashlib, json, pathlib, re, zipfile, xml.etree.ElementTree as ET
ROOT = pathlib.Path(__file__).resolve().parents[1]
def sha(data): return hashlib.sha256(data).hexdigest()
def tree(n): return {'tag':n.tag.split('}')[-1],'attrs':dict(n.attrib),'text':n.text or '', 'children':[tree(c) for c in n]}
def validate(sources=False):
    details = {}
    images = set()
    image_manifest=json.loads((ROOT/'json/fixture_image_manifest.json').read_text())['images']
    for p in (ROOT/'json/fixture-details').glob('*.json'):
        d=json.loads(p.read_text()); assert p.stem==d['provenance']['sha256'], p
        assert isinstance(d['modes'],list) and d['name'], p
        for m in d['modes']:
            assert m['name']==m['definition']['attrs']['Name'], p
            assert isinstance(m['channels'],int) and m['channels']>=0, p
            assert isinstance(m['parameters'],int) and m['parameters']>=0,p
        images.update([d['image']] if d['image'] else [])
        details[p.relative_to(ROOT).as_posix()]=d
    count=0
    for p in (ROOT/'json/fixtures').glob('*.json'):
        for f in json.loads(p.read_text())['fixtures']:
            count+=1;assert 'gdtf' not in f,p
            if f['image']:
                images.add(f['image'])
                assert {'manufacturer':json.loads(p.read_text())['manufacturer'],'fixture':f['fixture']} in image_manifest[f['image']]['fixtures'],(p,f['fixture'])
            if f['details']:
                d=details[f['details']];assert f['provenance']['sha256']==d['provenance']['sha256'],p
                for name,m in f['modes'].items():
                    if m.get('sourceMode'):
                        source=next(x for x in d['modes'] if x['name']==m['sourceMode'] and x['channels']==m.get('sourceChannels',m['channels']))
                        assert source['channels']==m.get('sourceChannels',m['channels']),(p,name)
                        assert source['parameters']==m['parameters'],(p,name)
            assert all(isinstance(m,dict) and m['channels']>=0 for m in f['modes'].values()),p
    for name in images:
        p=ROOT/name;assert p.is_file(),name
        assert re.fullmatch(r'images/fixtures/[a-z0-9-]+/[a-z0-9-]+\.(png|jpg|jpeg|webp|svg)',name),name
        assert not re.fullmatch(r'[0-9a-f]{64}',p.stem),name
        data=p.read_bytes()
        if p.suffix=='.png':assert data.startswith(b'\x89PNG\r\n\x1a\n'),name
        elif p.suffix in ('.jpg','.jpeg'):assert data.startswith(b'\xff\xd8\xff'),name
        elif p.suffix=='.webp':assert data[:4]==b'RIFF' and data[8:12]==b'WEBP',name
        elif p.suffix=='.svg':assert ET.fromstring(data).tag.split('}')[-1]=='svg',name
        assert name in image_manifest and sha(data)==image_manifest[name]['sha256'],name
    assert images==set(image_manifest),'Image manifest does not match fixture references'
    assert images=={p.relative_to(ROOT).as_posix() for p in (ROOT/'images/fixtures').rglob('*') if p.is_file() and p.name!='.DS_Store'},'Unreferenced fixture artwork'
    if sources:
        audit=json.loads((ROOT/'outputs/fixture-data/extraction-audit.json').read_text())
        for a in audit['archives']:
            p=ROOT/a['source'];assert sha(p.read_bytes())==a['sha256'],p
            with zipfile.ZipFile(p) as z:
                assert z.testzip() is None,p
                xml=ET.fromstring(z.read(next(n for n in z.namelist() if n.lower().endswith('description.xml'))))
                modes=[tree(n) for n in xml.iter() if n.tag.split('}')[-1]=='DMXMode']
                assert modes==[m['definition'] for m in details[a['detail']]['modes']],p
                for key,tag in [('geometries','Geometries'),('physicalDescriptions','PhysicalDescriptions')]:
                    assert [tree(n) for n in xml.iter() if n.tag.split('}')[-1]==tag]==details[a['detail']][key],p
                archive_image_hashes={sha(z.read(n)) for n in z.namelist() if pathlib.Path(n).suffix.lower() in ('.png','.jpg','.jpeg','.webp','.svg')}
                for img in a['images']:
                    assert sha((ROOT/img).read_bytes())==image_manifest[img]['sha256'],img
                    assert image_manifest[img].get('sourceSha256',image_manifest[img]['sha256']) in archive_image_hashes,img
        assert len(audit['archives'])==len(list((ROOT/'gdtf').rglob('*.gdtf'))),'Unextracted source archive'
        print(f"Verified original CRCs, SHA-256, every mode definition and extracted artwork for {len(audit['archives'])} archives.")
    print(f'Validated {count} catalogue fixtures, {len(details)} stored definitions and {len(images)} referenced images.')
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--sources',action='store_true');validate(parser.parse_args().sources)
