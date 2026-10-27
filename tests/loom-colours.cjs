'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),code=fs.readFileSync(path.join(root,'js/loom-colours.js'),'utf8');
function source(name){const start=html.indexOf('function '+name+'(');assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const out=html.slice(start,end+1);try{new vm.Script('('+out+')');return out}catch{}}throw Error(name)}
function classes(){const values=new Set();return {add:x=>values.add(x),remove:x=>values.delete(x),contains:x=>values.has(x)}}
const escape=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const loom={id:'loom1',name:'FOH',boxIt:'Tour case <A>',endsTogether:'male',cables:[{id:'a',colour1:'',colour2:'',colour3:''},{id:'b',colour1:'#ffffff',colour2:'',colour3:''}]};
const card={classList:classes()};card.classList.add('loomCardCollapsed');
const controls=[{disabled:false},{disabled:true}],rows=loom.cables.map(cable=>({dataset:{loomCableRow:cable.id},style:{},querySelector(sel){if(sel==='.loomDeleteCell')return {appendChild:field=>this.field=field};if(sel==='.loomCableColourFields')return this.field;return null}}));
const table={dataset:{loomTable:loom.id},closest:()=>card,querySelectorAll:sel=>sel.includes('input[data-loom-cell]')?controls:rows};
const pane={classList:classes(),appendChild:rail=>pane.rail=rail,querySelector:()=>pane.rail};
let saves=0,refreshes=0;
const context=vm.createContext({console,escapeHtml:escape,escapeAttr:escape,colourTextToHex:v=>v||'',normaliseBlankColour:v=>v||'',isNoColourText:v=>!v,normaliseHex:v=>v,normaliseLoomLength:(length,unit)=>({value:length,unit}),loomId:()=> 'new',LampyCableCatalogue:{metadata:()=>({})},$:id=>id==='loomEditorPane'?pane:id==='stripe'?{value:4}:null,loomById:id=>id===loom.id?loom:null,activeLoomEditorId:loom.id,loomEditorDraft:{name:'Unsaved name',boxIt:'Unsaved case'},persist:()=>saves++,refreshOpenPdfPreview:()=>refreshes++,styleAllColourInputs(){},styleColourTextInput(){},colourInputControl:(attrs,value)=>`<input ${attrs} value="${escape(value)}">`,document:{querySelectorAll:()=>[table],querySelector:()=>null,createElement(){return {className:'',innerHTML:'',querySelectorAll(){return ['colour1','colour2','colour3'].map(key=>({dataset:{loomCableColour:key},value:'',addEventListener(event,fn){this.fire=fn}})).map(input=>{(this.inputs||=[]).push(input);return input})},remove(){this.removed=true}}}}});
for(const name of ['colourSetPresentation','positionStripeBands','outlinedStripeBandStops','powerMultiColourBackground','normaliseLoomCable','normaliseLoom'])vm.runInContext(source(name),context);
vm.runInContext(code,context);
const before=JSON.stringify(loom),draft=JSON.stringify(context.loomEditorDraft);
context.beginLoomCableColours();assert(pane.classList.contains('loomColourEditing'));assert(!card.classList.contains('loomCardCollapsed'));assert(controls.every(c=>c.disabled));assert.equal(saves,0);
rows[0].field.inputs[0].value='#ffff3d';rows[0].field.inputs[0].fire();assert.equal(JSON.stringify(loom),before);assert(rows[0].style.cssText.includes('.5mm'));
context.finishLoomCableColours(false);assert.equal(JSON.stringify(loom),before);assert.equal(saves,0);assert(card.classList.contains('loomCardCollapsed'));assert.equal(controls[0].disabled,false);assert.equal(controls[1].disabled,true);assert.equal(JSON.stringify(context.loomEditorDraft),draft);
context.beginLoomCableColours();rows[0].field.inputs[0].value='#ff0000';rows[0].field.inputs[0].fire();rows[0].field.inputs[1].value='#ffffff';rows[0].field.inputs[1].fire();
loom.cables.reverse();context.finishLoomCableColours(true);assert.equal(loom.cables.find(c=>c.id==='a').colour1,'#ff0000');assert.equal(loom.cables.find(c=>c.id==='a').colour2,'#ffffff');assert.equal(loom.cables.find(c=>c.id==='b').colour1,'#ffffff');assert.equal(saves,1);assert.equal(refreshes,1);assert.equal(JSON.stringify(context.loomEditorDraft),draft);
context.finishLoomCableColours(true);assert.equal(saves,1);context.beginLoomCableColours();context.finishLoomCableColours(true);assert.equal(saves,1);
const loaded=context.normaliseLoom(JSON.parse(JSON.stringify(loom)));assert.equal(loaded.boxIt,'Tour case <A>');assert.equal(loaded.cables.find(c=>c.id==='a').colour2,'#ffffff');assert.equal(context.normaliseLoom({}).boxIt,'');
for(const values of [{},{colour1:'#ffffff'}]){const style=context.loomCableRowStyle(values);assert(style.includes('--loom-row-text:#111111'));assert(style.includes('--loom-row-stroke:0'))}
assert(context.loomCableRowStyle({colour1:'#ffff3d'}).includes('--loom-row-stroke:.5mm'));
assert(context.loomCableRowStyle({colour1:'#ff0000',colour2:'#ffffff',colour3:'#0000ff'}).includes('.3mm'));
assert.equal(context.loomBoxItRowMarkup({}), '');assert(context.loomBoxItRowMarkup(loom).includes('Tour case &lt;A>'));assert(context.loomBoxItRowMarkup(loom,4).includes('colspan="4"'));
assert(source('loomCardMarkup').includes('${endsRow}${loomBoxItRowMarkup(loom)}'));assert(source('saveLoomEditor').includes('loom.boxIt=String(draft.boxIt'));assert(html.includes('if(!loomCableColourEdit&&loomEditorPane'));
context.loomLengthText=()=>'';vm.runInContext(fs.readFileSync(path.join(root,'js/loom-pdf.js'),'utf8'),context);
const pdf=context.loomPdfRowGroups(loom).join('');assert(pdf.indexOf('Box It:')>pdf.indexOf('Male Ends Together'));assert(pdf.includes('data-loom-cable-pdf-colours'));assert(!pdf.includes('<input'));assert(!pdf.includes('onclick'));
console.log('PASS: loom cable colour drafts, cancel/no-op/save once, stable IDs, independent editor draft, existing disabled controls, Box It round trip, shared colours and PDF parity.');
