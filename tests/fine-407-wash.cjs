'use strict';
// Source: Fine Art FINE 407 WASH User Manual (2024-11-14), pages 2 and 5.
// https://ossen.fineart-light.com/upload/files/article/20241114/614c82a15c644f05b1f5bdffd9cd75dc.pdf
// Table p5 says Tilt 220 degrees; specification p2 says 230. Use the DMX table.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const {parserContext,documentTree,readArchives}=require('../scripts/sync-gdtf-parameters.cjs');
const fixture=JSON.parse(fs.readFileSync(path.join(root,'json/fixtures/fine-art.json'))).fixtures.find(f=>f.fixture==='FINE 407 WASH');
assert.deepEqual(fixture.modes,{STND:20});
assert.equal(fixture.watts,330);assert.equal(fixture.weight,6.8);
assert.deepEqual(fixture.gdtf.modes.STND,{channels:20,gdtfMode:'STND',status:'matched',parameters:13});
const file=path.join(root,'gdtf',fixture.gdtf.file);
assert.equal(path.basename(file),'Fine_Art@FINE_407_WASH@Lampy_2026-10-27.gdtf');
const doc=documentTree(readArchives([file])[file]),mode=doc.getElementsByTagName('DMXMode')[0],context=parserContext();
assert.equal(context.parseGdtfModeParameterCount(mode),13);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const name of ['gdtfOffsetValues','gdtfGeometryNode','parseGdtfModeChannelCount']){
  const start=html.indexOf('function '+name+'(');assert(start>=0);
  for(let end=html.indexOf('}',start);;end=html.indexOf('}',end+1)){
    assert(end>=0);const code=html.slice(start,end+1);
    try{new Function('return ('+code+')')}catch{continue}
    vm.runInContext(code,context);break;
  }
}
assert.equal(context.parseGdtfModeChannelCount(mode),20);
const channels=JSON.parse(execFileSync('python3',['-c',String.raw`
import sys,json,zipfile,xml.etree.ElementTree as E
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 r=E.fromstring(z.read('description.xml'))
 assert r.find('FixtureType').get('Manufacturer')=='Fine Art'
 assert r.find('FixtureType').get('Name')=='FINE 407 WASH'
 channels=r.findall('.//DMXChannel')
 json.dump([{'offset':c.get('Offset'),'attribute':c.find('LogicalChannel').get('Attribute'),'functions':[(f.get('Name'),f.get('DMXFrom')) for f in c.findall('.//ChannelFunction')]} for c in channels],sys.stdout)
`,file],{encoding:'utf8'}));
assert.deepEqual(channels.map(c=>[c.offset,c.attribute]),[
 ['1,2','ColorAdd_R'],['3,4','ColorAdd_G'],['5,6','ColorAdd_B'],['7,8','ColorAdd_W'],
 ['9','CTO'],['10','ColorMacro1'],['11','Shutter1'],['12,13','Dimmer'],['14,15','Pan'],
 ['16,17','Tilt'],['18','Control1'],['19','FixtureGlobalReset'],['20','Zoom']
]);
assert.deepEqual(channels.flatMap(c=>c.offset.split(',').map(Number)).sort((a,b)=>a-b),Array.from({length:20},(_,i)=>i+1));
for(const [offset,starts] of [['9',[0,4,5,6,7,8,9,10]],['10',[0,10,17,28,242]],['11',[0,4,104,108,208,213,252]],['19',[0,26,77,128]]]){
 assert.deepEqual(channels.find(c=>c.offset===offset).functions.map(f=>Number(f[1].split('/')[0])),starts);
}
console.log('PASS: FINE 407 WASH 20-slot DMX map, 13 parameters, function boundaries, library metadata and archive CRC.');
