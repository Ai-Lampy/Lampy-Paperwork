/* Complete local project snapshots. No credentials or global active-project slot. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LampyProjectStore=api;})(globalThis,function(){
 'use strict';
 const DATABASE='lampy-account-projects-v1', SCHEMA=1;
 const clone=value=>structuredClone(value);
 function key(owner,kind,id){
  if(typeof owner!=='string'||!owner||owner.length>256)throw Error('Invalid project owner');
  if(!['project','template'].includes(kind)||typeof id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(id))throw Error('Invalid project identity');
  return JSON.stringify([owner,kind,id]);
 }
 function open({indexedDB=globalThis.indexedDB,name=DATABASE}={}){
  return new Promise((resolve,reject)=>{
   if(!indexedDB){reject(Error('This browser does not provide local project storage.'));return}
   const request=indexedDB.open(name,SCHEMA);
   request.onupgradeneeded=()=>{
    const db=request.result;
    const records=db.createObjectStore('records',{keyPath:'key'});records.createIndex('owner','owner');
    const history=db.createObjectStore('history',{keyPath:'key'});history.createIndex('recordKey','recordKey');
   };
   request.onerror=()=>reject(request.error);
   request.onblocked=()=>reject(Error('Close older account windows, then reopen the project manager.'));
   request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();resolve(repository(db))};
  });
 }
 function repository(db){
  // Never await network or unrelated work inside an IndexedDB transaction.
  function transaction(stores,mode,work){return new Promise((resolve,reject)=>{
   let result,error;const tx=db.transaction(stores,mode,{durability:mode==='readwrite'?'strict':'default'});
   const done=value=>{result=value};
   const fail=e=>{error=e;tx.abort()};
   tx.oncomplete=()=>resolve(clone(result));tx.onabort=()=>reject(error||tx.error||Error('Local save was interrupted.'));tx.onerror=()=>{};
   try{work(tx,done,fail)}catch(e){fail(e)}
  })}
  function historyEntry(tx,record,reason,payload=record.payload){
   const entry={key:crypto.randomUUID(),recordKey:record.key,owner:record.owner,kind:record.kind,id:record.id,name:record.name,revision:record.revision,payload:clone(payload),reason,savedAt:new Date().toISOString()};
   tx.objectStore('history').add(entry);return entry.key;
  }
  function read(owner,kind,id){return transaction(['records'],'readonly',(tx,done)=>{const r=tx.objectStore('records').get(key(owner,kind,id));r.onsuccess=()=>done(r.result||null)})}
  function list(owner,kind='project',{includeDeleted=false}={}){return transaction(['records'],'readonly',(tx,done)=>{
   const r=tx.objectStore('records').index('owner').getAll(owner);r.onsuccess=()=>done(r.result.filter(x=>x.kind===kind&&(includeDeleted||!x.deleted)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));
  })}
  function create({owner,kind='project',id=crypto.randomUUID(),name,payload,remoteEtag=null}){
   if(!payload||typeof payload!=='object')return Promise.reject(Error('A project snapshot is required.'));
   const record={key:key(owner,kind,id),owner,kind,id,name:String(name||'Untitled').slice(0,200),payload:clone(payload),revision:1,syncedRevision:remoteEtag?1:0,remoteEtag,dirty:!remoteEtag,deleted:false,updatedAt:new Date().toISOString(),syncLease:null,conflict:null};
   return transaction(['records'],'readwrite',(tx,done)=>{tx.objectStore('records').add(record);done(record)})
  }
  function save({owner,kind='project',id,expectedRevision,payload,name,deleted=false,checkpoint=false}){
   const copy=clone(payload);
   return transaction(['records','history'],'readwrite',(tx,done,fail)=>{
    const store=tx.objectStore('records'),r=store.get(key(owner,kind,id));r.onsuccess=()=>{try{
     const current=r.result;if(!current)throw Error('The project is no longer available on this device.');
     if(current.revision!==expectedRevision){
      const recoveryKey=historyEntry(tx,current,'concurrent-tab-edit',copy);
      done({ok:false,conflict:true,current,recoveryKey});return;
     }
     if(current.deleted&&!deleted)throw Error('Restore the deleted project explicitly before editing it.');
     if(checkpoint||deleted)historyEntry(tx,current,deleted?'before-delete':'before-replacement');
     const next={...current,payload:copy,name:String(name??current.name).slice(0,200),deleted,revision:current.revision+1,dirty:true,updatedAt:new Date().toISOString()};
     store.put(next);done({ok:true,record:next});
    }catch(e){fail(e)}};
   });
  }
  function recoveries(owner,kind,id){return transaction(['history'],'readonly',(tx,done)=>{
   const r=tx.objectStore('history').index('recordKey').getAll(key(owner,kind,id));r.onsuccess=()=>done(r.result.sort((a,b)=>b.savedAt.localeCompare(a.savedAt)));
  })}
  function mutate(owner,kind,id,work){return transaction(['records','history'],'readwrite',(tx,done,fail)=>{
   const store=tx.objectStore('records'),r=store.get(key(owner,kind,id));r.onsuccess=()=>{try{
    const record=r.result;if(!record)throw Error('Project not found.');
    const result=work(record,tx);if(result.write)store.put(result.record||record);done(result.value);
   }catch(e){fail(e)}};
  })}
  function beginSync(owner,kind,id,{now=Date.now(),leaseMs=60000}={}){
   return mutate(owner,kind,id,record=>{
    if(!record.dirty||record.conflict||(record.syncLease&&record.syncLease.expiresAt>now))return {write:false,value:null};
    if(!record.pendingUpload||record.pendingUpload.revision!==record.revision||record.pendingUpload.baseEtag!==record.remoteEtag)record.pendingUpload={revision:record.revision,baseEtag:record.remoteEtag,writeId:crypto.randomUUID()};
    const lease={token:crypto.randomUUID(),expiresAt:now+leaseMs,revision:record.revision,baseEtag:record.remoteEtag,writeId:record.pendingUpload.writeId};
    record.syncLease=lease;return {write:true,value:{record:clone(record),lease}};
   });
  }
  function finishSync(owner,kind,id,{token,etag,error=null,conflict=null}){
   return mutate(owner,kind,id,(record,tx)=>{
    const lease=record.syncLease;if(!lease||lease.token!==token)return {write:false,value:{ignored:true}};
    if(conflict){historyEntry(tx,record,'online-conflict');record.conflict=clone(conflict)}
    else if(!error){
     if(typeof etag!=='string'||!etag)throw Error('The server did not confirm the project version.');
     record.remoteEtag=etag;record.syncedRevision=lease.revision;record.dirty=record.revision!==lease.revision;record.pendingUpload=null;
    }
    record.syncLease=null;record.syncError=error?String(error):null;
    return {write:true,value:record};
   });
  }
  function acceptRemote({owner,kind='project',id,expectedRevision,expectedEtag,payload,name,etag,deleted=false}){
   return mutate(owner,kind,id,(record,tx)=>{
    if(record.revision!==expectedRevision||record.remoteEtag!==expectedEtag)return {write:false,value:{ok:false,current:record}};
    if(!etag)throw Error('The server did not confirm the project version.');
    historyEntry(tx,record,'before-online-replacement');
    const next={...record,payload:clone(payload),name:String(name||record.name).slice(0,200),revision:record.revision+1,syncedRevision:record.revision+1,remoteEtag:etag,dirty:false,deleted,conflict:null,syncError:null,syncLease:null,updatedAt:new Date().toISOString()};
    return {write:true,record:next,value:{ok:true,record:next}};
   });
  }
  function restore({owner,kind='project',id,expectedRevision}){
   return mutate(owner,kind,id,record=>{
    if(record.revision!==expectedRevision)return {write:false,value:{ok:false,current:record}};
    record.deleted=false;record.revision++;record.dirty=true;record.updatedAt=new Date().toISOString();
    return {write:true,value:{ok:true,record}};
   });
  }
  return {read,list,create,save,recoveries,beginSync,finishSync,acceptRemote,restore,close:()=>db.close()};
 }
 return {DATABASE,SCHEMA,key,open};
});
