/* Capability links: public viewers can append notes; the private owner link manages snapshots. */
(function(root){
 'use strict';
 const core=root.LampyShareCore,match=location.hash.match(/^#patch-(view|owner)=([a-zA-Z0-9_-]{1,100})\.([a-f0-9]{64})(?:\.([a-f0-9]{64}))?$/),isViewer=location.hash.startsWith('#patch-view='),isOwnerLink=location.hash.startsWith('#patch-owner=');
 const API=new URL('./js/patch-sharing-config.json',location.href),KEY='lampy-patch-share-owners-v1';
 let bridge,base,projectKey='',connection=null,state=null,polling=false,page='patch',loadedVersion=0,notes=[],viewerError='',viewerPending=false,header,status,viewerName='',viewerRole='';
 const viewer=isViewer&&match?{id:match[2],token:match[3]}:null;
 let registry={};try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))registry=saved}catch{}
 const el=(tag,text='',className='')=>{const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node};
 function button(label,run,className='btn'){const node=el('button',label,className);node.type='button';node.onclick=async()=>{node.disabled=true;try{await run()}catch(error){showError(error.name==='TimeoutError'||error.name==='AbortError'?Error('The sharing service took too long to respond. Try again.'):error instanceof TypeError?Error('Could not reach the sharing service. Check your connection and try again.'):error)}finally{node.disabled=false}};return node}
 function showError(error){const hostDialog=document.querySelector('dialog.shareDialog[open]'),container=hostDialog||status||dialog('Patch sharing');let host=container.querySelector('.shareError');if(!host){host=el('p','','shareError');container.append(host)}host.textContent=error.message||String(error);host.setAttribute('role','alert')}
 function saveRegistry(){localStorage.setItem(KEY,JSON.stringify(registry))}
 function useProject(key){if(isViewer)return;projectKey=core.ID.test(key||'')?key:crypto.randomUUID();connection=registry[projectKey]||null;state=null;notes=[];if(bridge)refresh().catch(()=>{})}
 function link(kind,connection){const url=new URL(location.href);url.search='';url.hash='patch-'+kind+'='+connection.id+'.'+(kind==='owner'?connection.owner+'.'+connection.viewer:connection.viewer);return url.href}
 const serviceUpdateMessage='Patch sharing is unavailable because the server still requires account sign-in. The Cloudflare sharing Worker needs updating. You do not need to sign in.';
 async function request(connection,action='',method='GET',data){
  if(!base){const response=await fetch(API,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Could not load patch sharing configuration.');const config=await response.json();base=new URL(config.apiURL);if(base.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(base.hostname))throw Error('Patch sharing requires HTTPS.')}
  const token=connection.owner||connection.token;if(!core.TOKEN.test(token))throw Error('Invalid sharing link.');
  const response=await fetch(new URL(connection.id+(action.startsWith('?')?action:action?'/'+action:''),base),{method,credentials:'omit',cache:'no-store',headers:{[connection.owner?'X-Lampy-Owner':'X-Lampy-Share']:token,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(20000)});
  if(response.status===401||response.redirected){const error=Error(serviceUpdateMessage);error.status=response.status;throw error}
  let value;try{value=await response.json()}catch{throw Error('The sharing service returned an unexpected response. Check the Cloudflare Worker and API-path configuration.')}
  if(!response.ok){const error=Error(value.error||'Patch sharing failed.');error.status=response.status;throw error}return value;
 }
 async function readState(target,previous=[]){
  const merged=new Map(previous.map(note=>[note.seq,note]));let after=Math.max(0,...merged.keys()),result;
  for(let page=0;page<41;page++){
   result=await request(target,'?after='+after);for(const note of result.notes)merged.set(note.seq,note);
   if(!result.more)return {...result,notes:[...merged.values()].sort((a,b)=>a.seq-b.seq)};
   after=Math.max(after,...result.notes.map(note=>note.seq));
  }
  throw Error('Too many notes to load. Please try again.');
 }
 function noteCard(note){const card=el('div','','shareNote');card.style.background=core.colour(note.seq);card.append(el('strong',note.name+' · '+note.jobRole),el('span',note.body));return card}
 function notesFor(id){return notes.filter(note=>note.fixtureId===id)}
 function noteText(id){return notesFor(id).map(note=>note.name+' ('+note.jobRole+'): '+note.body).join('\n')}
 function noteMarkup(id){const host=el('div');notesFor(id).forEach(note=>host.append(noteCard(note)));return host.innerHTML}
 function decorate(scope=document){
  scope.querySelectorAll('.fixturePatchView [data-patch-row]').forEach(row=>{
   const cell=row.querySelector('[data-patch-column="notes"]');if(!cell)return;
   const old=cell.querySelector('.shareNotes');const list=el('div','','shareNotes');notesFor(row.dataset.patchRow).forEach(note=>list.append(noteCard(note)));
   if(isViewer){const add=button('Add note',()=>compose(row.dataset.patchRow),'btn shareNoteEntry');list.append(add)}
   if(old)old.replaceWith(list);else cell.append(list);
  });
  const nav=document.querySelector('[data-sheet-tab="fixturePatch"]');if(nav){nav.querySelector('.shareBadge')?.remove();const count=notes.filter(note=>note.seq>(state?.readSeq||0)).length;if(count){const badge=el('span','🔔 '+count,'shareBadge');badge.title=count+' unread viewer notes';badge.setAttribute('aria-label',badge.title);nav.append(badge)}}
 }
 function dialog(title){document.querySelector('dialog.shareDialog')?.close();const d=el('dialog','','shareDialog');d.append(el('h2',title));d.append(button('Close',()=>d.close()));d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();return d}
 function linkField(d,label,value){const wrapper=el('label',label);const input=el('input','','shareLink');input.readOnly=true;input.value=value;input.onclick=()=>input.select();wrapper.append(input);d.append(wrapper)}
 async function refresh(){
  if(isViewer)return refreshViewer();const current=connection,key=projectKey;if(!current||polling)return;polling=true;
  try{const result=await readState(current,notes);if(key!==projectKey||current!==connection)return;state=result;notes=result.notes;decorate()}finally{polling=false}
 }
 async function create(){
  const snapshot=core.snapshot(bridge.snapshot());
  // Save tokens before the request: retrying a lost response uses the same identity.
  if(!connection||state?.revoked){connection={id:crypto.randomUUID(),owner:core.token(),viewer:core.token()};registry[projectKey]=connection;saveRegistry();bridge.persist()}
  const current=connection,key=projectKey,result=await request(current,'','POST',{viewerToken:current.viewer,snapshot});
  if(key!==projectKey||current!==connection)return;state=result;notes=state.notes;await ownerDialog();
 }
 async function ownerDialog(){
  const d=dialog('Share Fixture Patch'),current=connection,key=projectKey;
  if(current){const loading=el('p','Loading shared patch…');loading.setAttribute('role','status');d.append(loading);
   try{const result=await readState(current,notes);if(key!==projectKey||current!==connection||!d.open)return;state=result;notes=result.notes;decorate()}
   catch(error){if(!d.open)return;if(key!==projectKey||current!==connection){d.close();return}if(error.status===404)state=null;else{const message=el('p',error.message||'Could not load sharing details.','shareError');message.setAttribute('role','alert');d.append(message,button('Try again',ownerDialog,'btn primary'));return}}
   finally{loading.remove()}
  }
  if(key!==projectKey||current!==connection||!d.open){if(d.open)d.close();return}
  d.append(el('p','Viewers can filter the patch, export a PDF, view summaries and add notes. Fixture data stays read-only. Ordinary project edits do not change the shared snapshot.'));
  if(!connection||!state){d.append(button('Create viewer link',create,'btn primary'));return}
  if(state.revoked){d.append(el('p','This viewer link is revoked.'),button('Create new viewer link',create,'btn primary'));return}
  linkField(d,'Viewer link — send this to your crew',link('view',connection));linkField(d,'Private owner-management link — keep this safe; do not send it to viewers',link('owner',connection));
  d.append(el('p','Save the private link somewhere safe. Anyone with it can publish or revoke this patch. There is no account or password recovery.'));
  const actions=el('div','','shareActions');actions.append(button('Make current patch live',async()=>{
   if(!confirm('Replace the shared snapshot with the current Fixture Patch? Existing viewer notes will be retained.'))return;
   await request(connection,'snapshot','PUT',{version:state.version,snapshot:core.snapshot(bridge.snapshot())});await refresh();await ownerDialog();
  },'btn primary'),button('Viewer notes',ownerNotes),button('Revoke viewer link',async()=>{if(!confirm('Revoke this viewer link? Anyone using it will lose access.'))return;await request(connection,'revoke','POST',{});await refresh();await ownerDialog()}));d.append(actions,el('p','Published snapshot '+state.version+' · '+notes.length+' viewer notes'));
 }
 async function ownerNotes(){if(!connection)throw Error('Create a shared patch first.');await refresh();const d=dialog('Viewer notes'),list=el('div','','shareNoteList');if(!notes.length)list.append(el('p','No viewer notes yet.'));notes.forEach(note=>{list.append(el('strong',note.fixtureLabel),noteCard(note))});d.append(list,button('Mark notes read',async()=>{await request(connection,'read','POST',{seq:Math.max(0,...notes.map(n=>n.seq))});await refresh();d.close()}));}
 function toolbar(){const wrap=el('div','','shareActions');wrap.append(button('Share patch',ownerDialog),button('Viewer notes',ownerNotes));return wrap}
 function decorateOwner(){if(isViewer)return;const toolbarHost=document.querySelector('.fixturePatchToolbarActions');if(toolbarHost&&!toolbarHost.querySelector('[data-share-toolbar]')){const buttons=toolbar();buttons.dataset.shareToolbar='1';toolbarHost.append(buttons)}decorate()}
 function renderViewer(){
  if(!bridge)return;const sheet=document.getElementById('sheet');sheet.replaceChildren();
  if(!state){sheet.append(el('p',viewerError||'Loading shared patch…'));return}
  const nav=el('nav','','shareActions');for(const [id,label] of [['patch','Fixture Patch'],['fixtures','Fixture Summary'],['positions','Position Summary']]){const b=button(label,()=>{page=id;renderViewer()});if(page===id)b.setAttribute('aria-current','page');nav.append(b)}nav.append(button('How it works',guidance));sheet.append(nav);
  const content=el('section','','sharePage');sheet.append(content);
  if(page==='patch'){
   bridge.renderPatch();const patch=sheet.querySelector('.fixturePatchView');if(patch){patch.querySelector('.fixturePatchToolbarLeft')?.remove();patch.querySelector('.fixturePatchToolbarRight').replaceChildren(button('Export to PDF',bridge.exportPatch,'btn primary'));patch.querySelectorAll('.fixturePatchGroupGear,.fixturePatchLock').forEach(n=>n.remove());patch.querySelectorAll('.fixturePatchTable input,.fixturePatchTable select').forEach(n=>n.disabled=true);}
   decorate(sheet);
  }else{content.innerHTML=page==='fixtures'?bridge.fixtureSummary():bridge.positionSummary();content.querySelectorAll('[onclick]').forEach(n=>n.removeAttribute('onclick'));content.querySelectorAll('.homeFixtureInfoButton').forEach(n=>{const card=el('div','','homeFixtureInfoButton');card.innerHTML=n.innerHTML;card.querySelector('.homeDistroMeta:last-child')?.remove();n.replaceWith(card)})}
 }
 function guidance(){const d=dialog('Using the shared Fixture Patch');const list=el('ol');for(const text of ['Use the patch toolbar to sort, filter and choose columns. You can also view Fixture Summary and Position Summary.','Choose Export to PDF to download the patch. Fixture details are read-only.','Enter your name and job role at the top, then use Add note in a fixture’s Notes column. Your note appears on the owner’s patch with your name.'])list.append(el('li',text));d.append(list,button('Got it',()=>{try{localStorage.setItem('lampy-share-guide:'+viewer?.id,'1')}catch{}d.close()},'btn primary'))}
 function updateViewerStatus(){if(!status)return;status.replaceChildren();if(viewerError)status.append(el('p',viewerError,'shareError'));if(viewerPending)status.append(el('span','The owner published a new patch. '),button('Load updated patch',async()=>{if(document.querySelector('[data-share-note]'))throw Error('Finish or close your note first.');await refreshViewer(true)}));}
 async function refreshViewer(force=false){
  if(polling)return;polling=true;
  try{if(!viewer)throw Error('This viewer link is incomplete or invalid. Ask the owner for a new link.');const result=await readState(viewer,notes);viewerError='';if(loadedVersion&&loadedVersion!==result.version&&!force){viewerPending=true;updateViewerStatus();return}
   state=result;notes=result.notes;if(!loadedVersion||loadedVersion!==result.version){bridge.load(result.snapshot);loadedVersion=result.version;viewerPending=false;header.querySelector('h1').textContent=result.snapshot.title;document.title=result.snapshot.title+' · Fixture Patch';renderViewer()}else decorate(document);updateViewerStatus();
  }catch(error){viewerError=error.message;if([404,410].includes(error.status)){state=null;notes=[];renderViewer();document.querySelector('[data-share-note]')?.close()}updateViewerStatus();if(!state)renderViewer()}finally{polling=false}
 }
 function compose(id){
  if(!viewerName.trim()||!viewerRole.trim()){header.querySelector(!viewerName.trim()?'[name=name]':'[name=role]').focus();throw Error('Enter your name and job role above the patch before adding a note.')}
  status?.querySelectorAll('.shareError').forEach(n=>n.remove());const d=dialog('Add fixture note');d.dataset.shareNote='1';const field=el('textarea');field.maxLength=2000;field.setAttribute('aria-label','Note');d.append(field);const requestId=crypto.randomUUID(),version=loadedVersion;
  d.append(button('Send note',async()=>{const data=core.note({requestId,fixtureId:id,name:viewerName,jobRole:viewerRole,body:field.value,version});const saved=await request(viewer,'notes','POST',data);if(!notes.some(n=>n.seq===saved.seq))notes.push(saved);d.close();decorate(document)},'btn primary'));field.focus();
 }
 async function setup(options){
  bridge=options;
  if(isViewer){document.body.classList.add('shareViewerMode');header=el('header','','shareViewerHeader');const logo=el('img');logo.src='images/branding/lampy-paperwork-logo.png';logo.alt='Lampy Paperwork';header.append(logo,el('h1','Fixture Patch'));
   const identity=el('div','','shareIdentity');for(const [key,label] of [['name','Name'],['role','Job Role']]){const wrapper=el('label',label),input=el('input');input.name=key;input.maxLength=120;input.required=true;input.autocomplete=key==='name'?'name':'organization-title';input.oninput=()=>{if(key==='name')viewerName=input.value;else viewerRole=input.value};wrapper.append(input);identity.append(wrapper)}header.append(identity);document.body.prepend(header);status=el('div','','shareViewerStatus');header.after(status);await refreshViewer();let guided=false;try{guided=!!localStorage.getItem('lampy-share-guide:'+viewer?.id)}catch{}if(state&&!guided)guidance();
  }else{
   if(isOwnerLink){if(!match||!core.TOKEN.test(match[4]||''))throw Error('This owner-management link is incomplete. Use the complete private link saved when you created the share.');const offered={id:match[2],owner:match[3],viewer:match[4]},result=await request(offered);const d=dialog('Private patch management');d.append(el('p','Shared patch: '+result.snapshot.title+'. Open the matching project before linking these management controls to it. Your current project will not be replaced.'));
    d.append(button('Use with current project',async()=>{const old=connection;connection={...offered,viewer:offered.viewer||(old?.id===offered.id?old.viewer:undefined)};registry[projectKey]=connection;saveRegistry();state=result;notes=result.notes;bridge.persist();d.close();await ownerDialog()}));
   }
   const recovery=button('Recover saved projects',()=>root.LampyLocalRecovery.show());document.getElementById('actionSidebar')?.append(recovery);
   await refresh().catch(()=>{});
  }
  setInterval(()=>{if(!document.hidden)refresh().catch(()=>{})},20000);window.addEventListener('focus',()=>refresh().catch(()=>{}));
 }
 return root.LampyPatchShare={isViewer,isOwnerLink,setup,useProject,get projectKey(){if(!projectKey)projectKey=crypto.randomUUID();return projectKey},renderViewer,decorateOwner,noteMarkup,noteText,ownerDialog,refresh,error:error=>{const d=dialog('Patch sharing');d.append(el('p',error.message||String(error),'shareError'))}};
})(globalThis);
