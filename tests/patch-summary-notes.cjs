'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function source(name){const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const code=html.slice(start,end+1);try{new Function('return ('+code+')');return code}catch{}}throw Error(name)}
function add(c,...names){names.forEach(name=>vm.runInContext(source(name),c))}
const plain=v=>JSON.parse(JSON.stringify(v));
const c=vm.createContext({PATCH_COLUMN_DEFAULTS:{},PATCH_TITLE_DEFAULT_FONT:'Project',PATCH_LEGACY_DEFAULT_FONT:'Cochin',patchTitleFontSize:v=>Number(v)||26,escapeHtml:s=>String(s??'').replaceAll('<','&lt;')});
add(c,'defaultPatchViewOptions','normalisePatchViewOptions','normalisePatchUniverseAddress','validPatchSeparator','patchSummaryNoteLines','patchPdfSummaryRows','patchPdfSupplementElement');
assert.equal(c.normalisePatchViewOptions({}).pdf.summaryNotes,'');assert.equal(c.normalisePatchViewOptions({}).pdf.showSummaryNotes,true);
const saved=c.normalisePatchViewOptions({pdf:{summaryNotes:'First\r\nSecond',showSummaryNotes:false}}),loaded=c.normalisePatchViewOptions(plain(saved));assert.equal(loaded.pdf.summaryNotes,'First\nSecond');assert.equal(loaded.pdf.showSummaryNotes,false);
assert.equal(c.normalisePatchViewOptions({pdf:{summaryNotes:{bad:true}}}).pdf.summaryNotes,'');
for(const width of [20,35]){const text='First line\n\nSecond with many words and AVeryLongWordThatMustWrapWithoutDroppingCharacters';const lines=plain(c.patchSummaryNoteLines(text,width,s=>s.length));assert(lines.every(l=>l.length<=width));assert(lines.includes(''));assert.equal(lines.join(''),text.replaceAll('\n',''));}
assert.deepEqual(plain(c.patchSummaryNoteLines('a\r\nb\rc',50,s=>s.length)),['a','b','c']);
c.document={createElement:()=>({classList:{add(){}}})};
const rows=c.patchPdfSummaryRows([{items:[{manufacturer:'A',fixture:'X'}, {manufacturer:'A',fixture:'X'}, {manufacturer:'B',fixture:'Y'}]}]);
const markup=c.patchPdfSupplementElement('summary',rows,{final:true,universes:1}).innerHTML;
assert(markup.includes('Total Number of Fixtures = 3'));assert(markup.indexOf('Total Number')<markup.indexOf('Patched Universes'));
assert(!c.patchPdfSupplementElement('summary',rows).innerHTML.includes('Total Number'));
assert(c.patchPdfSupplementElement('summary',[],{final:true,universes:0}).innerHTML.includes('Total Number of Fixtures = 0'));
// Exercise notes editing: hide never clears text; controls follow whitespace state; save once.
{
 const nodes={patchPdfSummaryNotes:{value:'Keep these notes'},patchPdfShowSummaryNotes:{checked:false},patchPdfShowSummaryNotesControl:{classList:{toggle:(name,hidden)=>nodes.hidden=hidden}}};let saves=0,renders=0;
 const p=vm.createContext({fixturePatchViewOptions:{pdf:{}},$:id=>nodes[id],persist:()=>saves++,renderFixturePatchPdfPreview:()=>renders++});add(p,'syncPatchPdfSummaryNotesVisibility','updatePatchPdfSummaryNotes');
 p.updatePatchPdfSummaryNotes();assert.equal(p.fixturePatchViewOptions.pdf.summaryNotes,'Keep these notes');assert.equal(p.fixturePatchViewOptions.pdf.showSummaryNotes,false);assert.equal(nodes.hidden,false);assert.equal(saves,1);assert.equal(renders,1);
 nodes.patchPdfSummaryNotes.value=' \n ';p.updatePatchPdfSummaryNotes();assert.equal(nodes.hidden,true);
 nodes.patchPdfSummaryNotes.value='Restored';nodes.patchPdfShowSummaryNotes.checked=true;p.updatePatchPdfSummaryNotes();assert.equal(nodes.hidden,false);assert.equal(p.fixturePatchViewOptions.pdf.showSummaryNotes,true);
}
// Measured DOM model tests actual paginator in portrait/landscape capacities and widths.
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.clientWidth=0;this.textContent=''}
 appendChild(child){child.remove();child.parent=this;child.clientWidth=this.clientWidth;this.children.push(child);return child}
 remove(){if(this.parent){this.parent.children=this.parent.children.filter(c=>c!==this);this.parent=null}}
 get height(){if(this.className==='patchPdfSummaryNotesTitle')return 28;if(this.className==='patchPdfSummaryNoteLine')return 22;if(this.className==='patchPdfSummaryNotes')return 16+this.children.reduce((s,c)=>s+c.height,0);return this.fixedHeight||0}
}
for(const [capacity,width] of [[300,180],[190,280]]){
 for(const firstSpace of [0,65,150]){
  const pages=[];const make=()=>{const page=new Element('page');page.clientWidth=width;pages.push(page);return {page}};
  const initial=make(),summary=new Element('summary');summary.fixedHeight=capacity-firstSpace;initial.page.appendChild(summary);
  const p=vm.createContext({document:{createElement:tag=>new Element(tag)},getComputedStyle:()=>({fontStyle:'normal',fontWeight:'400',fontSize:'16px',fontFamily:'Project'}),patchTextWidth:s=>s.length*8,appendPatchPdfPage:make,patchSummaryPageOverflow:page=>page.children.reduce((s,c)=>s+c.height,0)>capacity});
  add(p,'patchSummaryNoteLines','patchSummaryNotesBlock','appendPatchSummaryNotes');
  const text='First paragraph\n\n'+('Long notes stay readable and keep all of their text. '.repeat(30))+'\nLast line';
  p.appendPatchSummaryNotes({}, {},initial,{summaryNotes:text});
  const blocks=pages.flatMap(page=>page.children.filter(el=>el.className==='patchPdfSummaryNotes'));
  assert(blocks.length>1);assert.equal(blocks[0].children[0].textContent,'Notes');assert(blocks.slice(1).every(b=>b.children[0].textContent==='Notes (continued)'));
  assert(blocks.every(b=>b.children.length>=2),'no orphan notes heading');
  assert.equal(blocks.flatMap(b=>b.children.slice(1).map(l=>l.textContent)).join(''),text.replaceAll('\n',''));
  pages.forEach(page=>assert(page.children.reduce((s,c)=>s+c.height,0)<=capacity,'footer protected'));
  assert.equal(summary.fixedHeight,capacity-firstSpace,'summary never shrinks for notes');
  const before=pages.length;for(const pdf of [{summaryNotes:''},{summaryNotes:' \n '},{summaryNotes:'Hidden',showSummaryNotes:false},{summaryNotes:'Hidden',showSummary:false}])p.appendPatchSummaryNotes({}, {},initial,pdf);assert.equal(pages.length,before);
 }
}
// Drive the summary paginator with both totals reserving height and a filtered quantity.
{
 const pages=[],p=vm.createContext({});add(p,'appendPatchSupplementPages');p.measurePatchSummaryWidths=()=>[150,140,60,50];p.fitPatchSummarySingleRow=()=>{};
 p.appendPatchPdfPage=()=>{const page={blocks:[],appendChild(block){block.page=this;this.blocks.push(block)}};pages.push(page);return {page}};
 p.patchPdfSupplementElement=(kind,items,opts)=>({items:[...items],opts,height:40+items.length*30+(opts.final?50:0),remove(){this.page.blocks=this.page.blocks.filter(b=>b!==this)}});
 p.patchSummaryPageOverflow=(page,block)=>block.height>150;
 p.appendPatchSupplementPages({}, {},'summary',[{quantity:2},{quantity:3},{quantity:4},{quantity:5}],{universes:2});
 const blocks=pages.flatMap(p=>p.blocks);assert.equal(blocks.at(-1).opts.total,14);assert.equal(blocks.at(-1).opts.universes,2);assert(blocks.at(-1).items.length>0);assert(blocks.every(b=>b.height<=150));assert.equal(blocks.filter(b=>b.opts.final).length,1);
}
// Vector notes consume measured DOM lines without a second wrapping/shrinking pass.
{
 const p=vm.createContext({getComputedStyle:()=>({fontSize:'16px',color:'#000'}),pdfFontFromStyle:()=>'/F1',pdfSetFill(){},pdfCssColour:c=>c,pdfPt:n=>n.toFixed(2),pdfText:t=>t});add(p,'patchPdfDrawSummaryNoteLine');const doc={h:800,cmd:[]};p.patchPdfDrawSummaryNoteLine(doc,{textContent:'Exact line'}, {x:20,y:50,h:22,w:180},.75);assert(doc.cmd[0].includes('/F1 12.00 Tf'));assert(doc.cmd[0].includes('(Exact line) Tj'));assert(!source('patchPdfDrawSummaryNoteLine').includes('pdfDrawCellText'));
}
for(const selector of ['.patchPdfFixtureTotal','.patchPdfUniverseTotal','.patchPdfSummaryNotesTitle','.patchPdfSummaryNoteLine'])assert(source('fixturePatchDomPdfBytes').includes(selector));
assert(source('fixturePatchDomPdfBytes').includes('patchPdfDrawSummaryNoteLine'));
assert(source('fixturePatchPreviewPdfBytes').includes('await preparePatchPdfExport()'));
assert(source('preparePatchPdfExport').includes('await document.fonts.ready'));
assert(source('renderFixturePatchPdfPreview').includes('appendPatchSummaryNotes(pages,d,summaryState,pdf)'));
assert(html.includes('id="patchPdfSummaryNotes" rows="4"'));
console.log('PASS: V50.7 fixture totals, saved notes, visibility, wrapping, continuation pages and vector line parity.');
// Full render ordering includes notes pages before fixture tables and final token totals.
{
 const pageList=[],order=[],totals=[],host={querySelectorAll:()=>pageList,querySelector:()=>pageList[0]};
 const p=vm.createContext({patchPdfRenderRequest:0,document:{fonts:{status:'loaded'}},$:()=>host,fixturePatchViewOptions:{pdf:{showSummary:true,showRevisionNotes:true,summaryNotes:'Notes'}},syncPatchPdfHiddenColumnsControl(){},patchPdfPaperDimensions:()=>({}),patchGroups:()=>[{items:[]}],patchPdfSummaryRows:()=>[],patchPdfPatchedUniverses:()=>0,patchPdfRevisionRows:()=>[],appendPatchSupplementPages:(host,d,kind)=>{order.push(kind);pageList.push(kind);return {page:kind}},appendPatchSummaryNotes:()=>{order.push('notes');pageList.push('notes','notes-continuation')},appendPatchPdfPage:()=>{pageList.push('fixtures');return {}},addPatchPdfGroup:()=>order.push('fixtures'),refreshPatchPdfMeasurements(){},finalisePdfPageChrome:pages=>totals.push(pages.length),runAfterProjectFontsReady:fn=>fn(),requestAnimationFrame:fn=>fn(),updatePatchPdfZoom(){}});
 add(p,'renderFixturePatchPdfPreview');p.renderFixturePatchPdfPreview();assert.deepEqual(order,['summary','notes','fixtures','revision']);assert.deepEqual(totals,[5,5]);
 pageList.length=order.length=totals.length=0;p.fixturePatchViewOptions.pdf.showSummary=false;p.renderFixturePatchPdfPreview();assert.deepEqual(order,['fixtures','revision']);assert.deepEqual(totals,[2,2]);
}
