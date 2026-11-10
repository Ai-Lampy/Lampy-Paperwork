'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function source(name){const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const code=html.slice(start,end+1);try{new Function('return ('+code+')');return code}catch{}}throw Error(name)}
const element=hidden=>({innerHTML:'',classList:{hidden,contains(){return this.hidden},add(){this.hidden=true},remove(){this.hidden=false}}});
const nodes={fixturePatchModal:element(false),patchOptionsModal:element(true),fixturePatchPicker:element(false)},inputs={patchQuantity:'2',patchFixId:'101',patchUniverse:'',patchAddress:''},events={};let rows=[],opens=0,alerts=[];
const context=vm.createContext({console,fixturePatchSelection:{},fixturePatchPickerTab:'patched',fixturePatchSearch:{manufacturer:'',fixture:'',mode:''},fixturePatchReference:{manufacturers:{}},patchFixtureRows:()=>rows,fixtureWithProjectOverride:fixture=>fixture,$:id=>nodes[id]||{value:inputs[id]||''},saveFixturePickerScroll(){},restoreFixturePickerScroll(){},clearFixturePickerThumbnails(){},renderPatchOptionsModal:()=>opens++,renderPatchUniverseViewer(){},fitPatchFixtureStatus(){},requestAnimationFrame:fn=>fn(),alert:text=>alerts.push(text),normalisePatchFixture:row=>row,colourTextToHex:value=>value,document:{body:{},addEventListener:(name,handler)=>events[name]=handler,querySelectorAll:()=>[]},MutationObserver:class{observe(){}}});
for(const name of ['normaliseImportMatch','normalisePatchMode','modeChannels','modeWatts','modeWeight','fixtureModeKey','patchFixturesFor','selectedPatchFixture','patchModesForSelection','patchedFixtureOptions','selectPatchedFixture','selectPatchManufacturer','selectPatchFixture','selectPatchMode','escapeHtml','escapeAttr','fixturePickButton','renderFixturePatchPicker','closeFixturePatchModal','openPatchOptionsModal','fixtureGdtfReference','incrementMaybe','buildPendingPatchAdds'])vm.runInContext(source(name),context);
vm.runInContext(fs.readFileSync(path.join(root,'js/ui-support.js'),'utf8'),context);
function choose(manufacturer,fixture,mode,channels){
 nodes.fixturePatchModal.classList.hidden=false;nodes.patchOptionsModal.classList.hidden=true;context.fixturePatchPickerTab='patched';context.renderFixturePatchPicker();
 const encoded=[...nodes.fixturePatchPicker.innerHTML.matchAll(/data-fixture-action="([^"]+)"/g)].map(match=>JSON.parse(match[1].replace(/&(quot|#039|amp|lt|gt);/g,(all,key)=>({quot:'"','#039':"'",amp:'&',lt:'<',gt:'>'}[key])))).find(action=>action[1]===manufacturer&&action[2]===fixture&&action[3]===mode&&(action.length<5||action[4]===channels));assert(encoded,'fixture button rendered');
 const button={dataset:{fixtureAction:JSON.stringify(encoded)}};events.click({target:{closest:selector=>selector==='[data-fixture-action]'?button:null}});
}
const glp=JSON.parse(fs.readFileSync(path.join(root,'json/fixtures/glp.json'),'utf8')),real=glp.fixtures.find(f=>f.fixture==='impression FR10 Bar'),key='M1 Normal (25ch)',mode=real.modes[key];
context.fixturePatchReference.manufacturers[glp.manufacturer]=glp.fixtures;rows=[{manufacturer:glp.manufacturer,fixture:real.fixture,mode:mode.displayName,channels:mode.channels}];
choose(glp.manufacturer,real.fixture,mode.displayName,mode.channels);
assert.equal(opens,1,'a displayed mode name must open the next patch screen');assert(nodes.fixturePatchModal.classList.hidden);assert(!nodes.patchOptionsModal.classList.hidden);assert.equal(context.fixturePatchSelection.mode,key);
const adds=context.buildPendingPatchAdds();assert.equal(adds.length,2);assert(adds.every(row=>row.mode===mode.displayName&&row.channels===mode.channels&&row.fixture===real.fixture));
// Exercise every stored catalogue mode, including display names, raw keys and zero-channel modes.
let checked=0;
for(const file of fs.readdirSync(path.join(root,'json/fixtures')).filter(file=>file.endsWith('.json'))){const library=JSON.parse(fs.readFileSync(path.join(root,'json/fixtures',file),'utf8'));if(!Array.isArray(library.fixtures))continue;context.fixturePatchReference.manufacturers[library.manufacturer]=library.fixtures;const unchanged=JSON.stringify(library);
 for(const fixture of library.fixtures)for(const [internal,value] of Object.entries(fixture.modes||{})){
  const meta=context.normalisePatchMode(value),display=meta.displayName||internal;rows=[{manufacturer:library.manufacturer,fixture:fixture.fixture,mode:display,channels:meta.channels}];const before=opens;choose(library.manufacturer,fixture.fixture,display,meta.channels);assert.equal(opens,before+1,library.manufacturer+' / '+fixture.fixture+' / '+display);assert.equal(context.patchModesForSelection().find(m=>m.mode===context.fixturePatchSelection.mode).channels,meta.channels);const built=context.buildPendingPatchAdds();assert.equal(built[0].channels,meta.channels);checked++;
 }
 assert.equal(JSON.stringify(library),unchanged,'selection must not change the fixture library');
}
// Channel counts disambiguate shared display names and never select a mismatched footprint.
const fixture={fixture:'Shared',modes:{small:{channels:10,displayName:'Standard'},large:{channels:20,displayName:'Standard'},manual:{channels:0,displayName:'Non-DMX'}},modeAliases:{Legacy:'large'}};context.fixturePatchReference.manufacturers.Test=[fixture];
for(const [display,channels,expected] of [['Standard',10,'small'],['Standard',20,'large'],['large',20,'large'],['Legacy',20,'large'],['Non-DMX',0,'manual']]){
 rows=[{manufacturer:'Test',fixture:'Shared',mode:display,channels}];const before=opens;choose('Test','Shared',display,channels);assert.equal(opens,before+1);assert.equal(context.fixturePatchSelection.mode,expected);
}
rows=[{manufacturer:'Test',fixture:'Shared',mode:'Standard',channels:11}];let before=opens;choose('Test','Shared','Standard',11);assert.equal(opens,before);assert(!nodes.fixturePatchModal.classList.hidden);assert(alerts.at(-1).includes('Library'),'unmatched modes explain how to proceed');
rows=[{manufacturer:'Test',fixture:'Shared',mode:'Removed mode',channels:20}];before=opens;choose('Test','Shared','Removed mode',20);assert.equal(opens,before);assert(alerts.at(-1).includes('Removed mode'));
// Project-only fixtures still use their saved mode when absent from the catalogue.
rows=[{manufacturer:'Custom & Co',fixture:'Tour "Special"',mode:"Owner's mode",channels:0,watts:250,weight:10}];before=opens;choose(rows[0].manufacturer,rows[0].fixture,rows[0].mode,0);assert.equal(opens,before+1);const custom=context.buildPendingPatchAdds();assert.equal(custom[0].channels,0);assert.equal(custom[0].universe,'');assert.equal(custom[0].watts,250);
console.log('PASS: Patched-tab click routing, '+checked+' catalogue modes, display/internal/alias resolution, channel disambiguation, non-DMX/custom fixtures, add-row data and explicit missing-mode feedback.');
