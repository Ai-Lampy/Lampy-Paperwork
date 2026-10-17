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
assert.deepEqual(sidebar.layoutState(false,false,false),{width:256,hidden:false,expanded:true});
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
