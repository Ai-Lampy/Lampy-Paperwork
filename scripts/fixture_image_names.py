"""Give fixture artwork readable names and record byte hashes independently of paths."""
import collections, hashlib, json, os, pathlib, re, unicodedata
ROOT = pathlib.Path(__file__).resolve().parents[1]
def image_slug(value):
    text=unicodedata.normalize('NFKD',str(value)).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+','-',text).strip('-') or 'fixture'
def main():
    owners=collections.defaultdict(set)
    files=sorted((ROOT/'json/fixtures').glob('*.json'))
    details=sorted((ROOT/'json/fixture-details').glob('*.json'))
    for p in files:
        d=json.loads(p.read_text())
        for f in d['fixtures']:
            if f.get('image'):owners[f['image']].add((d['manufacturer'],f['fixture']))
    for p in details:
        d=json.loads(p.read_text())
        if d.get('image') and d['image'] not in owners:owners[d['image']].add((d['manufacturer'],d['longName'] or d['name']))
    old_manifest_path=ROOT/'json/fixture_image_manifest.json'
    old_manifest=json.loads(old_manifest_path.read_text())['images'] if old_manifest_path.exists() else {}
    mapping={};manifest={};claimed=set()
    for old,identities in sorted(owners.items()):
        identities=sorted(identities);makers=sorted({image_slug(m) for m,f in identities})
        names=sorted({image_slug(f) for m,f in identities});label='--'.join(names)
        if len(label)>180:label=(os.path.commonprefix(names).rsplit('-',1)[0] or 'fixture')+'-shared'
        folder='images/fixtures/'+('--'.join(makers));extension=pathlib.Path(old).suffix.lower()
        dest=folder+'/'+label+extension;number=2
        while dest in claimed:dest=folder+'/'+label+'-'+str(number)+extension;number+=1
        claimed.add(dest);mapping[old]=dest
        digest=hashlib.sha256((ROOT/old).read_bytes()).hexdigest()
        if old in old_manifest and digest!=old_manifest[old]['sha256']:raise ValueError('Image changed unexpectedly: '+old)
        manifest[dest]={'sha256':digest,'fixtures':[{'manufacturer':m,'fixture':f} for m,f in identities]}
        if old_manifest.get(old,{}).get('sourceSha256'):manifest[dest]['sourceSha256']=old_manifest[old]['sourceSha256']
    # Validate every destination before renaming anything.
    for old,new in mapping.items():
        if old!=new and (ROOT/new).exists():raise ValueError('Destination exists: '+new)
    for old,new in mapping.items():
        if old!=new:
            (ROOT/new).parent.mkdir(parents=True,exist_ok=True);(ROOT/old).rename(ROOT/new)
        assert hashlib.sha256((ROOT/new).read_bytes()).hexdigest()==manifest[new]['sha256']
    audit=ROOT/'outputs/fixture-data/extraction-audit.json'
    for p in files+details+([audit] if audit.exists() else []):
        text=p.read_text();updated=text
        # Replace exact JSON strings only, retaining the surrounding formatting.
        updated=re.sub(r'"images/fixtures/[^"]+"',lambda m:json.dumps(mapping.get(json.loads(m[0]),json.loads(m[0]))),updated)
        if updated!=text:p.write_text(updated)
    (ROOT/'json/fixture_image_manifest.json').write_text(json.dumps({'format':'lampy-fixture-images-v1','images':dict(sorted(manifest.items()))},indent=2,ensure_ascii=False)+'\n')
    print(f'Checked {len(mapping)} fixture images; renamed {sum(a!=b for a,b in mapping.items())}. All image bytes preserved.')
    return mapping
if __name__=='__main__':main()
