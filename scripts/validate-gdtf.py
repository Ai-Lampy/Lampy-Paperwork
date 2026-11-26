#!/usr/bin/env python3
"""Read-only GDTF archive/schema validator (requires lxml).

Usage: python3 scripts/validate-gdtf.py gdtf/fixtures/martin
Vendored schema: https://github.com/mvrdevelopment/tools/blob/main/gdtf.xsd
Apply narrow, explicit compatibility corrections in memory, never to fixtures:
* Correct upstream Gammut typo and allow multiple Gamuts, per GDTF 1.2.
* Geometry Break offsets describe a logical footprint, not a physical DMX port.
  Accept positive 32-bit offsets beyond 512 for network-controlled fixtures.
* GDTF 1.0 compatibility uses channel-level Default, not function-level Default.
  This is a compatibility check, not certification against a full 1.0 schema.
All other XSD constraints, including geometry-name uniqueness, stay enabled.
"""
import argparse
from functools import lru_cache
from pathlib import Path, PurePosixPath
from zipfile import ZipFile, BadZipFile
from lxml import etree as E

XS = 'http://www.w3.org/2001/XMLSchema'
NS = {'xs': XS}
SCHEMA = Path(__file__).with_name('schemas') / 'gdtf-1.2-upstream.xsd'

@lru_cache(maxsize=3)
def schema_for(version):
    if version not in ('1.0', '1.1', '1.2'):
        raise ValueError(f'Unsupported GDTF version: {version}')
    tree = E.parse(str(SCHEMA))
    def one(xpath):
        items = tree.xpath(xpath, namespaces=NS)
        if len(items) != 1:
            raise ValueError(f'Unexpected upstream schema structure: {xpath}')
        return items[0]
    one('//xs:complexType[@name="Gamuts"]/xs:sequence').set('maxOccurs', 'unbounded')
    one('//xs:complexType[@name="ChannelFunction"]/xs:attribute[@name="Gammut"]').set('name', 'Gamut')
    logical_offset = E.SubElement(tree.getroot(), '{%s}simpleType' % XS, name='logicaloffsettype')
    restriction = E.SubElement(logical_offset, '{%s}restriction' % XS, base='xs:integer')
    E.SubElement(restriction, '{%s}minInclusive' % XS, value='1')
    E.SubElement(restriction, '{%s}maxInclusive' % XS, value='2147483647')
    one('//xs:complexType[@name="Break"]/xs:attribute[@name="DMXOffset"]').set('type', 'logicaloffsettype')
    if version == '1.0':
        one('//xs:simpleType[@name="dataversion"]//xs:minInclusive').set('value', '1.0')
        one('//xs:complexType[@name="ChannelFunction"]/xs:attribute[@name="Default"]').set('use', 'optional')
        channel = one('//xs:complexType[@name="DMXChannel"]')
        E.SubElement(channel, '{%s}attribute' % XS, name='Default', type='dmxtype')
    return E.XMLSchema(tree)

def validate_xml(content):
    xml = E.fromstring(content, E.XMLParser(resolve_entities=False, no_network=True))
    if xml.getroottree().docinfo.doctype:
        raise ValueError('DOCTYPE declarations are not allowed')
    version = xml.get('DataVersion')
    schema = schema_for(version)
    if not schema.validate(xml):
        raise ValueError('\n'.join(dict.fromkeys(e.message for e in schema.error_log)))
    gamuts = [n.get('Name') for n in xml.findall('.//Gamuts/Gamut')]
    if len(gamuts) != len(set(gamuts)):
        raise ValueError('Duplicate gamut names')
    for function in xml.findall('.//ChannelFunction'):
        gamut = function.get('Gamut')
        if gamut and gamut not in gamuts:
            raise ValueError(f'Unresolved Gamut reference: {gamut}')
    return xml, version

def validate_archive(path):
    with ZipFile(path) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ValueError('Duplicate archive members')
        for name in names:
            if PurePosixPath(name).is_absolute() or '..' in PurePosixPath(name).parts or '\\' in name or ':' in name:
                raise ValueError(f'Unsafe archive path: {name}')
        if 'description.xml' not in names:
            raise ValueError('Missing root description.xml')
        if archive.getinfo('description.xml').file_size > 64 * 1024 * 1024:
            raise ValueError('description.xml exceeds validation limit')
        if archive.testzip() is not None:
            raise ValueError('Archive CRC failure')
        xml, version = validate_xml(archive.read('description.xml'))
        thumbnail = xml.find('FixtureType').get('Thumbnail')
        if thumbnail and not any(thumbnail + ext in names for ext in ('.png', '.svg')):
            raise ValueError(f'Missing thumbnail: {thumbnail}')
        for tag, attribute, directory in [('Model', 'File', 'models/'), ('Slot', 'MediaFileName', 'wheels/')]:
            for node in xml.findall('.//' + tag):
                value = node.get(attribute)
                if value and not any(n.startswith(directory) and PurePosixPath(n).stem == value for n in names):
                    raise ValueError(f'Missing embedded {tag} asset: {value}')
        return version

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('paths', nargs='+', type=Path)
    args = parser.parse_args()
    files = sorted({f for p in args.paths for f in (p.rglob('*.gdtf') if p.is_dir() else [p])})
    if not files:
        parser.error('No GDTF files found')
    failed = 0
    legacy = 0
    for path in files:
        try:
            version = validate_archive(path)
            legacy += version == '1.0'
        except (ValueError, OSError, E.Error, KeyError, BadZipFile) as error:
            print(f'FAIL {path}: {error}')
            failed += 1
    print(f'{len(files) - failed}/{len(files)} archives passed; {legacy} use GDTF 1.0 compatibility validation.')
    return bool(failed)

if __name__ == '__main__':
    raise SystemExit(main())
