/* Capability links: public viewers can append notes; the private owner link manages snapshots. */
(function(root){
 'use strict';
 const core=root.LampyShareCore,match=location.hash.match(/^#patch-(view|owner)=([a-zA-Z0-9_-]{1,100})\.([a-f0-9]{64})(?:\.([a-f0-9]{64}))?$/),isViewer=location.hash.startsWith('#patch-view='),isOwnerLink=location.hash.startsWith('#patch-owner=');
 const API=new URL('./js/patch-sharing-config.json',location.href),KEY='lampy-patch-share-owners-v1';
 let bridge,base,projectKey='',connection=null,state=null,polling=false,loadedVersion=0,notes=[],viewerError='',viewerPending=false,header,status,viewerName='',viewerRole='';
 const drafts=new Map();let summaryPane=null,summaryKind='';
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
   if(old)old.replaceWith(list);else cell.append(list);
   if(isViewer){attachNoteEditor(cell,row.dataset.patchRow)}
  });
  bridge?.resizePatch?.();
  const nav=document.querySelector('[data-sheet-tab="fixturePatch"]');if(nav){nav.querySelector('.shareBadge')?.remove();const count=notes.filter(note=>note.seq>(state?.readSeq||0)).length;if(count){const badge=el('span','🔔 '+count,'shareBadge');badge.title=count+' unread viewer notes';badge.setAttribute('aria-label',badge.title);nav.append(badge)}}
 }
 function dialog(title){document.querySelector('dialog.shareDialog')?.close();const d=el('dialog','','shareDialog');d.append(el('h2',title));d.append(button('Close',()=>d.close()));d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();return d}
 function linkField(d,label,value){const wrapper=el('label',label);const input=el('input','','shareLink');input.readOnly=true;input.value=value;input.onclick=()=>input.select();wrapper.append(input);d.append(wrapper)}
 async function refresh(){
  if(isViewer)return refreshViewer();const current=connection,key=projectKey;if(!current||polling)return;polling=true;
  try{const result=await readState(current,notes);if(key!==projectKey||current!==connection)return;state=result;notes=result.notes;decorate()}finally{polling=false}
 }
 async function create(){
  const snapshot=await prepareSnapshot();
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
  d.append(el('p','Viewers can filter the patch, export a PDF, view summaries and add notes. Project logos, Console Info and patch notes are included. Fixture data stays read-only. Ordinary project edits do not change the shared snapshot.'));
  if(!connection||!state){d.append(button('Create viewer link',create,'btn primary'));return}
  if(state.revoked){d.append(el('p','This viewer link is revoked.'),button('Create new viewer link',create,'btn primary'));return}
  linkField(d,'Viewer link — send this to your crew',link('view',connection));linkField(d,'Private owner-management link — keep this safe; do not send it to viewers',link('owner',connection));
  d.append(el('p','Save the private link somewhere safe. Anyone with it can publish or revoke this patch. There is no account or password recovery.'));
  const actions=el('div','','shareActions');actions.append(button('Make current patch live',async()=>{
   if(!confirm('Replace the shared snapshot with the current Fixture Patch? Existing viewer notes will be retained.'))return;
   await request(connection,'snapshot','PUT',{version:state.version,snapshot:await prepareSnapshot()});await refresh();await ownerDialog();
  },'btn primary'),button('Viewer notes',ownerNotes),button('Revoke viewer link',async()=>{if(!confirm('Revoke this viewer link? Anyone using it will lose access.'))return;await request(connection,'revoke','POST',{});await refresh();await ownerDialog()}));d.append(actions,el('p','Published snapshot '+state.version+' · '+notes.length+' viewer notes'));
 }
 async function ownerNotes(){if(!connection)throw Error('Create a shared patch first.');await refresh();const d=dialog('Viewer notes'),list=el('div','','shareNoteList');if(!notes.length)list.append(el('p','No viewer notes yet.'));notes.forEach(note=>{list.append(el('strong',note.fixtureLabel),noteCard(note))});d.append(list,button('Mark notes read',async()=>{await request(connection,'read','POST',{seq:Math.max(0,...notes.map(n=>n.seq))});await refresh();d.close()}));}
 function toolbar(){const wrap=el('div','','shareActions');wrap.append(button('Share patch',ownerDialog),button('Viewer notes',ownerNotes));return wrap}
 function decorateOwner(){if(isViewer)return;const toolbarHost=document.querySelector('.fixturePatchToolbarActions');if(toolbarHost&&!toolbarHost.querySelector('[data-share-toolbar]')){const buttons=toolbar();buttons.dataset.shareToolbar='1';toolbarHost.append(buttons)}decorate()}
 function openSummary(kind){
  summaryKind=kind;if(!summaryPane){summaryPane=el('aside','','frontEditorPane fixtureSummaryPane shareSummaryPane');summaryPane.setAttribute('aria-label','Patch summary');document.body.append(summaryPane)}
  summaryPane.replaceChildren();const head=el('div','','frontEditorHead'),body=el('div','','frontEditorBody');head.append(el('h2',kind==='fixtures'?'Fixture Summary':'Position Summary'),button('×',()=>{summaryPane.remove();summaryPane=null;summaryKind=''},'close'));summaryPane.append(head,body);
  body.innerHTML=kind==='fixtures'?bridge.fixtureSummary():bridge.positionSummary();body.querySelectorAll('[onclick]').forEach(n=>n.removeAttribute('onclick'));
  body.querySelectorAll('.homeFixtureInfoButton').forEach(n=>{const card=el('div','','homeFixtureInfoButton');card.innerHTML=n.innerHTML;card.querySelector('.homeDistroMeta:last-child')?.remove();n.replaceWith(card)});summaryPane.classList.add('open');
 }
 function renderViewer(){
  if(!bridge)return;const sheet=document.getElementById('sheet');sheet.replaceChildren();
  if(!state){sheet.append(el('p',viewerError||'Loading shared patch…'));summaryPane?.remove();summaryPane=null;return}
  bridge.renderPatch();const patch=sheet.querySelector('.fixturePatchView');if(patch){
   patch.querySelector('.fixturePatchToolbarLeft')?.replaceChildren(button('Fixture Summary',()=>openSummary('fixtures')),button('Position Summary',()=>openSummary('positions')));
   const actions=el('div','','fixturePatchToolbarActions sheetToolbarActions');actions.append(button('Export',bridge.exportPatch,'btn primary'),button('How it works',guidance));patch.querySelector('.fixturePatchToolbarRight')?.replaceChildren(actions);
   patch.querySelectorAll('.fixturePatchGroupGear,.fixturePatchLock').forEach(n=>n.remove());patch.querySelectorAll('.fixturePatchTable input,.fixturePatchTable select').forEach(n=>n.disabled=true);
   const details=el('details','','sharePatchDetails'),body=el('div','','sharePatchDetailsBody');details.append(el('summary','Console Info & Notes'));body.innerHTML=bridge.controlMarkup(state.snapshot.control);const items=state.snapshot.summaryNotes||[];if(items.some(note=>note.trim())){body.append(el('h3','Notes'));const list=el(state.snapshot.summaryNoteStyle==='numbered'?'ol':'ul');items.filter(note=>note.trim()).forEach(note=>list.append(el('li',note)));body.append(list)}patch.append(details);details.append(body);
  }
  decorate(sheet);if(summaryPane)openSummary(summaryKind);
 }
 function guidance(){const d=dialog('Using the shared Fixture Patch');const list=el('ol');for(const text of ['Use the patch toolbar to sort, filter and choose columns. You can also view Fixture Summary and Position Summary.','Choose Export to PDF to download the patch. Fixture details are read-only.','Enter your name and job role at the top, then click a fixture’s Notes cell and type. Press Enter or leave the cell to send; use Shift+Enter for a new line. Your note appears on the owner’s patch with your name.'])list.append(el('li',text));d.append(list,button('Got it',()=>{try{localStorage.setItem('lampy-share-guide:'+viewer?.id,'1')}catch{}d.close()},'btn primary'))}
 function updateViewerStatus(){
  if(!status)return;status.replaceChildren();if(viewerError)status.append(el('p',viewerError,'shareError'));
  if(viewerPending)status.append(el('span','The owner published a new patch. '),button('Load updated patch (keep drafts)',async()=>{if([...drafts.values()].some(d=>d.sending))throw Error('Wait for your note to finish sending.');await refreshViewer(true)}));
  const ids=new Set(state?.snapshot.fixtures.map(row=>row.id)||[]);for(const [id,draft] of drafts){if(draft.body.trim()&&!ids.has(id)){const box=el('div','','shareOrphanDraft'),field=el('textarea');field.readOnly=true;field.value=draft.body;field.setAttribute('aria-label','Unsent note for removed fixture');box.append(el('p','A fixture was removed from the updated patch. Copy your unsent note before dismissing it.'),field,button('Dismiss draft',()=>{drafts.delete(id);updateViewerStatus()}));status.append(box)}}
 }
 async function refreshViewer(force=false){
  if(polling)return;polling=true;
  try{if(!viewer)throw Error('This viewer link is incomplete or invalid. Ask the owner for a new link.');const result=await readState(viewer,notes);viewerError='';if(loadedVersion&&loadedVersion!==result.version&&!force){viewerPending=true;updateViewerStatus();return}
   state=result;notes=result.notes;if(!loadedVersion||loadedVersion!==result.version){bridge.load(result.snapshot);loadedVersion=result.version;for(const draft of drafts.values()){if(draft.body.trim()){draft.version=loadedVersion;draft.requestId=crypto.randomUUID();draft.payload=null;draft.error='Patch updated. Review your note, then press Enter to send.'}}viewerPending=false;header.querySelector('h1').textContent=result.snapshot.title;renderHeaderLogos(result.snapshot);document.title=result.snapshot.title+' · Fixture Patch';renderViewer()}else decorate(document);updateViewerStatus();
  }catch(error){viewerError=error.message;if([404,410].includes(error.status)){state=null;notes=[];renderViewer();document.querySelector('[data-share-note]')?.close()}updateViewerStatus();if(!state)renderViewer()}finally{polling=false}
 }
 function attachNoteEditor(cell,id){
  if(cell.querySelector('.shareNoteEntry'))return;
  const draft=drafts.get(id)||{body:'',requestId:crypto.randomUUID(),version:loadedVersion,error:'',sending:false,payload:null};drafts.set(id,draft);
  const field=el('textarea','','shareNoteEntry'),message=el('span','','shareNoteStatus');field.rows=1;field.maxLength=2000;field.value=draft.body;field.setAttribute('aria-label','Note for fixture '+id);field.title='Type a note. Enter sends; Shift+Enter adds a line.';message.setAttribute('role','status');
  const resize=()=>{field.style.height='auto';field.style.height=Math.max(24,field.scrollHeight)+'px'},sync=()=>{field.value=draft.body;field.readOnly=draft.sending;message.textContent=draft.sending?'Sending…':draft.error;message.hidden=!message.textContent;resize()};
  draft.sync=sync;
  field.onfocus=()=>{if(!viewerName.trim()||!viewerRole.trim()){showError(Error('Enter your name and job role above the patch before adding a note.'));header.querySelector(!viewerName.trim()?'[name=name]':'[name=role]').focus()}};
  field.oninput=()=>{draft.body=field.value;draft.error='';message.hidden=true;bridge.resizePatch?.();resize()};
  const send=async()=>{
   if(draft.sending||!draft.body.trim())return;
   try{const payload=core.note({requestId:draft.requestId,fixtureId:id,name:viewerName,jobRole:viewerRole,body:draft.body,version:draft.version});
    // Keep the exact payload/key on uncertain retries; changed text is a new note request.
    if(draft.payload&&JSON.stringify({...payload,requestId:''})!==JSON.stringify({...draft.payload,requestId:''})){draft.requestId=crypto.randomUUID();payload.requestId=draft.requestId}draft.payload=payload;draft.sending=true;draft.sync();
    const saved=await request(viewer,'notes','POST',payload);if(!notes.some(n=>n.seq===saved.seq))notes.push(saved);draft.body='';draft.error='';draft.payload=null;draft.requestId=crypto.randomUUID();draft.version=loadedVersion;decorate(document);updateViewerStatus();bridge.resizePatch?.();
   }catch(error){draft.error=error.message+' Click the cell and press Enter to retry.';if(error.status===409){draft.error=error.message+' Your text is kept in this cell.';refreshViewer().catch(()=>{})}showError(error)}finally{draft.sending=false;draft.sync()}
  };
  field.onblur=send;field.onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();send().then(()=>{if(!draft.error)field.blur()})}};
  cell.onclick=event=>{if(event.target!==field)field.focus()};cell.append(field,message);sync();
 }
 function renderHeaderLogos(snapshot){const host=header.querySelector('.shareHeaderLogos');host.replaceChildren();const brand=el('img');brand.src='images/branding/ai-lampy-logo.png';brand.alt='AI-Lampy';host.append(brand);for(const logo of Object.values(snapshot.logos||{})){const image=el('img');image.src=logo.dataUrl;image.alt=logo.name||'Project logo';host.append(image)}}
 async function prepareSnapshot(){
  const raw=bridge.snapshot(),logos={};for(const [key,logo] of Object.entries(raw.logos||{})){const source=logo?.dataUrl||logo?.src;if(!source)continue;
   const url=new URL(source,location.href);if(url.protocol!=='data:'&&(url.origin!==location.origin||!url.pathname.includes('/images/')))throw Error('The '+key+' logo must be a project image or a bundled logo.');
   const image=new Image();await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Could not load the '+key+' logo. Try again.')),15000);image.onload=()=>{clearTimeout(timeout);resolve()};image.onerror=()=>{clearTimeout(timeout);reject(Error('Could not load the '+key+' logo.'))};image.src=source});
   const canvas=document.createElement('canvas'),scale=Math.min(1,600/image.naturalWidth,300/image.naturalHeight);canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const dataUrl=canvas.toDataURL('image/webp',.85);if(dataUrl.length>180000)throw Error('The '+key+' logo is too large to share. Use a smaller project logo.');logos[key]={name:logo.name||key,dataUrl};
  }return core.snapshot({...raw,logos});
 }
 async function setup(options){
  bridge=options;
  if(isViewer){document.body.classList.add('shareViewerMode');const footerLink=document.querySelector('.appFooterBrandLink');if(footerLink){footerLink.removeAttribute('onclick');footerLink.href=location.href;footerLink.onclick=event=>{event.preventDefault();header?.scrollIntoView({behavior:'smooth'})}}header=el('header','','shareViewerHeader');header.id='shareViewHeader';header.append(el('div','','shareHeaderLogos'),el('h1','Fixture Patch'));
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
 return root.LampyPatchShare={isViewer,isOwnerLink,setup,useProject,get projectKey(){if(!projectKey)projectKey=crypto.randomUUID();return projectKey},renderViewer,decorateOwner,noteMarkup,get snapshot(){return isViewer?state?.snapshot:null},noteText,ownerDialog,refresh,error:error=>{const d=dialog('Patch sharing');d.append(el('p',error.message||String(error),'shareError'))}};
})(globalThis);
