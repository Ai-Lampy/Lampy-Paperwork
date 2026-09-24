'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),plain=value=>JSON.parse(JSON.stringify(value));
function source(name){const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const code=html.slice(start,end+1);try{new Function('return ('+code+')');return code}catch{}}throw Error(name)}
function add(c,...names){names.forEach(name=>vm.runInContext(source(name),c))}
const c=vm.createContext({console,escapeHtml:s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;'),escapeAttr:s=>String(s??''),fixturePatchViewOptions:{columns:{universe:false,address:true},universeAddress:{enabled:false,separator:'',visible:true}},PATCH_COLUMNS:[{key:'fixId',field:'fixId'},{key:'universe',field:'universe'},{key:'address',field:'address'},{key:'mode',field:'mode'}]});
add(c,'validPatchSeparator','normalisePatchUniverseAddress','patchUniverseAddressText','parsePatchUniverseAddress','patchColumnDefinitions','patchColumnVisible','patchVisibleColumns','patchColumnValue','fixturePatchXlsxValue','patchPdfExportColumns','patchPdfHiddenColumns','patchPdfSummaryRows','patchPdfPatchedUniverses','patchSummaryColumnWidths','patchPdfSupplementElement','patchSummaryPageOverflow');
assert.deepEqual(plain(c.normalisePatchUniverseAddress()),{enabled:false,separator:'',visible:true});
for(const separator of ['', '\n','x\t'])assert.equal(c.normalisePatchUniverseAddress({enabled:true,separator}).enabled,false);
for(const separator of ['.',' / ','-','< >']){
 const saved=c.normalisePatchUniverseAddress({enabled:true,separator});assert.equal(saved.enabled,true);c.fixturePatchViewOptions.universeAddress=saved;
 for(const pair of [{universe:'1',address:'101'},{universe:'',address:'101'},{universe:'1',address:''},{universe:'',address:''}])assert.deepEqual(plain(c.parsePatchUniverseAddress(c.patchUniverseAddressText(pair),separator)),pair);
 assert.equal(c.fixturePatchXlsxValue({universe:'1',address:'101'},{key:'universeAddress'}),'1'+separator+'101');
}
assert.throws(()=>c.parsePatchUniverseAddress('1.2.3','.'),/unambiguous/);
assert.throws(()=>c.parsePatchUniverseAddress('1111','1'),/unambiguous/);
assert.throws(()=>c.parsePatchUniverseAddress('0.1','.'),/positive/);
assert.deepEqual(plain(c.parsePatchUniverseAddress('2.513','.')),{universe:'2',address:'513'},'overflow belongs in address review');
assert.deepEqual(plain(c.patchVisibleColumns().map(col=>col.key)),['fixId','universeAddress','mode']);
c.fixturePatchViewOptions.universeAddress.visible=false;assert(!c.patchVisibleColumns().some(col=>col.key==='universeAddress'));
c.fixturePatchViewOptions.universeAddress.enabled=false;assert.deepEqual(plain(c.patchVisibleColumns().map(col=>col.key)),['fixId','address','mode'],'individual visibility restored');
c.fixturePatchViewOptions.universeAddress={enabled:true,separator:'.',visible:true};
assert(c.patchPdfExportColumns([{universe:'1',address:''}]).some(col=>col.key==='universeAddress'));
assert(!c.patchPdfExportColumns([{universe:'',address:''}]).some(col=>col.key==='universeAddress'));
assert(!c.patchPdfHiddenColumns([{universe:'1',address:'1'}]).some(col=>['universe','address'].includes(col.key)));
const rows=[{manufacturer:'A',fixture:'Spot',mode:'Full',channels:32,universe:'1',address:'1'},{manufacturer:'A',fixture:'Spot',mode:'Full',channels:32,universe:'01',address:'101'},{manufacturer:'B',fixture:'Spot',mode:'Full',channels:32,universe:'3',address:'512'},{manufacturer:'A',fixture:'Spot',mode:'Full',channels:64,universe:'5',address:''},{manufacturer:'A',fixture:'Spot',mode:'Other',channels:32,universe:'6',address:'513'}],groups=[{items:rows}];
assert.equal(c.patchPdfPatchedUniverses(groups),2);assert.equal(c.patchPdfPatchedUniverses([{items:rows.slice(0,2)}]),1);assert.equal(c.patchPdfPatchedUniverses([]),0);
assert.deepEqual(plain(c.patchPdfSummaryRows(groups).map(r=>r.quantity)),[2,1,1,1]);
for(const width of [720,1050]){assert.deepEqual(plain(c.patchSummaryColumnWidths(width,[0,0,0,0])),[.15,.15,.05,.05].map(n=>width*n));assert.deepEqual(plain(c.patchSummaryColumnWidths(width,[9999,9999,9999,9999])),[.4,.35,.15,.1].map(n=>width*n))}
const element=()=>({classList:{add(){}},style:{}});c.document={createElement:element};
const markup=c.patchPdfSupplementElement('summary',c.patchPdfSummaryRows(groups),{widths:[200,160,60,50],final:true,universes:2}).innerHTML;
assert(markup.includes('A Spot'));assert(markup.includes('<th>Channels</th>'));assert(markup.includes('<th aria-label="Quantity" title="Quantity"></th>'));assert(markup.includes('Patched Universes: 2'));assert(markup.includes('width:470px'));assert(!markup.includes('Parameters'));
assert(!c.patchPdfSupplementElement('summary',[],{}).innerHTML.includes('Patched Universes'));
assert(html.includes('.patchPdfSummaryTable{margin-inline:auto}'));
assert(html.includes('.patchPdfSummary .patchPdfSummaryTable th,.patchPdfSummary .patchPdfSummaryTable td{overflow-wrap:anywhere;vertical-align:middle}'));
// Pagination keeps the final total with its last row, including a boundary case.
for(const capacity of [115,160]){
 const pages=[],p=vm.createContext({});add(p,'appendPatchSupplementPages');p.measurePatchSummaryWidths=()=>[150,140,60,50];p.fitPatchSummarySingleRow=()=>{};
 p.appendPatchPdfPage=()=>{const page={blocks:[],appendChild(block){block.page=this;this.blocks.push(block)}};pages.push(page);return {page}};
 p.patchPdfSupplementElement=(kind,items,opts)=>({items:[...items],opts,height:40+items.length*30+(opts.final?25:0),remove(){this.page.blocks=this.page.blocks.filter(b=>b!==this)},style:{}});
 p.patchSummaryPageOverflow=(page,block)=>block.height>capacity;p.exportPageOverflow=()=>false;
 p.appendPatchSupplementPages({}, {},'summary',Array.from({length:7},(_,id)=>({id})),{universes:3});
 const blocks=pages.flatMap(page=>page.blocks);assert.deepEqual(blocks.flatMap(b=>b.items.map(r=>r.id)),[0,1,2,3,4,5,6]);assert.equal(blocks.filter(b=>b.opts.final).length,1);assert.equal(blocks.at(-1).items.at(-1).id,6);blocks.forEach(b=>{assert(b.height<=capacity);assert.deepEqual(b.opts.widths,[150,140,60,50])});
}
// Drive combined clipboard and keyboard callbacks; no project writes before review.
{
 const handlers={},reviews=[],alerts=[],record={id:'a',universe:'1',address:'10'},p=vm.createContext({console,document:{activeElement:null},fixturePatchViewOptions:{universeAddress:{separator:'.'}},patchAddressReview:null,alert:msg=>alerts.push(msg),patchFixtureRows:()=>[record],fixturePatchControlAcceptsValue:()=>true,reviewPatchAddressEdits:(...args)=>{reviews.push(plain(args));p.patchAddressReview={}},openPatchAddressReview:rows=>{reviews.push(plain(rows));p.patchAddressReview={}},selectFixturePatchCell(){},focusFixturePatchCell(){},clearFixturePatchCellSelection(){},persist(){throw Error('Premature save')},render(){},setTimeout:fn=>fn()});
 add(p,'validPatchSeparator','parsePatchUniverseAddress','patchUniverseAddressText','patchCellClipboardValue','patchCellPasteEdits','commitPatchMergedCell','attachFixturePatchTableEvents');
 const fields=['universe','address'].map(field=>({dataset:{patchField:field,patchId:'a',patchMerged:'1'},tagName:'INPUT',value:record[field],focus(){p.document.activeElement=this},select(){}}));
 const cell={dataset:{patchColumn:'universeAddress'},querySelector:()=>fields[0],querySelectorAll:()=>fields,contains:el=>fields.includes(el)},row={querySelectorAll:()=>[cell]},table={querySelectorAll:selector=>selector.startsWith('tbody')?[row]:selector==='.fixturePatchCellSelected'?[cell]:[],addEventListener:(name,handler)=>handlers[name]=handler};fields.forEach(field=>field.closest=()=>cell);p.fixturePatchEditableCells=()=>[cell];p.attachFixturePatchTableEvents(table);
 assert.equal(fields[0].dataset.patchGridCol,fields[1].dataset.patchGridCol);
 let copied;handlers.copy({preventDefault(){},clipboardData:{setData:(type,value)=>copied=value}});assert.equal(copied,'1.10');
 const paste=value=>handlers.paste({target:fields[0],preventDefault(){},clipboardData:{getData:()=>value}});
 paste('3.100');assert.deepEqual(reviews[0],[[{id:'a',field:'address',value:'100'}],[{id:'a',field:'universe',value:'3'}],true]);assert.deepEqual(record,{id:'a',universe:'1',address:'10'});
 p.patchAddressReview=null;paste('3.1.2');assert.equal(reviews.length,1);assert.equal(alerts.length,1);
 fields[0].value='4';fields[1].value='200';p.commitPatchMergedCell(cell);assert.equal(fields[0].value,'1');assert.equal(fields[1].value,'10');assert.equal(record.address,'10');assert.equal(reviews.length,2);
 p.patchAddressReview=null;handlers.keydown({key:'Tab',target:fields[0],preventDefault(){}});assert.equal(p.document.activeElement,fields[1]);
}
assert(source('preparePatchPdfExport').includes('await document.fonts.ready'));
assert(source('fixturePatchPreviewPdfBytes').includes('await preparePatchPdfExport()'));
assert(source('fixturePatchDomPdfBytes').includes('await preparePatchPdfExport()'));
assert(source('fixturePatchDomPdfBytes').includes('.patchPdfUniverseTotal'));
console.log('PASS: V50.6 summary grouping/widths/pagination, universe totals, merged separators/visibility, staged clipboard editing and export parity.');
// Save/load retains the presentation preference and underlying visibility.
{
 const n=vm.createContext({PATCH_COLUMN_DEFAULTS:{universe:true,address:false},PATCH_TITLE_DEFAULT_FONT:'Project',PATCH_LEGACY_DEFAULT_FONT:'Cochin',patchTitleFontSize:v=>Number(v)||26});
 add(n,'validPatchSeparator','normalisePatchUniverseAddress','defaultPatchViewOptions','normalisePatchViewOptions');
 assert.equal(n.normalisePatchViewOptions({}).universeAddress.enabled,false);
 const saved=n.normalisePatchViewOptions({columns:{universe:false,address:true},universeAddress:{enabled:true,separator:' / ',visible:false}}),loaded=n.normalisePatchViewOptions(JSON.parse(JSON.stringify(saved)));
 assert.deepEqual(plain(loaded.universeAddress),{enabled:true,separator:' / ',visible:false});assert.equal(loaded.columns.universe,false);assert.equal(loaded.columns.address,true);
}
// Combined drag-fill stages both fields and leaves source/project records untouched.
{
 const handlers={},windowHandlers={},reviews=[],records=[{id:'a',universe:'1',address:'10'},{id:'b',universe:'2',address:'20'}];
 const p=vm.createContext({fixturePatchViewOptions:{universeAddress:{separator:'.'}},patchFixtureRows:()=>records,reviewPatchAddressEdits:(...args)=>reviews.push(plain(args)),alert:msg=>{throw Error(msg)},document:{body:{classList:{add(){},remove(){}}}},window:{addEventListener:(name,fn)=>windowHandlers[name]=fn,removeEventListener(){}}});
 add(p,'validPatchSeparator','parsePatchUniverseAddress','patchUniverseAddressText','patchCellClipboardValue','patchCellPasteEdits','attachFixturePatchFillHandle');
 const table={querySelectorAll:()=>[]},cells=records.map((record,index)=>{const fields=['universe','address'].map(field=>({dataset:{patchId:record.id,patchField:field,patchGridRow:String(index),patchGridCol:'0'},value:record[field]}));return {dataset:{patchColumn:'universeAddress'},querySelector:()=>fields[0],querySelectorAll:()=>fields,closest:()=>table,classList:{add(){},remove(){}}}});
 p.fixturePatchEditableCells=()=>cells;p.document.elementFromPoint=()=>({closest:()=>cells[1]});
 const handle={parentElement:cells[0],addEventListener:(name,fn)=>handlers[name]=fn};p.attachFixturePatchFillHandle(handle);
 handlers.pointerdown({preventDefault(){},stopPropagation(){}});windowHandlers.pointermove({});windowHandlers.pointerup();
 assert.deepEqual(reviews[0],[[{id:'b',field:'address',value:'10'}],[{id:'b',field:'universe',value:'1'}],true]);assert.equal(records[1].address,'20');
 handlers.pointerdown({preventDefault(){},stopPropagation(){}});windowHandlers.pointermove({});windowHandlers.pointercancel({type:'pointercancel'});assert.equal(reviews.length,1);
}
