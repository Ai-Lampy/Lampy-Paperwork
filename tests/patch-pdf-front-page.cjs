'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),code=fs.readFileSync(path.join(root,'js/patch-pdf-front-page.js'),'utf8');
function source(name){const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const code=html.slice(start,end+1);try{new Function('return ('+code+')');return code}catch{}}throw Error(name)}
const plain=v=>JSON.parse(JSON.stringify(v)),escape=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const consoles=[{id:'c1',name:'Full-size',manufacturer:'MA',customName:'Main',softwareMode:'Mode 3',protocol1:'old',ip1:'old'},{id:'c2',name:'Backup',manufacturer:'MA',protocol2:'sACN',ip2:'10.0.0.2'}],npus=[{name:'XL',manufacturer:'MA'},{name:'XL',manufacturer:'MA'},{name:'L',manufacturer:'MA'}];
const c=vm.createContext({app:{controlNetwork:{consoles,npus}},normaliseControlNetwork:v=>v,consoleRefForItem:()=>null,npuRefForItem:()=>null,controlEffectiveName:v=>v.customName||v.name,controlDeviceSoftwareVersionText:()=>'<custom>',ipDeviceInterfaces:()=>[],deviceConfigPortsFor:d=>d.id==='c1'?[{category:'network',protocol:'MA-Net3',ip:'192.168.1.10'}]:[],homeParametersAvailable:()=>32768,fixtureParametersRequired:()=>15200,escapeHtml:escape});vm.runInContext(code,c);vm.runInContext(source('patchSummaryNoteLines'),c);
const data=c.patchPdfControlData();assert.equal(data.consoles.length,2);assert.equal(data.consoles[0].cells[4],'192.168.1.10');assert.equal(data.consoles[0].protocols[0],'MA-Net3');assert.equal(data.consoles[1].cells[5],'10.0.0.2');assert.equal(data.npus[0].quantity,2);
const markup=c.patchPdfControlMarkup(data);assert(markup.includes('&lt;custom&gt;'));assert(!markup.includes('<h2'));assert(markup.includes('<th>MA-Net3</th>'));assert(!markup.includes('<td>MA-Net3'));assert(markup.includes('<th>sACN</th>'));assert.equal((markup.match(/Parameters Available/g)||[]).length,1);assert(markup.indexOf('NPU Type')>markup.indexOf('Backup'));assert(markup.indexOf('Parameters Available')>markup.indexOf('NPU Type'));assert(markup.includes('32,768'));
assert(c.patchPdfControlMarkup({consoles:[],npus:[],parameters:'—'}).includes('No consoles added.'));
assert.deepEqual(plain(c.patchPdfNoteItems({summaryNotes:'Old\nNotes'})),['Old','Notes']);assert.deepEqual(plain(c.patchPdfNoteItems({summaryNoteItems:['one\nwrapped','two'],summaryNotes:'legacy'})),['one\nwrapped','two']);
assert.equal(c.patchPdfConsoleTypeSize('short',100,()=>50),10);assert.equal(c.patchPdfConsoleTypeSize('long',100,(s,size)=>size*12),8.25);assert.equal(c.patchPdfConsoleTypeSize('very long',10,()=>500),7);
for(const count of [0,3,4,5,6,10,13]){const result=c.patchPdfNotesColumns(Array.from({length:count},(_,i)=>'Note '+(i+1)),'numbered',1000,s=>s.length*6);assert.equal(result.columns,4);assert.equal(result.chunks.length,count);for(let i=0;i<count;i++)assert.equal(result.chunks[i][0],`${i+1}. Note ${i+1}`)}
const wrapped=c.patchPdfNotesColumns(['a\nb\nc\nd\ne','second'],'bullet',1000,s=>s.length*6);assert.equal(wrapped.columns,4);assert.equal(wrapped.chunks[0].length,5);assert.equal(wrapped.chunks[1][0],'• second');
assert(!html.includes('patchPdfFrontLayout'));assert(html.includes('>Add Note</button>'));assert(html.includes('onclick="updatePatchPdfSummaryNotes()">Update Notes'));assert(!html.includes('oninput="updatePatchPdfSummaryNotes()"'));
let saves=0,renders=0;const fields=[{value:'Draft'},{value:'line two'},{value:''}],controls={patchPdfSummaryNotes:{querySelectorAll:()=>fields},patchPdfShowSummaryNotes:{checked:false},patchPdfNoteStyle:{value:'numbered'}},pdf={summaryNotes:'Committed',showSummaryNotes:true};
Object.assign(c,{$:id=>controls[id],fixturePatchViewOptions:{pdf},persist:()=>saves++,renderFixturePatchPdfPreview:()=>renders++,syncPatchPdfSummaryNotesVisibility(){}});vm.runInContext(source('updatePatchPdfSummaryNotesVisibility')+'\n'+source('updatePatchPdfSummaryNotes'),c);
c.updatePatchPdfSummaryNotesVisibility();assert.equal(pdf.summaryNotes,'Committed');assert.equal(fields[0].value,'Draft');c.updatePatchPdfSummaryNotes();assert.equal(pdf.summaryNotes,'Draft\nline two\n');assert.equal(pdf.summaryNoteStyle,'numbered');assert.equal(saves,2);assert.equal(renders,2);
controls.patchPdfShowControl={checked:true};controls.patchPdfShowUniverseTotal={checked:false};const committed=pdf.summaryNotes;fields[0].value='Uncommitted change';c.updatePatchPdfFrontOptions();assert.equal(pdf.showControl,true);assert.equal(pdf.showUniverseTotal,false);assert.equal(pdf.summaryNotes,committed);assert.equal(saves,3);assert.equal(renders,3);

function node(){return {children:[],style:{},dataset:{},classList:{toggle(){}},appendChild(child){this.children.push(child);return child},append(...children){children.forEach(child=>this.appendChild(child))},replaceChildren(...children){this.children=children},setAttribute(){},focus(){this.focused=true},querySelectorAll:()=>[]}}
const host=node();controls.patchPdfSummaryNotes=host;Object.assign(c,{document:{createElement:node}});c.patchPdfNotesEditor({summaryNotes:''});assert.equal(host.children.length,3);c.addPatchPdfNoteField('',true);assert.equal(host.children.length,4);assert(host.children[3].children[0].focused);assert.equal(saves,3);
// Single-page assembly and relocation: totals outside the tables, notes after totals.
let pageCount=0;Object.assign(c,{appendPatchPdfPage:()=>{pageCount++;return {page:node()}},patchPdfSummaryRows:()=>[{quantity:2},{quantity:3}],fixtureParametersRequired:()=>15200,patchPdfPatchedUniverses:()=>4,patchPdfSupplementElement:(kind,rows,options)=>({...node(),kind,options,querySelector:()=>({kind:'totals'})}),patchSummaryNotesBlock:()=>({...node(),kind:'notes'}),fitPatchPdfFrontPage:()=>{}});
// Use the real fitting functions separately below, with measured bounds.
const realFit=code.slice(code.indexOf('function fitPatchPdfFrontPage('),code.indexOf('function patchPdfFrontTextScale('));
const makeNode=c.document.createElement;c.document.createElement=()=>({...makeNode(),insertAdjacentHTML(where,text){this.markup=text}});
for(const showControl of [false,true]){pageCount=0;const state=c.appendPatchPdfFrontPage({}, {},[],{showSummary:true,showControl,summaryNoteItems:['a','b'],showSummaryNotes:true});const front=state.page.children[0],tables=front.children[0],details=front.children[1];assert.equal(pageCount,1);assert.equal(front.dataset.control,String(showControl));assert.equal(tables.children.length,1);assert.deepEqual(details.children[0].children.map(node=>node.textContent),['Parameter Count - 15,200','Total Number of Fixtures = 5','Patched Universes: 4']);assert.equal(front.children[2].kind,'notes');assert.equal(!!tables.markup,showControl)}
// Independently switch summary, universe total, console info and notes.
for(const showSummary of [false,true])for(const showUniverseTotal of [false,true])for(const showControl of [false,true])for(const showSummaryNotes of [false,true]){
 const options={showSummary,showUniverseTotal,showControl,showSummaryNotes,summaryNoteItems:['Committed note']};
 assert.equal(c.patchPdfHasFrontPage(options),showSummary||showUniverseTotal||showControl||showSummaryNotes);
 const state=c.appendPatchPdfFrontPage({}, {},[],options),front=state.page.children[0],tables=front.children[0],details=front.children[1];
 assert.equal(tables.children.length,Number(showSummary));assert.equal(!!tables.markup,showControl);
 assert.equal(details.children.length,1);assert.equal(front.children.length,2+Number(showSummaryNotes));
 const totals=details.children[0].children;assert.equal(totals[0].className,'patchPdfParameterTotal');
 assert.equal(totals.some(n=>n.className==='patchPdfFixtureTotal'),showSummary);assert.equal(totals.some(n=>n.className==='patchPdfUniverseTotal'),showUniverseTotal);
}
assert.equal(c.patchPdfHasFrontPage({showSummary:false,showUniverseTotal:false,showControl:false,summaryNoteItems:['  ']}),false);
Object.assign(c,{ensureProjectInfo:()=>({file:{projectName:'Tour <Name>',version:'7'}}),escapeAttr:escape,fixturePatchViewOptions:{titleFormat:{font:'Arial'},pdf:{}}});
vm.runInContext(source('patchPdfProjectHeader'),c);const header=c.patchPdfProjectHeader();assert(header.includes('<h2>Tour &lt;Name&gt;</h2><h3>Fixture Patch - Version 7</h3>'));assert(!header.includes('Parameter Count'));
const modal=html.slice(html.indexOf('<div id="fixturePatchPdfModal"'),html.indexOf('<div id="fixturePatchPdfModal"')+10000),output=modal.slice(0,modal.indexOf('</details>'));
assert(!output.includes('patchPdfSummaryNotes'));assert(!output.includes('patchPdfShowControl'));
const frontControls=modal.slice(modal.indexOf('data-patch-pdf-front-options'),modal.indexOf('data-patch-pdf-notes-control'));
for(const label of ['Show Fixture Summary','Show Console Info','Show Universe Total',' Notes'])assert(frontControls.includes(label));
const organise=source('organisePdfPreviewSidePane');assert(organise.includes("pdfPreviewSideSection('Notes','patchPdfNotesOptions')"));assert(organise.includes("pdfPreviewSideSection('Front Page','patchPdfFrontOptions')"));assert(organise.includes("ctl.hasAttribute('data-patch-pdf-notes-control'))notesSection.appendChild(ctl)"));
assert(source('fixturePatchDomPdfBytes').includes('.patchPdfParameterTotal'));assert(html.includes('.patchPdfParameterTotal{font-weight:800;grid-column:1/-1}'));
assert(html.includes('.fixturePatchFilterActions .patchFilterActionButton{height:38px;padding:8px 6px;font-size:14px}'));assert(source('patchUniverseAddressControls').includes('btn patchFilterActionButton'));assert(source('patchControlsMarkup').includes('class="btn patchFilterActionButton" type="button" onclick="clearPatchFilters()"'));
vm.runInContext(realFit,c);c.layoutPatchPdfNotes=()=>{};c.fitPatchPdfConsoleTypes=()=>{};c.fitPatchPdfFixtureTotal=()=>{};
const style=()=>({cssText:'',transform:'',height:''});const tables={style:style(),dataset:{},scrollHeight:800,querySelectorAll:()=>[],querySelector:()=>({getBoundingClientRect:()=>({top:120})})},details={style:style(),dataset:{},scrollHeight:600},notes={style:style(),dataset:{},scrollHeight:60};const page={offsetWidth:1000,getBoundingClientRect:()=>({width:500}),querySelector:()=>({getBoundingClientRect:()=>({top:304})})},front={style:style(),dataset:{control:'true'},clientWidth:1000,querySelector:selector=>selector.includes('Tables')?tables:selector.includes('Details')?details:notes,closest:()=>page,getBoundingClientRect:()=>({top:100})};
for(const control of ['true','false'])for(const noteHeight of [60,600]){
 front.dataset.control=control;notes.scrollHeight=noteHeight;c.fitPatchPdfFrontPage(front);assert.equal(front.style.height,'400px');assert.equal(front.dataset.frontScale,'1');
 const notesTop=parseFloat(notes.style.top),notesScale=Number(notes.dataset.frontScale),tableScale=Number(tables.dataset.frontScale),detailScale=Number(details.dataset.frontScale);
 assert(Math.abs(notesTop+noteHeight*notesScale-400)<.001);assert(800*tableScale<=notesTop-16+.001);assert(Math.abs(parseFloat(details.style.left)+parseFloat(details.style.width)*detailScale-front.clientWidth)<.001);assert(parseFloat(details.style.top)+600*detailScale<=notesTop-16+.001);
}
assert(html.includes('font-size:14px;border-bottom:'));assert(html.includes('row-gap:4px;font-size:10px'));
assert(source('fixturePatchDomPdfBytes').includes('.patchPdfFront .patchPdfSummaryNotes'));
assert(html.includes('border:1.5px solid #9b9b9b;border-radius:20px'));assert(html.includes('.patchPdfFront[data-control="false"] .patchPdfSummaryTotals{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'));assert(html.includes('font-size:9pt;padding:1mm 1.5mm'));
assert(source('fixturePatchDomPdfBytes').includes('patchPdfFrontTextScale(cell)'));assert(source('patchPdfDrawSummaryNoteLine').includes("text.startsWith('• ')"));assert(source('fixturePatchDomPdfBytes').includes("pdfRoundRect(doc,box.x,box.y"));
console.log('PASS: approved stacked cover, mixed protocol headers and IP-only cells, compact headers, console text fitting, three draft fields, explicit notes commit, legacy notes, four-column row-first notes, bottom placement, one-page fitting and vector borders/bullets.');

// V55.11: keep capacity siblings together and fit fixture total without widening cards.
assert(html.includes('.patchPdfFront .patchPdfSupplementTable thead th{font-size:10pt;line-height:1.1;padding:1mm 1.5mm}'));
const totalContext=vm.createContext({getComputedStyle:()=>({fontSize:'16px',paddingLeft:'12px',paddingRight:'12px',fontStyle:'normal',fontWeight:'700',fontFamily:'Georgia'}),patchTextWidth:(text,font)=>text.length*parseFloat(font.match(/([0-9.]+)px/)[1])*.6});
vm.runInContext(code,totalContext);
for(const width of [160,230,400]){const total={style:{},clientWidth:width,textContent:'Total Number of Fixtures = 72000'};totalContext.fitPatchPdfFixtureTotal({querySelector:()=>total});assert(parseFloat(total.style.fontSize)<=16);assert(total.textContent.length*parseFloat(total.style.fontSize)*.6<=width-24);if(width===400)assert.equal(total.style.fontSize,'16px')}
assert(html.includes('.pdfVendorLogoDivider>.lightingVendorLogo{flex:none}'));
console.log('PASS: single-line fixture total, compact headers and non-shrinking vendor divider.');

assert(!code.includes('patchPdfCapacity'));assert(!html.includes('patchPdfCapacity'));assert(markup.includes('32,768</td>'));
assert(html.includes('.exportPage.pdfFirstPage{padding-top:3mm}'));
assert(html.includes('.exportPage.pdfFirstPage .pdfUnifiedHeaderCenter{margin-top:0;padding-bottom:2mm}'));
assert(html.includes('.exportPage.pdfFirstPage .pdfUnifiedHeader{margin-bottom:3mm}'));
console.log('PASS: removed capacity indicators, compact first-page header and totals reaching the right edge at every tested scale.');
