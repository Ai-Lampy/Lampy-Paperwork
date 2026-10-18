const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sidebar=require('../js/app-sidebar.js');
const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
assert.equal(sidebar.readPreference(storage),false);
sidebar.writePreference(storage,true);assert.equal(sidebar.readPreference(storage),true);
sidebar.writePreference(storage,false);assert.equal(sidebar.readPreference(storage),false);
const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};
assert.equal(sidebar.readPreference(blocked),false);assert.doesNotThrow(()=>sidebar.writePreference(blocked,true));
assert.deepEqual(sidebar.layoutState(false,false,false),{width:200,hidden:false,expanded:true});
assert.deepEqual(sidebar.layoutState(true,false,false),{width:60,hidden:false,expanded:false});
for(const compact of [false,true]){
 assert.deepEqual(sidebar.layoutState(compact,true,false),{width:0,hidden:true,expanded:false});
 assert.deepEqual(sidebar.layoutState(compact,true,true),{width:0,hidden:false,expanded:true});
}
const source=fs.readFileSync(path.join(__dirname,'../js/app-sidebar.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'../js/app-sidebar.css'),'utf8'),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert(source.includes("aside.inert=state.hidden"));assert(source.includes("event.key==='Escape'"));assert(source.includes("event.key==='Tab'"));
assert(source.includes("disclosure.setAttribute('aria-expanded'"));assert(source.includes("button.setAttribute('aria-current','page')"));
assert(css.includes('overscroll-behavior:contain'));assert(css.includes('@media print'));assert(css.includes('padding-left:0!important'));
assert(html.includes('renderSheetTabMenus();window.LampySidebar?.refresh();updateApplicationChrome()'));
assert(html.includes('LampySidebar.init({changed:()=>{scheduleResponsiveSheetLayout();scheduleApplicationTitleFit()}})'));
console.log('Application sidebar regressions passed');

// The previous horizontal toolbar centred the entire menu halfway down the rail.
// Lock the independent content wrapper and its top-aligned, single-column flow.
function declarations(selector){let start=css.indexOf(selector+'{');while(start>0&&css[start-1]===',')start=css.indexOf(selector+'{',start+1);assert(start>=0,selector);return Object.fromEntries(css.slice(start+selector.length+1,css.indexOf('}',start)).split(';').filter(Boolean).map(item=>{const i=item.indexOf(':');return [item.slice(0,i),item.slice(i+1)]}));}
assert(source.includes("nav.classList.remove('previewHead')"));
assert(source.includes("nav.classList.add('appNavigationContent')"));
const content=declarations('.appNavigation .appNavigationContent'),tabs=declarations('.appNavigation .sheetTabs');
assert.equal(content.display,'block');assert.equal(content['min-height'],'0');assert.equal(content['overflow-y'],'auto');
assert.equal(tabs['justify-content'],'flex-start');assert.equal(tabs['flex-wrap'],'nowrap');assert.equal(tabs.height,'max-content');
assert.equal(declarations('.appNavigation .sheetTabMenuHost').flex,'0 0 auto');
assert.equal(declarations('.appNavigationDisclosure')['grid-row'],'1');
assert.equal(declarations('.appNavigation .sheetSubMenu,.appNavigation .sheetTabMenuHost.menuDismissed .sheetSubMenu')['grid-row'],'2');
assert.equal(declarations('.appNavigationHead').display,'flex');
assert(source.includes('stroke="currentColor"'));assert(source.includes('focusable="false"'));
assert(!source.includes("icon.textContent=icons"));
assert(css.includes('@media(prefers-reduced-motion:reduce)'));
console.log('PASS: sidebar top alignment, non-wrapping rail, independent scroll, inline header and disclosure row placement.');

const workspace=declarations('body.hasAppNavigation>.topHeader,body.hasAppNavigation>.appShell,body.hasAppNavigation>.appFooter');
assert.equal(workspace.width,'100%');assert.equal(workspace['max-width'],'100%');
assert.equal(workspace['margin-left'],'0');assert.equal(workspace['margin-right'],'0');
assert.equal(declarations('body.hasAppNavigation>.appShell>.wrap>.previewPanel').padding,'0');
assert.equal(1500-sidebar.layoutState(false,false,false).width,1300);
assert.equal(1500-sidebar.layoutState(true,false,false).width,1440);
assert.equal(375-sidebar.layoutState(false,true,false).width,375);
console.log('PASS: full-width expanded, compact and mobile workspace without wrapper gutters.');

assert.deepEqual(sidebar.flyoutPosition({right:60,top:80},{width:1500,height:900},240,200),{left:68,top:80});
assert.deepEqual(sidebar.flyoutPosition({right:256,top:850},{width:800,height:900},240,200),{left:264,top:692});
assert.deepEqual(sidebar.flyoutPosition({right:700,top:0},{width:800,height:900},240,884),{left:552,top:8});
assert(source.includes("querySelectorAll('.sheetSubMenu button:not(.appNavigationDuplicate)').forEach(item=>addAction(item))"));
assert(source.includes("hideFlyout();original.click()"));
assert(source.includes("flyout.addEventListener('pointerenter',cancelLeave)"));
assert(source.includes("event.key==='ArrowRight'"));assert(source.includes('hideFlyout(true)'));
assert(css.includes('@media print{.appNavigationFlyout{display:none!important}}'));
console.log('PASS: flyout viewport bounds, current sub-page routing, pointer handoff, keyboard access and print exclusion.');

assert(html.includes('position:fixed;bottom:8px;right:8px;z-index:9999'));
assert(!html.includes('position:fixed;bottom:8px;left:8px;z-index:9999'));

assert.equal(declarations('body.hasAppNavigation>.topHeader,body.hasAppNavigation>.appShell')['padding-left'],'10px');
assert.equal(declarations('body.hasAppNavigation>.topHeader,body.hasAppNavigation>.appShell')['padding-right'],'10px');
assert.equal(declarations('body.hasAppNavigation>.appFooter')['margin-left'],'10px');
assert.equal(declarations('body.hasAppNavigation>.appFooter').width,'98%');
assert.equal(declarations('body.hasAppNavigation>.appFooter')['max-width'],'calc(100% - 10px)');

assert.equal(declarations('.appNavigation').background,'#9b9b9b');
assert.equal(declarations('.appNavigation')['border-right'],'2px solid #000');
assert.equal(declarations('.appNavigation').padding,'12px 6px');
assert.equal(declarations('.appNavigation')['padding-left'],'10px');
assert.equal(declarations('.appNavigation .sheetTab').color,'#ffffff');
assert(css.includes('body.hasAppNavigation #sheet>:is(.homeView,.fixturePatchView,.powerSheetView'));
assert(css.includes('.projectSettingsView,.tableView){background:#fff}'));

assert.equal(declarations('body.hasAppNavigation')['--navigation-width'],'200px');
assert.equal(declarations('.appNavigationDisclosure').color,'#000000');
assert.equal(declarations('.appNavigation .sheetTab').font,'14px/20px var(--app-font)');
assert.equal(content['scrollbar-color'],'#f5f5f5 transparent');
assert.equal(declarations('.appNavigation .sheetSubMenu,.appNavigation .sheetTabMenuHost.menuDismissed .sheetSubMenu').background,'#9b9b9b');
assert.equal(declarations('.appNavigation .sheetSubMenu button').color,'#ffffff');
assert.equal(declarations('.appNavigation .sheetSubMenu button')['border-left'],undefined);
assert(source.includes('if(!collapsed||media.matches||suppressFocus)return'));
assert(css.includes('--navigation-width:min(200px,85vw)'));
for(const [parent,label,icon] of [['fixturePatch','Imported show','fixturePatch'],['fixturePatch','Universe Detail','universe'],['network','Device Config','network'],['network','Port Configuration','ports'],['powerSheet','Fan Outs','fan'],['powerSheet','Phase Totals','totals'],['rackLayout','Rack A','rackLayout'],['looms','Cable List','list'],['distroLabels','Front RCBO Labels','distroLabels'],['distroLabels','Rear Labels','rear'],['distroLabels','Table View','fixturePatch']])assert.equal(sidebar.subPageIcon(parent,label),icon);
const doc={createElement:()=>({setAttribute(key,value){this[key]=value}})},button={setAttribute(key,value){this[key]=value},removeAttribute(key){delete this[key]},textContent:'Rear Labels',querySelector(){return this.children?.[0]},replaceChildren(...children){this.children=children}};
sidebar.decorateSubPage(button,'distroLabels',doc);
assert.equal(button.children[1].textContent,'Rear Labels');assert.equal(button.children[0]['aria-hidden'],'true');assert(button.children[0].innerHTML.includes('<svg'));
const first=button.children;sidebar.decorateSubPage(button,'distroLabels',doc);assert.equal(button.children,first);
console.log('PASS: 200px sidebar, expanded hover suppression, requested styles and labelled sub-page icons.');

assert.equal(declarations('body.hasAppNavigation>.topHeader>.top')['padding-right'],'10px');

for(const compact of [false,true])for(const active of [false,true])for(const expanded of [false,true])assert.equal(sidebar.subPagesVisible(compact,active,expanded),compact?active:expanded);
assert(source.includes("if(page)resetExpandedPages(expanded,page.dataset.sheetTab)"));
assert(source.includes('if(activePage!==lastActivePage)'));
assert(source.includes("menu.hidden=!visible"));
assert(source.includes("menu.querySelectorAll('button').forEach(item=>item.removeAttribute('title'))"));
assert(css.includes('.appNavigationCompact .appNavigation .appNavigationSubLabel{display:none}'));
assert.equal(button['aria-label'],'Rear Labels');
assert.equal(new Set(['universe','fan','ports','looms'].map(sidebar.iconMarkup)).size,4);
for(const key of ['universe','fan','ports','looms'])assert(sidebar.iconMarkup(key).includes('aria-hidden="true"'));
const header=html.slice(html.indexOf('<header class="topHeader">'),html.indexOf('</header>')+9),headerActions=header.slice(header.indexOf('<div class="topActions">'),header.indexOf('<button class="menuButton"'));
assert(headerActions.indexOf('id="tourLogoSlot"')<headerActions.indexOf('id="projectErrorsButton"'));
assert(!headerActions.includes('Report Issue'));
assert(header.slice(header.indexOf('<aside class="actionSidebar"')).includes('href="https://github.com/Ai-Lampy/Lampy-Paperwork/issues"'));
assert(header.includes('class="btn" onclick="closeActionMenu()" href='));
assert(source.includes("aside.querySelectorAll('button,a[href]')"));
console.log('PASS: automatic sub-pages, active compact icons, distinct glyphs, Report Issue in Menu and Errors after Tour Logo.');

const compactPrefix='.appNavigationCompact .appNavigation ';
assert.equal(declarations(compactPrefix+'.sheetTab.active')['border-bottom'],'1px solid white');
assert.equal(declarations(compactPrefix+'.sheetTabMenuHost:has(>.sheetTab.active)').border,'1px solid white');
assert.equal(declarations(compactPrefix+'.sheetSubMenu,'+compactPrefix+'.sheetTabMenuHost.menuDismissed .sheetSubMenu').padding,'4px');
assert.equal(declarations(compactPrefix+'.sheetSubMenu[hidden],'+compactPrefix+'.sheetTabMenuHost.menuDismissed .sheetSubMenu[hidden]').display,'none!important');
assert.equal(declarations('.appNavigation .sheetTab.active')['border-bottom'],undefined);
assert(source.includes("closest('[data-sheet-tab],.sheetSubMenu button');if(button)showFlyout(button)"));
assert(source.includes(".filter(item=>item.getClientRects().length)"));
for(const current of ['fixturePatch','network','home']){
 const visible=['fixturePatch','network'].filter(key=>sidebar.subPagesVisible(true,key===current,true));
 assert.deepEqual(visible,current==='home'?[]:[current]);
}
console.log('PASS: compact-only borders/padding, hidden-menu precedence, current-page-only submenus and sub-page hover/focus names.');

// Reopening must not resurrect groups previously visited in either sidebar mode.
const reopened=new Set(['fixturePatch','network','looms']);
sidebar.resetExpandedPages(reopened,'powerSheet');assert.deepEqual([...reopened],['powerSheet']);
assert.equal(sidebar.subPagesVisible(false,false,reopened.has('fixturePatch')),false);
assert.equal(sidebar.subPagesVisible(false,true,reopened.has('powerSheet')),true);
sidebar.resetExpandedPages(reopened,'home');assert.deepEqual([...reopened],['home']);
sidebar.resetExpandedPages(reopened,undefined);assert.equal(reopened.size,0);
assert(source.includes('if(state.expanded&&!wasExpanded)resetExpandedPages'));
assert(source.includes('wasExpanded=state.expanded'));
assert(source.includes('expanded.has(key)?expanded.delete(key):resetExpandedPages(expanded,key);paint()'));
console.log('PASS: desktop/mobile reopen clears stale groups, selects the current group and preserves manual disclosure toggles.');

assert(source.includes('if(activePage!==lastActivePage){resetExpandedPages(expanded,activePage)'));
for(const key of ['powerSheet','network','fixturePatch','home']){
 sidebar.resetExpandedPages(reopened,key);
 for(const compact of [false,true]){
  const visible=['powerSheet','network','fixturePatch'].filter(page=>sidebar.subPagesVisible(compact,page===key,reopened.has(page)));
  assert.deepEqual(visible,key==='home'?[]:[key]);
 }
}
const groupSizing=declarations('.appNavigation .sheetTabMenuHost'),submenuSizing=declarations('.appNavigation .sheetSubMenu,.appNavigation .sheetTabMenuHost.menuDismissed .sheetSubMenu');
assert.equal(groupSizing.height,'max-content');assert.equal(groupSizing['grid-template-rows'],'44px max-content');
assert.equal(submenuSizing.height,'max-content');assert.equal(submenuSizing['align-content'],'start');assert.equal(submenuSizing['grid-auto-rows'],'max-content');
assert.equal(declarations('.appNavigation .sheetSubMenu button')['align-self'],'start');
console.log('PASS: both sidebar modes close previous groups and submenu grids use intrinsic non-stretching rows.');

// V53: destination state, compact labels, Home settings, contextual help and loom preferences.
const vm=require('node:vm');
function appFunction(name){const start=html.indexOf('function '+name+'(');assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const code=html.slice(start,end+1);try{new Function('return ('+code+')');return code}catch{}}throw Error(name)}
assert.equal(sidebar.flyoutMode('home',true),'none');
assert.equal(sidebar.flyoutMode('home',false),'group');
assert.equal(sidebar.flyoutMode('powerSheet',true),'name');
assert.equal(sidebar.flyoutMode('powerSheet',false),'group');
assert.equal(sidebar.flyoutMode(undefined,true),'name');
assert.equal(sidebar.flyoutMode(undefined,false),'name');
assert(source.includes("if(button.dataset.sheetTab!=='home')addAction(button,true)"));
assert(source.includes("if(mode==='group')button.parentElement"));
assert(css.includes('button[aria-current="page"]{background:#0060ff'));
assert(css.includes('.appNavigationCompact .appNavigation .sheetSubMenu button.appNavigationDuplicate{display:none}'));
assert(html.includes("if(route.active)item.setAttribute('aria-current','page')"));
assert.equal(sidebar.subPageIcon('home','Project Settings'),'settings');
assert.notEqual(sidebar.iconMarkup('rear'),sidebar.iconMarkup('distroLabels'));
assert(source.indexOf('footer.append(helpButton)')<source.indexOf('footer.append(menuButton)'));
assert(source.includes("root.openAppInfo('help')"));
assert(!html.slice(html.indexOf('<aside class="actionSidebar"'),html.indexOf('</header>')).includes('>Project Settings</button>'));
assert(html.includes('.projectErrorsControl{position:relative;padding-left:6px}'));
const context=vm.createContext({activeProjectTab:'general',activeSheetTab:'home',activePatchSheetId:'master',activePowerSubTab:'calcs',activeNetworkSubTab:'deviceConfig',activeControlNetworkTab:'consoles',activeRackTabId:'r1',activeLoomSubTab:'looms',activeDistroLabelTab:'labels',activeUniverseDetail:1,app:{patchSheets:[],controlNetwork:{racks:[{id:'r1',name:'Rack'}]}},distroRanges:()=>[],powerPhaseTotalsAvailable:()=>true,normalisePatchSheets:v=>v,setSheetTab:tab=>context.activeSheetTab=tab,openProjectSettings:()=>context.activeSheetTab='projectSettings'});
for(const name of ['projectSettingsTabLabel','sheetSubMenuRoutes','applicationPageHelp'])vm.runInContext(appFunction(name),context);
context.sheetSubMenuRoutes('home')[0].run();assert.equal(context.activeSheetTab,'projectSettings');assert.equal(context.sheetSubMenuRoutes('home')[1].active,true);assert.equal(context.sheetSubMenuRoutes('home')[1].label,'General');
context.activeSheetTab='fixturePatch';let routes=context.sheetSubMenuRoutes('fixturePatch');assert(routes[0].active);assert(routes[0].compactDuplicate);
context.app.patchSheets=[{id:'a',name:'Show A'},{id:'b',name:'Show B'}];context.activePatchSheetId='b';routes=context.sheetSubMenuRoutes('fixturePatch');assert(!routes[0].compactDuplicate);assert.deepEqual(Array.from(routes.filter(r=>r.active),r=>r.label),['Show B']);assert.equal(routes.at(-1).label,'Universe Detail');
for(const [page,group,key,value,label] of [['powerSheet','powerSheet','activePowerSubTab','fanOuts','Fan Outs'],['deviceConfig','network','activeNetworkSubTab','portConfiguration','Port Configuration'],['looms','looms','activeLoomSubTab','cableList','Cable List'],['distroLabels','distroLabels','activeDistroLabelTab','rear','Rear Labels'],['controlNetwork','rackLayout','activeControlNetworkTab','racks','Rack']]){context.activeSheetTab=page;context[key]=value;assert.deepEqual(Array.from(context.sheetSubMenuRoutes(group).filter(r=>r.active),r=>r.label),[label]);assert(context.applicationPageHelp().length>50)}
const data=new Map(),localStorage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
function loomContext(){const c=vm.createContext({localStorage,collapsedLoomCards:new Set(),knownLoomCardStates:new Set(),loomById:id=>({id}),loomDescendantIds:()=>new Set(['child']),render(){}});for(const name of ['initialiseLoomCardState','saveLoomCardState','toggleLoomCard'])vm.runInContext(appFunction(name),c);return c}
let looms=loomContext();looms.initialiseLoomCardState('a');assert(looms.collapsedLoomCards.has('a'));looms.toggleLoomCard('a');assert(!looms.collapsedLoomCards.has('a'));looms.initialiseLoomCardState('a');assert(!looms.collapsedLoomCards.has('a'));
looms=loomContext();looms.initialiseLoomCardState('a');assert(!looms.collapsedLoomCards.has('a'));looms.initialiseLoomCardState('new');assert(looms.collapsedLoomCards.has('new'));looms.toggleLoomCard('a');assert(looms.collapsedLoomCards.has('child'));
looms=loomContext();looms.initialiseLoomCardState('a');assert(looms.collapsedLoomCards.has('a'));looms.localStorage={getItem(){throw Error()},setItem(){throw Error()}};assert.doesNotThrow(()=>looms.toggleLoomCard('a'));
assert(appFunction('loadProjectPayload').includes('knownLoomCardStates.clear()'));assert(!appFunction('appPayload').includes('knownLoomCardStates'));
console.log('PASS: V53 active destinations, compact hover policy, single-patch shortcut, contextual Help, Home Settings and reload-safe loom disclosure preferences.');

// The compact inactive-group flyout must not resurrect the hidden single-patch shortcut.
assert(source.includes("querySelectorAll('.sheetSubMenu button:not(.appNavigationDuplicate)')"));
const labelOutline='M3 3h9l9 9-9 9-9-9zM7 7h.01';
assert(sidebar.iconMarkup('rear').includes(labelOutline));
assert(sidebar.iconMarkup('distroLabels').includes(labelOutline));
assert(sidebar.iconMarkup('rear').includes('M9 16V9h3'));
console.log('PASS: compact flyouts suppress duplicate Patch and Rear Labels retains the label outline with an R.');
