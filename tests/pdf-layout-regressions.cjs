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
// Every fixture group starts on a fresh page. Tall groups continue at the
// same scale, repeat the group heading, and retain all rows in their order.
const pages=[],preparedLayouts=[];
c.appendPatchPdfPage=()=>{const page={blocks:[],offsetHeight:300,appendChild(block){this.blocks.push(block);block.parent=this},getBoundingClientRect:()=>({height:300,bottom:300}),querySelector:()=>({getBoundingClientRect:()=>({top:256})})};pages.push(page);return {page}};
c.patchPdfGroupCount=page=>page.blocks.length;c.patchPdfExportColumns=()=>['same-columns'];
c.patchPdfGroupElement=(group,rows,columns)=>({rows,dataset:{},columns,group,heading:'Group',height:20+(group.height-20)*rows.length/group.items.length,querySelector(){return {append:text=>this.heading+=text}},remove(){this.parent.blocks.splice(this.parent.blocks.indexOf(this),1)},getBoundingClientRect(){const i=this.parent.blocks.indexOf(this),top=50+this.parent.blocks.slice(0,i).reduce((n,b)=>n+b.height,0);return {top,bottom:top+this.height}}});
c.preparePatchPdfGroup=block=>{if(!block.patchPdfLayout)block.patchPdfLayout={naturalWidth:1000,columns:[[40,60]]};preparedLayouts.push(block.patchPdfLayout)};
let state=c.appendPatchPdfPage();const groups=[{height:70,items:[1,2]},{height:80,items:[3]},{height:90,items:[4,5]}];for(const group of groups)state=c.addPatchPdfGroup(state,group,{},{});
assert.equal(pages.length,3);assert(pages.every(page=>page.blocks.length===1),'Small groups must not share a page');
const tall={height:500,items:[6,7,8]},original=JSON.stringify(tall);
state=c.addPatchPdfGroup(state,tall,{},{});
assert.equal(pages.length,6);assert.deepEqual(pages.slice(3).flatMap(page=>page.blocks.flatMap(block=>block.rows)),[6,7,8]);
const chunks=pages.slice(3).map(page=>page.blocks[0]);assert(chunks.every(block=>block.patchPdfLayout===chunks[0].patchPdfLayout));
assert.equal(chunks[0].heading,'Group');assert(chunks.slice(1).every(block=>block.heading==='Group (continued)'));
assert.equal(JSON.stringify(tall),original,'Pagination must not mutate fixture data');
state=c.addPatchPdfGroup(state,{height:40,items:[9]}, {},{});assert.equal(pages.length,7);assert.deepEqual(pages[6].blocks[0].rows,[9]);
state=c.addPatchPdfGroup(state,{height:200,items:[10]}, {},{});assert.equal(pages.length,8,'An exactly fitting group has no blank continuation');
const count=pages.length;state=c.addPatchPdfGroup(state,{height:0,items:[]}, {},{});assert.equal(pages.length,count);
assert.throws(()=>c.addPatchPdfGroup(state,{height:500,items:[11]}, {},{}),/heading and one row do not fit/,'An impossible single row reports a problem instead of shrinking');
assert(source('renderFixturePatchPdfPreview').includes('let patchState=null'));
// Table width fitting is independent of row count, footer space and preview zoom.
vm.runInContext(source('fitPatchPdfScaledGroup'),c);
const cols=[{style:{width:'400px'}},{style:{width:'600px'}}],table={style:{},querySelectorAll:()=>cols};
const wrap={style:{},get scrollWidth(){return parseFloat(this.style.width)||1000},scrollHeight:1000,querySelectorAll:()=>[table]};
const slot={style:{},dataset:{},clientWidth:500,querySelector:()=>wrap};
c.applyPatchTableColumnWidths=()=>{cols[0].style.width='400px';cols[1].style.width='600px'};c.fitPatchTableText=()=>{};
for(const height of [1000,100,3000,1000]){
 wrap.scrollHeight=height;
 assert.equal(c.fitPatchPdfScaledGroup(slot),.5);assert.equal(slot.style.height,Math.ceil(height*.5)+'px');
 assert.equal(parseFloat(wrap.style.width)*Number(slot.dataset.patchPdfScale),500);
 assert.equal(table.style.width,'100%');assert.deepEqual(cols.map(col=>col.style.width),['40%','60%']);
}
console.log('PASS: fresh page per fixture group, readable continuations with stable widths, ordered rows, repeated headings, exact fits and no height-based shrinking.');
