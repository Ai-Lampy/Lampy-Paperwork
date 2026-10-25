'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function source(name){const start=html.indexOf('function '+name+'('),end=html.indexOf('\nfunction ',start+1);assert(start>=0);return html.slice(start,end)}
const c=vm.createContext({});
for(const name of ['stripPowerPdfLiveLayout','addPatchPdfGroup','patchPdfGroupFits','fitPatchPdfScaledGroup'])vm.runInContext(source(name),c);
// Both preview routes must discard the live transform and stale full-table height before selecting rows.
for(const name of ['preparePowerPdfView','prepareFanOutPdfView'])assert(source(name).includes('stripPowerPdfLiveLayout(view)'));
for(const mode of ['power','fanOut']){
 const table={mode,rows:[1,2,3]},content={childNodes:[table],style:{transform:'scale(.2)',position:'absolute'}},host={style:{height:'3000px'},querySelector:()=>content,replaceWith(...nodes){this.replacement=nodes}},view={querySelectorAll:selector=>selector==='.liveResponsiveScaleHost'?[host]:[]};
 assert.equal(c.stripPowerPdfLiveLayout(view),view);assert.deepEqual(host.replacement,[table]);assert.equal(table.rows.length,3);
}
assert(source('lockPowerPdfColumnWidth').includes('sample?.offsetWidth'));
// Measured whole fixture groups: share a page if they fit, otherwise move intact.
const pages=[];
c.appendPatchPdfPage=()=>{const page={blocks:[],appendChild(block){this.blocks.push(block);block.parent=this},querySelector:()=>({getBoundingClientRect:()=>({top:256})})};pages.push(page);return {page}};
c.patchPdfGroupCount=page=>page.blocks.length;c.patchPdfExportColumns=()=>[];
c.patchPdfGroupElement=(group,rows)=>({rows,dataset:{},height:group.height,remove(){this.parent.blocks.splice(this.parent.blocks.indexOf(this),1)},getBoundingClientRect(){const i=this.parent.blocks.indexOf(this),top=50+this.parent.blocks.slice(0,i).reduce((n,b)=>n+b.height,0);return {top,bottom:top+this.height}}});
c.preparePatchPdfGroup=()=>{};let scaled=0;c.fitPatchPdfScaledGroup=block=>{assert.equal(block.parent.blocks.length,1);scaled++;block.height=200};
let state=c.appendPatchPdfPage();const groups=[{height:70,items:[1,2]},{height:80,items:[3]},{height:90,items:[4,5]}];for(const group of groups)state=c.addPatchPdfGroup(state,group,{},{});
assert.equal(pages.length,2);assert.equal(pages[0].blocks.length,2);assert.deepEqual(pages[1].blocks[0].rows,[4,5]);assert.equal(scaled,0);
state=c.addPatchPdfGroup(state,{height:500,items:[6,7,8]}, {},{});assert.equal(pages.length,3);assert.deepEqual(pages[2].blocks[0].rows,[6,7,8]);assert.equal(scaled,1);
assert(source('renderFixturePatchPdfPreview').includes('let patchState=null'));
// Height fitting uses actual footer space and survives subsequent measurement refreshes.
vm.runInContext(source('fitPatchPdfScaledGroup'),c);
const wrap={style:{},scrollWidth:1000,scrollHeight:1000},slot={style:{},dataset:{patchPdfFitHeight:'true'},clientWidth:500,querySelector:()=>wrap,closest:()=>({querySelector:()=>({getBoundingClientRect:()=>({top:306})})}),getBoundingClientRect:()=>({top:100})};
assert.equal(c.fitPatchPdfScaledGroup(slot),.2);assert.equal(slot.style.height,'200px');assert.equal(c.fitPatchPdfScaledGroup(slot),.2);
console.log('PASS: whole fixture groups share pages, oversized groups fit above footers, and Power/Fan-Out export copies discard live scale wrappers.');
