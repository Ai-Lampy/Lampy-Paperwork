'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),code=fs.readFileSync(path.join(root,'js/loom-pdf.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const parent={id:'a',name:'FOH',colour1:'#ffff3d',colour2:'#ffffff',endsTogether:'male',cables:[{label:'A',cableType:'DMX',length:'10',unit:'m',notes:'<do not edit>'}]};
const extension={id:'b',parentLoomId:'a',name:'FOH EXT',cables:[{label:'B',cableType:'CAT6',length:'20',unit:'m',notes:''}]};
const collapsed=new Set(['a','b']),groups=[{parent,extensions:[extension]}];
const c=vm.createContext({console,escapeHtml:escape,escapeAttr:escape,loomDisplayGroups:()=>groups,loomById:()=>parent,loomLengthText:(value,unit)=>value+unit,colourTextToHex:value=>value||'',loomHeadingStyle:()=> '--loom-title-stroke-width:.8mm',collapsedLoomCards:collapsed});
vm.runInContext(code,c);
const before=JSON.stringify(groups),source=c.loomPdfSource();assert.equal(source.length,2);assert.equal(source[1].feeder,'FOH');assert.equal(JSON.stringify(groups),before);assert.deepEqual([...collapsed],['a','b']);
source[0].cables[0].notes='changed';assert.equal(parent.cables[0].notes,'<do not edit>');
const row=c.loomPdfRowMarkup(parent.cables[0]);assert(row.includes('&lt;do not edit>'));assert(!row.includes('<input'));assert(!row.includes('connector'));
const section=c.loomPdfSectionMarkup(extension);assert(!section.includes('(continued)'));assert(section.includes('<th>Notes</th>'));assert(!section.includes('onclick'));assert(!section.includes('Delete'));
assert(c.loomPdfRowGroups(parent)[0].includes('Male Ends Together'));assert.equal(c.loomPdfRowGroups({cables:[]}).length,1);
// Run actual packing with measured complete cards and detachable nodes.
const pages=[];let finalised=0;
const host={querySelectorAll:()=>pages};
c.finalisePdfPageChrome=items=>{finalised=items.length};
c.loomPdfCreatePage=()=>{
 const content={children:[],style:{},appendChild(card){card.parent=this;this.children.push(card)},getBoundingClientRect(){const height=this.children.reduce((n,card)=>n+card.height,0)+Math.max(0,this.children.length-1)*12;return {top:50,height,bottom:50+height}}};
 const page={content,querySelector:()=>({getBoundingClientRect:()=>({top:256})})};pages.push(page);return {page,content};
};
c.document={createElement:()=>({set innerHTML(value){const count=[...value.matchAll(/<td/g)].length/4;this.card={height:30+count*40,markup:value,remove(){this.parent.children.splice(this.parent.children.indexOf(this),1)}}},get content(){return {firstElementChild:this.card}}})};
const cables=Array.from({length:8},(_,i)=>({label:String(i),cableType:'DMX',length:'10',unit:'m',notes:''}));
c.buildLoomPdfPages(host,[{...parent,cables}],{});assert.equal(finalised,1);assert.equal(pages[0].content.children.length,1);assert(pages[0].content.style.transform.startsWith('scale('));assert(pages[0].content.children[0].markup.includes('Male Ends Together'));
pages.length=0;const small={...parent,endsTogether:''};c.buildLoomPdfPages(host,[small,{...small,id:"c"},{...small,id:"d"}],{});assert.equal(pages.length,2);assert.equal(pages[0].content.children.length,2);assert.equal(pages[1].content.children.length,1);assert(pages.every(page=>page.content.getBoundingClientRect().bottom<=250));
pages.length=0;c.buildLoomPdfPages(host,[small,{...parent,id:"c",cables},{...small,id:"d"}],{});assert.equal(pages.length,3);assert.equal(pages[0].content.style.transform,undefined);assert(pages[1].content.style.transform.startsWith('scale('));assert.equal(pages[2].content.style.transform,undefined);
// Stale renders cannot replace a later session or later paper/logo settings.
vm.runInContext('loomPdfSession={version:2}',c);const session=vm.runInContext('loomPdfSession',c);assert(c.loomPdfRenderCurrent(session,2));assert(!c.loomPdfRenderCurrent(session,1));assert(!c.loomPdfRenderCurrent({version:2},2));
for(const text of ["mode==='looms'?'#loomPdfPaperSize'","mode==='looms'?'#loomPdfOrientation'","mode==='looms'?'[data-loom-pdf-zoom]'","else if(mode==='looms')renderLoomPdfPreview()",'closeLoomPdfPreview();','[data-loom-pdf-colours]'])assert(html.includes(text),text);
assert(html.includes('onclick="openLoomPdfPreview()">PDF Export'));
assert(code.includes('await deviceConfigPdfAssetsReady(stage)'));assert(code.includes("querySelectorAll('#loomPdfPages .exportPage')"));assert(code.includes('await patchPdfPageToJpeg(page)'));assert(!code.includes('persist('));
console.log('PASS: all expanded loom sources, escaped display-only rows, whole-card page packing, footer protection, stale renders and shared PDF controls/capture.');

const grouped=c.loomPdfGroups(c.loomPdfSource());assert.equal(grouped.length,1);assert.equal(grouped[0].length,2);
const groupMarkup=c.loomPdfGroupMarkup(grouped[0]);assert(groupMarkup.includes('loomPdfExtensionStack'));assert(groupMarkup.includes('>Extension</span>'));assert(groupMarkup.indexOf('FOH</h3>')<groupMarkup.indexOf('FOH EXT</h3>'));
assert(html.includes('.loomPdfGroup{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'));assert(html.includes('.loomPdfEnds td{text-align:center;color:#c00000;font-weight:900'));
pages.length=0;c.buildLoomPdfPages(host,c.loomPdfSource(),{});assert.equal(pages.length,1);assert.equal(pages[0].content.children.length,1);assert(pages[0].content.children[0].markup.includes('FOH EXT'));
