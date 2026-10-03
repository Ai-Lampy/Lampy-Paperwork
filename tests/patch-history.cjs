'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),api=require('../js/patch-history.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),plain=value=>JSON.parse(JSON.stringify(value));
function source(name){const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const code=html.slice(start,end+1);try{new Function('return ('+code+')');return code}catch{}}throw Error(name)}
function load(c,...names){names.forEach(name=>vm.runInContext(source(name),c))}
const fixture={id:'a',fixId:'1',fixture:'Spot',universe:'1',address:'1',channels:10,location:'Front',mode:'Full',notes:''};
function context(){
 const calls={saves:0,renders:0,confirms:[],focus:0},nodes=new Map(),c=vm.createContext({LampyPatchHistory:api,console,Date,app:{fixturePatch:[plain(fixture)],patchSheets:[],projectInfo:{positions:[{name:'Front',colour1:'red'}],fixtureOverrides:{},file:{projectName:'Tour'}},gdtfFiles:{},gdtfMatches:{},controlNetwork:{devices:[]},labels:[{generated:'unchanged'}]},patchUndoPending:null,patchUndoBatchDepth:0,patchUndoSaveRequested:false,patchUndoEpoch:0,fixturePatchUndoHistory:[],showPatchUndoList:false,activePatchSheetId:'master',activePatchCellChange:null,selectedPatchRows:new Set(),selectedPatchCells:new Set(),selectedUnpatchIds:new Set(),selectedPatchGroupEditIds:new Set(),unlockedPatchGroups:new Set(),duplicatePatchRows:new Set(),duplicateAddressRows:new Set(),confirmedDuplicateAddressKeys:new Set(),universeSelectedIds:new Set(),repositoryGdtfBytes:new Map(),patchImportState:{},confirm:message=>{calls.confirms.push(message);return c.allowConfirm},allowConfirm:true,document:{querySelector:()=>null},$:id=>{if(!nodes.has(id))nodes.set(id,{focus:()=>calls.focus++,classList:{add(){},remove(){}}});return nodes.get(id)},escapeHtml:value=>String(value).replaceAll('<','&lt;'),render:()=>calls.renders++,refreshOpenPdfPreview(){},clearFixturePickerThumbnails(){},scheduleProjectValidation(){},scheduleDuplicateIpWarnings(){},setSaveStatus(){},persistTimer:null,persistIdleHandle:null,window:{},setTimeout:()=>{calls.saves++;return 1},clearTimeout(){},AUTOSAVE_DELAY:1});
 c.ensureProjectInfo=()=>c.app.projectInfo;c.patchFixtureRows=()=>c.app.fixturePatch;c.normalisePatchSheets=rows=>rows;c.positionKey=value=>String(value||'').toLowerCase();c.syncPositionsFromPatch=()=>{};c.refreshHomeIfActive=()=>{};
 load(c,'capturePatchUndoAssets','discardPatchImportAssets','captureFixturePatchUndo','restoreFixturePatchUndo','recordFixturePatchUndo','commitFixturePatchUndo','resetFixturePatchUndo','beginPatchFieldUndo','cancelPatchFieldUndo','runPatchUndoBatch','persist','undoFixturePatchChange','patchOopsMarkup','fixturePatchUndoListMarkup','patchUndoTimeLabel','refreshPatchOops','toggleFixturePatchUndoList','closePatchOops','deleteFixturePatch','fixturePatchDataSummary','finishPatchAdd','confirmUnpatchFixtures','clearPatchFixtureAddresses','makePatchSheetMaster','deleteImportedPatchSheet');
 return {c,calls,nodes};
}
// Inverse deltas preserve unrelated fields, appended records and immutable binary assets.
{
 const before={rows:[{id:'a',address:'1',notes:''}],positions:[{name:'Front',colour:'red'}]},after={rows:[{id:'a',address:'20',notes:''}],positions:[]},current={rows:[{id:'a',address:'20',notes:'Later note'},{id:'extra',address:'50'}],positions:[{name:'Rear',colour:'blue'}]};
 const restored=api.reverse(before,after,current);assert.equal(restored.rows[0].address,'1');assert.equal(restored.rows[0].notes,'Later note');assert(restored.rows.some(row=>row.id==='extra'));assert.deepEqual(restored.positions.map(row=>row.name),['Front','Rear']);assert.equal(current.rows[0].address,'20');
 const bytes=new Uint8Array([1,2,3]);assert.equal(api.clone({bytes}).bytes,bytes);assert.equal(api.reverse({bytes},{},{}).bytes,bytes);
}
// Five entries, no-op/cancel, older selection semantics, save once, no project data leakage.
{
 const {c,calls}=context();c.recordFixturePatchUndo('No change');c.persist();assert.equal(c.fixturePatchUndoHistory.length,0);
 for(let i=1;i<=7;i++){c.recordFixturePatchUndo('Edit '+i);c.app.fixturePatch[0].notes='v'+i;c.persist()}
 assert.equal(c.fixturePatchUndoHistory.length,5);assert.deepEqual(c.fixturePatchUndoHistory.map(item=>item.label),['Edit 7','Edit 6','Edit 5','Edit 4','Edit 3']);
 c.app.projectInfo.file.projectName='Later project name';c.app.projectInfo.positions.push({name:'Later position'});c.app.labels.push({generated:'later'});c.allowConfirm=false;const state=plain(c.app);c.undoFixturePatchChange(2);assert.deepEqual(plain(c.app),state);assert.equal(c.fixturePatchUndoHistory.length,5);
 c.allowConfirm=true;const saves=calls.saves;c.undoFixturePatchChange(2);assert.equal(c.app.fixturePatch[0].notes,'v4');assert.equal(c.fixturePatchUndoHistory.length,2);assert(calls.confirms.at(-1).includes('Undo 3 changes'));assert.equal(calls.saves,saves+1);assert.equal(c.app.projectInfo.file.projectName,'Later project name');assert.equal(c.app.projectInfo.positions.at(-1).name,'Later position');assert.equal(c.app.labels.length,2);assert(!Object.keys(c.app).some(key=>/undo|history/i.test(key)));
 c.resetFixturePatchUndo();assert.equal(c.fixturePatchUndoHistory.length,0);assert.equal(c.patchUndoPending,null);assert.equal(c.patchUndoEpoch,1);
}
// Coalesce typing. Background changes during an edit must not become undo changes.
{
 const {c}=context(),input={dataset:{patchId:'a',patchField:'notes'},value:''};
 for(const text of ['H','He','Hello']){c.beginPatchFieldUndo(input);c.app.fixturePatch[0].notes=text;c.patchUndoPending.after=c.captureFixturePatchUndo();c.persist();assert.equal(c.fixturePatchUndoHistory.length,0);c.app.gdtfMatches.background={fileName:'auto'}}
 c.patchUndoPending.editing=null;c.persist();assert.equal(c.fixturePatchUndoHistory.length,1);c.undoFixturePatchChange(0);assert.equal(c.app.fixturePatch[0].notes,'');assert(c.app.gdtfMatches.background);
 c.beginPatchFieldUndo(input);c.app.fixturePatch[0].notes='Cancelled';c.patchUndoPending.after=c.captureFixturePatchUndo();c.cancelPatchFieldUndo(input);assert.equal(c.app.fixturePatch[0].notes,'');assert.equal(c.fixturePatchUndoHistory.length,0);
 c.beginPatchFieldUndo(input);c.patchUndoPending.after=c.captureFixturePatchUndo();c.commitFixturePatchUndo(true);assert.equal(c.fixturePatchUndoHistory.length,0);
}
// A bulk operation is one entry and one save; a failed batch restores partial edits.
{
 const {c,calls}=context();c.runPatchUndoBatch('Paste',()=>{c.app.fixturePatch[0].address='12';c.persist();c.app.fixturePatch[0].notes='Pasted';c.persist()});assert.equal(c.fixturePatchUndoHistory.length,1);assert.equal(calls.saves,1);c.undoFixturePatchChange(0);assert.equal(c.app.fixturePatch[0].address,'1');assert.equal(c.app.fixturePatch[0].notes,'');
 const old=plain(c.app);assert.throws(()=>c.runPatchUndoBatch('Failed',()=>{c.app.fixturePatch=[];c.persist();throw Error('Failed')}));assert.deepEqual(plain(c.app),old);assert.equal(c.fixturePatchUndoHistory.length,0);
}
// Actual destructive handler: restore deleted Positions, overrides, GDTF associations/bytes and comparisons.
{
 const {c}=context();c.app.patchSheets=[{id:'import',rows:[{...fixture,id:'b',location:'Rear'}]}];c.app.projectInfo.positions.push({name:'Rear',colour1:'blue'});c.app.projectInfo.fixtureOverrides={Spot:{shortName:'Sp'}};c.app.gdtfFiles={'spot.gdtf':{fileName:'spot.gdtf',base64:'AQID'}};c.app.gdtfMatches={match:{fileName:'spot.gdtf'}};const bytes=new Uint8Array([1,2,3]);c.repositoryGdtfBytes.set('spot.gdtf',bytes);const before=plain(c.app);c.deleteFixturePatch();assert.equal(c.app.fixturePatch.length,0);assert.equal(c.fixturePatchUndoHistory.length,1);assert(c.patchOopsMarkup().includes('>Oops</button>'));c.app.projectInfo.file.projectName='New title';c.app.projectInfo.positions.push({name:'Later'});c.undoFixturePatchChange(0);assert.deepEqual(plain(c.app.fixturePatch),before.fixturePatch);assert.deepEqual(plain(c.app.patchSheets),before.patchSheets);assert.deepEqual(plain(c.app.gdtfFiles),before.gdtfFiles);assert.deepEqual(plain(c.app.projectInfo.fixtureOverrides),before.projectInfo.fixtureOverrides);assert.equal(c.repositoryGdtfBytes.get('spot.gdtf'),bytes);assert.equal(c.app.projectInfo.file.projectName,'New title');assert.equal(c.app.projectInfo.positions.at(-1).name,'Later');assert.deepEqual(plain(c.app.labels),before.labels);
}
// Actual add, unpatch and comparison actions enter history once and roll back in order.
{
 const {c}=context();c.fixturePatchSelection={manufacturer:'A'};c.closePatchOptionsModal=()=>{};c.finishPatchAdd([{...fixture,id:'b'}]);assert.equal(c.fixturePatchUndoHistory.length,1);c.selectedUnpatchIds.add('b');c.closeUnpatchFixtureModal=()=>{};c.confirmUnpatchFixtures();assert.equal(c.app.fixturePatch[1].address,'');assert.equal(c.fixturePatchUndoHistory.length,2);c.undoFixturePatchChange(1);assert.equal(c.app.fixturePatch.length,1);
 c.app.patchSheets=[{id:'import',name:'New',rows:[{...fixture,id:'b'}]}];c.patchSheetById=id=>c.app.patchSheets.find(sheet=>sheet.id===id);c.normalisePatchFixture=row=>({...row,id:row.id||'new'});c.makePatchSheetMaster('import');assert.equal(c.app.fixturePatch[0].id,'new');c.undoFixturePatchChange(0);assert.equal(c.app.patchSheets.length,1);assert.equal(c.app.fixturePatch[0].id,'a');c.deleteImportedPatchSheet('import');c.undoFixturePatchChange(0);assert.equal(c.app.patchSheets.length,1);
}
// Imported GDTF deltas do not remove unrelated later GDTF changes on cancel.
{
 const {c}=context(),before=c.capturePatchUndoAssets();c.app.gdtfFiles.import={fileName:'import'};const after=c.capturePatchUndoAssets();c.patchImportState.assetChanges=[{before,after}];c.app.gdtfFiles.other={fileName:'other'};c.discardPatchImportAssets();assert(!c.app.gdtfFiles.import);assert(c.app.gdtfFiles.other);assert.equal(c.fixturePatchUndoHistory.length,0);
}
// Panel, release and handler integration checks.
{
 const {c}=context();c.toggleFixturePatchUndoList();assert(c.fixturePatchUndoListMarkup().includes('No patch changes to undo'));assert(c.patchOopsMarkup().includes('aria-expanded="true"'));c.closePatchOops();assert.equal(c.showPatchUndoList,false);
 const toolbar=source('renderFixturePatchView');assert(toolbar.includes('>Unpatch Fixture</button>${patchOopsMarkup()}'));assert(!html.includes('>Undo Patch Changes</button>'));assert(!source('importedPatchBannerMarkup').includes('toggleFixturePatchUndoList'));assert(html.includes("fixturePatchUndoHistory=fixturePatchUndoHistory.slice(0,5)"));assert(!source('appPayload').includes('fixturePatchUndoHistory'));
 for(const name of ['finishPatchAdd','confirmUnpatchFixtures','deleteFixturePatch','confirmPatchImport','makePatchSheetMaster','deleteImportedPatchSheet','saveFixtureInfoEditor','confirmPatchGroupEditLegacy','confirmPatchAddressReview','bulkImportedPatchAction','bulkImportedPatchCellAction','readFixtureInfoGdtfFile','readGdtfUploadFile'])assert(source(name).includes('recordFixturePatchUndo('),name);
 for(const name of ['clearProjectState','loadProjectPayload'])assert(source(name).includes('resetFixturePatchUndo()'));
 assert(source('attachFixturePatchTableEvents').includes("runPatchUndoBatch('Paste fixture values'"));assert(source('attachFixturePatchFillHandle').includes("runPatchUndoBatch('Fill '"));assert(source('updatePatchRowField').includes('beginPatchFieldUndo(inp)'));
 assert(html.includes('<title>Lampy Paperwork V51.6</title>'));assert(source('deleteFixturePatch').includes('using Oops'));assert(!source('deleteFixturePatch').includes('fixturePatchUndoHistory=[]'));
}
console.log('PASS: V51.1 five-operation Oops history, coalescing, scoped restoration, bulk changes, deletion assets and session isolation.');

// Exercise actual input events: keystrokes coalesce, finalise commits, locked edits do not record.
{
 const {c}=context();load(c,'updatePatchRowField','applyPatchField');c.patchGroupUnlocked=()=>true;c.patchGroupKey=()=> 'spot';c.updateDuplicateAddressRows=()=>{};c.schedulePatchAddressValidation=()=>{};c.fixturePatchKeyboardNavigating=false;
 const input={dataset:{patchId:'a',patchField:'notes'},value:''};for(const value of ['a','ab','abc']){input.value=value;c.updatePatchRowField(input,false)}assert.equal(c.fixturePatchUndoHistory.length,0);c.updatePatchRowField(input,true);c.updatePatchRowField(input,true);assert.equal(c.fixturePatchUndoHistory.length,1);c.undoFixturePatchChange(0);assert.equal(c.app.fixturePatch[0].notes,'');
 c.patchGroupUnlocked=()=>false;input.value='Locked';c.updatePatchRowField(input,true);assert.equal(c.fixturePatchUndoHistory.length,0);assert.equal(c.app.fixturePatch[0].notes,'');
}
// Import records associations created during row construction and imported assets as one action.
{
 const {c,calls}=context();load(c,'confirmPatchImport');c.patchImportMappedRows=()=>[{}];c.patchImportUnmatchedTypes=()=>[];c.patchImportDiscrepancies=()=>[];c.buildPatchDiffs=()=>({});c.closePatchImportModal=()=>{};c.patchImportState.name='Incoming';const assetBefore=c.capturePatchUndoAssets();c.app.gdtfFiles.imported={fileName:'imported'};c.patchImportState.assetChanges=[{before:assetBefore,after:c.capturePatchUndoAssets()}];c.buildPatchImportRows=()=>{c.app.gdtfMatches.imported={fileName:'imported'};return [{...fixture,id:'b'}]};c.confirmPatchImport();assert.equal(c.fixturePatchUndoHistory.length,1);assert.equal(calls.saves,1);assert.equal(c.app.patchSheets.length,1);c.undoFixturePatchChange(0);assert.equal(c.app.patchSheets.length,0);assert(!c.app.gdtfFiles.imported);assert(!c.app.gdtfMatches.imported);
}
// Fixture Information restores only changed override fields and affected rows.
{
 const {c,nodes}=context();load(c,'saveFixtureInfoEditor');c.activeFixtureInfoRow=()=>c.app.fixturePatch[0];c.fixtureOverrideKey=()=> 'spot';c.projectWeightInputToKg=Number;c.openFixtureInfoModal=()=>{};c.applyFixtureOverrideToRow=row=>Object.assign(row,{shortName:c.app.projectInfo.fixtureOverrides.spot.shortName});for(const [id,value] of Object.entries({fixtureInfoShortName:'New name',fixtureInfoWeight:'10',fixtureInfoWatts:'200'}))nodes.set(id,{value});nodes.set('fixtureSummaryPane',{classList:{contains:()=>false}});c.saveFixtureInfoEditor();assert.equal(c.fixturePatchUndoHistory.length,1);assert.equal(c.app.fixturePatch[0].shortName,'New name');c.undoFixturePatchChange(0);assert(!c.app.projectInfo.fixtureOverrides.spot);assert(!c.app.fixturePatch[0].shortName);
}
// Manual GDTF assignment is one committed operation; failed matching creates no entry.
(async()=>{
 const {c,calls,nodes}=context();load(c,'readFixtureInfoGdtfFile');const bytes=new Uint8Array([1,2,3]);c.readBoundedFileBuffer=async()=>bytes;c.parseGdtfFileBytes=async()=>({fileName:'spot.gdtf',manufacturer:'A',fixture:'Spot',modes:[{name:'Full',channels:10}]});c.activeFixtureInfoRow=()=>c.app.fixturePatch[0];c.patchAddressSnapshot=()=>JSON.stringify(c.app.fixturePatch);c.gdtfFileMatchesPatchFixture=()=>true;c.gdtfCandidateForRow=file=>({file,mode:file.modes[0]});c.storeGdtfFile=file=>{c.app.gdtfFiles[file.fileName]=file;c.repositoryGdtfBytes.set(file.fileName,bytes)};c.fixtureOverrideKey=()=> 'spot';c.gdtfMatchKey=()=> 'spot';c.matchGdtfForRow=()=>{};c.openFixtureInfoModal=async()=>{};nodes.set('fixtureSummaryPane',{classList:{contains:()=>false}});const input={files:[{name:'spot.gdtf'}],value:'file'};await c.readFixtureInfoGdtfFile({target:input});assert.equal(c.fixturePatchUndoHistory.length,1);assert.equal(calls.saves,1);assert.equal(c.app.fixturePatch[0].gdtfSpec,'spot.gdtf');c.undoFixturePatchChange(0);assert(!c.app.fixturePatch[0].gdtfSpec);assert.equal(c.repositoryGdtfBytes.size,0);assert.deepEqual(plain(c.app.gdtfFiles),{});
 c.gdtfFileMatchesPatchFixture=()=>false;c.alert=()=>{};c.console={error(){}};await c.readFixtureInfoGdtfFile({target:input});assert.equal(c.fixturePatchUndoHistory.length,0);assert.equal(c.repositoryGdtfBytes.size,0);
 console.log('PASS: actual field commits, import associations, Fixture Information and manual GDTF undo.');
})().catch(error=>{console.error(error);process.exitCode=1});
