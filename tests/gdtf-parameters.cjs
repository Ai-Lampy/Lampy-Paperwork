'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),{parserContext,documentTree,readArchives}=require('../scripts/sync-gdtf-parameters.cjs'),c=parserContext();
const node=(tag,attrs={},children=[])=>({tag,attrs,children});
const channel=(geometry,offset='1',attributes=['Dimmer'])=>node('DMXChannel',{Geometry:geometry,Offset:offset},attributes.map(Attribute=>node('LogicalChannel',{Attribute})));
function count(geometries,channels,geometry='Base'){
 const doc=documentTree(node('GDTF',{},[node('Geometries',{},geometries),node('DMXMode',{Geometry:geometry},channels)]));return c.parseGdtfModeParameterCount(doc.getElementsByTagName('DMXMode')[0]);
}
const pixel=node('Beam',{Name:'Pixel'}),ref=Name=>node('GeometryReference',{Name,Geometry:'Pixel'});
assert.equal(count([node('Geometry',{Name:'Base'},[ref('P1'),ref('P2')]),pixel],[channel('Pixel'),channel('Pixel','2'),channel('Pixel','3'),channel('Pixel','')]),8);
assert.equal(count([node('Geometry',{Name:'Base'})],[channel('Base','1,2')]),1,'16-bit consumes one parameter');
assert.equal(count([node('Geometry',{Name:'Base'})],[channel('Base','1',['Dimmer','Shutter'])]),2);
assert.equal(count([node('Geometry',{Name:'Base'},[node('GeometryReference',{Name:'One',Geometry:'Module'}),node('GeometryReference',{Name:'Two',Geometry:'Module'})]),node('Geometry',{Name:'Module'},[ref('A'),ref('B')]),pixel,node('Geometry',{Name:'Unused'},[ref('C')])],[channel('Pixel')]),4,'nested references expand only the selected root');
assert.equal(count([node('Geometry',{Name:'Base'},[node('GeometryReference',{Name:'Loop',Geometry:'Base'})])],[channel('Base')]),1,'cycles terminate');
assert.equal(count([], [channel('Missing'),channel('Missing','2')]),2,'legacy files without geometry retain logical counts');
const expected={'Compact':7,'Basic':13,'Extended 5 Segments':33,'Extended 10 Segments':53,'Extended 25 Segments':113,'Extended 100 Pixels':413,'Compact Direct':7,'RGB':4,'PixelMap 5 Segments':20,'PixelMap 10 Segments':40,'PixelMap 25 Segments':100,'PixelMap 100 Pixels':400};
const library=JSON.parse(fs.readFileSync(path.join(root,'json/fixtures/martin.json'))),fixture=library.fixtures.find(f=>f.fixture==='VDO Sceptron XB 1000 mm');
const detail=JSON.parse(fs.readFileSync(path.join(root,fixture.details)));
for(const mode of detail.modes){const storedDoc=documentTree(node('GDTF',{},[...detail.geometries,mode.definition]));assert.equal(c.parseGdtfModeParameterCount(storedDoc.getElementsByTagName('DMXMode')[0]),expected[mode.name],mode.name+' recomputed');assert.equal(mode.parameters,expected[mode.name],mode.name);assert.equal(fixture.modes[mode.name].parameters,expected[mode.name],mode.name+' stored count')}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function source(name){const start=html.indexOf('function '+name+'(');assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const code=html.slice(start,end+1);try{new Function('return ('+code+')');return code}catch{}}throw Error(name)}
for(const name of ['normalisePatchMode','modeChannels','modeParameters','normaliseImportMatch','fixtureModeKey','fixtureModeParameters','fixtureParametersRequired'])vm.runInContext(source(name),c);
c.repositoryFixturePatchReference={manufacturers:{Martin:library.fixtures}};
const rows=Array.from({length:38},()=>({manufacturer:'Martin',fixture:fixture.fixture,mode:'PixelMap 100 Pixels',channels:300}));
assert.equal(c.fixtureParametersRequired(rows),15200);
assert.equal(c.fixtureModeParameters({manufacturer:'Missing',fixture:'Custom',mode:'Unknown',channels:32}),32);
assert(source('renderGdtfFixtureInfo').includes('mode.parameters.toLocaleString()'));
assert(source('parseGdtfFixtureInfo').includes('parameters:parseGdtfModeParameterCount(mode)'));
assert(source('parseGdtfDescription').includes('parameters:parseGdtfModeParameterCount(mode)'));
console.log('PASS: GDTF geometry instances, virtual parameters, 16-bit channels, nested references, mode counts and 38 × 400 = 15,200.');
