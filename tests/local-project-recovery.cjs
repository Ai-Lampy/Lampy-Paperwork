const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{indexedDB}=require('fake-indexeddb');
const context={indexedDB};vm.runInNewContext(fs.readFileSync('js/local-project-recovery.js','utf8'),context);
(async()=>{
 assert.deepEqual(Array.from(await context.LampyLocalRecovery.read()),[]);
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('lampy-account-projects-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('records',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
 const original={key:'saved',kind:'project',name:'Saved gig',payload:{app:{fixturePatch:[{id:'fixture'}]}},deleted:false};
 await new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite');tx.objectStore('records').put(original);tx.objectStore('records').put({...original,key:'deleted',deleted:true});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
 const records=await context.LampyLocalRecovery.read();assert.equal(records.length,1);assert.deepEqual(records[0],original);
 assert.equal((await context.LampyLocalRecovery.read())[0].payload.app.fixturePatch[0].id,'fixture');db.close();console.log('PASS: earlier browser projects remain intact and recoverable without sign-in or writes.');
})().catch(error=>{console.error(error);process.exitCode=1});
