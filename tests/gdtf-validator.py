"""Regression tests: run with a Python interpreter providing lxml."""
import importlib.util
import sys
from pathlib import Path
from zipfile import ZipFile
import unittest
from lxml import etree as E

ROOT=Path(__file__).resolve().parents[1]
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('validator', ROOT/'scripts/validate-gdtf.py')
validator=importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)

def fixture(pattern):
    paths=list((ROOT/'gdtf/fixtures/martin').glob(pattern))
    assert len(paths)==1,paths
    with ZipFile(paths[0]) as z:return E.fromstring(z.read('description.xml'))

class ValidatorTests(unittest.TestCase):
    def test_multiple_gamuts_and_links(self):
        x=fixture('*@MAC_One@*')
        self.assertGreater(len(x.findall('.//Gamuts/Gamut')),1)
        validator.validate_xml(E.tostring(x))
        x.find('.//ChannelFunction[@Gamut]').set('Gamut','Missing')
        with self.assertRaisesRegex(ValueError,'Unresolved Gamut'):validator.validate_xml(E.tostring(x))

    def test_duplicate_gamuts_rejected(self):
        x=fixture('*@MAC_One@*');gamuts=x.findall('.//Gamuts/Gamut')
        gamuts[1].set('Name',gamuts[0].get('Name'))
        with self.assertRaisesRegex(ValueError,'Duplicate gamut'):validator.validate_xml(E.tostring(x))

    def test_network_offsets(self):
        x=fixture('*@MAC_Aura_Raven_XIP@*')
        b=max(x.findall('.//Break'),key=lambda e:int(e.get('DMXOffset','1')))
        self.assertEqual(b.get('DMXOffset'),'700')
        validator.validate_xml(E.tostring(x))
        for bad in ('0','-1','1.5','invalid','2147483648'):
            b.set('DMXOffset',bad)
            with self.assertRaises(ValueError):validator.validate_xml(E.tostring(x))

    def test_unique_wiring_names(self):
        for kind in ('Cove','Graze'):
            for length in ('1ft','4ft'):
                x=fixture(f'*@Exterior_Linear_Pro_{kind}_CTC_{length}@*')
                validator.validate_xml(E.tostring(x))
                nodes=x.findall('.//WiringObject')
                self.assertEqual(len(nodes),len({n.get('Name') for n in nodes}))
                nodes[1].set('Name',nodes[0].get('Name'))
                with self.assertRaisesRegex(ValueError,'Duplicate key'):validator.validate_xml(E.tostring(x))

    def test_version_aware_defaults(self):
        x=fixture('*@Atomic_3000_DMX@*')
        self.assertEqual(validator.validate_xml(E.tostring(x))[1],'1.0')
        x.set('DataVersion','1.2')
        with self.assertRaises(ValueError):validator.validate_xml(E.tostring(x))
        x.set('DataVersion','9.0')
        with self.assertRaisesRegex(ValueError,'Unsupported'):validator.validate_xml(E.tostring(x))

if __name__=='__main__':unittest.main()
