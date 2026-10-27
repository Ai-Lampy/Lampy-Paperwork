const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),Cable=require('../js/cable-catalogue.js');
const raw=JSON.parse(fs.readFileSync(path.join(root,'json/cable/christie_lites_cable.json'))),manifest=JSON.parse(fs.readFileSync(path.join(root,'json/cable/manifest.json'))),catalogue=Cable.normalise(raw);
function source(name){const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const value=html.slice(start,end+1);try{new Function('return ('+value+')');return value}catch{}}throw Error(name)}
const plain=v=>JSON.parse(JSON.stringify(v)),clone=v=>JSON.parse(JSON.stringify(v));
const all=catalogue.categories.flatMap(c=>c.cables),whirlwind=all.find(c=>c.name==='Whirlwind 12-Pair');
assert(all.find(c=>c.name==='32A 3ø').aliases.includes('32A 3Ph'));
assert.equal(all.length,20);assert.equal(catalogue.looms.length,6);assert.equal(catalogue.unit,'ft');
assert(!whirlwind.lengths.includes('504'));assert.deepEqual(whirlwind.loomOnlyLengths,['504']);
for(const cable of all){assert.deepEqual(cable.lengths,[...cable.lengths].sort((a,b)=>+a-+b));assert(cable.connectors.start&&cable.connectors.end)}
for(const direction of Cable.directions){const value=Cable.metadata({direction,connectors:{male:'M',female:'F',end:'B'}});const expected={'male-female':['M','B'],'female-male':['F','B'],'male-male':['M','B'],'female-female':['F','B'],bidirectional:['B','B']}[direction];assert.deepEqual([value.connectors.start,value.connectors.end],expected)}
assert.deepEqual(Cable.metadata({direction:'female-male',connectors:{male:'Tails',female:'63A'}}),{direction:'female-male',connectors:{start:'63A',end:'Tails'}});
assert(Cable.description({direction:'male-male',connectors:{start:'XLR-5',end:'XLR-5'}}).includes('XLR-5 male → XLR-5 male'));
assert(Cable.description({direction:'bidirectional',connectors:{end:'etherCON'}}).includes('↔'));
assert.equal(Cable.description({}),'');
for(const edit of [d=>d.cables.Data[0].lengths.push(-1),d=>d.cables.Data[0].lengths.push(4),d=>d.cables.Data[0].direction='sideways',d=>d.cables.Data[0].connectors={},d=>d.cables['FOH Snake'][0].cables[0].cableType='missing',d=>d.cables['FOH Snake'][0].cables[0].quantity=1.5,d=>d.cables['FOH Snake'][0].lengths=[999],d=>d.cables['FOH Snake'].push(clone(d.cables['FOH Snake'][0]))]){const d=clone(raw);edit(d);assert.throws(()=>Cable.normalise(d))}
assert(!catalogue.categories.some(c=>c.name==='FOH Snake'||c.name==='Stock / Pre-Made Looms'));
for(const edit of [d=>delete d.cables['FOH Snake'][0].cables,d=>d.cables['FOH Snake'][0].cables=[],d=>d.cables['FOH Snake'][0].cables=null,d=>d.cables['FOH Snake'][0].id='',d=>delete d.cables.Data[0].direction,d=>d.cables.Data[0].connectors.male=42,d=>delete d.cables.Data.find(c=>c.name==='Whirlwind 12-Pair').loomOnlyLengths]){const d=clone(raw);edit(d);assert.throws(()=>Cable.normalise(d))}
const legacyCatalogue=clone(raw);legacyCatalogue.looms=[];for(const name of ['FOH Snake','Stock / Pre-Made Looms']){legacyCatalogue.looms.push(...legacyCatalogue.cables[name].map(l=>({...l,category:name})));delete legacyCatalogue.cables[name]}assert.equal(Cable.normalise(legacyCatalogue).looms.length,6);
const duplicate=clone(raw);duplicate.looms=[duplicate.cables['FOH Snake'][0]];assert.throws(()=>Cable.normalise(duplicate));
// Aliases resolve to a single canonical cable, never to a second stock item.
const aliasRaw=clone(raw),aliasCable=aliasRaw.cables.Mains.find(c=>c.name==='32A 3ø');aliasCable.aliases=['32A 3Ph','  32 amp three phase  '];
for(const loom of aliasRaw.cables['FOH Snake'])for(const member of loom.cables)if(member.cableType==='32A 3ø')member.cableType='  32a 3PH  ';
const aliasCatalogue=Cable.normalise(aliasRaw);
assert.deepEqual(aliasCatalogue.categories.find(c=>c.name==='Mains').cables[0].aliases,['32A 3Ph','32 amp three phase']);
assert.deepEqual(aliasCatalogue.looms,catalogue.looms);
for(const template of aliasCatalogue.looms)for(const length of template.lengths)assert.deepEqual(Cable.templateRows(aliasCatalogue,template.id,length),Cable.templateRows(catalogue,template.id,length));
const aliasLegacy=clone(legacyCatalogue);aliasLegacy.cables.Mains[0].aliases=['32A 3Ph'];for(const loom of aliasLegacy.looms)for(const member of loom.cables)if(member.cableType==='32A 3ø')member.cableType='32A 3Ph';assert.deepEqual(Cable.normalise(aliasLegacy).looms,Cable.normalise(legacyCatalogue).looms);
for(const aliases of ['one',null,{},[42],[''],['   ']]){const bad=clone(raw);bad.cables.Data[0].aliases=aliases;assert.throws(()=>Cable.normalise(bad),/aliases must/)}
for(const reverse of [false,true]){
 const bad=clone(raw);bad.cables.Data[0].aliases=['shared'];bad.cables.Mains[0].aliases=[' SHARED '];if(reverse)bad.cables=Object.fromEntries(Object.entries(bad.cables).reverse());assert.throws(()=>Cable.normalise(bad),/Ambiguous cable name or alias/);
 const conflict=clone(raw);conflict.cables.Data[0].aliases=[' 32a 3ø '];if(reverse)conflict.cables=Object.fromEntries(Object.entries(conflict.cables).reverse());assert.throws(()=>Cable.normalise(conflict),/Ambiguous cable name or alias/);
}
const same=clone(raw);same.cables.Data[0].aliases=['XLR-3','xlr-3','Three pin',' THREE PIN '];assert.equal(Cable.normalise(same).categories[0].cables[0].aliases.length,2);
const unknownAlias=clone(aliasRaw);unknownAlias.cables['FOH Snake'][0].cables[0].cableType='undeclared alias';assert.throws(()=>Cable.normalise(unknownAlias),/unknown cable/);
const badAliasLength=clone(aliasRaw);badAliasLength.cables.Mains[0].lengths=[24];assert.throws(()=>Cable.normalise(badAliasLength),/does not list/);
console.log('PASS: alias lookup, canonical metadata, legacy looms, invalid aliases and order-independent ambiguity rejection.');
const entries=Cable.manifest(manifest);assert.equal(entries.length,15);assert.equal(entries.filter(e=>e.optional).length,14);
assert.throws(()=>Cable.manifest({catalogues:[{vendor:'x',file:'../secret.json'}]}));assert.throws(()=>Cable.manifest({catalogues:[...manifest.catalogues,manifest.catalogues[0]]}));
let saves=0,renders=0,ids=0,confirmation=true,alerts=[];
const escape=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const c=vm.createContext({LampyCableCatalogue:Cable,Date,Math,crypto:{randomUUID:()=>String(++ids)},normaliseBlankColour:v=>String(v||''),escapeHtml:escape,escapeAttr:escape,escapeJsAttr:escape,
 app:{looms:[]},ensureProjectInfo:()=>({production:{lightingVendor:'Christie Lites UK'}}),cableCatalogueReference:{catalogues:[catalogue]},
 loomEditorDraft:null,activeLoomEditorId:'',activeLoomExtensionParentId:'',collapsedLoomCards:new Set(),persist:()=>saves++,render:()=>renders++,renderLoomEditor:()=>renders++,confirm:()=>confirmation,alert:v=>alerts.push(v),hideLoomCableMenu(){},$:()=>({classList:{remove(){}}})});
vm.runInContext(fs.readFileSync(path.join(root,'js/loom-colours.js'),'utf8'),c);
for(const n of ['loomId','normaliseLoomUnit','normaliseLoomLength','loomLengthText','normaliseLoomCable','normaliseLoom','normaliseLooms','blankLoomBuildRow','blankLoomDraft','currentCableCatalogue','cableCategoryForType','cableLengthsForType','loomDraftRows','loomRowIsComplete','loomCableFromBuilderRow','loomById','loomDescendantIds','closeLoomEditor','saveLoomEditor','addCatalogueLoom','loomCableGroupKey','loomBuildRowsForLoom','reconcileLoomBuilderRows','setLoomCableTypeMetadata','loomCatalogueControlsMarkup','cableCatalogueStatusMarkup'])vm.runInContext(source(n),c);
assert.equal(catalogue.looms.filter(l=>l.category==='FOH Snake').length,5);
assert.equal(catalogue.looms.filter(l=>l.category==='Stock / Pre-Made Looms').length,1);
for(const template of catalogue.looms){for(const length of template.lengths){
 c.loomEditorDraft=c.blankLoomDraft();c.loomEditorDraft.name='Unfinished custom';c.loomEditorDraft.rows[0]={cableType:'Custom',length:'10',unit:'m',quantity:2};
 const draft=JSON.stringify(c.loomEditorDraft),count=saves,before=c.app.looms.length;
 c.addCatalogueLoom(template.id,length);assert.equal(c.app.looms.length,before+1);assert.equal(saves,count+1);assert.equal(JSON.stringify(c.loomEditorDraft),draft);
 const saved=c.app.looms.at(-1);assert.equal(saved.cables.length,template.cables.reduce((sum,c)=>sum+c.quantity,0));assert(saved.cables.every(cable=>cable.length===length&&cable.unit==='ft'));
 assert.equal(new Set(saved.cables.map(c=>c.id)).size,saved.cables.length);
 for(const cable of saved.cables)assert(cable.direction&&cable.connectors.start&&cable.connectors.end);
 assert.deepEqual(plain(c.normaliseLoom(saved)),plain(saved));
}}
assert.equal(alerts.length,0);
assert(!c.cableLengthsForType('Whirlwind 12-Pair').includes('504'));
const parentId=c.app.looms[0].id;c.activeLoomExtensionParentId=parentId;c.addCatalogueLoom(catalogue.looms[0].id,catalogue.looms[0].lengths[0]);assert.equal(c.app.looms.at(-1).parentLoomId,parentId);c.activeLoomExtensionParentId='';
const countBeforeInvalid=c.app.looms.length,saveBeforeInvalid=saves;c.addCatalogueLoom('missing','304');assert.equal(c.app.looms.length,countBeforeInvalid);assert.equal(saves,saveBeforeInvalid);
vm.runInContext(source('stockLoomMenuOptions'),c);
const stockMarkup=c.loomCatalogueControlsMarkup(false);assert(stockMarkup.includes('>Looms</label>'));assert(stockMarkup.includes('data-loom-stock-picker'));assert(!stockMarkup.includes('<details'));assert(!stockMarkup.includes('Catalogue Looms'));
assert.deepEqual(plain(c.stockLoomMenuOptions()).map(o=>o.label),['Stock / Pre-Made Looms','FOH Snake']);
assert.equal(c.stockLoomMenuOptions('FOH Snake').length,5);assert.equal(c.stockLoomMenuOptions('Stock / Pre-Made Looms').length,2);assert(c.stockLoomMenuOptions('Stock / Pre-Made Looms').every(o=>o.id===catalogue.looms[0].id));
assert(source('showStockLoomMenu').includes('addCatalogueLoom(item.id,item.length)'));assert(source('showStockLoomMenu').includes('positionLoomCableMenu(menu,input)'));assert(source('showStockLoomMenu').includes('data-stock-back'));
const beforeCancel=JSON.stringify(c.app),beforeSaves=saves;c.closeLoomEditor();assert.equal(JSON.stringify(c.app),beforeCancel);assert.equal(saves,beforeSaves);assert.equal(c.loomEditorDraft,null);
const legacy=c.normaliseLoomCable({id:'old',cableType:'Custom',length:'20',unit:'m',label:'Keep',notes:'Keep notes'});assert.equal(legacy.direction,'');assert.equal(legacy.label,'Keep');
const old={id:'oldloom',cables:[legacy]},rows=c.loomBuildRowsForLoom(old);rows[0].quantity=2;c.reconcileLoomBuilderRows(old,rows);assert.equal(old.cables[0].id,'old');assert.equal(old.cables[0].notes,'Keep notes');assert.equal(old.cables.length,2);
const opposite={...legacy,direction:'female-male',connectors:{start:'A',end:'B'}};assert.notEqual(c.loomCableGroupKey(legacy),c.loomCableGroupKey(opposite));
const changed={...opposite};c.setLoomCableTypeMetadata(changed,'XLR-5');assert.equal(changed.direction,'male-female');c.setLoomCableTypeMetadata(changed,'New custom cable');assert.equal(changed.direction,'');assert.equal(changed.connectors.start,'');
assert(source('chooseLoomCableOption').includes('setLoomCableTypeMetadata(row,choice)'));assert(source('updateLoomCableField').includes('setLoomCableTypeMetadata(cable,input.value)'));
assert(!source('loomViewerRowMarkup').includes('loomCableDescriptionMarkup'));assert(!source('loomCableListMarkup').includes('loomCableDescriptionMarkup'));assert(!html.includes('loomConnectorInfo'));assert(!html.includes('data-cable-description'));
assert(source('renderLoomsView').includes('cableCatalogueStatusMarkup()'));
// Exercise actual input handlers without browser automation.
for(const n of ['refreshLoomCableLengths','updateLoomBuilderLength','updateLoomBuilderCable','updateLoomCableField','chooseLoomCableOption','returnToLoomCableCategories','loomLengthDatalist'])vm.runInContext(source(n),c);
c.ensureProjectInfo=()=>({production:{lightingVendor:'Christie Lites UK'}});
let browsing=null;c.showLoomCableMenu=(input,category)=>{browsing=category};c.hideLoomCableMenu=()=>{};
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
assert(!source('loomEditorRowMarkup').includes('loomCableDescriptionMarkup'));
assert(html.includes('#loomEditorBody{position:relative;min-height:0;overscroll-behavior:contain}'));
assert(html.includes('html:has(#loomEditorPane.open),body:has(#loomEditorPane.open){overflow:hidden}'));
const page={appendChild(menu){menu.parentElement=this}},pane={clientWidth:398,scrollTop:120,getBoundingClientRect:()=>({left:800,top:60}),appendChild(menu){menu.parentElement=this}},menu={style:{}};
const positionContext=vm.createContext({document:{body:page},window:{innerWidth:1200,innerHeight:800}});vm.runInContext(source('positionLoomCableMenu'),positionContext);
positionContext.positionLoomCableMenu(menu,{closest:()=>pane},{left:850,bottom:400});assert.equal(menu.parentElement,pane);assert.equal(menu.style.position,'absolute');assert.equal(menu.style.top,'464px');assert.equal(menu.style.overflowY,'visible');assert.equal(menu.style.overscrollBehavior,'contain');
positionContext.positionLoomCableMenu(menu,{closest:()=>null},{left:1100,bottom:780});assert.equal(menu.parentElement,page);assert.equal(menu.style.position,'fixed');assert.equal(menu.style.left,'894px');assert.equal(menu.style.maxHeight,'152px');assert.equal(menu.style.overflowY,'auto');
console.log('PASS: connector-free picker rows, pane-owned scrolling and viewport-bounded live menus.');
(async()=>{
 const loader=vm.createContext({LampyCableCatalogue:Cable,CABLE_CATALOGUE_MANIFEST_URL:'json/cable/manifest.json',cableCatalogueReference:{catalogues:[]},cableCatalogueLoadSequence:0,activeSheetTab:'home',console:{warn(){}},fetchJSONWithFallback:async file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))});
 for(const n of ['normaliseCableCatalogue','loadCableCatalogueReference'])vm.runInContext(source(n),loader);
 await loader.loadCableCatalogueReference();assert.equal(loader.cableCatalogueReference.catalogues.length,1);assert.equal(loader.cableCatalogueReference.unavailable.length,14);assert.equal(loader.cableCatalogueReference.loading,false);
 c.cableCatalogueReference=loader.cableCatalogueReference;c.ensureProjectInfo=()=>({production:{lightingVendor:'Adlib'}});assert(c.cableCatalogueStatusMarkup().includes('unavailable for Adlib'));assert(c.cableCatalogueStatusMarkup().includes('Custom cable entry remains available'));
 let finish;loader.fetchJSONWithFallback=()=>new Promise(resolve=>finish=resolve);const stale=loader.loadCableCatalogueReference();loader.fetchJSONWithFallback=async()=>({catalogues:[]});await loader.loadCableCatalogueReference();finish({catalogues:[]});await stale;assert.equal(loader.cableCatalogueReference.catalogues.length,0);
 loader.fetchJSONWithFallback=async()=>{throw Error('offline')};await loader.loadCableCatalogueReference();assert.equal(loader.cableCatalogueReference.error,'offline');assert.equal(loader.cableCatalogueReference.loading,false);
 console.log('PASS: cable catalogue structure, all directions, loom-only lengths, preset drafts/save/cancel, metadata round trips, independent loading and stale requests.');
})().catch(error=>{console.error(error);process.exitCode=1});
