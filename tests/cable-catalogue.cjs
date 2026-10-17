const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),Cable=require('../js/cable-catalogue.js');
const raw=JSON.parse(fs.readFileSync(path.join(root,'json/cable/christie_lites_cable.json'))),manifest=JSON.parse(fs.readFileSync(path.join(root,'json/cable/manifest.json'))),catalogue=Cable.normalise(raw);
function source(name){const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const value=html.slice(start,end+1);try{new Function('return ('+value+')');return value}catch{}}throw Error(name)}
const plain=v=>JSON.parse(JSON.stringify(v)),clone=v=>JSON.parse(JSON.stringify(v));
const all=catalogue.categories.flatMap(c=>c.cables),whirlwind=all.find(c=>c.name==='Whirlwind 12-Pair');
assert.equal(all.length,32);assert.equal(catalogue.looms.length,6);assert.equal(catalogue.unit,'ft');
assert(!whirlwind.lengths.includes('504'));assert.deepEqual(whirlwind.loomOnlyLengths,['504']);
for(const cable of all){assert.deepEqual(cable.lengths,[...cable.lengths].sort((a,b)=>+a-+b));assert(cable.connectors.start&&cable.connectors.end)}
for(const direction of Cable.directions){const value=Cable.metadata({direction,connectors:{male:'M',female:'F',end:'B'}});const expected={'male-female':['M','B'],'female-male':['F','B'],'male-male':['M','B'],'female-female':['F','B'],bidirectional:['B','B']}[direction];assert.deepEqual([value.connectors.start,value.connectors.end],expected)}
assert.deepEqual(Cable.metadata({direction:'female-male',connectors:{male:'Tails',female:'63A'}}),{direction:'female-male',connectors:{start:'63A',end:'Tails'}});
assert(Cable.description({direction:'male-male',connectors:{start:'XLR-5',end:'XLR-5'}}).includes('XLR-5 male → XLR-5 male'));
assert(Cable.description({direction:'bidirectional',connectors:{end:'etherCON'}}).includes('↔'));
assert.equal(Cable.description({}),'');
for(const edit of [d=>d.cables.Data[0].lengths.push(-1),d=>d.cables.Data[0].lengths.push(4),d=>d.cables.Data[0].direction='sideways',d=>d.cables.Data[0].connectors={},d=>d.looms[0].cables[0].cableType='missing',d=>d.looms[0].cables[0].quantity=1.5,d=>d.looms[0].lengths=[999],d=>d.looms.push(clone(d.looms[0]))]){const d=clone(raw);edit(d);assert.throws(()=>Cable.normalise(d))}
const entries=Cable.manifest(manifest);assert.equal(entries.length,15);assert.equal(entries.filter(e=>e.optional).length,14);
assert.throws(()=>Cable.manifest({catalogues:[{vendor:'x',file:'../secret.json'}]}));assert.throws(()=>Cable.manifest({catalogues:[...manifest.catalogues,manifest.catalogues[0]]}));
let saves=0,renders=0,ids=0,confirmation=true,alerts=[];
const escape=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const c=vm.createContext({LampyCableCatalogue:Cable,Date,Math,crypto:{randomUUID:()=>String(++ids)},normaliseBlankColour:v=>String(v||''),escapeHtml:escape,escapeAttr:escape,
 app:{looms:[]},ensureProjectInfo:()=>({production:{lightingVendor:'Christie Lites UK'}}),cableCatalogueReference:{catalogues:[catalogue]},
 loomEditorDraft:null,activeLoomEditorId:'',activeLoomExtensionParentId:'',collapsedLoomCards:new Set(),persist:()=>saves++,render:()=>renders++,renderLoomEditor:()=>renders++,confirm:()=>confirmation,alert:v=>alerts.push(v),hideLoomCableMenu(){},$:()=>({classList:{remove(){}}})});
for(const n of ['loomId','normaliseLoomUnit','normaliseLoomLength','loomLengthText','normaliseLoomCable','normaliseLoom','normaliseLooms','blankLoomBuildRow','blankLoomDraft','currentCableCatalogue','cableCategoryForType','cableLengthsForType','loomDraftRows','loomRowIsComplete','loomCableFromBuilderRow','loomById','loomDescendantIds','closeLoomEditor','saveLoomEditor','selectLoomCatalogueTemplate','selectLoomCatalogueLength','applyLoomCatalogueTemplate','loomCableGroupKey','loomBuildRowsForLoom','reconcileLoomBuilderRows','setLoomCableTypeMetadata','loomCableDescriptionMarkup','loomCatalogueControlsMarkup','cableCatalogueStatusMarkup'])vm.runInContext(source(n),c);
for(const template of catalogue.looms){for(const length of template.lengths){
 c.loomEditorDraft=c.blankLoomDraft();c.selectLoomCatalogueTemplate(template.id);c.selectLoomCatalogueLength(length);
 const before=JSON.stringify(c.app),count=saves;c.applyLoomCatalogueTemplate();assert.equal(JSON.stringify(c.app),before);assert.equal(saves,count);
 assert(c.loomEditorDraft.rows.every(r=>r.length===length&&r.unit==='ft'));
 c.saveLoomEditor();assert.equal(saves,count+1);const saved=c.app.looms.at(-1);assert.equal(saved.cables.length,template.cables.reduce((sum,c)=>sum+c.quantity,0));
 assert.equal(new Set(saved.cables.map(c=>c.id)).size,saved.cables.length);
 for(const cable of saved.cables)assert(cable.direction&&cable.connectors.start&&cable.connectors.end);
 assert.deepEqual(plain(c.normaliseLoom(saved)),plain(saved));
}}
assert.equal(alerts.length,0);
assert(!c.cableLengthsForType('Whirlwind 12-Pair').includes('504'));
c.loomEditorDraft=c.blankLoomDraft();c.selectLoomCatalogueTemplate(catalogue.looms[0].id);c.applyLoomCatalogueTemplate();const savedDraft=JSON.stringify(c.loomEditorDraft.rows);confirmation=false;c.selectLoomCatalogueTemplate(catalogue.looms[1].id);c.applyLoomCatalogueTemplate();assert.equal(JSON.stringify(c.loomEditorDraft.rows),savedDraft);confirmation=true;
const beforeCancel=JSON.stringify(c.app),beforeSaves=saves;c.closeLoomEditor();assert.equal(JSON.stringify(c.app),beforeCancel);assert.equal(saves,beforeSaves);assert.equal(c.loomEditorDraft,null);
const legacy=c.normaliseLoomCable({id:'old',cableType:'Custom',length:'20',unit:'m',label:'Keep',notes:'Keep notes'});assert.equal(legacy.direction,'');assert.equal(legacy.label,'Keep');
const old={id:'oldloom',cables:[legacy]},rows=c.loomBuildRowsForLoom(old);rows[0].quantity=2;c.reconcileLoomBuilderRows(old,rows);assert.equal(old.cables[0].id,'old');assert.equal(old.cables[0].notes,'Keep notes');assert.equal(old.cables.length,2);
const opposite={...legacy,direction:'female-male',connectors:{start:'A',end:'B'}};assert.notEqual(c.loomCableGroupKey(legacy),c.loomCableGroupKey(opposite));
const changed={...opposite};c.setLoomCableTypeMetadata(changed,'XLR-5 MALE > MALE');assert.equal(changed.direction,'male-male');c.setLoomCableTypeMetadata(changed,'New custom cable');assert.equal(changed.direction,'');assert.equal(changed.connectors.start,'');
assert.equal(c.loomCableDescriptionMarkup({direction:'male-female',connectors:{start:'<script>',end:'X'}}).includes('<script>'),false);
assert(source('chooseLoomCableOption').includes('setLoomCableTypeMetadata(row,choice)'));assert(source('updateLoomCableField').includes('setLoomCableTypeMetadata(cable,input.value)'));
assert(source('loomViewerRowMarkup').includes('loomCableDescriptionMarkup(cable)'));assert(source('loomCableListMarkup').includes('loomCableDescriptionMarkup(row)'));
assert(source('renderLoomsView').includes('cableCatalogueStatusMarkup()'));
// Exercise actual input handlers without browser automation.
for(const n of ['refreshLoomCableLengths','updateLoomBuilderLength','updateLoomBuilderCable','updateLoomCableField','chooseLoomCableOption','returnToLoomCableCategories','loomLengthDatalist'])vm.runInContext(source(n),c);
c.ensureProjectInfo=()=>({production:{lightingVendor:'Christie Lites UK'}});
let browsing=null;c.showLoomCableMenu=(input,category)=>{browsing=category};c.hideLoomCableMenu=()=>{};c.refreshLoomCableDescription=()=>{};
const list={innerHTML:''},input={dataset:{loomBuilderCable:'0',loomCategory:'Data'},value:'XLR-5',closest:()=>({querySelector:()=>list})};
c.loomEditorDraft={rows:[{cableType:'Custom',category:'',length:'10',unit:'m',quantity:1}]};c.activeLoomCableInput=input;
c.chooseLoomCableOption({dataset:{loomCableCategory:'Data',loomCableChoice:'XLR-5'}});
assert.equal(c.loomEditorDraft.rows[0].unit,'m');assert.equal(c.loomEditorDraft.rows[0].length,'10');
c.updateLoomBuilderLength({dataset:{loomBuilderLength:'0'},value:'12'});assert.equal(c.loomEditorDraft.rows[0].unit,'m');
c.updateLoomBuilderLength({dataset:{loomBuilderLength:'0'},value:'24ft'});assert.equal(c.loomEditorDraft.rows[0].unit,'ft');
c.loomEditorDraft.rows[0].unit='m';input.value='IEC';c.updateLoomBuilderCable(input);assert(list.innerHTML.includes('6&#39;')||list.innerHTML.includes("6'"));assert(!list.innerHTML.includes('6m'));assert.equal(input.dataset.loomCategory,'TRS');assert.equal(c.loomEditorDraft.rows[0].unit,'m');
input.value='Custom unknown';c.updateLoomBuilderCable(input);assert.equal(list.innerHTML,'');
input.value='XLR-5';c.updateLoomBuilderCable(input);
const beforeBrowse=JSON.stringify(c.loomEditorDraft),inputBefore=input.value,metadataBefore=JSON.stringify(input.dataset),savesBefore=saves;
c.returnToLoomCableCategories();assert.equal(browsing,'');
c.chooseLoomCableOption({dataset:{loomCableCategory:'TRS',loomCableCategoryOnly:'1'}});assert.equal(browsing,'TRS');
assert.equal(JSON.stringify(c.loomEditorDraft),beforeBrowse);assert.equal(input.value,inputBefore);assert.equal(JSON.stringify(input.dataset),metadataBefore);assert.equal(saves,savesBefore);
const live=c.app.looms[0].cables[0];live.length='10';live.unit='m';const liveInput={dataset:{loomId:c.app.looms[0].id,loomCableId:live.id,loomKey:'cableType'},value:'',closest:()=>({querySelector:()=>list})};c.activeLoomCableInput=liveInput;
c.chooseLoomCableOption({dataset:{loomCableCategory:'TRS',loomCableChoice:'IEC'}});assert.equal(live.unit,'m');assert.equal(live.length,'10');assert(list.innerHTML.includes("6'"));assert.equal(liveInput.dataset.loomCategory,'TRS');
liveInput.value='XLR-5';c.updateLoomCableField(liveInput,false);assert(list.innerHTML.includes("144'"));assert(!list.innerHTML.includes("value=\"6'\"") );
assert(c.loomLengthDatalist('test','IEC','m').includes("6'"));
c.loomEditorDraft={rows:[{cableType:'',length:'',unit:'',quantity:1}]};c.activeLoomCableInput=input;c.chooseLoomCableOption({dataset:{loomCableCategory:'Data',loomCableChoice:'XLR-5'}});assert.equal(c.loomEditorDraft.rows[0].unit,'ft');
console.log('PASS: cable unit preservation, explicit suffixes, live/draft length suggestions and non-destructive category browsing.');
(async()=>{
 const loader=vm.createContext({LampyCableCatalogue:Cable,CABLE_CATALOGUE_MANIFEST_URL:'json/cable/manifest.json',cableCatalogueReference:{catalogues:[]},cableCatalogueLoadSequence:0,activeSheetTab:'home',console:{warn(){}},fetchJSONWithFallback:async file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))});
 for(const n of ['normaliseCableCatalogue','loadCableCatalogueReference'])vm.runInContext(source(n),loader);
 await loader.loadCableCatalogueReference();assert.equal(loader.cableCatalogueReference.catalogues.length,1);assert.equal(loader.cableCatalogueReference.unavailable.length,14);assert.equal(loader.cableCatalogueReference.loading,false);
 c.cableCatalogueReference=loader.cableCatalogueReference;c.ensureProjectInfo=()=>({production:{lightingVendor:'Adlib'}});assert(c.cableCatalogueStatusMarkup().includes('unavailable for Adlib'));assert(c.cableCatalogueStatusMarkup().includes('Custom cable entry remains available'));
 let finish;loader.fetchJSONWithFallback=()=>new Promise(resolve=>finish=resolve);const stale=loader.loadCableCatalogueReference();loader.fetchJSONWithFallback=async()=>({catalogues:[]});await loader.loadCableCatalogueReference();finish({catalogues:[]});await stale;assert.equal(loader.cableCatalogueReference.catalogues.length,0);
 loader.fetchJSONWithFallback=async()=>{throw Error('offline')};await loader.loadCableCatalogueReference();assert.equal(loader.cableCatalogueReference.error,'offline');assert.equal(loader.cableCatalogueReference.loading,false);
 console.log('PASS: cable catalogue structure, all directions, loom-only lengths, preset drafts/save/cancel, metadata round trips, independent loading and stale requests.');
})().catch(error=>{console.error(error);process.exitCode=1});
