'use strict';
const assert=require('node:assert/strict');
const {indexedDB}=require('fake-indexeddb');
const Store=require('../js/account-project-store.js');
const payload=name=>({fileType:'Lampy Paperwork Project',app:{labels:[],distros:[],fixturePatch:[],projectInfo:{file:{projectName:name}},gdtfFiles:{imported:{base64:'complete-imported-data'}}}});
(async()=>{
 const name='account-store-test-'+crypto.randomUUID(),a=await Store.open({indexedDB,name}),b=await Store.open({indexedDB,name});
 try{
  const first=await a.create({owner:'owner-a',name:'First',payload:payload('First')});
  const second=await a.create({owner:'owner-a',name:'Second',payload:payload('Second')});
  await a.create({owner:'owner-b',id:first.id,name:'Other owner',payload:payload('Other')});
  assert.equal((await a.list('owner-a')).length,2);
  assert.equal((await a.list('owner-b')).length,1);
  const edits=await Promise.all([
   a.save({owner:'owner-a',id:first.id,expectedRevision:1,payload:payload('Tab A')}),
   b.save({owner:'owner-a',id:first.id,expectedRevision:1,payload:payload('Tab B')})
  ]);
  assert.equal(edits.filter(x=>x.ok).length,1,'only one simultaneous edit may replace a revision');
  assert.equal(edits.filter(x=>x.conflict).length,1);
  const winner=edits.find(x=>x.ok).record,loser=edits.find(x=>!x.ok);
  assert.equal((await b.read('owner-a','project',first.id)).payload.app.projectInfo.file.projectName,winner.payload.app.projectInfo.file.projectName);
  const recovery=(await a.recoveries('owner-a','project',first.id)).find(x=>x.key===loser.recoveryKey);
  assert(recovery,'the losing tab remains recoverable');
  assert.notEqual(recovery.payload.app.projectInfo.file.projectName,winner.payload.app.projectInfo.file.projectName);
  assert.equal((await a.read('owner-a','project',second.id)).revision,1,'other projects remain unchanged');
  const leases=await Promise.all([a.beginSync('owner-a','project',first.id),b.beginSync('owner-a','project',first.id)]);
  assert.equal(leases.filter(Boolean).length,1,'tabs cannot upload the same project concurrently');
  const sync=leases.find(Boolean);
  await a.save({owner:'owner-a',id:first.id,expectedRevision:winner.revision,payload:payload('While uploading')});
  const ack=await b.finishSync('owner-a','project',first.id,{token:sync.lease.token,etag:'"online-1"'});
  assert.equal(ack.dirty,true,'new edits are not accidentally marked synced');assert.equal(ack.syncedRevision,2);assert.equal(ack.revision,3);
  assert.equal(ack.remoteEtag,'"online-1"');
  const next=await a.beginSync('owner-a','project',first.id);
  assert.equal(next.lease.baseEtag,'"online-1"');
  const interrupted=await a.finishSync('owner-a','project',first.id,{token:next.lease.token,error:'Offline'});
  assert.equal(interrupted.dirty,true);assert.equal(interrupted.payload.app.gdtfFiles.imported.base64,'complete-imported-data');
  const retry=await a.beginSync('owner-a','project',first.id);
  await a.finishSync('owner-a','project',first.id,{token:retry.lease.token,conflict:{etag:'"other-device"'}});
  assert.equal(await b.beginSync('owner-a','project',first.id),null,'conflicts require an explicit resolution');
  const denied=await a.acceptRemote({owner:'owner-a',id:first.id,expectedRevision:2,expectedEtag:'"online-1"',payload:payload('Online'),etag:'"other-device"'});
  assert.equal(denied.ok,false,'a stale conflict dialogue cannot discard subsequent edits');
  const accepted=await a.acceptRemote({owner:'owner-a',id:first.id,expectedRevision:3,expectedEtag:'"online-1"',payload:payload('Online'),etag:'"other-device"'});
  assert.equal(accepted.ok,true);assert.equal(accepted.record.dirty,false);
  assert((await a.recoveries('owner-a','project',first.id)).some(x=>x.payload.app.projectInfo.file.projectName==='While uploading'));
  const deleted=await a.save({owner:'owner-a',id:second.id,expectedRevision:1,payload:second.payload,deleted:true});
  assert.equal((await a.list('owner-a')).length,1);assert.equal((await a.list('owner-a','project',{includeDeleted:true})).length,2);
  await assert.rejects(a.save({owner:'owner-a',id:second.id,expectedRevision:2,payload:payload('Accidental resurrection')}),/Restore/);
  assert.equal((await a.restore({owner:'owner-a',id:second.id,expectedRevision:deleted.record.revision})).ok,true);
  assert.equal((await a.list('owner-a')).length,2);
  const template=await a.create({owner:'owner-a',kind:'template',name:'Tour',payload:{areas:['logos'],data:{logo:{name:'A'}}}});
  const copy=await a.read('owner-a','template',template.id);copy.payload.data.logo.name='B';
  assert.equal((await a.read('owner-a','template',template.id)).payload.data.logo.name,'A','reads are independent snapshots');
  const lease1=await a.beginSync('owner-a','project',second.id,{now:100,leaseMs:1});
  const lease2=await b.beginSync('owner-a','project',second.id,{now:102});
  assert(lease1&&lease2);assert.notEqual(lease1.lease.token,lease2.lease.token);
  assert.equal((await a.finishSync('owner-a','project',second.id,{token:lease1.lease.token,etag:'"stale"'})).ignored,true);
  const synced=await b.finishSync('owner-a','project',second.id,{token:lease2.lease.token,etag:'"confirmed"'});
  assert.equal(synced.dirty,false);
  await assert.rejects(a.create({owner:'owner-a',id:first.id,payload:payload('Overwrite')}),/constraint|exist/i);
  console.log('PASS: account project isolation, atomic tab conflicts, recovery, sync leases, in-flight edits, offline retention, reviewed replacement, tombstones and templates.');
 }finally{a.close();b.close();indexedDB.deleteDatabase(name)}
})().catch(error=>{console.error(error);process.exitCode=1});
