/* Truck Pack editor. Geometry and saved data rules live in truck-pack.js. */
(function(root){
  'use strict';
  const T=root.LampyTruckPack,labels={plan:'2D Top / Plan',top:'3D Top',left:'3D Left',right:'3D Right',back:'3D Back',front:'3D Front',leftIso:'3D Left Isometric',rightIso:'3D Right Isometric',orbit:'3D Free Rotation'};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let host,callbacks,tab='pack',selected='',selectedGroup=[],inspectorObserver=null,message='',dialog=null,drag=null,sceneMaps=[],importRequest=0;
  const state=()=>callbacks.getState(),truck=()=>state().trucks.find(t=>t.id===state().activeTruckId),unit=()=>callbacks.units(),length=v=>T.formatLength(v,unit().measurement),weight=v=>T.formatWeight(v,unit().weight);
  const button=(action,label,extra='')=>`<button type="button" class="btn" data-tp-action="${action}" ${extra}>${label}</button>`;
  const input=(name,value='',type='text',extra='')=>`<input name="${name}" type="${type}" value="${esc(value)}" ${extra}>`;
  const field=(label,control)=>`<label class="tpField"><span>${label}</span>${control}</label>`;
  function notify(text,error=false){message=text;const box=host?.querySelector('.tpMessage');if(box){box.textContent=text;box.classList.toggle('error',error)}}
  function save(){callbacks.save()}
  function replace(next){const checked=T.normalise(next);callbacks.setState(checked);save();return checked}
  function transaction(change,redraw=true){try{const next=JSON.parse(JSON.stringify(state()));change(next);replace(next);message='';if(redraw)render();return true}catch(error){notify(error.message,true);return false}}
  function selectionIds(){return selected?(selectedGroup.includes(selected)?selectedGroup:[selected]):[]}
  function select(id){selected=id;selectedGroup=id?[id]:[];renderInspector();renderScenes()}
  function syncInspectorHeight(){const pane=host?.querySelector('.tpInspector'),grid=host?.querySelector('.tpViewGrid'),height=grid?.getBoundingClientRect?.().height;if(pane?.style&&height>0)pane.style.height=height+'px'}
  function observeInspector(){inspectorObserver?.disconnect();inspectorObserver=null;syncInspectorHeight();const grid=host?.querySelector('.tpViewGrid');if(grid&&root.ResizeObserver){inspectorObserver=new root.ResizeObserver(syncInspectorHeight);inspectorObserver.observe(grid)}}

  function outsidePointer(event){
    if(!host||!selected||event.target.closest?.('.tpInspector,.tpDialog,#colourMenu,[data-tp-scene],[data-tp-item]'))return;
    select('');
  }
  function caseColourFields(record={}){return '<div class="tpColourFields">'+['colour','colour2','colour3'].map((key,i)=>field('Col '+(i+1),callbacks.colourControl(`name="${key}" data-allow-blank-colour="1"`,record[key]||'','#fff','color','colour',true))).join('')+'</div>'}
  function readCaseColours(form){return Object.fromEntries(['colour','colour2','colour3'].map(key=>{const raw=String(form.get(key)||'').trim(),value=raw?callbacks.colourHex(raw):'';if(raw&&!value)throw Error('Enter a valid colour or leave it blank.');return [key,value]}))}
  function sceneTools(index,v){
    const paths={select:'M5 3v16l4-5 4 7 3-2-4-6 6-1z',pan:'M8 12V5a2 2 0 0 1 4 0v6-7a2 2 0 0 1 4 0v7-4a2 2 0 0 1 4 0v8c0 5-3 7-7 7-3 0-5-2-7-5l-3-4a2 2 0 0 1 3-2l2 2',rotate:'M20 8a8 8 0 1 0 0 8M20 3v5h-5'};
    return `<div class="tpSceneTools" role="group" aria-label="View ${index+1} tools">${[['select','Select cases'],['pan','Pan view'],['rotate','Rotate 3D view']].map(([key,label])=>button('tool',`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[key]}"/></svg>`,`data-tool="${key}" data-view="${index}" title="${label}" aria-label="${label}" aria-pressed="${(v.tool||'select')===key}"`)).join('')}</div>`;
  }
  function setTab(value){cancelDrag();closeDialog();tab=value==='cases'?'cases':'pack';selected='';selectedGroup=[];message=''}
  function mount(element,options){host=element;callbacks=options;root.document?.removeEventListener('pointerdown',outsidePointer,true);root.document?.addEventListener('pointerdown',outsidePointer,true);render()}
  function reset(){cancelDrag();closeDialog();selected='';selectedGroup=[];tab='pack';message='';sceneMaps=[]}
  function destroy(){inspectorObserver?.disconnect();inspectorObserver=null;cancelDrag();closeDialog();root.document?.removeEventListener('pointerdown',outsidePointer,true);selected='';selectedGroup=[];host=null}
  function render(){
    if(!host)return;cancelDrag();const data=state(),active=truck();selectedGroup=selectionIds().filter(id=>active?.items.some(item=>item.id===id));selected=selectedGroup[0]||'';
    host.className='truckPackView';host.innerHTML=`<div class="tpToolbar"><div class="tpTabs">${button('pack','Pack',`aria-pressed="${tab==='pack'}"`)}${button('cases','Cases',`aria-pressed="${tab==='cases'}"`)}</div>${tab==='pack'?`<div class="tpTruckTabs" role="group" aria-label="Trucks">${data.trucks.map(t=>button('truck',esc(t.name),`data-truck-id="${t.id}" aria-pressed="${t.id===active?.id}"`)).join('')}</div>`:''}<div class="tpActions">${tab==='cases'?button('new-case','+ Case / Truss')+button('import','Import Cases')+button('delete-all-cases','Delete all',data.cases.length?'':'disabled'):button('new-truck','+ Truck')+(active?button('add-case','Add case')+button('edit-truck','Truck Details')+button('delete-truck','Delete Truck'):'')}${tab==='pack'&&active?`${field('Views',`<select data-tp-layout>${[1,2,4].map(n=>`<option value="${n}" ${n===data.layout?'selected':''}>${n===1?'Single':n+' views'}</option>`).join('')}</select>`)}`:''}</div></div><div class="tpMessage${message?' hasMessage':''}" role="status" aria-live="polite">${esc(message)}</div>${tab==='cases'?inventoryMarkup():packMarkup(data,active)}`;
    host.onclick=click;host.onchange=change;host.onpointerdown=pointerDown;host.onpointermove=pointerMove;host.onpointerup=pointerUp;host.onpointercancel=()=>{cancelDrag();renderScenes()};host.onkeydown=event=>{if(event.key==='Escape'&&drag){event.preventDefault();cancelDrag();renderScenes();notify('Move cancelled.')}else if(event.key==='Escape'&&selected){event.preventDefault();select('')}else if(['Enter',' '].includes(event.key)&&event.target.closest('[data-tp-cube-face]')){event.preventDefault();const face=event.target.closest('[data-tp-cube-face]');setView(Number(face.closest('[data-tp-cube]').dataset.tpCube),face.dataset.tpCubeFace)}else if(['Enter',' '].includes(event.key)&&event.target.matches('[data-tp-item]')){event.preventDefault();select(event.target.dataset.tpItem)}};
    if(tab==='pack'&&active){renderInspector();renderScenes()}callbacks.styleColours?.(host);observeInspector();callbacks.navigationChanged?.();
  }
  function inventoryMarkup(){
    const rows=state().cases.map(c=>`<tr data-tp-case="${c.id}"><td>${input('name',c.name)}</td><td>${input('type',c.type,'text','list="tpCaseTypes"')}</td>${['width','length','height'].map(k=>`<td>${input(k,length(c[k]))}</td>`).join('')}<td><input name="heightIncludesWheels" type="checkbox" aria-label="Height includes wheels for ${esc(c.name)}" ${c.heightIncludesWheels?'checked':''}></td><td>${input('weight',weight(c.weight),'text',`placeholder="${unit().weight}"`)}</td><td>${input('casterHeight',c.casterHeight==null?'':length(c.casterHeight),'text','placeholder="Required if excluded"')}</td><td>${button('delete-case','Delete',`data-case-id="${c.id}" aria-label="Delete ${esc(c.name)}"`)}</td></tr>`).join('');
    return `<p class="hint">Enter dimensions with mm, cm, m, ' or &quot;. Values display in your project units. Castor height is required if H excludes wheels. Truss uses its full outside dimensions.</p><datalist id="tpCaseTypes"><option value="Case"><option value="Truss"><option value="Pallet"></datalist><div class="tpInventoryScroll"><table class="tpInventory"><thead><tr>${['Name','Type','W','L','H','Height Inc Wheels?','Weight ('+unit().weight+')','Castor H',''].map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows||'<tr><td colspan="9">No cases yet. Add a case or import your inventory.</td></tr>'}</tbody></table></div>`;
  }
  function packMarkup(data,active){
    if(!active)return '<div class="blankState">Add a truck to start a pack. Create or import your case inventory in Cases.</div>';
    const totals=T.totals(data,active),packed=active.items.filter(i=>i.packed).length;
    return `<div class="tpLoadSummary"><strong>${esc(active.name)}</strong><span>${esc(length(active.length))} L × ${esc(length(active.width))} W × ${esc(length(active.height))} H</span><span>${packed} packed / ${active.items.length-packed} waiting</span><span class="${totals.overPayload?'tpWarning':''}">Packed: ${esc(weight(totals.packed))} / ${active.payload==null?'payload unknown':esc(weight(active.payload))}${totals.overPayload?' — OVER PAYLOAD':''}</span>${totals.unknown?`<span class="tpWarning">${totals.unknown} case weight${totals.unknown===1?'':'s'} unknown</span>`:''}</div><div class="tpWorkspace"><div class="tpViewGrid tpLayout${data.layout}">${data.views.slice(0,data.layout).map((v,i)=>`<section class="tpViewport" data-tp-viewport="${i}"><div class="tpViewToolbar"><label>View ${i+1}<select data-tp-perspective="${i}">${Object.entries(labels).map(([key,label])=>`<option value="${key}" ${v.mode===key?'selected':''}>${label}</option>`).join('')}</select></label><div>${button('zoom-out','−',`data-view="${i}" aria-label="Zoom out view ${i+1}"`)}${button('fit','Fit',`data-view="${i}"`)}${button('zoom-in','+',`data-view="${i}" aria-label="Zoom in view ${i+1}"`)}</div></div><div class="tpSceneWrap" data-tool="${v.tool||'select'}">${sceneTools(i,v)}<svg class="tpScene" data-tp-scene="${i}" viewBox="0 0 900 600" role="img" aria-label="${labels[v.mode]} of ${esc(active.name)}"></svg><div class="tpCube" data-tp-cube="${i}"></div></div></section>`).join('')}</div><aside class="tpInspector" aria-label="Case details" hidden></aside></div><p class="hint">Use the cursor to select and drag cases, the hand to pan, and Rotate to orbit in 3D. Drag across empty space to select multiple cases. Shift-click adds or removes a case. Click empty space to clear selection. Off-wheel lifters snap onto supporting cases.</p>`;
  }
  function renderInspector(){
    const pane=host?.querySelector('.tpInspector'),active=truck();if(!pane||!active)return;const items=active.items.filter(i=>selectionIds().includes(i.id)),item=items[0];
    const list=`<label class="tpField"><span>Cases on this truck</span><select data-tp-select><option value="">Select a case</option>${active.items.map((i,index)=>`<option value="${i.id}" ${i.id===selected?'selected':''}>${index+1}. ${esc(T.definition(state(),i).name)} — ${i.packed?'Packed':'Waiting'}</option>`).join('')}</select></label>`;
    pane.hidden=!item;pane.closest('.tpWorkspace').classList.toggle('hasSelection',!!item);syncInspectorHeight();if(!item){selected='';selectedGroup=[];pane.innerHTML='';return}if(items.length>1){renderGroupInspector(pane,items);return}
    const base=T.definition(state(),item),d=T.dimensions(state(),item);
    pane.innerHTML=`<form data-tp-item-form><div class="tpInspectorHead"><h3>Case Details</h3><button class="btn primary" type="submit" name="intent" value="details">Save Details</button></div>${list}${field('Name',input('name',base.name))}${field('Department',input('department',item.department))}${caseColourFields(item)}${field('Ride on Wheels',`<select name="rideOnWheels"><option value="yes" ${item.rideOnWheels?'selected':''}>Yes</option><option value="no" ${!item.rideOnWheels?'selected':''}>No — stand on end</option></select>`)}<div data-tp-lifter ${item.rideOnWheels?'hidden':''}>${field('Lifter?',`<select name="lifter"><option value="no" ${!item.lifter?'selected':''}>No</option><option value="yes" ${item.lifter?'selected':''}>Yes</option></select>`)}</div><p class="hint">${esc(base.type)} · ${esc(weight(base.weight)||'Weight unknown')}<br>${esc(length(d.width))} W × ${esc(length(d.length))} L × ${esc(length(d.height))} H</p>${field('Rotation',`<select name="rotation"><option value="0" ${!item.rotation?'selected':''}>0°</option><option value="90" ${item.rotation===90?'selected':''}>90°</option></select>`)}<details class="tpPositionDetails"><summary>Position from rear-left floor</summary><div class="tpPositionFields">${['x','y','z'].map((k,i)=>field(['X — across width','Y — into trailer','Z — height'][i],input(k,length(item[k])))).join('')}</div></details><div class="tpActions">${!item.packed?'<button class="btn" type="submit" name="intent" value="pack">Pack at Position</button>':''}${item.packed?button('unpack','Move to Waiting'):''}${button('remove-item','Remove')}</div></form>`;
    pane.querySelector('form').onsubmit=event=>{event.preventDefault();applyItem(event.currentTarget,event.submitter?.value==='pack')};
    pane.querySelector('[name="rideOnWheels"]').onchange=event=>{pane.querySelector('[data-tp-lifter]').hidden=event.target.value==='yes'};
    callbacks.styleColours?.(pane);
  }
  function renderGroupInspector(pane,items){
    const common=key=>items.every(item=>item[key]===items[0][key])?items[0][key]:'',values=Object.fromEntries(['department','colour','colour2','colour3'].map(key=>[key,common(key)]));
    pane.innerHTML=`<form data-tp-group-form><div class="tpInspectorHead"><h3>${items.length} Cases Selected</h3><button class="btn primary" type="submit">Save Details</button></div><p class="hint">Only fields you change apply to all selected cases. Blank mixed fields stay unchanged unless edited.</p>${field('Department',input('department',values.department))}${caseColourFields(values)}<ul class="tpSelectionList">${items.map(item=>`<li>${esc(T.definition(state(),item).name)}</li>`).join('')}</ul></form>`;
    const form=pane.querySelector('form');form.oninput=event=>{if(['department','colour','colour2','colour3'].includes(event.target.name))event.target.dataset.tpChanged='true'};
    form.onsubmit=event=>{event.preventDefault();applySelectedDetails(form)};callbacks.styleColours?.(pane);
  }
  function applySelectedDetails(form){
    const changes={};for(const input of form.querySelectorAll('[data-tp-changed="true"]')){
      if(!['department','colour','colour2','colour3'].includes(input.name))continue;
      const raw=input.value.trim(),value=input.name==='department'?raw:raw?callbacks.colourHex(raw):'';
      if(input.name!=='department'&&raw&&!value){notify('Enter a valid colour or leave it blank.',true);return}changes[input.name]=value;
    }
    if(!Object.keys(changes).length){notify('No details changed.');return}
    const ids=new Set(selectionIds());transaction(next=>{for(const item of next.trucks.find(t=>t.id===next.activeTruckId).items)if(ids.has(item.id))Object.assign(item,changes)});
  }
  function deleteInventory(all,id){
    const ids=all?state().cases.map(c=>c.id):[id];if(!ids.length)return;
    if(!confirm(all?'Delete all inventory cases and all their copies from every truck? Trucks will be kept.':'Delete this inventory case and every copy from all trucks? Any cases it supports will move to Waiting.'))return;
    let result;if(transaction(next=>{result=T.removeInventoryCases(next,ids)}))notify(result.inventory+' inventory cases and '+result.removed+' truck cases deleted.'+(result.waiting?' '+result.waiting+' unsupported cases moved to Waiting.':''));
  }
  function applyItem(form,pack=false){
    const values=new FormData(form);transaction(next=>{const t=next.trucks.find(t=>t.id===state().activeTruckId),index=t.items.findIndex(i=>i.id===selected),original=t.items[index],candidate={...original,name:String(values.get('name')).trim(),department:String(values.get('department')).trim(),...readCaseColours(values),rideOnWheels:values.get('rideOnWheels')==='yes',lifter:values.get('rideOnWheels')==='no'&&values.get('lifter')==='yes',rotation:Number(values.get('rotation')),x:T.parseLength(values.get('x'),true),y:T.parseLength(values.get('y'),true),z:T.parseLength(values.get('z'),true)};
      if(!original.packed&&!pack){t.items[index]=candidate;return}
      const placed=T.placement(next,t,candidate,candidate,false);if(placed.error)throw Error(placed.error);t.items[index]=placed.item;
    });
  }
  function click(event){
    const target=event.target.closest('[data-tp-action]');if(!target||!host.contains(target))return;const action=target.dataset.tpAction;
    if(action==='pack'||action==='cases'){setTab(action);render();return}
    if(action==='new-case'){caseDialog();return}if(action==='import'){importDialog();return}
    if(action==='new-truck'||action==='edit-truck'){truckDialog(action==='edit-truck'?truck():null);return}
    if(action==='delete-case'||action==='delete-all-cases'){deleteInventory(action==='delete-all-cases',target.dataset.caseId);return}
    if(action==='delete-truck'){if(confirm('Delete this truck and its pack? Inventory cases will remain.'))transaction(next=>{next.trucks=next.trucks.filter(t=>t.id!==next.activeTruckId)});return}
    if(action==='add-case'){addCaseDialog();return}
    if(action==='truck'){if(!state().trucks.some(t=>t.id===target.dataset.truckId))return;state().activeTruckId=target.dataset.truckId;selected='';selectedGroup=[];save();render();return}
    if(action==='tool'){const index=Number(target.dataset.view),v=state().views[index],tool=target.dataset.tool;if(!v||!['select','pan','rotate'].includes(tool))return;cancelDrag();selected='';selectedGroup=[];if(tool==='rotate'&&v.mode==='plan')Object.assign(v,T.view({...v,mode:'leftIso',yaw:T.cameras.leftIso[0],pitch:T.cameras.leftIso[1]}));v.tool=tool;save();render();return}
    if(action==='unpack'||action==='remove-item'){transaction(next=>{const t=next.trucks.find(t=>t.id===next.activeTruckId);if(action==='remove-item')t.items=t.items.filter(i=>i.id!==selected);else Object.assign(t.items.find(i=>i.id===selected),{packed:false,x:0,y:0,z:0})});return}
    if(['fit','zoom-in','zoom-out'].includes(action)){const v=state().views[Number(target.dataset.view)];if(action==='fit'){v.panX=0;v.panY=0}v.zoom=action==='fit'?1:Math.max(.25,Math.min(8,v.zoom*(action==='zoom-in'?1.25:.8)));save();renderScenes()}
  }
  function change(event){
    const el=event.target;
    if(el.matches('[data-tp-layout]')){state().layout=Number(el.value);save();render();return}
    if(el.matches('[data-tp-perspective]')){setView(Number(el.dataset.tpPerspective),el.value);return}
    if(el.matches('[data-tp-select]')){select(el.value);return}
    const row=el.closest('[data-tp-case]');if(!row)return;
    const prior=state().cases.find(c=>c.id===row.dataset.tpCase),key=el.name;
    const ok=transaction(next=>{const c=next.cases.find(c=>c.id===prior.id);c[key]=['width','length','height'].includes(key)?T.parseLength(el.value):key==='casterHeight'?(el.value.trim()?T.parseLength(el.value,true):null):key==='weight'?T.parseWeight(el.value,unit().weight,true):key==='heightIncludesWheels'?el.checked:el.value},false);
    if(!ok){if(el.type==='checkbox')el.checked=prior[key];else el.value=['width','length','height','casterHeight'].includes(key)?length(prior[key]):key==='weight'?weight(prior[key]):prior[key];return}
    const updated=state().cases.find(c=>c.id===prior.id);if(['width','length','height','casterHeight'].includes(key))el.value=length(updated[key]);if(key==='weight')el.value=weight(updated[key]);notify('Case saved.');
  }
  function setView(index,mode){const old=state().views[index];state().views[index]=T.view({...old,mode,yaw:T.cameras[mode]?.[0]??old.yaw,pitch:T.cameras[mode]?.[1]??old.pitch},index);save();render()}
  function closeDialog(){importRequest++;dialog?.remove();dialog=null}
  function showDialog(title,markup,onSubmit){
    closeDialog();dialog=document.createElement('div');dialog.className='modal tpDialog';dialog.innerHTML=`<div class="modalCard" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modalHead"><h2>${esc(title)}</h2><button class="close" type="button" aria-label="Close">×</button></div><form>${markup}<div class="tpDialogError" role="alert"></div><div class="tpActions"><button class="btn" type="button" data-tp-cancel>Cancel</button><button class="btn primary" type="submit">Save</button></div></form></div>`;
    document.body.append(dialog);dialog.querySelector('.close').onclick=closeDialog;dialog.querySelector('[data-tp-cancel]').onclick=closeDialog;
    dialog.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();closeDialog()}else if(event.key==='Tab'){const nodes=[...dialog.querySelectorAll('button,input,select,textarea')].filter(n=>!n.disabled&&n.getClientRects().length),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}};
    dialog.querySelector('form').onsubmit=event=>{event.preventDefault();try{onSubmit(event.currentTarget)}catch(error){dialog.querySelector('.tpDialogError').textContent=error.message}};
    callbacks.styleColours?.(dialog);dialog.querySelector('input,select,button')?.focus();return dialog;
  }
  function addCaseDialog(){
    const active=truck();if(!active)return;
    const rows=state().cases.map(c=>`<label class="tpAddCaseRow" data-case-search="${esc((c.name+' '+c.type).toLowerCase())}"><span><strong>${esc(c.name)}</strong><small>${esc(c.type)} · ${esc(length(c.width))} × ${esc(length(c.length))} × ${esc(length(c.height))}</small></span>${input('quantity_'+c.id,0,'number',`min="0" max="${T.MAX_ITEMS}" step="1" aria-label="Quantity of ${esc(c.name)}"`)}</label>`).join('');
    const modal=showDialog('Add cases to '+active.name,`<label class="tpField"><span>Find cases</span><input type="search" data-tp-case-search placeholder="Search cases"></label><p class="hint">Enter quantities for the cases to add to Waiting.</p><div class="tpAddCaseList">${rows||'<p>No cases in inventory. Add or import cases in Cases first.</p>'}</div>`,form=>{
      const f=new FormData(form),next=JSON.parse(JSON.stringify(state()));let count=0;
      for(const c of next.cases){const raw=String(f.get('quantity_'+c.id)||'').trim();if(!raw||Number(raw)===0)continue;const quantity=Number(raw);if(!Number.isInteger(quantity)||quantity<0)throw Error('Enter a whole quantity for '+c.name+'.');count+=T.addItems(next,active.id,c.id,quantity).length}
      if(!count)throw Error('Enter a quantity for at least one case.');replace(next);selected='';selectedGroup=[];closeDialog();message=count+' cases added to Waiting.';render();
    });
    modal.querySelector('[type="submit"]').textContent='Add cases';
    modal.querySelector('[data-tp-case-search]').oninput=event=>{const query=event.target.value.trim().toLowerCase();modal.querySelectorAll('[data-case-search]').forEach(row=>{row.hidden=!row.dataset.caseSearch.includes(query)})};
  }
  function caseDialog(){
    const markup=`<div class="tpFormGrid">${field('Name',input('name','','text','required'))}${field('Type',input('type','Case','text','list="tpDialogTypes"'))}<datalist id="tpDialogTypes"><option value="Case"><option value="Truss"><option value="Pallet"></datalist>${['width','length','height'].map(k=>field({width:'W',length:'L',height:'H'}[k],input(k,'','text','required placeholder="e.g. 600 mm"'))).join('')}${field('Height Inc Wheels?',`<select name="heightIncludesWheels"><option value="yes">Yes</option><option value="no">No</option></select>`)}${field('Castor Height',input('casterHeight','','text','placeholder="Required when excluded from H"'))}${field('Weight',input('weight','','text',`placeholder="${unit().weight}"`))}${field('Department',input('department'))}</div>`;
    showDialog('Add Case / Truss',markup,form=>{const f=new FormData(form),record=T.normaliseCase({id:T.id('case'),name:f.get('name'),type:f.get('type'),width:T.parseLength(f.get('width')),length:T.parseLength(f.get('length')),height:T.parseLength(f.get('height')),heightIncludesWheels:f.get('heightIncludesWheels')==='yes',casterHeight:f.get('casterHeight')?T.parseLength(f.get('casterHeight'),true):null,weight:T.parseWeight(f.get('weight'),unit().weight,true),department:f.get('department')});const next=JSON.parse(JSON.stringify(state()));next.cases.push(record);replace(next);closeDialog();render()});
  }
  function truckDialog(existing){
    const initial=existing||{...T.presets[0],name:'Truck '+(state().trucks.length+1),preset:T.presets[0].id};
    const markup=`<div class="tpFormGrid">${field('Trailer Size',`<select name="preset">${T.presets.map(p=>`<option value="${p.id}" ${initial.preset===p.id?'selected':''}>${p.name}</option>`).join('')}<option value="custom" ${initial.preset==='custom'?'selected':''}>Custom</option></select>`)}<p class="hint tpFull">Presets: <a href="${T.source.url}" target="_blank" rel="noopener noreferrer">Stagetruck fleet</a>. Check your actual vehicle dimensions and payload.</p>${['width','length','height'].map(k=>field('Trailer '+k,input(k,length(initial[k]),'text','required'))).join('')}${field('Max Payload',input('payload',weight(initial.payload),'text','placeholder="Unknown — enter confirmed payload"'))}<p class="hint tpFull" data-preset-note>${esc(T.presets.find(p=>p.id===initial.preset)?.note||'')}</p>${[['company','Trucking Company'],['name','Trailer Name/Number'],['registration','Trailer Reg'],['driver','Driver Name'],['email','Driver E-mail'],['phone','Driver Phone']].map(([k,label])=>field(label,input(k,initial[k]||'',k==='email'?'email':k==='phone'?'tel':'text',k==='name'?'required':''))).join('')}</div>`;
    const modal=showDialog(existing?'Truck Details':'Add Truck',markup,form=>{const f=new FormData(form),record={id:existing?.id||T.id('truck'),items:existing?.items||[],preset:f.get('preset'),width:T.parseLength(f.get('width')),length:T.parseLength(f.get('length')),height:T.parseLength(f.get('height')),payload:T.parseWeight(f.get('payload'),unit().weight,true)};for(const key of ['company','name','registration','driver','email','phone'])record[key]=f.get(key);const next=JSON.parse(JSON.stringify(state()));if(existing)next.trucks[next.trucks.findIndex(t=>t.id===existing.id)]=record;else next.trucks.push(record);next.activeTruckId=record.id;replace(next);closeDialog();selected='';selectedGroup=[];render()});
    modal.querySelector('[name="preset"]').onchange=event=>{const preset=T.presets.find(p=>p.id===event.target.value);if(preset){for(const k of ['width','length','height'])modal.querySelector(`[name="${k}"]`).value=length(preset[k]);modal.querySelector('[name="payload"]').value=weight(preset.payload)}modal.querySelector('[data-preset-note]').textContent=preset?.note||''};
    for(const el of modal.querySelectorAll('[name="width"],[name="length"],[name="height"]'))el.addEventListener('input',()=>{modal.querySelector('[name="preset"]').value='custom'});
  }
  function importDialog(){
    let sheets=[],sheetIndex=0,mapping={};
    const modal=showDialog('Import Cases','<input type="file" accept=".csv,.tsv,.xlsx,.xlsm,.xml" data-tp-file><p class="hint">Choose CSV, TSV or an Excel workbook. Existing inventory is preserved.</p><label class="tpField"><span>Dimension units</span><select name="dimensionUnit" data-tp-dimension-unit><option value="">Units included in values</option><option value="mm">Millimetres (mm)</option><option value="cm">Centimetres (cm)</option><option value="m">Metres (m)</option><option value="ft">Feet (ft)</option><option value="in">Inches (in)</option></select></label><p class="hint">Choose the units used by numbers without units in Width, Length, Height and Castor Height. Values with units keep their own units.</p><div data-tp-import-content></div>',()=>{if(!sheets.length)throw Error('Choose an inventory file.');for(const key of ['name','width','length','height'])if(mapping[key]<0)throw Error('Map '+key+' before importing.');const assigned=Object.values(mapping).filter(n=>n>=0);if(new Set(assigned).size!==assigned.length)throw Error('Map each spreadsheet column to only one field.');const records=T.importRows(sheets[sheetIndex].rows.slice(1),mapping,unit().weight,modal.querySelector('[data-tp-dimension-unit]').value),next=JSON.parse(JSON.stringify(state()));next.cases.push(...records);replace(next);closeDialog();tab='cases';message=records.length+' cases imported.';render()});
    modal.querySelector('[type="submit"]').textContent='Import';
    modal.querySelector('[data-tp-dimension-unit]').onchange=()=>{modal.querySelector('.tpDialogError').textContent='';if(sheets.length)drawCorrections()};
    const drawCorrections=()=>{
      const rows=sheets[sheetIndex].rows,dimensionUnit=modal.querySelector('[data-tp-dimension-unit]').value,issues=T.importDimensionIssues(rows.slice(1),mapping,dimensionUnit),corrections=issues.filter(issue=>!issue.unitRequired),box=modal.querySelector('[data-tp-import-corrections]');
      box.innerHTML=(issues.some(issue=>issue.unitRequired)?'<p class="tpWarning">Choose Dimension units for numbers without units.</p>':'')+(corrections.length?`<h3>Correct dimension values</h3><p class="hint">These values cannot be used for packing. Enter measurements below; the source file stays unchanged. Plain numbers use the selected dimension units.</p><div class="tpImportCorrections">${corrections.map(issue=>`<label class="tpField"><span>Row ${issue.row} · ${esc(rows[issue.row-1][mapping.name]||'Case')} · ${issue.label}</span><input type="text" data-tp-correction-row="${issue.row}" data-tp-correction-field="${issue.field}" value="${esc(issue.value)}" aria-describedby="tpCorrection_${issue.row}_${issue.field}"><small id="tpCorrection_${issue.row}_${issue.field}">${esc(issue.message)}</small></label>`).join('')}</div>`:'');
      box.querySelectorAll('[data-tp-correction-row]').forEach(input=>input.oninput=()=>{
        const row=Number(input.dataset.tpCorrectionRow),key=input.dataset.tpCorrectionField;rows[row-1][mapping[key]]=input.value;modal.querySelector('.tpDialogError').textContent='';
        const status=box.querySelector('#tpCorrection_'+row+'_'+key);try{T.parseImportLength(input.value,modal.querySelector('[data-tp-dimension-unit]').value,key==='casterHeight');status.textContent='Ready to import.'}catch(error){status.textContent=error.message}
      });
    };
    const draw=()=>{const rows=sheets[sheetIndex].rows,headers=rows[0]||[];mapping=T.suggestMapping(headers);const body=modal.querySelector('[data-tp-import-content]');body.innerHTML=field('Worksheet',`<select data-tp-sheet>${sheets.map((s,i)=>`<option value="${i}" ${i===sheetIndex?'selected':''}>${esc(s.name)}</option>`).join('')}</select>`)+`<div class="tpFormGrid">${Object.keys(mapping).map(k=>field(({heightIncludesWheels:'Height Inc Wheels?',casterHeight:'Castor Height'})[k]||k,`<select data-tp-map="${k}"><option value="-1">Not imported</option>${headers.map((h,i)=>`<option value="${i}" ${mapping[k]===i?'selected':''}>${esc(h||'Column '+(i+1))}</option>`).join('')}</select>`)).join('')}</div><p>${rows.length-1} rows. Invalid measurements reject the import without adding partial data.</p><div class="tpImportPreview"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1,6).map(r=>`<tr>${headers.map((_,i)=>`<td>${esc(r[i])}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div data-tp-import-corrections></div>`;body.querySelector('[data-tp-sheet]').onchange=event=>{sheetIndex=Number(event.target.value);draw()};body.querySelectorAll('[data-tp-map]').forEach(el=>el.onchange=()=>{mapping[el.dataset.tpMap]=Number(el.value);drawCorrections()});drawCorrections()};
    modal.querySelector('[data-tp-file]').onchange=async event=>{const file=event.target.files[0];if(!file)return;const request=++importRequest;modal.querySelector('[type="submit"]').disabled=true;try{const parsed=await callbacks.readInventory(file);if(request!==importRequest||dialog!==modal)return;sheets=parsed.filter(s=>s.rows.length>1);if(!sheets.length)throw Error('No inventory rows found.');sheetIndex=0;draw();modal.querySelector('.tpDialogError').textContent=''}catch(error){if(dialog===modal&&request===importRequest){sheets=[];modal.querySelector('[data-tp-import-content]').innerHTML='';modal.querySelector('.tpDialogError').textContent=error.message}}finally{if(dialog===modal&&request===importRequest)modal.querySelector('[type="submit"]').disabled=false}};
  }
  function corners(b){return [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]].map(([x,y,z])=>({x:b.x+x*b.width,y:b.y+y*b.length,z:b.z+z*b.height}))}
  const faces=[[0,3,2,1],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]],edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  function staging(active){let y=0,rowWidth=0,x=active.width+600;const map=new Map();for(const item of active.items.filter(i=>!i.packed)){const d=T.dimensions(state(),item);if(y+d.length>active.length&&y>0){x+=rowWidth+200;y=0;rowWidth=0}map.set(item.id,{x,y,z:0});y+=d.length+150;rowWidth=Math.max(rowWidth,d.width)}return map}
  function scene(index){
    const active=truck(),v=state().views[index],waiting=staging(active),all=active.items.map(item=>({item,position:item.packed?item:waiting.get(item.id)}));
    if(drag?.type==='case'&&drag.preview){const entry=all.find(e=>e.item.id===drag.id);if(entry){entry.position=drag.preview;entry.item={...entry.item,...drag.preview,packed:true}}}
    const trailer={x:0,y:0,z:0,width:active.width,length:active.length,height:active.height},bounds=corners(trailer).concat(all.flatMap(({item,position})=>corners({...T.dimensions(state(),item),...position}))),projected=bounds.map(p=>T.project(p,v));
    let minX=Math.min(...projected.map(p=>p.x)),maxX=Math.max(...projected.map(p=>p.x)),minY=Math.min(...projected.map(p=>p.y)),maxY=Math.max(...projected.map(p=>p.y));
    const fit=Math.min(780/Math.max(1,maxX-minX),440/Math.max(1,maxY-minY)),scale=fit*v.zoom,offsetX=450-(minX+maxX)/2*scale+(v.panX||0),offsetY=310-(minY+maxY)/2*scale+(v.panY||0),point=p=>{const q=T.project(p,v);return {...q,x:q.x*scale+offsetX,y:q.y*scale+offsetY}};
    // Hold the projection during dragging so the scene does not move under the pointer.
    const fixed=drag?.type==='case'&&drag.index===index?drag.projection:null;
    if(fixed)return renderSceneData(active,all,v,fixed.point,fixed.scale,waiting,index);
    return renderSceneData(active,all,v,point,scale,waiting,index);
  }
  function caseTextWidth(text){
    if(!caseTextWidth.cache)caseTextWidth.cache=new Map();
    if(caseTextWidth.cache.has(text))return caseTextWidth.cache.get(text);
    if(caseTextWidth.context===undefined)caseTextWidth.context=root.document?.createElement('canvas').getContext('2d')||null;
    const context=caseTextWidth.context;if(context)context.font='600 16px Arial';
    const width=context?context.measureText(text).width/16:Array.from(text).reduce((sum,char)=>sum+(/[ilI.,' ]/.test(char)?.3:/[MW@]/.test(char)?.95:.65),0);
    if(caseTextWidth.cache.size>=2048)caseTextWidth.cache.clear();caseTextWidth.cache.set(text,width);return width;
  }
  function fitCaseLabel(text,width,height){
    const words=String(text).trim().split(/\s+/).filter(Boolean),padding=Math.min(4,width*.06,height*.06),available=width-2*padding,space=caseTextWidth(' ');
    const wrap=size=>{const lines=[];let line='',used=0;for(const word of words){
      const parts=[];let part='';for(const char of word){if(part&&caseTextWidth(part+char)*size>available){parts.push(part);part=''}part+=char}if(part)parts.push(part);
      for(const part of parts){const next=caseTextWidth(part)*size,gap=line?space*size:0;if(line&&used+gap+next>available){lines.push(line);line='';used=0}if(line){line+=' ';used+=space*size}line+=part;used+=next}
    }if(line)lines.push(line);return lines};
    let low=0,high=Math.min(18,(height-2*padding)/1.25,available/Math.max(.01,...words.flatMap(word=>Array.from(word,caseTextWidth))));
    for(let i=0;i<14;i++){const size=(low+high)/2,lines=wrap(size);if(lines.length*size*1.25<=height-2*padding)low=size;else high=size}
    const size=low,lines=wrap(size);return {size,lines,padding,width:available,lineHeight:size*1.25};
  }
  function caseColourMarkup(item,index){
    const presentation=callbacks.colourPresentation([item.colour,item.colour2,item.colour3]),colours=presentation.colours,fillId='tp-colours-'+index+'-'+item.id;
    const band=callbacks.stripeWidth(),edge=.3*96/25.4;
    const defs=colours.length>1?`<defs><pattern id="${fillId}" patternUnits="userSpaceOnUse" width="${colours.length*band}" height="${band}" patternTransform="rotate(45)">${colours.map((colour,i)=>`<rect x="${i*band}" width="${band}" height="${band}" fill="${colour}"/>`+(colour.toLowerCase()==='#ffffff'?`<rect x="${i*band}" width="${edge}" height="${band}" fill="#000000"/><rect x="${(i+1)*band-edge}" width="${edge}" height="${band}" fill="#000000"/>`:'')).join('')}</pattern></defs>`:'';
    return {...presentation,defs,fill:colours.length>1?'url(#'+fillId+')':colours[0]||'#ffffff'};
  }
  function caseLabelMarkup(name,q,presentation=callbacks.colourPresentation([])){
    const origin={x:q[0].x,y:q[0].y};let u={x:q[1].x-q[0].x,y:q[1].y-q[0].y},v={x:q[3].x-q[0].x,y:q[3].y-q[0].y};
    if(Math.abs(v.x)/Math.hypot(v.x,v.y)>Math.abs(u.x)/Math.hypot(u.x,u.y))[u,v]=[v,u];
    if(u.x<0){origin.x+=u.x;origin.y+=u.y;u={x:-u.x,y:-u.y}}
    let det=u.x*v.y-u.y*v.x;if(det<0){origin.x+=v.x;origin.y+=v.y;v={x:-v.x,y:-v.y};det=-det}
    const width=Math.hypot(u.x,u.y),height=Math.hypot(v.x,v.y);if(det<.1||!width||!height)return '';
    const fit=fitCaseLabel(name,width,height),start=(height-fit.lines.length*fit.lineHeight)/2+fit.size;
    return `<g transform="matrix(${u.x/width} ${u.y/width} ${v.x/height} ${v.y/height} ${origin.x} ${origin.y})" pointer-events="none"><svg class="tpCaseLabel" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" overflow="hidden"><text text-anchor="middle" font-family="Arial" font-weight="600" font-size="${fit.size}" fill="${presentation.text}" stroke="${presentation.outline}" stroke-width="${presentation.outline==='transparent'?0:Math.min(.5*96/25.4,fit.size*.12)}" paint-order="stroke fill">${fit.lines.map((line,i)=>`<tspan x="${width/2}" y="${start+i*fit.lineHeight}" textLength="${Math.min(fit.width,caseTextWidth(line)*fit.size)}" lengthAdjust="spacingAndGlyphs">${esc(line)}</tspan>`).join('')}</text></svg></g>`;
  }
  function renderSceneData(active,all,v,point,scale,waiting,index){
    const tc=corners({x:0,y:0,z:0,width:active.width,length:active.length,height:active.height}).map(point),points=ps=>ps.map(p=>p.x.toFixed(2)+','+p.y.toFixed(2)).join(' '),outline=edges.map(([a,b])=>`M${tc[a].x},${tc[a].y}L${tc[b].x},${tc[b].y}`).join(' ');
    let markup=`<polygon points="${points(tc.slice(0,4))}" fill="#edf0f3" stroke="#526274" stroke-width="2"/><path d="${outline}" stroke="#7f8a99" stroke-width="1.5" fill="none" opacity=".7" pointer-events="none"/>`;
    const rear=point({x:active.width/2,y:0,z:0}),front=point({x:active.width/2,y:active.length,z:0});markup+=`<text x="${rear.x}" y="${rear.y+22}" class="tpSceneCaption">REAR / LOAD</text><text x="${front.x}" y="${front.y-12}" class="tpSceneCaption">FRONT</text>`;
    if(waiting.size){const p=point({x:active.width+600,y:active.length,z:0});markup+=`<text x="${p.x}" y="${p.y-24}" class="tpSceneCaption">WAITING</text>`}
    const surfaces=[];
    for(const {item,position} of all){const base=T.definition(state(),item),d=T.dimensions(state(),item),b={...d,...position},selectedCase=(drag?.type==='marquee'?drag.ids:selectionIds()).includes(item.id),invalid=drag?.id===item.id&&drag.error,appearance=caseColourMarkup(item,index),colour=invalid?'#ed7b7b':appearance.fill;
      markup+=appearance.defs;
      if(v.mode==='plan'){const q=corners(b).slice(4).map(point);surfaces.push({depth:b.z,markup:`<g data-tp-item="${item.id}" tabindex="0" role="button" aria-label="${esc(base.name)}" class="tpCase"><title>${esc(base.name)} — ${item.packed?'Packed':'Waiting'}</title><polygon points="${points(q)}" fill="${colour}" stroke="${selectedCase?'#0060d2':'#23384a'}" stroke-width="${selectedCase?4:1.5}"/>${caseLabelMarkup(base.name,q,appearance)}</g>`});continue}
      // Castors rotate with the case when it is stood on end.
      const localPoint=p=>{let x=p.x,y=p.y,z=p.z;if(!item.rideOnWheels){y=p.z;z=base.length-p.y}if(item.rotation===90)[x,y]=[y,base.width-x];return {x:position.x+x,y:position.y+y,z:position.z+z}};
      const boxes=[{x:0,y:0,z:d.caster,width:base.width,length:base.length,height:d.bodyHeight,body:true}];
      if(!d.truss&&d.caster>0){const w=Math.min(65,base.width*.15),l=Math.min(90,base.length*.15);for(const x of [base.width*.08,base.width*.92-w])for(const y of [base.length*.08,base.length*.92-l]){const radius=Math.min(l*.5,d.caster*.4);boxes.push({x,y,z:0,width:w,length:l,height:d.caster,body:false,wheel:true});boxes.push({x:x+w*.3,y:y+l*.3,z:radius*2,width:w*.4,length:l*.4,height:d.caster-radius*2,body:false})}}
      for(const part of boxes){const mesh=partMesh(part),ps=mesh.vertices.map(localPoint).map(point);for(let f=0;f<mesh.faces.length;f++){const q=mesh.faces[f].map(i=>ps[i]),area=q.reduce((n,p,i)=>n+p.x*q[(i+1)%q.length].y-q[(i+1)%q.length].x*p.y,0);if(Math.abs(area)<.1)continue;const depth=q.reduce((n,p)=>n+p.depth,0)/q.length,faceColour=part.body?colour:'#303844',stroke=selectedCase&&part.body?'#0060d2':'#263646';let content=`<polygon points="${points(q)}" fill="${faceColour}" fill-opacity="${d.truss?.35:1}" stroke="${stroke}" stroke-width="${selectedCase&&part.body?2.8:1}"/>`;
        if(part.body){content+=caseLabelMarkup(base.name,q,appearance);if(d.truss)content+=`<path d="M${q[0].x},${q[0].y}L${q[2].x},${q[2].y}M${q[1].x},${q[1].y}L${q[3].x},${q[3].y}" stroke="#3f4f5f" stroke-width="2"/>`}
        surfaces.push({depth,markup:`<g data-tp-item="${item.id}" class="tpCase" tabindex="0" role="button" aria-label="${esc(base.name)}"><title>${esc(base.name)}</title>${content}</g>`});
      }}
    }
    markup+=surfaces.sort((a,b)=>a.depth-b.depth).map(f=>f.markup).join('');
    const hitBoxes=all.map(({item,position})=>{const ps=corners({...T.dimensions(state(),item),...position}).map(point);return {id:item.id,left:Math.min(...ps.map(p=>p.x)),right:Math.max(...ps.map(p=>p.x)),top:Math.min(...ps.map(p=>p.y)),bottom:Math.max(...ps.map(p=>p.y))}});
    if(drag?.type==='marquee'&&drag.index===index&&drag.current){const r=selectionRect(drag.start,drag.current);markup+=`<rect class="tpSelectionBox" x="${r.left}" y="${r.top}" width="${r.right-r.left}" height="${r.bottom-r.top}" pointer-events="none"/>`}
    return {markup,point,scale,camera:v,waiting,index,hitBoxes};
  }
  function partMesh(part){
    if(!part.wheel)return {vertices:corners(part),faces};
    const radius=Math.min(part.length*.5,part.height*.4),vertices=[];
    for(const x of [part.x,part.x+part.width])for(let n=0;n<12;n++){const angle=n*Math.PI/6;vertices.push({x,y:part.y+part.length/2+Math.cos(angle)*radius,z:part.z+radius+Math.sin(angle)*radius})}
    const sides=[Array.from({length:12},(_,i)=>11-i),Array.from({length:12},(_,i)=>12+i)];
    for(let n=0;n<12;n++)sides.push([n,(n+1)%12,(n+1)%12+12,n+12]);
    return {vertices,faces:sides};
  }
  function cubeMarkup(v){
    const points=corners({x:-1,y:-1,z:-1,width:2,length:2,height:2}).map(p=>{const q=T.project(p,v);return {...q,x:q.x*25+55,y:q.y*25+53}}),names=['','back','right','front','left','top'];
    return `<svg viewBox="0 0 110 110" role="img" aria-label="Drag rotation cube or click a face">${faces.map((indices,i)=>({i,ps:indices.map(n=>points[n])})).sort((a,b)=>a.ps.reduce((s,p)=>s+p.depth,0)-b.ps.reduce((s,p)=>s+p.depth,0)).map(({i,ps})=>{
      const origin={x:ps[0].x,y:ps[0].y};let u={x:(ps[1].x-ps[0].x)/100,y:(ps[1].y-ps[0].y)/100},w={x:(ps[3].x-ps[0].x)/100,y:(ps[3].y-ps[0].y)/100};
      // Map text into the face plane, keeping letters readable on either side.
      if(u.x<0){origin.x+=u.x*100;origin.y+=u.y*100;u={x:-u.x,y:-u.y}}
      if(u.x*w.y-u.y*w.x<0){origin.x+=w.x*100;origin.y+=w.y*100;w={x:-w.x,y:-w.y}}
      const label=names[i]&&Math.abs(u.x*w.y-u.y*w.x)>.001?`<text transform="matrix(${u.x} ${u.y} ${w.x} ${w.y} ${origin.x} ${origin.y})" x="50" y="50" text-anchor="middle" dominant-baseline="middle" font-size="18" textLength="70" lengthAdjust="spacingAndGlyphs">${names[i].toUpperCase()}</text>`:'';
      return `<g data-tp-cube-face="${names[i]||'top'}" role="button" tabindex="0" aria-label="${names[i]||'top'} view"><polygon points="${ps.map(p=>p.x+','+p.y).join(' ')}" fill="${i===5?'#dbeafe':'#e5e9ef'}" stroke="#43536a"/>${label}</g>`;
    }).join('')}</svg><span>Drag to rotate</span>`;
  }
  function renderScenes(){if(!host||tab!=='pack'||!truck())return;sceneMaps=[];host.querySelectorAll('[data-tp-scene]').forEach(svg=>{const index=Number(svg.dataset.tpScene),data=scene(index);sceneMaps[index]=data;svg.innerHTML=data.markup;const cube=svg.closest('.tpViewport').querySelector('.tpCube'),v=state().views[index];cube.hidden=v.mode==='plan';cube.innerHTML=cubeMarkup(v)})}
  function selectionRect(a,b){return {left:Math.min(a.x,b.x),right:Math.max(a.x,b.x),top:Math.min(a.y,b.y),bottom:Math.max(a.y,b.y)}}
  function casesInSelection(boxes,rect){return boxes.filter(box=>box.left<=rect.right&&box.right>=rect.left&&box.top<=rect.bottom&&box.bottom>=rect.top).map(box=>box.id)}
  function svgPoint(event,svg){const rect=svg.getBoundingClientRect(),ratio=Math.min(rect.width/900,rect.height/600),left=rect.left+(rect.width-900*ratio)/2,top=rect.top+(rect.height-600*ratio)/2;return {x:(event.clientX-left)/ratio,y:(event.clientY-top)/ratio}}
  function pointerDown(event){
    if(event.button!==0||tab!=='pack')return;const cube=event.target.closest('[data-tp-cube]'),svg=event.target.closest('[data-tp-scene]');
    if(cube){const index=Number(cube.dataset.tpCube),v=state().views[index];drag={type:'orbit',pointerId:event.pointerId,index,model:state(),original:{...v},startX:event.clientX,startY:event.clientY,yaw:v.yaw,pitch:v.pitch,face:event.target.closest('[data-tp-cube-face]')?.dataset.tpCubeFace,moved:false};host.setPointerCapture(event.pointerId);event.preventDefault();return}
    if(!svg)return;const index=Number(svg.dataset.tpScene),v=state().views[index],tool=v.tool||'select';
    if(tool==='pan'||tool==='rotate'){selected='';selectedGroup=[];renderInspector();renderScenes();drag={type:tool==='pan'?'pan':'orbit',index,model:state(),original:{...v},start:svgPoint(event,svg),startX:event.clientX,startY:event.clientY,yaw:v.yaw,pitch:v.pitch,pointerId:event.pointerId,moved:false};host.setPointerCapture(event.pointerId);event.preventDefault();return}
    const target=event.target.closest('[data-tp-item]');if(!target){const start=svgPoint(event,svg);drag={type:'marquee',index,start,current:start,ids:[],base:event.shiftKey?selectionIds():[],boxes:sceneMaps[index]?.hitBoxes||[],pointerId:event.pointerId,moved:false};host.setPointerCapture(event.pointerId);event.preventDefault();return}const item=truck().items.find(i=>i.id===target.dataset.tpItem);if(!item)return;if(event.shiftKey){const ids=new Set(selectionIds());ids.has(item.id)?ids.delete(item.id):ids.add(item.id);selectedGroup=[...ids];selected=selectedGroup[0]||'';renderInspector();renderScenes();event.preventDefault();return}selected=item.id;selectedGroup=[item.id];renderInspector();renderScenes();const projection=sceneMaps[index],origin=item.packed?{x:item.x,y:item.y,z:item.z}:projection.waiting.get(item.id),mode=state().views[index].mode,camera=state().views[index],edgeOn=mode==='orbit'&&Math.abs(Math.sin(camera.pitch*Math.PI/180))<.15,plane=['left','right'].includes(mode)?'yz':['front','back'].includes(mode)?'xz':edgeOn?(Math.abs(Math.sin(camera.yaw*Math.PI/180))>Math.abs(Math.cos(camera.yaw*Math.PI/180))?'yz':'xz'):'xy';drag={type:'case',pointerId:event.pointerId,index,id:item.id,item:{...item},start:svgPoint(event,svg),origin:{...origin,...(!item.packed&&plane==='yz'?{x:0}:{}),...(!item.packed&&plane==='xz'?{y:0}:{})},projection,plane,preview:null,error:'',moved:false};host.setPointerCapture(event.pointerId);event.preventDefault();renderScenes();
  }
  function pointerMove(event){
    if(!drag)return;
    if(drag.type==='marquee'){drag.current=svgPoint(event,host.querySelector(`[data-tp-scene="${drag.index}"]`));if(Math.abs(drag.current.x-drag.start.x)+Math.abs(drag.current.y-drag.start.y)>3)drag.moved=true;drag.ids=[...new Set([...drag.base,...casesInSelection(drag.boxes,selectionRect(drag.start,drag.current))])];renderScenes();return}
    if(drag.type==='pan'){const svg=host.querySelector(`[data-tp-scene="${drag.index}"]`),p=svgPoint(event,svg),v=state().views[drag.index];v.panX=Math.max(-100000,Math.min(100000,(drag.original.panX||0)+p.x-drag.start.x));v.panY=Math.max(-100000,Math.min(100000,(drag.original.panY||0)+p.y-drag.start.y));drag.moved=true;renderScenes();return}
    if(drag.type==='orbit'){const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;const v=state().views[drag.index];v.mode='orbit';v.yaw=drag.yaw+dx*.65;v.pitch=Math.max(-60,Math.min(89,drag.pitch-dy*.65));renderScenes();return}
    const svg=host.querySelector(`[data-tp-scene="${drag.index}"]`),p=svgPoint(event,svg),dx=(p.x-drag.start.x)/drag.projection.scale,dy=(p.y-drag.start.y)/drag.projection.scale,delta=T.unprojectDelta(dx,dy,drag.projection.camera,drag.plane);if(!delta)return;if(Math.abs(dx)+Math.abs(dy)>5)drag.moved=true;
    const proposed={x:drag.origin.x+delta.x,y:drag.origin.y+delta.y,z:Math.max(0,drag.origin.z+delta.z)},active=truck();
    if(proposed.x>=active.width+100||proposed.y>=active.length+100||proposed.x+T.dimensions(state(),drag.item).width<-100){drag.preview={...proposed,packed:false};drag.error='';drag.unpacked=true}
    else{drag.unpacked=false;const result=T.placement(state(),active,drag.item,proposed,drag.plane==='xy');drag.preview=result.item||proposed;drag.error=result.error}
    notify(drag.error|| (drag.unpacked?'Release to move to Waiting.':'Release to place case.'),!!drag.error);renderScenes();
  }
  function pointerUp(event){
    if(!drag)return;const current=drag;drag=null;try{host.releasePointerCapture(event.pointerId)}catch{}
    if(current.type==='marquee'){selectedGroup=current.moved?current.ids:current.base;selected=selectedGroup[0]||'';renderInspector();renderScenes();return}
    if(current.type==='pan'){save();render();return}
    if(current.type==='orbit'){if(!current.moved&&current.face)setView(current.index,current.face);else{save();render()}return}
    if(!current.moved){renderScenes();return}if(current.error){notify(current.error,true);renderScenes();return}
    if(current.preview)transaction(next=>{const t=next.trucks.find(t=>t.id===next.activeTruckId),i=t.items.findIndex(i=>i.id===current.id);t.items[i]=current.unpacked?{...t.items[i],packed:false,x:0,y:0,z:0}:{...t.items[i],...current.preview,packed:true}});
  }
  function cancelDrag(){if(['orbit','pan'].includes(drag?.type)&&callbacks&&drag.model===state())state().views[drag.index]={...drag.original};if(drag?.pointerId!==undefined){try{host?.releasePointerCapture(drag.pointerId)}catch{}}drag=null}
  root.LampyTruckPackView={mount,destroy,reset,setTab,getTab:()=>tab,labels};
})(globalThis);
