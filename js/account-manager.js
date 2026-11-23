/* Private pilot UI. Text nodes keep imported names and messages out of HTML. */
(function(root){
 'use strict';
 let store,workspace,bridge,api,user=null,libraryOwner='device',onlineItems=[],dialog,body,message,status,onlineError='',bootError='',offlineState='Offline app setup has not completed.',config={enabled:false,apiURL:'https://paperwork-api.ailampy.com/paperwork/account-api/'};
 const inFlight=new Set(),syncTimers=new Map();let viewGeneration=0;
 const el=(tag,text='',className='')=>{const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node};
 function action(label,run,className='btn'){const button=el('button',label,className);button.type='button';button.addEventListener('click',async()=>{button.disabled=true;try{await run()}catch(error){showError(error.message||String(error))}finally{button.disabled=false}});return button}
 function showError(text){if(message){message.textContent=text;message.hidden=!text}if(status&&text)status.title=text}
 function note(text){body.append(el('p',text,'accountNote'))}
 function field(label,input){const wrapper=el('label',label,'accountField');input.setAttribute('aria-label',label);wrapper.append(input);return wrapper}
 function input(value=''){const node=el('input');node.type='text';node.value=value;return node}
 function toolbar(...buttons){const node=el('div','','accountToolbar');node.append(...buttons);return node}
 function select(options,value){const node=el('select');for(const [id,label] of options){const o=el('option',label);o.value=id;node.append(o)}node.value=value;return node}
 function show(title){
  viewGeneration++;
  if(!dialog){dialog=el('dialog','','accountManager');dialog.id='accountManager';dialog.addEventListener('cancel',event=>{if(bootError)event.preventDefault()});document.body.append(dialog)}
  const header=el('div','','accountManagerHeader'),heading=el('h2',title);heading.id='accountManagerHeading';dialog.setAttribute('aria-labelledby',heading.id);
  header.append(heading,action('Close',()=>{if(bootError)throw Error('Choose a project or continue with the local project first.');dialog.close()}));
  message=el('p','','accountError');message.setAttribute('role','alert');message.hidden=true;body=el('div','','accountManagerBody');dialog.replaceChildren(header,message,body);if(!dialog.open)dialog.showModal();
 }
 function projectName(payload,fallback='Untitled Project'){return payload.app?.projectInfo?.file?.projectName||fallback}
 function current(){return workspace?.state()||{active:null,applying:false,pending:0,dirty:false,error:null,conflict:null}}
 function updateStatus(state=current()){
  if(!status)return;status.hidden=!state.active;document.body.classList.toggle('accountProjectOpen',!!state.active);
  if(!state.active)return;
  const local=state.error?'Local save needs attention':state.pending||state.dirty?'Saving on this device…':'Saved on this device';
  const online=state.conflict||state.active.conflict?'Conflict — review required':state.active.owner==='device'?'Device project':state.active.dirty?(onlineError?'Waiting to sync':'Not yet synced'):'Saved online';
  status.textContent=state.active.name+' · '+local+' · '+online;status.dataset.error=String(!!state.error||!!state.conflict||!!state.active.conflict);status.title=state.error||onlineError||'Open Projects & Account';
 }
 function locationFor(record){const url=new URL(location.href);url.searchParams.delete('_lampy_update');url.searchParams.set('account',record.owner);url.searchParams.set('project',record.id);return url.href}
 function setLocation(record){const url=new URL(location.href);if(record){url.searchParams.set('account',record.owner);url.searchParams.set('project',record.id);libraryOwner=record.owner}else{url.searchParams.delete('account');url.searchParams.delete('project')}history.replaceState(null,'',url)}
 function recordStatus(record){return record.deleted?'Deleted — recoverable':record.remoteOnly?'Online — download to open':record.conflict?'Conflict — review required':record.owner==='device'?'On this device':record.dirty?'On this device — awaiting sync':'Saved online'}
 function updateRecordRow(record){if(!record?.id)return;const key=JSON.stringify([record.owner,record.kind,record.id]),row=[...(dialog?.querySelectorAll('.accountRecord')||[])].find(node=>node.dataset.recordKey===key);if(!row)return;row.querySelector('small').textContent=recordStatus(record);row.querySelector('strong').textContent=record.name;row.querySelector('[data-conflict-review]')?.remove();if(record.conflict){const button=action('Review conflict',()=>showConflict(record));button.dataset.conflictReview='true';row.querySelector('.accountToolbar').prepend(button)}}
 function coordinator(owner){return root.LampyAccountSync.coordinator({store,api,owner,onChange:record=>{workspace.syncMetadata(record);updateRecordRow(record)}})}
 function scheduleSync(record){if(!record||record.owner==='device'||!config.enabled||record.conflict)return;const key=record.owner+':'+record.kind+':'+record.id;clearTimeout(syncTimers.get(key));syncTimers.set(key,setTimeout(()=>{syncTimers.delete(key);syncRecord(record).catch(error=>{onlineError=error.message;updateStatus()})},2000))}
 async function syncPending(owner){if(!owner||owner==='device'||!config.enabled||navigator.onLine===false)return;for(const kind of ['project','template'])for(const record of await store.list(owner,kind,{includeDeleted:true}))if(record.dirty&&!record.conflict)scheduleSync(record)}
 async function syncRecord(record){if(!config.enabled||record.owner==='device'||navigator.onLine===false)return;const key=record.owner+':'+record.kind+':'+record.id;if(inFlight.has(key)){scheduleSync(record);return}inFlight.add(key);try{const result=await coordinator(record.owner).syncOne(record.kind,record.id);onlineError='';if(result?.dirty&&!result.conflict)scheduleSync(result);return result}finally{inFlight.delete(key);updateStatus()}}
 async function authenticate(){if(!config.enabled)throw Error('The online pilot is awaiting authentication and storage setup. Device projects remain available.');const session=await api.session();user=session.user;libraryOwner=user.id;onlineError='';await syncPending(user.id);return user}
 async function refreshOnline(kind){onlineItems=[];if(!config.enabled||libraryOwner==='device')return;if(navigator.onLine===false){onlineError='Offline — showing saved copies on this device.';return}try{await authenticate();onlineItems=await api.list(kind)}catch(error){onlineError=error.message}}
 async function ensureRecord(kind,id){let record=await store.read(libraryOwner,kind,id);if(!record){if(libraryOwner==='device')throw Error('Project not found on this device.');const result=await coordinator(libraryOwner).pull(kind,id);if(!result.ok)throw Error('Review the local and online versions first.');record=result.record}return record}
 async function openRecord(record){
  if(record.owner!=='device'&&config.enabled){try{const result=await coordinator(record.owner).pull('project',record.id);if(!result.ok)return showConflict(record);record=result.record}catch(error){onlineError=error.message}}
  await workspace.open(record.owner,record.id);bootError='';dialog?.close();bridge.render();scheduleSync(record);
 }
 async function download(record){await bridge.download(record.payload,record.name)}
 async function manager(kind='project'){
  if(!store)throw Error('Local project storage is unavailable.');
  show(kind==='project'?'Projects & Account':'Defaults & Templates');const generation=viewGeneration;
  await refreshOnline(kind);if(generation!==viewGeneration)return;const local=await store.list(libraryOwner,kind,{includeDeleted:true});if(generation!==viewGeneration)return;
  note(libraryOwner==='device'?'Projects saved on this device. Sign in to save copies online.':user?.id===libraryOwner?'Signed in as '+user.email:'Saved account copies on this device. Sign in to sync.');
  const offlineNote=el('p',offlineState,'accountNote');offlineNote.id='accountOfflineState';body.append(offlineNote);
  if(!config.enabled)note('Private online pilot: account setup is not enabled yet.');else if(onlineError)note(onlineError);
  const navigation=toolbar(action('Projects',()=>manager('project')),action('Defaults & Templates',()=>manager('template')),action('On this device',()=>{libraryOwner='device';onlineItems=[];return manager(kind)}));
  if(config.enabled){navigation.append(action('Connect account',async()=>{await authenticate();await refreshOnline(kind);await manager(kind)}));const signIn=el('a','Sign in','btn');signIn.href=api.loginURL;navigation.append(signIn)}body.append(navigation);
  if(bootError){showError(bootError);body.append(action('Continue with local project',()=>{bootError='';const url=new URL(location.href);url.searchParams.delete('account');url.searchParams.delete('project');location.replace(url.href)}))}
  body.append(kind==='project'?toolbar(action('New project',()=>newProjectForm()),action('Save a copy of current project',async()=>{const name=projectName(bridge.capture());await workspace.createProject({owner:libraryOwner,name,payload:bridge.capture()});await manager()}),action('Import selected data',()=>transferForm())):toolbar(action('Save current as template',()=>templateForm()),action('Apply a template to current project',()=>transferForm('template'))));
  if(current().active&&kind==='project')body.append(toolbar(action('Return to local project',async()=>{await workspace.leave();dialog.close();bridge.render()}),action('Save now',async()=>{const record=await workspace.flush();await syncRecord(record);await manager()}),action('Recoveries',()=>recoveryForm(current().active))));
  if(current().conflict){showError(current().error);body.append(toolbar(action('Keep my edits as a new project',async()=>{await workspace.forkEdits();await manager()}),action('Use other tab’s saved project',async()=>{if(confirm('Use the other tab’s version? Your conflicting edits remain in Recoveries.')){await workspace.useStored();await manager()}})))}
  const records=new Map(local.map(r=>[r.id,r]));for(const remote of onlineItems)if(!records.has(remote.id))records.set(remote.id,{...remote,kind,owner:libraryOwner,remoteOnly:true});
  const list=el('div','','accountList');body.append(list);
  for(const record of [...records.values()].sort((a,b)=>a.name.localeCompare(b.name))){
   const row=el('section','','accountRecord'),details=el('div'),title=el('strong',record.name),state=recordStatus(record);row.dataset.recordKey=JSON.stringify([record.owner,kind,record.id]);
   details.append(title,el('small',state));row.append(details);const buttons=toolbar();
   if(record.deleted){buttons.append(action('Restore',async()=>{const r=await ensureRecord(kind,record.id),restored=await store.restore({owner:r.owner,kind,id:r.id,expectedRevision:r.revision});if(!restored.ok)throw Error('The project changed. Refresh before restoring.');scheduleSync(restored.record);await manager(kind)}))}
   else if(kind==='project'){
    buttons.append(action('Open',async()=>openRecord(await ensureRecord(kind,record.id))));
    const link=el('a','Open in new tab','btn');link.href=locationFor(record);link.target='_blank';link.rel='noopener';buttons.append(link);
    buttons.append(action('Copy',async()=>{const r=await ensureRecord(kind,record.id);await workspace.createProject({owner:libraryOwner,name:r.name+' — copy',payload:r.payload});await manager()}));
   }else buttons.append(action('Review / Apply',()=>transferForm('template',record.id)),action('Update from current project',async()=>templateForm(await ensureRecord(kind,record.id))));
   if(!record.deleted){buttons.append(action('Download',async()=>download(await ensureRecord(kind,record.id))),action('Delete',async()=>{
    if(current().active?.id===record.id&&current().active?.owner===record.owner)throw Error('Open another project or return to the local project before deleting this one.');
    if(!confirm('Delete '+record.name+'? It will be hidden from the list but remains recoverable.'))return;
    const r=await ensureRecord(kind,record.id),result=await store.save({owner:r.owner,kind,id:r.id,expectedRevision:r.revision,payload:r.payload,name:r.name,deleted:true});if(!result.ok)throw Error('The project changed before deletion. Review it again.');scheduleSync(result.record);await manager(kind);
   },'btn danger'))}
   if(record.conflict){const button=action('Review conflict',()=>showConflict(record));button.dataset.conflictReview='true';buttons.prepend(button)}
   row.append(buttons);list.append(row);
  }
  if(!records.size)list.append(el('p','No saved '+(kind==='project'?'projects':'templates')+' here yet.'));
 }
 async function newProjectForm(){
  if(config.enabled&&libraryOwner!=='device'&&navigator.onLine!==false){await refreshOnline('template');for(const item of onlineItems.filter(t=>!t.deleted)){try{const pulled=await coordinator(libraryOwner).pull('template',item.id);if(!pulled.ok)return showConflict(await store.read(libraryOwner,'template',item.id))}catch(error){if(!await store.read(libraryOwner,'template',item.id))throw error;onlineError=error.message}}}
  show('New project');const name=input('Untitled Project'),templates=(await store.list(libraryOwner,'template')).filter(t=>!t.conflict),options=select([['','Blank project'],...templates.map(t=>[t.id,t.name])],templates.some(t=>t.id==='personal-default')?'personal-default':'');
  body.append(field('Project name',name),field('Starting template',options));note('This makes a separate project. Future template changes will not alter it.');
  const contents=el('div','','accountReview');body.append(contents);
  const render=()=>{const t=templates.find(t=>t.id===options.value);contents.replaceChildren(el('p',t?'Includes: '+t.payload.areas.map(a=>root.LampyProjectTransfer.AREAS[a]).join(', '):'No starting equipment or saved settings.'))};options.addEventListener('change',render);render();
  body.append(toolbar(action('Create project',async()=>{if(!name.value.trim())throw Error('Enter a project name.');const template=templates.find(t=>t.id===options.value)?.payload,record=await workspace.createProject({owner:libraryOwner,name:name.value,template});dialog.close();bridge.render();scheduleSync(record)},'btn primary'),action('Cancel',()=>manager())));
 }
 function areaPicker(allowed=Object.keys(root.LampyProjectTransfer.AREAS),selected=[]){
  const fields=new Map(),list=el('div','','accountAreas');for(const area of allowed){const check=el('input');check.type='checkbox';check.checked=selected.includes(area);list.append(field(root.LampyProjectTransfer.AREAS[area],check));fields.set(area,check)}return {list,selected:()=>[...fields].filter(([,n])=>n.checked).map(([a])=>a)};
 }
 async function templateForm(existing=null){
  show(existing?'Update template':'Save reusable template');const name=input(existing?.name||''),def=el('input');def.type='checkbox';def.checked=existing?.id==='personal-default';
  def.disabled=!!existing;const areas=areaPicker(undefined,existing?.payload.areas||['contacts','logos','pdf','settings']);body.append(field('Template name',name),field('Use as my personal default',def),areas.list);note('Choose what this template includes. Updating it affects new projects only. Existing projects change only through Review / Apply.');
  body.append(toolbar(action('Review template',async()=>{
   const source=bridge.capture(),expectedFingerprint=root.LampyAccountWorkspace.fingerprint(source),id=def.checked?'personal-default':existing?.id||crypto.randomUUID(),prior=await store.read(libraryOwner,'template',id),template=root.LampyProjectTransfer.createTemplate(source,areas.selected(),{name:def.checked?'Personal default':name.value.trim(),id,isDefault:def.checked,revision:(prior?.payload?.revision||0)+1});
   if(!template.name)throw Error('Enter a template name.');show('Review template: '+template.name);note('Includes: '+template.areas.map(a=>root.LampyProjectTransfer.AREAS[a]).join(', '));note(prior?'This replaces the saved template. No existing projects will be changed.':'This creates a new saved template.');
   body.append(toolbar(action('Save template',async()=>{const saved=await workspace.saveTemplate({owner:libraryOwner,name:template.name,areas:template.areas,isDefault:template.isDefault,existing:prior,expectedFingerprint});scheduleSync(saved);await manager('template')},'btn primary'),action('Back',()=>templateForm(existing))));
  }),action('Cancel',()=>manager('template'))));
 }
 async function transferForm(kind='project',selectedId=''){
  if(!current().active)throw Error('Save a copy of the current project in Projects & Account first.');await workspace.flush();
  await refreshOnline(kind);
  const records=await store.list(libraryOwner,kind);for(const remote of onlineItems)if(!remote.deleted&&!records.some(r=>r.id===remote.id))records.push({...remote,remoteOnly:true});
  show(kind==='template'?'Apply template — choose data':'Import from another project');
  const source=select([['','Choose '+kind],...records.map(r=>[r.id,r.name])],selectedId),choices=el('div','','accountTransferChoices'),reviewButton=action('Review changes',reviewSelection);
  body.append(field('Source',source),choices,toolbar(reviewButton,action('Cancel',()=>manager())));
  const modes=new Map();let sourceRecord=null;
  async function renderChoices(){const id=source.value;sourceRecord=null;modes.clear();choices.replaceChildren();reviewButton.disabled=true;if(!id)return;
   try{const record=await ensureRecord(kind,id);if(source.value!==id)return;sourceRecord=record;const allowed=kind==='template'?sourceRecord.payload.areas:Object.keys(root.LampyProjectTransfer.AREAS);
   for(const area of allowed){const mode=select([['','Do not import'],['add','Add — retain existing data'],['replace','Replace this area']],kind==='template'?'replace':'');modes.set(area,mode);choices.append(field(root.LampyProjectTransfer.AREAS[area],mode))}
   reviewButton.disabled=false}catch(error){showError(error.message)}
  }
  source.addEventListener('change',renderChoices);renderChoices();
  async function reviewSelection(){
   if(!sourceRecord)throw Error('Choose a source project or template.');const selected=Object.fromEntries([...modes].filter(([,node])=>node.value).map(([key,node])=>[key,node.value]));
   const snapshot=bridge.capture(),template=kind==='template'?sourceRecord.payload:null,preview=root.LampyProjectTransfer.review(snapshot,template?template.project:sourceRecord.payload,selected);
   show('Review changes from '+sourceRecord.name);note('Destination: '+current().active.name+'. Nothing changes until you press Apply reviewed changes.');
   const table=el('table','','accountReviewTable'),head=el('tr');for(const title of ['Area','Action','Current','Source','After'])head.append(el('th',title));table.append(head);
   for(const row of preview.areas){const tr=el('tr');for(const value of [row.label,row.action,row.before,row.source,row.after])tr.append(el('td',String(value)));table.append(tr)}body.append(table);
   for(const row of preview.areas){const details=el('details','','accountReviewDetails');details.append(el('summary',row.label+' — inspect changes'));if(!row.changes.length)details.append(el('p','No stored values change.'));for(const change of row.changes){const item=el('section');item.append(el('strong',change.path),el('pre','Current:\n'+change.before+'\n\nAfter applying:\n'+change.after));details.append(item)}body.append(details)}
   const issues=el('ul','','accountReviewIssues');for(const issue of preview.issues)issues.append(el('li',(issue.blocking?'Resolve first: ':'Review: ')+issue.message,issue.blocking?'accountBlocking':''));body.append(issues);
   if(!preview.issues.length)note('No duplicate or linked-data conflicts detected.');
   const apply=action('Apply reviewed changes',async()=>{await workspace.applyReview(preview,{template});dialog.close();bridge.render();scheduleSync(current().active)},'btn primary');apply.disabled=!preview.canApply;
   body.append(toolbar(apply,action('Back',()=>transferForm(kind,sourceRecord.id)),action('Cancel',()=>manager())));
  }
 }
 async function recoveryForm(record){show('Recovery copies — '+record.name);note('Recovering creates a separate project and keeps the original copy.');const recoveries=await store.recoveries(record.owner,record.kind,record.id);for(const recovery of recoveries){const row=el('section','','accountRecord');row.append(el('span',new Date(recovery.savedAt).toLocaleString()+' · '+recovery.reason),action('Open as new project',async()=>{await workspace.createProject({owner:record.owner,name:record.name+' — recovered',payload:recovery.payload});dialog.close();bridge.render()}),action('Download',()=>bridge.download(recovery.payload,record.name+' — recovered')));body.append(row)}if(!recoveries.length)note('No recovery copies are needed yet.')}
 async function showConflict(record){
  const kind=record.kind,isActive=()=>kind==='project'&&current().active?.id===record.id&&current().active.owner===record.owner;
  if(isActive())await workspace.flush();record=await store.read(record.owner,kind,record.id);
  const remote=await api.download(kind,record.id);show('Review online conflict — '+record.name);
  const describe=payload=>{const p=payload.project?.app||payload.app||payload;return `${(p.fixturePatch||[]).length} fixtures, ${(p.distros||[]).length} distros, ${(p.looms||[]).length} looms`};
  note('Local: '+describe(record.payload));note('Online: '+(remote.manifest.deleted?'Deleted — ':'')+describe(remote.payload)+' · saved '+remote.manifest.updatedAt);note('Keep both saves a separate local copy and accepts the reviewed online version for the original. Your previous version remains recoverable.');
  if(kind==='template')note('Existing projects keep their own settings. Resolving this template changes no existing projects.');
  async function accept(){
   if(isActive()&&workspace.hasUnsaved())throw Error('The local project changed. Review the conflict again.');
   const result=await coordinator(record.owner).acceptOnline(kind,record.id,record.revision,remote.manifest.etag);if(!result.ok)throw Error(result.reason||'The record changed. Review it again.');
   if(isActive()){if(result.record.deleted)await workspace.leave();else await workspace.open(record.owner,record.id,{skipFlush:true})}return result;
  }
  body.append(toolbar(action('Download local',()=>download(record)),action('Download online',()=>bridge.download(remote.payload,remote.manifest.name)),action('Keep both',async()=>{
   if(isActive()&&workspace.hasUnsaved())throw Error('The local project changed. Review it again.');
   const id=crypto.randomUUID(),name=record.name+' — local copy',payload=structuredClone(record.payload);
   if(kind==='template'){payload.id=id;payload.name=name;payload.isDefault=false}else{payload.app.projectInfo||={};payload.app.projectInfo.file||={};payload.app.projectInfo.file.projectName=name}
   const copy=await store.create({owner:record.owner,kind,id,name,payload});scheduleSync(copy);await accept();await manager(kind);
  }),action('Use reviewed online version',async()=>{await accept();await manager(kind)},'btn primary'),action('Cancel',()=>manager(kind))));
 }
 async function setup(appBridge){
  bridge=appBridge;status=action('',()=>manager());status.id='accountSaveStatus';status.hidden=true;status.setAttribute('aria-live','polite');document.body.append(status);
  const button=action('Projects & Account',async()=>{bridge.closeMenu();await manager()});button.id='accountManagerButton';document.getElementById('actionSidebar')?.prepend(button);
  try{const response=await fetch(new URL('./js/account-config.json',location.href),{cache:'no-store',signal:AbortSignal.timeout(6000)});if(response.ok)config={...config,...await response.json()}}catch{}
  try{store=await root.LampyProjectStore.open()}catch(error){bootError=error.message;show('Project storage unavailable');showError(error.message);body.append(action('Continue with local project',()=>{const url=new URL(location.href);url.searchParams.delete('account');url.searchParams.delete('project');location.replace(url.href)}));return}
  api=root.LampyAccountSync.client({baseURL:config.apiURL,validate:(kind,payload)=>kind==='project'?root.LampyCore.validateProject(payload):root.LampyProjectTransfer.validateTemplate(payload)});
  const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('lampy-project-updates-v1'):null;
  workspace=root.LampyAccountWorkspace.create({store,bridge,changed:updateStatus,setLocation,announce:record=>{channel?.postMessage(record);scheduleSync({...record,kind:record.kind||'project'})}});
  prepareOffline().catch(()=>setOfflineState('Offline app setup could not finish. Keep this tab open, or reconnect before reopening.'));
  channel?.addEventListener('message',event=>{const state=current();if(state.active?.id===event.data?.id&&state.active.owner===event.data.owner&&event.data.revision>state.active.revision){status.title='Another tab saved a newer version. Your next save will preserve both versions for review.'}});
  const reconnect=()=>syncPending(user?.id||current().active?.owner).catch(error=>{onlineError=error.message;updateStatus()});
  window.addEventListener('online',reconnect);window.addEventListener('focus',reconnect);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&current().active)workspace.flush().catch(error=>{onlineError=error.message;updateStatus()})});
  const url=new URL(location.href),owner=url.searchParams.get('account'),id=url.searchParams.get('project');
  if(owner&&id){libraryOwner=owner;try{await workspace.open(owner,id,{skipFlush:true});bridge.render();scheduleSync(current().active)}catch(error){bootError=error.message;await manager()}}
 }
 function setOfflineState(text){offlineState=text;const node=document.getElementById('accountOfflineState');if(node)node.textContent=text}
 async function prepareOffline(){
  if(!('serviceWorker' in navigator))return;
  const scope=new URL('./',location.href),workerURL=new URL('sw.js',scope),existing=await navigator.serviceWorker.getRegistration(scope.href);
  if(existing?.active){setOfflineState('App available offline. Detailed fixture data and images are available after you have opened them.');await existing.update().catch(()=>{});return}
  const check=await fetch(new URL('offline-manifest.json',scope),{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!check.ok)return;
  setOfflineState('Preparing the app for offline reopening…');const registration=await navigator.serviceWorker.register(workerURL,{scope:scope.href,updateViaCache:'none'});
  const ready=()=>setOfflineState('App available offline. Detailed fixture data and images are available after you have opened them.');
  if(registration.active)ready();else {const worker=registration.installing||registration.waiting;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='activated')ready();else if(worker.state==='redundant')setOfflineState('Offline app setup did not finish. Reconnect and reopen the app to retry.')})}
 }
 const opening=new URLSearchParams(location.search).has('project')?el('div','Opening saved project…','accountBootScreen'):null;if(opening)document.body.append(opening);
 root.LampyAccounts={setup:async value=>{try{await setup(value)}finally{opening?.remove()}},show:()=>manager(),newProject:()=>newProjectForm(),importFile:async payload=>{const record=await workspace.createProject({owner:current().active?.owner||libraryOwner,name:projectName(payload),payload});bridge.render();scheduleSync(record)},get active(){return current().active},get applying(){return current().applying},get enabled(){return !!workspace},markDirty:()=>workspace?.markDirty(),queue:payload=>workspace?.queue(payload),flush:()=>workspace?.flush(),hasUnsaved:()=>workspace?.hasUnsaved()||false,replace:payload=>workspace.replace(payload),metadata:()=>workspace?.metadata()||{},saveError:error=>workspace?.saveError(error),error:error=>{onlineError=error.message||String(error);updateStatus();if(dialog?.open)showError(onlineError)}};
})(globalThis);
