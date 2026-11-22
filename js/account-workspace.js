/* Coordinates one editor with many stored projects. The bridge owns app rendering. */
(function(root,factory){const api=factory(root.LampyProjectTransfer||(typeof require==='function'?require('./project-transfer.js'):null),root.LampyCore||(typeof require==='function'?require('./project-core.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.LampyAccountWorkspace=api;})(globalThis,function(Transfer,Core){
 'use strict';
 const copy=value=>structuredClone(value);
 function fingerprint(payload){const value=copy(payload);delete value.savedAt;return JSON.stringify(value)}
 function create({store,bridge,changed=()=>{},announce=()=>{},setLocation=()=>{}}){
  let active=null,applying=false,dirty=false,pending=0,error=null,conflict=null,saved='',chain=Promise.resolve();
  const state=()=>{const metadata=active?Object.fromEntries(Object.entries(active).filter(([key])=>key!=='payload')):null;return {active:metadata?copy(metadata):null,applying,dirty,pending,error,conflict:conflict?{recoveryKey:conflict.recoveryKey,currentRevision:conflict.current?.revision}:null}};
  const notify=()=>changed(state());
  function markDirty(){if(!active||applying)return;dirty=true;notify()}
  function queue(payload=bridge.capture(),{checkpoint=false}={}){
   if(!active||applying)return Promise.resolve(null);
   const id=active.id,owner=active.owner,snapshot=copy(payload),stamp=fingerprint(snapshot);
   Core.validateProject(snapshot);pending++;notify();
   const operation=chain.then(async()=>{
    if(!active||active.id!==id||active.owner!==owner)throw Error('The editor project changed before saving completed.');
    if(conflict)throw Error('Resolve the other-tab conflict before saving this project.');
    if(stamp===saved&&!checkpoint){dirty=fingerprint(bridge.capture())!==saved;return active}
    const result=await store.save({owner,id,expectedRevision:active.revision,payload:snapshot,name:snapshot.app?.projectInfo?.file?.projectName||active.name,checkpoint});
    if(!result.ok){conflict={current:result.current,recoveryKey:result.recoveryKey};throw Error('Another tab changed this project. Your edits have been preserved as a recovery copy.');}
    active=result.record;saved=stamp;dirty=fingerprint(bridge.capture())!==saved;error=null;announce({owner,id,revision:active.revision});return copy(active);
   });
   // The public promise reports failure. The internal chain remains usable for a retry.
   chain=operation.catch(e=>{error=e.message;dirty=true}).finally(()=>{pending--;notify()});
   return operation;
  }
  async function flush(){if(!active){if(bridge.saveGuest&&bridge.saveGuest()===false)throw Error('Save or recover the local project before switching.');return null}const payload=bridge.capture();await queue(payload);await chain;if(error)throw Error(error);return copy(active)}
  function load(record){
   if(record.deleted)throw Error('Restore this deleted project before opening it.');Core.validateProject(record.payload);
   const previous=active,previousPayload=bridge.capture();applying=true;
   try{bridge.load(copy(record.payload));active=copy(record);saved=fingerprint(bridge.capture());dirty=false;error=null;conflict=null;setLocation({owner:record.owner,id:record.id})}
   catch(e){bridge.load(previousPayload);active=previous;throw e}
   finally{applying=false;notify()}
  }
  async function open(owner,id,{skipFlush=false}={}){if(!skipFlush)await flush();const record=await store.read(owner,'project',id);if(!record)throw Error('This project is not saved on this device. Sign in and download it first.');load(record);return copy(record)}
  async function createProject({owner='device',name='Untitled Project',payload=null,template=null}={}){
   await flush();let value=payload?copy(payload):Transfer.empty();
   if(template){Transfer.validateTemplate(template);value=Transfer.applyReviewed(Transfer.review(value,template.project,Object.fromEntries(template.areas.map(k=>[k,'replace']))),value);value.templateHistory=[...(value.templateHistory||[]),{id:template.id,name:template.name,revision:template.revision,appliedAt:new Date().toISOString()}]}
   Core.validateProject(value);value.app.projectInfo||={};value.app.projectInfo.file||={};value.app.projectInfo.file.projectName=String(name).trim()||'Untitled Project';
   const record=await store.create({owner,name:value.app.projectInfo.file.projectName,payload:value});load(record);announce({owner,id:record.id,revision:record.revision});return copy(record);
  }
  async function replace(payload){
   if(!active)throw Error('Save this project in Projects & Account before applying a reviewed import.');
   await flush();const previous=copy(active);Core.validateProject(payload);
   const result=await store.save({owner:active.owner,id:active.id,expectedRevision:active.revision,payload,name:payload.app?.projectInfo?.file?.projectName||active.name,checkpoint:true});
   if(!result.ok){conflict={current:result.current,recoveryKey:result.recoveryKey};notify();throw Error('The project changed after your review. Review it again.');}
   try{load(result.record)}catch(e){await store.save({owner:previous.owner,id:previous.id,expectedRevision:result.record.revision,payload:previous.payload,name:previous.name,checkpoint:true});throw e}
   announce({owner:active.owner,id:active.id,revision:active.revision});return copy(active);
  }
  async function applyReview(preview,{template=null}={}){
   const current=bridge.capture();let payload=Transfer.applyReviewed(preview,current);
   if(template)payload.templateHistory=[...(current.templateHistory||[]),{id:template.id,name:template.name,revision:template.revision,appliedAt:new Date().toISOString()}];
   return replace(payload);
  }
  async function saveTemplate({owner='device',name,areas,isDefault=false,existing=null,expectedFingerprint=null}){
   await flush();if(expectedFingerprint&&fingerprint(bridge.capture())!==expectedFingerprint)throw Error('The project changed after the template review. Review it again.');const id=isDefault?'personal-default':existing?.id||crypto.randomUUID(),payload=Transfer.createTemplate(bridge.capture(),areas,{name:isDefault?'Personal default':name,id,isDefault,revision:(existing?.payload?.revision||0)+1});
   const current=await store.read(owner,'template',id);
   if(current){if(!existing||existing.revision!==current.revision)throw Error('The template changed. Review the current template before replacing it.');const r=await store.save({owner,kind:'template',id,expectedRevision:current.revision,payload,name:payload.name,checkpoint:true});if(!r.ok)throw Error('The template changed while saving. Review it again.');announce({owner,kind:'template',id,revision:r.record.revision});return r.record}
   const record=await store.create({owner,kind:'template',id,name:payload.name,payload});announce({owner,kind:'template',id,revision:record.revision});return record;
  }
  async function forkEdits(name){
   if(!active)throw Error('No stored project is open.');const record=await store.create({owner:active.owner,name:name||active.name+' — recovered',payload:bridge.capture()});load(record);announce({owner:record.owner,id:record.id,revision:record.revision});return record;
  }
  async function useStored(){if(!active)throw Error('No stored project is open.');const record=await store.read(active.owner,'project',active.id);if(!record)throw Error('Stored project not found.');load(record);return record}
  async function leave(){await flush();active=null;dirty=false;error=null;conflict=null;saved='';applying=true;try{bridge.leave();setLocation(null)}finally{applying=false;notify()}}
  function syncMetadata(record){if(active&&record?.id===active.id&&record.owner===active.owner&&record.revision===active.revision){active={...active,remoteEtag:record.remoteEtag,syncedRevision:record.syncedRevision,dirty:record.dirty,syncError:record.syncError,conflict:record.conflict};notify()}}
  function hasUnsaved(){return !!active&&(pending>0||dirty||!!error||fingerprint(bridge.capture())!==saved)}
  function saveError(value){error=value.message||String(value);dirty=true;notify()}
  return {state,markDirty,queue,flush,open,createProject,replace,applyReview,saveTemplate,forkEdits,useStored,leave,syncMetadata,hasUnsaved,saveError,metadata:()=>({templateHistory:copy(active?.payload?.templateHistory||[])})};
 }
 return {create,fingerprint};
});
