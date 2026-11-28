const assert=require('node:assert/strict'),fs=require('node:fs'),Core=require('../js/patch-sharing-core.js');
const snapshot=Core.snapshot({title:'Patch',fixtures:[{id:'one',fixture:'<script>',channels:0,password:'secret',notes:'Original'}],email:'secret'});
assert.equal(snapshot.fixtures[0].fixture,'<script>');assert(!('password'in snapshot.fixtures[0]));assert(!('email'in snapshot));assert.equal(snapshot.fixtures[0].channels,0);
assert.throws(()=>Core.snapshot({fixtures:[{id:'one'},{id:'one'}]}),/unique/);assert.throws(()=>Core.snapshot({fixtures:[]}),/Share/);
assert.throws(()=>Core.note({requestId:'id',fixtureId:'one',name:'Name',jobRole:'',body:'body',version:1}),/job role/);
assert(Core.TOKEN.test(Core.token()));assert.notEqual(Core.colour(1),Core.colour(2));
const html=fs.readFileSync('index.html','utf8'),sidebar=fs.readFileSync('js/app-sidebar.js','utf8');assert(!html.includes('LampyAccounts'));assert(!sidebar.includes('LampyAccounts'));assert(!html.includes('js/account-'));assert(html.includes('projectShareId:globalThis.LampyPatchShare?.projectKey'));
console.log('PASS: snapshot privacy allowlist, IDs, required note identity, highlight colours and removal of account UI hooks.');

// Snapshot data must preserve the owner's effective parameters and separate internal modes.
const vm=require('node:vm'),context={LampyPatchShare:{isViewer:false},ensureProjectInfo:()=>({file:{projectName:'Show'},positions:[],projectSettings:{units:{measurement:'metric'}}}),activePatchRows:()=>[{id:'a',fixture:'Fixture',mode:'Same display name',gdtfMode:'mode-a',channels:16},{id:'b',fixture:'Fixture',mode:'Same display name',gdtfMode:'mode-b',channels:16}],fixtureModeParameters:()=>12};
vm.createContext(context);vm.runInContext(html.match(/function fixturePatchShareSnapshot\(\)\{[^\n]+/)[0],context);
const shared=Core.snapshot(context.fixturePatchShareSnapshot());
assert.equal(shared.fixtures.reduce((n,row)=>n+row.parameters,0),24);
assert.equal(shared.fixtures[0].watts,null);assert.equal(shared.fixtures[0].gdtfMode,'mode-a');assert.equal(shared.fixtures[1].gdtfMode,'mode-b');
context.LampyPatchShare.isViewer=true;vm.runInContext(html.match(/function fixtureModeParameters\(row\)\{[^\n]+/)[0],context);
assert.equal(context.fixtureModeParameters(shared.fixtures[0]),12);
assert.equal(context.fixtureModeParameters({...shared.fixtures[0],parameters:0}),0);
vm.runInContext(html.match(/function patchGroupKey\(row\)\{[^\n]+/)[0],context);
assert.notEqual(context.patchGroupKey(shared.fixtures[0]),context.patchGroupKey(shared.fixtures[1]));
console.log('PASS: shared fixture groups, effective parameter totals and unknown measurements match the owner.');
