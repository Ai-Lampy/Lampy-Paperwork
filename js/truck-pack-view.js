/* Truck Pack editor. Geometry and saved data rules live in truck-pack.js. */
(function(root){
  'use strict';
  const T=root.LampyTruckPack,labels={plan:'2D Top/Plan',top:'3D Top',sides:'3D Sides',back:'3D Back',front:'3D Front',leftIso:'3D Left Isometric',rightIso:'3D Right Isometric',orbit:'3D Free Rotation'};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let host,callbacks,tab='pack',selected='',selectedGroup=[],inspectorObserver=null,message='',dialog=null,drag=null,sceneMaps=[],importRequest=0,undoStack=[],redoStack=[],showMeasurements=true,inventoryQuery='',manualDimensionUnit='';
  const state=()=>callbacks.getState(),truck=()=>state().trucks.find(t=>t.id===state().activeTruckId),unit=()=>callbacks.units(),length=v=>T.formatLength(v,unit().measurement),weight=v=>T.formatWeight(v,unit().weight);
  const button=(action,label,extra='')=>`<button type="button" class="btn" data-tp-action="${action}" ${extra}>${label}</button>`;
  const input=(name,value='',type='text',extra='')=>`<input name="${name}" type="${type}" value="${esc(value)}" ${extra}>`;
  const field=(label,control)=>`<label class="tpField"><span>${label}</span>${control}</label>`;
  function notify(text,error=false){message=text;const box=host?.querySelector('.tpMessage');if(box){box.textContent=text;box.classList.toggle('error',error)}}
  function save(){callbacks.save()}
  function replace(next){
    const checked=T.normalise(next),before=JSON.stringify(state()),changed=JSON.stringify([state().cases,state().trucks])!==JSON.stringify([checked.cases,checked.trucks]);
    callbacks.setState(checked);save();if(changed){undoStack.push(before);while(undoStack.length>30||undoStack.length>1&&undoStack.reduce((sum,s)=>sum+s.length,0)>10000000)undoStack.shift();redoStack=[]}syncHistoryButtons();return checked;
  }
  function syncHistoryButtons(){for(const [action,stack] of [['undo',undoStack],['redo',redoStack]])for(const control of host?.querySelectorAll?.(`[data-tp-action="${action}"]`)||[])control.disabled=!stack.length}
  function historyButtons(){return `<div class="tpHistoryActions">${[['undo','Undo','Ctrl/Cmd+Z',undoStack],['redo','Redo','Ctrl/Cmd+Shift+Z',redoStack]].map(([action,label,shortcut,stack])=>button(action,`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path ${action==='redo'?'transform="translate(24 0) scale(-1 1)"':''} d="M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12"/></svg>`,`aria-label="${label}" title="${label} (${shortcut})" ${stack.length?'':'disabled'}`)).join('')}</div>`}
  function inventoryMatches(record){return (record.name+' '+record.type+' '+record.department).toLowerCase().includes(inventoryQuery.trim().toLowerCase())}
  function filterInventory(){
    if(!host)return;const records=new Map(state().cases.map(c=>[c.id,c]));let visible=0;
    for(const row of host.querySelectorAll('[data-tp-case]')){const record=records.get(row.dataset.tpCase);row.hidden=!record||!inventoryMatches(record);if(!row.hidden)visible++}
    const empty=host.querySelector('[data-tp-no-results]');if(empty)empty.hidden=visible>0;
  }
  function restoreHistory(redo=false){
    if(drag||dialog)return;const from=redo?redoStack:undoStack,to=redo?undoStack:redoStack;if(!from.length)return;
    const current=state(),next=T.normalise({...JSON.parse(from[from.length-1]),views:current.views,layout:current.layout});to.push(JSON.stringify(current));from.pop();callbacks.setState(next);selected='';selectedGroup=[];save();message=redo?'Change redone.':'Change undone.';render();host?.focus?.({preventScroll:true});
  }
  function editingKey(event){
    if(event.target.closest?.('input,textarea,select,[contenteditable="true"]')||dialog||drag)return false;
    const key=String(event.key).toLowerCase();if((event.ctrlKey||event.metaKey)&&!event.altKey&&['z','y'].includes(key)){event.preventDefault();restoreHistory(key==='y'||event.shiftKey);return true}return false;
  }
  function orientationControl(value,mixed=false){return '<div data-tp-orientation'+(!mixed&&value==='wheels'?' hidden':'')+'>'+field('Orientation',`<select name="orientation">${mixed?'<option value="" selected>Mixed — leave unchanged</option>':''}${[['wheels','On wheels'],['tipped','Tipped / on end'],['side','On side'],['wheelsUp','Wheels up']].map(([key,label])=>`<option value="${key}" ${!mixed&&value===key?'selected':''}>${label}</option>`).join('')}</select>`)+'</div>'}
  function syncOrientationForm(event,form){
    const key=event.target.name;if(!['orientation','rideOnWheels'].includes(key))return;
    const other=form.querySelector?.(`[name="${key==='orientation'?'rideOnWheels':'orientation'}"]`);if(!other)return;
    if(!event.target.value){other.value='';delete other.dataset.tpChanged;return}
    other.value=key==='orientation'?(event.target.value==='wheels'?'yes':'no'):(event.target.value==='yes'?'wheels':'tipped');other.dataset.tpChanged='true';const orientation=form.querySelector?.('[data-tp-orientation]');if(orientation)orientation.hidden=form.querySelector('[name="rideOnWheels"]').value==='yes';
  }
  function editActions(){return `<div class="tpActions tpEditActions">${button('rotate-selection','Rotate 90°')}${button('move-truck','Move to truck',state().trucks.length<2?'disabled':'')}</div>`}
  function editSelection(action){
    const ids=selectionIds();if(!ids.length)return;
    if(action==='move-truck'){
      const sourceId=truck().id;showDialog('Move selected cases to another truck',field('Destination truck',`<select name="destination">${state().trucks.filter(t=>t.id!==sourceId).map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>`)+'<p class="hint">Cases move to Waiting on the destination truck, keeping their details and orientations.</p>',form=>{
        const next=JSON.parse(JSON.stringify(state()));T.transferItems(next,sourceId,new FormData(form).get('destination'),ids);replace(next);closeDialog();selectedGroup=ids;selected=ids[0];message='Cases moved to Waiting on '+truck().name+'.';render();
      });return;
    }
    let result;const ok=transaction(next=>{const active=next.trucks.find(t=>t.id===next.activeTruckId);if(action==='rotate-selection')T.rotateItems(next,active,ids);else result=T.duplicateItems(next,active,ids)});
    if(ok&&result){selectedGroup=result.ids;selected=result.ids[0];message=result.packed?'Row duplicated behind the selection.':'Copies added to Waiting — no valid space behind the selection.';render()}
  }
  function transaction(change,redraw=true){try{const next=JSON.parse(JSON.stringify(state()));change(next);replace(next);message='';if(redraw)render();return true}catch(error){notify(error.message,true);return false}}
  function selectionIds(){return selected?(selectedGroup.includes(selected)?selectedGroup:[selected]):[]}
  function select(id){if(!commitPendingDetails())return;selected=id;selectedGroup=id?[id]:[];renderInspector();renderScenes()}
  function syncInspectorHeight(){const pane=host?.querySelector('.tpInspector'),grid=host?.querySelector('.tpViewGrid'),height=grid?.getBoundingClientRect?.().height;if(pane?.style&&height>0)pane.style.height=height+'px'}
  function observeInspector(){inspectorObserver?.disconnect();inspectorObserver=null;syncInspectorHeight();const grid=host?.querySelector('.tpViewGrid');if(grid&&root.ResizeObserver){inspectorObserver=new root.ResizeObserver(()=>{syncInspectorHeight();renderScenes()});inspectorObserver.observe(grid)}}

  function outsidePointer(event){
    if(host&&selected&&!event.target.closest?.('.tpInspector,#colourMenu,[data-tp-scene],[data-tp-cube]')&&!commitPendingDetails())return;
    if(!host||!selected||event.target.closest?.('.tpInspector,.tpViewToolbar,.tpDialog,#colourMenu,.tpSceneTools,[data-tp-cube],[data-tp-scene],[data-tp-item]'))return;
    select('');
  }
  function caseColourFields(record={}){return '<div class="tpColourFields">'+['colour','colour2','colour3'].map((key,i)=>field('Col '+(i+1),callbacks.colourControl(`name="${key}" data-allow-blank-colour="1"`,record[key]||'','#fff','color','colour',true))).join('')+'</div>'}
  function readCaseColours(form){return Object.fromEntries(['colour','colour2','colour3'].map(key=>{const raw=String(form.get(key)||'').trim(),value=raw?callbacks.colourHex(raw):'';if(raw&&!value)throw Error('Enter a valid colour or leave it blank.');return [key,value]}))}
  function sceneTools(index,v,panel=null){
    const paths={select:'M5 3v16l4-5 4 7 3-2-4-6 6-1z',pan:'M8 12V5a2 2 0 0 1 4 0v6-7a2 2 0 0 1 4 0v7-4a2 2 0 0 1 4 0v8c0 5-3 7-7 7-3 0-5-2-7-5l-3-4a2 2 0 0 1 3-2l2 2',rotate:'M20 8a8 8 0 1 0 0 8M20 3v5h-5'};
    return `<div class="tpSceneTools" ${panel!==null?`data-panel="${panel}"`:''} role="group" aria-label="View ${index+1} tools">${[['select','Select cases'],['pan','Pan view'],['rotate','Rotate 3D view']].filter(([key])=>key!=='rotate'||state().layout!==1).map(([key,label])=>button('tool',`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[key]}"/></svg>`,`data-tool="${key}" data-view="${index}" ${panel!==null?`data-panel="${panel}"`:''} title="${label}" aria-label="${label}" aria-pressed="${(v.tool||'select')===key}"`)).join('')}</div>`;
  }
  function setTab(value){cancelDrag();closeDialog();tab=value==='cases'?'cases':'pack';selected='';selectedGroup=[];message=''}
  function mount(element,options){host=element;callbacks=options;if(state().layout===2&&state().views[0].mode==='top'&&state().views[1].mode==='sides')[state().views[0],state().views[1]]=[state().views[1],state().views[0]];if(state().layout===2)state().views.slice(0,2).forEach((v,i)=>{if(v.mode==='plan'){const mode=i===0?'sides':'top';state().views[i]=T.view({...v,mode,yaw:T.cameras[mode][0],pitch:T.cameras[mode][1]},i)}});if(state().layout===1&&state().views[0].mode!=='plan')state().views[0]=T.view({...state().views[0],mode:'plan',yaw:0,pitch:90,tool:'select'});state().views.forEach(v=>{if(['left','right'].includes(v.mode))Object.assign(v,T.view({...v,mode:'sides',yaw:-90,pitch:0}))});root.document?.removeEventListener('pointerdown',outsidePointer,true);root.document?.addEventListener('pointerdown',outsidePointer,true);render()}
  function reset(){cancelDrag();closeDialog();selected='';selectedGroup=[];tab='pack';message='';sceneMaps=[];undoStack=[];redoStack=[];showMeasurements=true;inventoryQuery='';manualDimensionUnit=''}
  function destroy(){inspectorObserver?.disconnect();inspectorObserver=null;cancelDrag();closeDialog();root.document?.removeEventListener('pointerdown',outsidePointer,true);selected='';selectedGroup=[];host=null}
  function render(){
    if(!host)return;cancelDrag();const data=state(),active=truck();selectedGroup=selectionIds().filter(id=>active?.items.some(item=>item.id===id));selected=selectedGroup[0]||'';
    host.className='truckPackView';host.tabIndex=0;host.innerHTML=`<div class="tpToolbar"><div class="tpTabs">${button('pack','Pack',`aria-pressed="${tab==='pack'}"`)}${button('cases','Cases',`aria-pressed="${tab==='cases'}"`)}</div>${tab==='pack'?`<div class="tpTruckTabs" role="group" aria-label="Trucks">${data.trucks.map(t=>button('truck',esc(t.name),`data-truck-id="${t.id}" aria-pressed="${t.id===active?.id}"`)).join('')}</div>`:''}<div class="tpActions">${tab==='cases'?button('new-case','+ Case / Truss')+button('import','Import Cases')+button('delete-all-cases','Delete all',data.cases.length?'':'disabled'):button('new-truck','+ Truck')+(active?button('add-case','Add case')+button('snap-grid','Snap to grid',`aria-pressed="${active.snapToGrid}" title="Four columns; new cases fill from the front"`)+button('measurements','Measurements',`aria-pressed="${showMeasurements}"`)+button('edit-truck','Truck Details')+button('delete-truck','Delete Truck'):'')}${tab==='pack'&&active?`${field('Views',`<select data-tp-layout>${[1,2,4].map(n=>`<option value="${n}" ${n===data.layout?'selected':''}>${n===1?'2D Top/Plan':n===2?'3D View':n+' views'}</option>`).join('')}</select>`)}`:''}</div></div><div class="tpMessage${message?' hasMessage':''}" role="status" aria-live="polite">${esc(message)}</div>${tab==='cases'?inventoryMarkup():packMarkup(data,active)}`;
    host.onclick=click;host.oninput=event=>{if(event.target.matches('[data-tp-inventory-search]')){inventoryQuery=event.target.value;filterInventory()}};host.onchange=change;host.onpointerdown=pointerDown;host.onpointermove=pointerMove;host.onpointerup=pointerUp;host.onlostpointercapture=event=>{if(drag?.type==='inventory-fill'&&drag.pointerId===event.pointerId)cancelDrag()};host.onpointercancel=()=>{cancelDrag();renderScenes()};host.onkeydown=event=>{if(editingKey(event))return;if(event.key==='Escape'&&drag){event.preventDefault();cancelDrag();renderScenes();notify('Move cancelled.')}else if(event.key==='Escape'&&selected){event.preventDefault();select('')}else if(['Enter',' '].includes(event.key)&&event.target.closest('[data-tp-cube-face]')){event.preventDefault();const face=event.target.closest('[data-tp-cube-face]');setView(Number(face.closest('[data-tp-cube]').dataset.tpCube),face.dataset.tpCubeFace,face.closest('[data-tp-cube]').dataset.panel===undefined?null:Number(face.closest('[data-tp-cube]').dataset.panel))}else if(['Enter',' '].includes(event.key)&&event.target.matches('[data-tp-item]')){event.preventDefault();select(event.target.dataset.tpItem)}};
    if(tab==='pack'&&active){renderInspector();renderScenes()}callbacks.styleColours?.(host);observeInspector();callbacks.navigationChanged?.();
  }
  function inventoryCell(key,control,label){return `<td data-tp-fill-field="${key}">${control}<button type="button" class="tpFillHandle" data-tp-fill="${key}" tabindex="-1" title="Drag down to copy ${esc(label)}" aria-label="Drag down to copy ${esc(label)}"></button></td>`}
  function inventoryFieldValue(el){
    const key=el.name;if(!['name','type','width','length','height','heightIncludesWheels','weight','casterHeight'].includes(key))throw Error('Choose an editable case field.');
    return ['width','length','height'].includes(key)?T.parseLength(el.value):key==='casterHeight'?(el.value.trim()?T.parseLength(el.value,true):null):key==='weight'?T.parseWeight(el.value,unit().weight,true):key==='heightIncludesWheels'?el.checked:el.value;
  }
  function refreshInventoryCell(row,key){const record=state().cases.find(c=>c.id===row.dataset.tpCase),input=row.querySelector(`[name="${key}"]`);if(!record||!input)return;if(key==='heightIncludesWheels')input.checked=record[key];else input.value=['width','length','height','casterHeight'].includes(key)?length(record[key]):key==='weight'?weight(record[key]):record[key]}
  function startInventoryFill(event,handle){
    event.preventDefault();const row=handle.closest('[data-tp-case]'),key=handle.dataset.tpFill,control=row?.querySelector(`[name="${key}"]`);if(!control)return;
    try{const value=inventoryFieldValue(control),rows=[...host.querySelectorAll('[data-tp-case]')].filter(r=>!r.hidden),start=rows.indexOf(row);if(start<0)return;cancelDrag();drag={type:'inventory-fill',pointerId:event.pointerId,model:state(),key,value,rows,start,end:start,clientY:event.clientY,scroller:host.querySelector('.tpInventoryScroll'),frame:null};host.setPointerCapture(event.pointerId);updateInventoryFill()}catch(error){notify(error.message,true)}
  }
  function updateInventoryFill(){
    if(drag?.type!=='inventory-fill')return;const current=drag;let end=current.start;
    for(let i=current.start+1;i<current.rows.length;i++){const rect=current.rows[i].getBoundingClientRect();if(current.clientY>=rect.top)end=i;else break}current.end=end;
    current.rows.forEach((row,i)=>{const cell=row.querySelector(`[data-tp-fill-field="${current.key}"]`);cell?.classList.toggle('tpFillSource',i===current.start);cell?.classList.toggle('tpFillTarget',i>current.start&&i<=end)});
  }
  function inventoryFillScroll(){
    if(drag?.type!=='inventory-fill')return;drag.frame=null;const scroller=drag.scroller;if(!scroller)return;const bounds=scroller.getBoundingClientRect(),step=drag.clientY>bounds.bottom-22?14:drag.clientY<bounds.top+22?-14:0,before=scroller.scrollTop;
    if(step)scroller.scrollTop+=step;updateInventoryFill();if(step&&scroller.scrollTop!==before&&root.requestAnimationFrame)drag.frame=root.requestAnimationFrame(inventoryFillScroll);
  }
  function finishInventoryFill(event){
    if(drag?.type!=='inventory-fill'||event.pointerId!==drag.pointerId)return;const current=drag;cancelDrag();if(current.model!==state()||current.end<=current.start)return;const rows=current.rows.slice(current.start,current.end+1),ids=new Set(rows.map(row=>row.dataset.tpCase));
    if(transaction(next=>{for(const c of next.cases)if(ids.has(c.id))c[current.key]=current.value},false)){for(const row of rows)refreshInventoryCell(row,current.key);filterInventory();notify('Copied to '+(rows.length-1)+' case'+(rows.length===2?'':'s')+'.')}
  }
  function inventoryMarkup(){
    const rows=state().cases.map(c=>`<tr data-tp-case="${c.id}" ${inventoryMatches(c)?'':'hidden'}>${inventoryCell('name',input('name',c.name),'Name')}${inventoryCell('type',input('type',c.type,'text','list="tpCaseTypes"'),'Type')}${['width','length','height'].map(k=>inventoryCell(k,input(k,length(c[k])),k)).join('')}${inventoryCell('heightIncludesWheels',`<input name="heightIncludesWheels" type="checkbox" aria-label="Height includes wheels for ${esc(c.name)}" ${c.heightIncludesWheels?'checked':''}>`,'Height includes wheels')}${inventoryCell('weight',input('weight',weight(c.weight),'text',`placeholder="${unit().weight}"`),'Weight')}${inventoryCell('casterHeight',input('casterHeight',c.casterHeight==null?'':length(c.casterHeight),'text','placeholder="Required if excluded"'),'Castor height')}<td class="deviceConfigDeleteCol"><button class="deviceConfigDeleteButton" type="button" data-tp-action="delete-case" data-case-id="${c.id}" title="Delete case" aria-label="Delete ${esc(c.name)}">❌</button></td></tr>`).join('');
    return `<div class="tpViewToolbar tpInventoryToolbar"><label class="tpInventorySearch"><span>Search cases</span><input type="search" data-tp-inventory-search value="${esc(inventoryQuery)}" placeholder="Name, type or department"></label>${button('remap-dimensions','Reassign W/L/H',state().cases.length?'':'disabled')}${historyButtons()}</div><datalist id="tpCaseTypes"><option value="Case"><option value="Truss"><option value="Pallet"></datalist><div class="tpInventoryScroll"><table class="tpInventory"><thead><tr>${['Name','Type','W','L','H','Height Inc Wheels?','Weight ('+unit().weight+')','Castor H',''].map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows}<tr data-tp-no-results ${state().cases.some(inventoryMatches)?'hidden':''}><td colspan="9">${state().cases.length?'No matching cases.':'No cases yet. Add a case or import your inventory.'}</td></tr></tbody></table></div>`;
  }
  function sceneCamera(index,panel=null){const v=state().views[index===4?0:index];return v?.mode==='sides'&&[0,1].includes(panel)?v.sideViews[panel]:v}
  function panelViewport(index,panel=null){const viewport=sceneViewport(index);return sceneCamera(index)?.mode==='sides'&&[0,1].includes(panel)?{width:viewport.width,height:(viewport.height-18)/2-22}:viewport}
  function viewportMarkup(v,index,title='',truckName=''){
    return `<section class="tpViewport" data-tp-viewport="${index}"><div class="tpViewToolbar"><label>${state().layout===1?title||'2D Top/Plan':`<select data-tp-perspective="${index}" aria-label="Perspective for view ${index+1}">${Object.entries(labels).filter(([key])=>state().layout!==2||key!=='plan').map(([key,label])=>`<option value="${key}" ${v.mode===key?'selected':''}>${label}</option>`).join('')}</select>`}</label><div class="tpViewControls">${historyButtons()}${button('zoom-out','−',`data-view="${index}" aria-label="Zoom out ${title||'view '+(index+1)}"`)}${button('fit','Fit',`data-view="${index}"`)}${button('zoom-in','+',`data-view="${index}" aria-label="Zoom in ${title||'view '+(index+1)}"`)}</div></div><div class="tpSceneWrap" data-tool="${v.tool||'select'}">${v.mode==='sides'?v.sideViews.map((side,panel)=>sceneTools(index,side,panel)).join(''):sceneTools(index,v)}<svg class="tpScene" data-tp-scene="${index}" viewBox="0 0 900 600" role="img" aria-label="${title?title+' — ':''}${labels[v.mode]} of ${esc(truckName)}"></svg>${v.mode==='sides'?[0,1].map(panel=>`<div class="tpCube" data-tp-cube="${index}" data-panel="${panel}"></div>`).join(''):`<div class="tpCube" data-tp-cube="${index}"></div>`}</div></section>`;
  }
  function loadSummaryMarkup(data,active){const totals=T.totals(data,active),packed=active.items.filter(i=>i.packed).length;return `<div class="tpLoadSummary"><strong>${esc(active.name)}</strong><span>${esc(length(active.length))} L × ${esc(length(active.width))} W × ${esc(length(active.height))} H</span><span>${packed} packed / ${active.items.length-packed} waiting</span><span class="${totals.overPayload?'tpWarning':''}">Packed: ${esc(weight(totals.packed))} / ${active.payload==null?'payload unknown':esc(weight(active.payload))}${totals.overPayload?' — OVER PAYLOAD':''}</span>${showMeasurements?`<span>Free length from rear: ${esc(length(T.measurements(data,active).remaining))}</span>`:''}${totals.unknown?`<span class="tpWarning">${totals.unknown} case weight${totals.unknown===1?'':'s'} unknown</span>`:''}</div>`}
  function packMarkup(data,active){
    if(!active)return '<div class="blankState">Add a truck to start a pack. Create or import your case inventory in Cases.</div>';
    const layered=data.layout===1&&data.views[0].mode==='plan',views=layered?viewportMarkup(data.views[0],0,'Bottom row',active.name)+viewportMarkup(data.views[0],4,'Top row — Lifters',active.name):data.views.slice(0,data.layout).map((v,i)=>viewportMarkup(v,i,'',active.name)).join('');
    return `${loadSummaryMarkup(data,active)}<div class="tpWorkspace${data.layout===1?' tpSingleView':''}"><div class="tpViewGrid tpLayout${data.layout}">${views}</div><aside class="tpInspector" aria-label="Case details" hidden></aside></div><p class="hint">Use the cursor to select and drag cases, the hand to pan, and Rotate to orbit in 3D. Drag across empty space to select multiple cases. Shift-click adds or removes a case. Drag any selected case to move the group. Click empty space to clear selection. Lifters can sit on the floor or stack on supporting cases, on or off their wheels.${active.snapToGrid?` Grid cells are ${esc(length(active.width/4))} square, four across. Cases align from the front; existing placements stay unchanged until moved.`:''}</p>`;
  }
  function commitPendingDetails(){return host?.querySelector?.('[data-tp-item-form],[data-tp-group-form]')?.tpCommit?.()!==false}
  function bindDetailsForm(form,group=false){
    let dirty=false,edited=null,committing=false;
    const commit=()=>{if(!dirty||committing)return true;committing=true;try{const okay=group?applySelectedDetails(form,true):applyItem(form,false,true);if(okay){dirty=false;edited=null;for(const input of form.querySelectorAll('[data-tp-changed]'))delete input.dataset.tpChanged}return okay}finally{committing=false}};
    form.tpCommit=commit;
    form.onchange=form.oninput=event=>{if(!event.target.name)return;syncOrientationForm(event,form);event.target.dataset.tpChanged='true';dirty=true;edited=event.target};
    form.onfocusout=event=>{if(event.target.matches?.('input,select,textarea'))commit()};
    form.onfocusin=event=>{if(dirty&&edited!==event.target)commit()};
    form.onkeydown=event=>{if(event.key!=='Enter'||!event.target.matches?.('input,select,textarea'))return;event.preventDefault();event.stopPropagation();if(commit())event.target.blur()};
    form.onsubmit=event=>{event.preventDefault();if(!group&&event.submitter?.value==='pack')applyItem(form,true);else commit()};
  }
  function caseMetrics(item){const base=T.definition(state(),item),d=T.dimensions(state(),item);return `${esc(base.type)} · ${esc(weight(base.weight)||'Weight unknown')}<br>${esc(length(d.width))} W × ${esc(length(d.length))} L × ${esc(length(d.height))} H`}
  function renderInspector(){
    const pane=host?.querySelector('.tpInspector'),active=truck();if(!pane||!active)return;const items=active.items.filter(i=>selectionIds().includes(i.id)),item=items[0];
    const visible=!!item||state().layout===1;pane.hidden=!visible;pane.closest('.tpWorkspace').classList.toggle('hasSelection',visible);syncInspectorHeight();if(!item){selected='';selectedGroup=[];pane.innerHTML=visible?'<div class="tpInspectorHead"><h3>Case Details</h3></div><p class="hint">Select cases to view or edit their details.</p>':'';return}if(items.length>1){renderGroupInspector(pane,items);return}
    const base=T.definition(state(),item);
    pane.innerHTML=`<form data-tp-item-form><div class="tpInspectorHead"><h3>Case Details</h3></div>${field('Name',input('name',base.name))}${field('Department',input('department',item.department))}${caseColourFields(item)}${orientationControl(T.orientation(item))}${field('Ride on Wheels',`<select name="rideOnWheels"><option value="yes" ${item.rideOnWheels?'selected':''}>Yes</option><option value="no" ${!item.rideOnWheels?'selected':''}>No — see Orientation</option></select>`)}<div data-tp-lifter>${field('Lifter?',`<select name="lifter"><option value="no" ${!item.lifter?'selected':''}>No</option><option value="yes" ${item.lifter?'selected':''}>Yes</option></select>`)}</div><p class="hint" data-tp-case-metrics>${caseMetrics(item)}</p><details class="tpPositionDetails"><summary>Position from rear-left floor</summary><div class="tpPositionFields">${['x','y','z'].map((k,i)=>field(['X — across width','Y — into trailer','Z — height'][i],input(k,length(item[k])))).join('')}</div></details><div class="tpActions">${!item.packed?'<button class="btn" type="submit" name="intent" value="pack">Pack at Position</button>':''}${item.packed?button('unpack','Move to Waiting'):''}${button('remove-item','Remove')}</div>${editActions()}</form>`;
    bindDetailsForm(pane.querySelector('form'));
    callbacks.styleColours?.(pane);
  }
  function renderGroupInspector(pane,items){
    const common=key=>items.every(item=>item[key]===items[0][key])?items[0][key]:'',values=Object.fromEntries(['department','colour','colour2','colour3','lifter','rideOnWheels','orientation'].map(key=>[key,common(key)]));
    pane.innerHTML=`<form data-tp-group-form><div class="tpInspectorHead"><h3>${items.length} Cases Selected</h3></div><p class="hint">Only fields you change apply to all selected cases. Blank mixed fields stay unchanged unless edited.</p>${field('Department',input('department',values.department))}${caseColourFields(values)}${orientationControl(T.orientation(items[0]),!items.every(i=>T.orientation(i)===T.orientation(items[0])))}${field('Ride on Wheels',`<select name="rideOnWheels">${values.rideOnWheels===''?'<option value="" selected>Mixed — leave unchanged</option>':''}<option value="yes" ${values.rideOnWheels===true?'selected':''}>Yes</option><option value="no" ${values.rideOnWheels===false?'selected':''}>No — see Orientation</option></select>`)}${field('Lifter?',`<select name="lifter">${values.lifter===''?'<option value="" selected>Mixed — leave unchanged</option>':''}<option value="no" ${values.lifter===false?'selected':''}>No</option><option value="yes" ${values.lifter===true?'selected':''}>Yes</option></select>`)}<ul class="tpSelectionList">${items.map(item=>`<li>${esc(T.definition(state(),item).name)}</li>`).join('')}</ul><div class="tpActions">${items.some(item=>item.packed)?button('unpack','Move to Waiting'):''}${button('remove-item','Remove')}</div>${editActions()}</form>`;
    bindDetailsForm(pane.querySelector('form'),true);callbacks.styleColours?.(pane);
  }
  function applySelectedDetails(form,auto=false){
    const changes={};for(const input of form.querySelectorAll('[data-tp-changed="true"]')){
      if(!['department','colour','colour2','colour3','lifter','rideOnWheels','orientation'].includes(input.name))continue;
      if(input.name==='orientation'){if(input.value)changes.orientation=input.value;continue}
      if(['lifter','rideOnWheels'].includes(input.name)){if(!input.value)continue;if(!['yes','no'].includes(input.value)){notify('Choose Yes or No for '+(input.name==='lifter'?'Lifter.':'Ride on Wheels.'),true);return}changes[input.name]=input.value==='yes';continue}
      const raw=input.value.trim(),value=input.name==='department'?raw:raw?callbacks.colourHex(raw):'';
      if(input.name!=='department'&&raw&&!value){notify('Enter a valid colour or leave it blank.',true);return}changes[input.name]=value;
    }
    if(!Object.keys(changes).length){notify('No details changed.');return true}
    const {orientation,...fields}=changes,ids=new Set(selectionIds());return detailsTransaction(next=>{for(const item of next.trucks.find(t=>t.id===next.activeTruckId).items)if(ids.has(item.id)){const previous=T.orientation(item);Object.assign(item,fields);if(orientation)T.orientItem(item,orientation,previous);else if('rideOnWheels' in changes)T.orientItem(item,changes.rideOnWheels?'wheels':'tipped',previous)}},!auto);
  }
  function deleteInventory(all,id){
    const ids=all?state().cases.map(c=>c.id):[id];if(!ids.length)return;
    if(!confirm(all?'Delete all inventory cases and all their copies from every truck? Trucks will be kept.':'Delete this inventory case and every copy from all trucks? Any cases it supports will move to Waiting.'))return;
    let result;if(transaction(next=>{result=T.removeInventoryCases(next,ids)}))notify(result.inventory+' inventory cases and '+result.removed+' truck cases deleted.'+(result.waiting?' '+result.waiting+' unsupported cases moved to Waiting.':''));
  }
  function detailsTransaction(change,refresh=true){
    const pane=host?.querySelector('.tpInspector'),top=pane?.scrollTop||0,left=pane?.scrollLeft||0,expanded=pane?.querySelector?.('.tpPositionDetails')?.open;
    if(!transaction(change,false))return false;notify('');
    if(refresh)renderInspector();const summary=host?.querySelector('.tpLoadSummary');if(summary)summary.outerHTML=loadSummaryMarkup(state(),truck());const current=host?.querySelector('.tpInspector'),position=current?.querySelector?.('.tpPositionDetails');if(position)position.open=!!expanded;const metrics=current?.querySelector?.('[data-tp-case-metrics]'),item=truck()?.items.find(i=>i.id===selected);if(metrics&&item)metrics.innerHTML=caseMetrics(item);if(current){callbacks.styleColours?.(current);current.scrollTop=top;current.scrollLeft=left}renderScenes();return true;
  }
  function applyItem(form,pack=false,auto=false){
    const values=new FormData(form);return detailsTransaction(next=>{const t=next.trucks.find(t=>t.id===state().activeTruckId),index=t.items.findIndex(i=>i.id===selected),original=t.items[index],candidate={...original,name:String(values.get('name')).trim(),department:String(values.get('department')).trim(),...readCaseColours(values),rideOnWheels:values.get('rideOnWheels')==='yes',lifter:values.get('lifter')==='yes',rotation:original.rotation,x:T.parseLength(values.get('x'),true),y:T.parseLength(values.get('y'),true),z:T.parseLength(values.get('z'),true)};
      if(values.get('orientation'))T.orientItem(candidate,values.get('orientation'),T.orientation(original));else if(candidate.rideOnWheels!==original.rideOnWheels)T.orientItem(candidate,candidate.rideOnWheels?'wheels':'tipped',T.orientation(original));
      if(!pack&&(!original.packed||['x','y','z','rotation','rideOnWheels','orientation'].every(key=>candidate[key]===original[key]))){t.items[index]=candidate;return}
      const placed=T.placement(next,t,candidate,candidate,false);if(placed.error)throw Error(placed.error);t.items[index]=placed.item;
    },!auto);
  }
  function click(event){
    const target=event.target.closest('[data-tp-action]');if(!target||!host.contains(target))return;const action=target.dataset.tpAction;
    if(action==='undo'||action==='redo'){restoreHistory(action==='redo');return}
    if(action==='measurements'){showMeasurements=!showMeasurements;render();return}
    if(['duplicate-row','rotate-selection','move-truck'].includes(action)){editSelection(action);return}
    if(action==='pack'||action==='cases'){setTab(action);render();return}
    if(action==='remap-dimensions'){dimensionMappingDialog();return}if(action==='new-case'){caseDialog();return}if(action==='import'){importDialog();return}
    if(action==='new-truck'||action==='edit-truck'){truckDialog(action==='edit-truck'?truck():null);return}
    if(action==='delete-case'||action==='delete-all-cases'){deleteInventory(action==='delete-all-cases',target.dataset.caseId);return}
    if(action==='delete-truck'){if(confirm('Delete this truck and its pack? Inventory cases will remain.'))transaction(next=>{next.trucks=next.trucks.filter(t=>t.id!==next.activeTruckId)});return}
    if(action==='add-case'){addCaseDialog();return}
    if(action==='snap-grid'){transaction(next=>{const t=next.trucks.find(t=>t.id===next.activeTruckId);t.snapToGrid=!t.snapToGrid});return}
    if(action==='truck'){if(!state().trucks.some(t=>t.id===target.dataset.truckId))return;state().activeTruckId=target.dataset.truckId;selected='';selectedGroup=[];save();render();return}
    if(action==='tool'){const index=Number(target.dataset.view),panel=target.dataset.panel===undefined?null:Number(target.dataset.panel),v=sceneCamera(index,panel),tool=target.dataset.tool;if(!v||!['select','pan','rotate'].includes(tool)||tool==='rotate'&&state().layout===1)return;cancelDrag();selected='';selectedGroup=[];if(tool==='rotate')prepareOrbit(v,panelViewport(index,panel),panel!==null);v.tool=tool;save();render();return}
    if(action==='unpack'||action==='remove-item'){const ids=new Set(selectionIds());transaction(next=>{const t=next.trucks.find(t=>t.id===next.activeTruckId);if(action==='remove-item')t.items=t.items.filter(i=>!ids.has(i.id));else for(const item of t.items)if(ids.has(item.id))Object.assign(item,{packed:false,x:0,y:0,z:0})});return}
    if(['fit','zoom-in','zoom-out'].includes(action)){const v=sceneCamera(Number(target.dataset.view));if(action==='fit'){if(v.mode==='sides')v.sideViews.forEach((side,panel)=>{side.panX=0;side.panY=0;side.zoom=1;if(side.mode==='orbit'){const area=panelViewport(Number(target.dataset.view),panel);side.orbitScale=fit3DView(truck(),side,area).scale/Math.min(area.width,area.height)}});v.panX=0;v.panY=0;if(v.mode==='orbit')v.orbitScale=fit3DView(truck(),v,sceneViewport(Number(target.dataset.view))).scale/Math.min(sceneViewport(Number(target.dataset.view)).width,sceneViewport(Number(target.dataset.view)).height)}v.zoom=action==='fit'?1:Math.max(.25,Math.min(8,v.zoom*(action==='zoom-in'?1.25:.8)));save();renderScenes()}
  }
  function change(event){
    const el=event.target;
    if(el.matches('[data-tp-layout]')){const previous=state().layout;state().layout=Number(el.value);if(state().layout===2&&previous!==2)['sides','top'].forEach((mode,i)=>state().views[i]=T.view({mode,yaw:T.cameras[mode][0],pitch:T.cameras[mode][1]},i));if(state().layout===1)state().views[0]=T.view({...state().views[0],mode:'plan',yaw:T.cameras.plan[0],pitch:T.cameras.plan[1],tool:'select'});save();render();return}
    if(el.matches('[data-tp-perspective]')){setView(Number(el.dataset.tpPerspective),el.value);return}
    if(el.matches('[data-tp-select]')){select(el.value);return}
    const row=el.closest('[data-tp-case]');if(!row)return;
    const prior=state().cases.find(c=>c.id===row.dataset.tpCase),key=el.name;
    const ok=transaction(next=>{const c=next.cases.find(c=>c.id===prior.id);c[key]=inventoryFieldValue(el)},false);
    if(!ok){if(el.type==='checkbox')el.checked=prior[key];else el.value=['width','length','height','casterHeight'].includes(key)?length(prior[key]):key==='weight'?weight(prior[key]):prior[key];return}
    const updated=state().cases.find(c=>c.id===prior.id);if(['width','length','height','casterHeight'].includes(key))el.value=length(updated[key]);if(key==='weight')el.value=weight(updated[key]);notify('Case saved.');filterInventory();
  }
  function setView(index,mode,panel=null){if([0,1].includes(panel)&&sceneCamera(index).mode==='sides'){const v=sceneCamera(index,panel);sceneCamera(index).sideViews[panel]=T.view({...v,mode,yaw:T.cameras[mode]?.[0]??v.yaw,pitch:T.cameras[mode]?.[1]??v.pitch});save();render();return}if(['left','right'].includes(mode))mode='sides';if(state().layout===1)mode='plan';else if(state().layout===2&&mode==='plan')mode='top';index=index===4?0:index;const old=sceneCamera(index);state().views[index]=T.view({...old,mode,yaw:T.cameras[mode]?.[0]??old.yaw,pitch:T.cameras[mode]?.[1]??old.pitch},index);if(mode==='orbit'){delete state().views[index].orbitScale;prepareOrbit(state().views[index],sceneViewport(index))}save();render()}
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
    const modal=showDialog('Add cases to '+active.name,`<label class="tpField"><span>Find cases</span><input type="search" data-tp-case-search placeholder="Search cases"></label><p class="hint">${active.snapToGrid?'New cases fill from the front on the four-column grid. Cases without space stay in Waiting.':'Enter quantities for the cases to add to Waiting.'}</p><div class="tpAddCaseList">${rows||'<p>No cases in inventory. Add or import cases in Cases first.</p>'}</div>`,form=>{
      const f=new FormData(form),next=JSON.parse(JSON.stringify(state()));let count=0,packed=0;
      for(const c of next.cases){const raw=String(f.get('quantity_'+c.id)||'').trim();if(!raw||Number(raw)===0)continue;const quantity=Number(raw);if(!Number.isInteger(quantity)||quantity<0)throw Error('Enter a whole quantity for '+c.name+'.');const added=T.addItems(next,active.id,c.id,quantity);count+=added.length;packed+=added.filter(item=>item.packed).length}
      if(!count)throw Error('Enter a quantity for at least one case.');replace(next);selected='';selectedGroup=[];closeDialog();message=active.snapToGrid?packed+' cases packed from the front; '+(count-packed)+' added to Waiting.':count+' cases added to Waiting.';render();
    });
    modal.querySelector('[type="submit"]').textContent='Add cases';
    modal.querySelector('[data-tp-case-search]').oninput=event=>{const query=event.target.value.trim().toLowerCase();modal.querySelectorAll('[data-case-search]').forEach(row=>{row.hidden=!row.dataset.caseSearch.includes(query)})};
  }
  function dimensionMappingDialog(){
    if(!state().cases.length)return;const keys=['width','length','height'],labels={width:'Width (W)',length:'Length (L)',height:'Height (H)'},controls=keys.map(key=>field('New '+labels[key],`<select name="${key}">${keys.map(source=>`<option value="${source}" ${source===key?'selected':''}>Current ${labels[source]}</option>`).join('')}</select>`)).join('');
    const modal=showDialog('Reassign case dimensions',`<p>Applies to all ${state().cases.length} inventory cases, including their copies in trucks. Positions and wheel-height settings stay unchanged.</p><div class="tpFormGrid">${controls}</div><div class="tpImportPreview" data-tp-dimension-preview></div>`,form=>{
      const f=new FormData(form),mapping=Object.fromEntries(keys.map(key=>[key,f.get(key)])),next=T.reassignDimensions(state(),mapping);replace(next);closeDialog();message='Case dimensions reassigned.';render();
    });
    modal.querySelector('[type="submit"]').textContent='Apply to all cases';
    const draw=()=>{const mapping=Object.fromEntries(keys.map(key=>[key,modal.querySelector(`[name="${key}"]`).value]));modal.querySelector('[data-tp-dimension-preview]').innerHTML=`<table><thead><tr><th>Case</th>${keys.map(key=>`<th>${labels[key]}: before → after</th>`).join('')}</tr></thead><tbody>${state().cases.slice(0,5).map(c=>`<tr><td>${esc(c.name)}</td>${keys.map(key=>`<td>${esc(length(c[key]))} → ${esc(length(c[mapping[key]]))}</td>`).join('')}</tr>`).join('')}</tbody></table>`};
    for(const key of keys)modal.querySelector(`[name="${key}"]`).onchange=draw;draw();
  }
  function caseDialog(){
    const defaultUnit=manualDimensionUnit||(unit().measurement==='imperial'?'in':'mm');
    const markup=`<div class="tpFormGrid">${field('Name',input('name','','text','required'))}${field('Type',input('type','Case','text','list="tpDialogTypes"'))}<datalist id="tpDialogTypes"><option value="Case"><option value="Truss"><option value="Pallet"></datalist>${field('Dimension units',`<select name="dimensionUnit">${[['mm','Millimetres (mm)'],['cm','Centimetres (cm)'],['m','Metres (m)'],['ft','Feet (ft)'],['in','Inches (in)']].map(([value,label])=>`<option value="${value}" ${value===defaultUnit?'selected':''}>${label}</option>`).join('')}</select>`)}<p class="hint tpFull">Numbers use the selected units. Values with their own units keep them.</p>${['width','length','height'].map(k=>field({width:'W',length:'L',height:'H'}[k],input(k,'','text','required'))).join('')}${field('Height Inc Wheels?',`<select name="heightIncludesWheels"><option value="yes">Yes</option><option value="no">No</option></select>`)}${field('Castor Height',input('casterHeight','','text','placeholder="Required when excluded from H"'))}${field('Weight',input('weight','','text',`placeholder="${unit().weight}"`))}${field('Department',input('department'))}</div>`;
    showDialog('Add Case / Truss',markup,form=>{const f=new FormData(form),dimensionUnit=f.get('dimensionUnit')||defaultUnit,dimension=(key,zero=false)=>T.parseImportLength(f.get(key),dimensionUnit,zero),record=T.normaliseCase({id:T.id('case'),name:f.get('name'),type:f.get('type'),width:dimension('width'),length:dimension('length'),height:dimension('height'),heightIncludesWheels:f.get('heightIncludesWheels')==='yes',casterHeight:f.get('casterHeight')?dimension('casterHeight',true):null,weight:T.parseWeight(f.get('weight'),unit().weight,true),department:f.get('department')});const next=JSON.parse(JSON.stringify(state()));next.cases.push(record);replace(next);manualDimensionUnit=dimensionUnit;closeDialog();render()});
  }
  function truckDialog(existing){
    const initial=existing||{...T.presets[0],name:'Truck '+(state().trucks.length+1),preset:T.presets[0].id};
    const markup=`<div class="tpFormGrid">${field('Trailer Size',`<select name="preset">${T.presets.map(p=>`<option value="${p.id}" ${initial.preset===p.id?'selected':''}>${p.name}</option>`).join('')}<option value="custom" ${initial.preset==='custom'?'selected':''}>Custom</option></select>`)}<p class="hint tpFull">Presets: <a href="${T.source.url}" target="_blank" rel="noopener noreferrer">Stagetruck fleet</a>. Check your actual internal clear dimensions and payload. Rulers use these internal dimensions.</p>${['width','length','height'].map(k=>field('Internal '+k,input(k,length(initial[k]),'text','required'))).join('')}${field('Max Payload',input('payload',weight(initial.payload),'text','placeholder="Unknown — enter confirmed payload"'))}<p class="hint tpFull" data-preset-note>${esc(T.presets.find(p=>p.id===initial.preset)?.note||'')}</p>${[['company','Trucking Company'],['name','Trailer Name/Number'],['registration','Trailer Reg'],['driver','Driver Name'],['email','Driver E-mail'],['phone','Driver Phone']].map(([k,label])=>field(label,input(k,initial[k]||'',k==='email'?'email':k==='phone'?'tel':'text',k==='name'?'required':''))).join('')}</div>`;
    const modal=showDialog(existing?'Truck Details':'Add Truck',markup,form=>{const f=new FormData(form),record={id:existing?.id||T.id('truck'),items:existing?.items||[],snapToGrid:existing?.snapToGrid===true,preset:f.get('preset'),width:T.parseLength(f.get('width')),length:T.parseLength(f.get('length')),height:T.parseLength(f.get('height')),payload:T.parseWeight(f.get('payload'),unit().weight,true)};for(const key of ['company','name','registration','driver','email','phone'])record[key]=f.get(key);const next=JSON.parse(JSON.stringify(state()));if(existing)next.trucks[next.trucks.findIndex(t=>t.id===existing.id)]=record;else next.trucks.push(record);next.activeTruckId=record.id;replace(next);closeDialog();selected='';selectedGroup=[];render()});
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
  function staging(active){
    const data=state(),key=JSON.stringify([active,active.items.map(item=>T.dimensions(data,item))]);
    if(staging.cache?.key===key)return staging.cache.map;
    const trial={...active,items:active.items.filter(item=>item.packed).map(item=>({...item}))},map=new Map(),parked=[];
    for(const item of active.items.filter(item=>!item.packed)){
      const d=T.dimensions(data,item);let target=T.firstGridPosition(data,trial,item);
      if(!target&&item.lifter){
        const supports=[...trial.items].sort((a,b)=>(b.y+T.dimensions(data,b).length)-(a.y+T.dimensions(data,a).length)||a.x-b.x);
        for(const support of supports){const size=T.dimensions(data,support),position={x:support.x,y:support.y+size.length-d.length,z:support.z+size.height},result=T.placement(data,trial,item,position,false);if(!result.error){target=result.item;break}}
      }
      if(target)trial.items.push({...item,...target,packed:true});
      // Keep the queue outside the truck, at its predicted loading row. Reserve
      // each predicted space for the next case without changing saved placements.
      const position={x:active.width+150,y:target?.y??0,z:0};
      for(const other of parked)if(position.y<other.y+other.length&&position.y+d.length>other.y&&position.x<other.x+other.width+150)position.x=other.x+other.width+150;
      parked.push({...position,...d});map.set(item.id,position);
    }
    staging.cache={key,map};return map;
  }
  function sceneViewport(index){
    const rect=host?.querySelector(`[data-tp-scene="${index}"]`)?.getBoundingClientRect?.();
    return rect?.width>0&&rect?.height>0?{width:rect.width,height:rect.height}:{width:900,height:600};
  }
  function fit3DBounds(active,point,v={}){
    const ps=corners({x:0,y:0,z:0,width:active.width,length:active.length,height:active.height}).map(point),add=(x,y)=>ps.push({x,y});
    for(const p of trailerCaptions(active,point)){const angle=(p.angle||0)*Math.PI/180,w=p.text.length*7.2/2+2,h=9,dx=Math.abs(Math.cos(angle))*w+Math.abs(Math.sin(angle))*h,dy=Math.abs(Math.sin(angle))*w+Math.abs(Math.cos(angle))*h;add(p.x-dx,p.y-dy);add(p.x+dx,p.y+dy)}
    for(const ruler of showMeasurements?trailerRulers(active,point,v):[]){const {a,b,nx,ny,size}=ruler,width=Math.max(24,length(size).length*6),left=nx<-.25?-width:nx>.25?0:-width/2;
      for(const p of [a,b]){add(p.x+nx*14,p.y+ny*14);add(p.x+nx*20,p.y+ny*20);add(p.x+nx*26+left-2,p.y+ny*26-9);add(p.x+nx*26+left+width+2,p.y+ny*26+7)}
    }
    return {left:Math.min(...ps.map(p=>p.x)),right:Math.max(...ps.map(p=>p.x)),top:Math.min(...ps.map(p=>p.y)),bottom:Math.max(...ps.map(p=>p.y))};
  }
  function fit3DView(active,v,viewport){
    const area={left:12,right:viewport.width-12,top:54,bottom:viewport.height-28},width=Math.max(1,area.right-area.left),height=Math.max(1,area.bottom-area.top),world=corners({x:0,y:0,z:0,width:active.width,length:active.length,height:active.height}).map(p=>T.project(p,v)),spanX=Math.max(...world.map(p=>p.x))-Math.min(...world.map(p=>p.x)),spanY=Math.max(...world.map(p=>p.y))-Math.min(...world.map(p=>p.y));
    const at=scale=>p=>{const q=T.project(p,v);return {...q,x:q.x*scale,y:q.y*scale}};
    const pivot=v.mode==='orbit'?T.project({x:active.width/2,y:active.length/2,z:active.height/2},v):null;
    let low=0,high=Math.min(width/Math.max(1,spanX),height/Math.max(1,spanY));
    for(let n=0;n<18;n++){const mid=(low+high)/2,b=fit3DBounds(active,at(mid),v);const fits=pivot?b.left-pivot.x*mid+viewport.width/2>=area.left&&b.right-pivot.x*mid+viewport.width/2<=area.right&&b.top-pivot.y*mid+viewport.height/2>=area.top&&b.bottom-pivot.y*mid+viewport.height/2<=area.bottom:b.right-b.left<=width&&b.bottom-b.top<=height;if(fits)low=mid;else high=mid}
    const scale=Math.max(.000001,low),bounds=fit3DBounds(active,at(scale),v);return {scale,centerX:pivot?.x??(bounds.left+bounds.right)/2/scale,centerY:pivot?.y??(bounds.top+bounds.bottom)/2/scale,screenX:pivot?viewport.width/2:(area.left+area.right)/2,screenY:pivot?viewport.height/2:(area.top+area.bottom)/2};
  }
  function prepareOrbit(v,viewport,contained=false){
    const keepScale=v.mode==='orbit'&&Number.isFinite(v.orbitScale)&&v.orbitScale>0;
    if(['top','plan'].includes(v.mode)||v.pitch>=89){v.yaw=-35;v.pitch=60}else if(v.mode==='sides'){v.yaw=-90;v.pitch=25}
    v.mode='orbit';v.panX=0;v.panY=0;if(!keepScale)v.orbitScale=fit3DView(truck(),v,viewport).scale/Math.min(viewport.width,viewport.height);if(contained&&!keepScale){const t=truck(),scale=Math.max(1,Math.min(viewport.width-160,viewport.height-100))/Math.hypot(t.width,t.length,t.height);v.orbitScale=Math.min(v.orbitScale,scale/Math.min(viewport.width,viewport.height))}
  }
  function boundedPan(value,min,max){return min<=max?Math.max(min,Math.min(max,value)):(min+max)/2}
  function groupedScene(index,active,all,v,waiting,viewport){
    const top=v.mode==='top',gap=18,rects=top?[{x:0,y:22,width:(viewport.width-gap)/2,height:viewport.height-22},{x:(viewport.width+gap)/2,y:22,width:(viewport.width-gap)/2,height:viewport.height-22}]:[{x:0,y:22,width:viewport.width,height:(viewport.height-gap)/2-22},{x:0,y:(viewport.height+gap)/2+22,width:viewport.width,height:(viewport.height-gap)/2-22}],cameras=top?[{...v,mode:'top',yaw:0,pitch:90},{...v,mode:'top',yaw:0,pitch:90}]:v.sideViews.map(side=>({...side,zoom:side.zoom*v.zoom})),fits=cameras.map((camera,i)=>fit3DView(active,camera,rects[i])),sharedScale=Math.min(...fits.map(f=>f.scale))*v.zoom;
    const projections=rects.map((rect,panel)=>{
      const camera=cameras[panel],fit=fits[panel],scale=top?sharedScale:(camera.mode==='orbit'&&camera.orbitScale?Math.min(rect.width,rect.height)*camera.orbitScale:fit.scale)*camera.zoom,pivot=camera.mode==='orbit'?T.project({x:active.width/2,y:active.length/2,z:active.height/2},camera):null,centerX=pivot?.x??fit.centerX,centerY=pivot?.y??fit.centerY,screenX=pivot?rect.width/2:fit.screenX,screenY=pivot?rect.height/2:fit.screenY;
      const origin=p=>{const q=T.project(p,camera);return {...q,x:q.x*scale+rect.x+screenX-centerX*scale,y:q.y*scale+rect.y+screenY-centerY*scale}},bounds=fit3DBounds(active,origin,camera),panLimits={minX:rect.x+8-bounds.left,maxX:rect.x+rect.width-8-bounds.right,minY:rect.y+8-bounds.top,maxY:rect.y+rect.height-8-bounds.bottom};
      return {rect,camera,scale,origin,panLimits};
    });
    const panLimits=top?{minX:Math.max(...projections.map(p=>p.panLimits.minX)),maxX:Math.min(...projections.map(p=>p.panLimits.maxX)),minY:Math.max(...projections.map(p=>p.panLimits.minY)),maxY:Math.min(...projections.map(p=>p.panLimits.maxY))}:null;
    const panels=projections.map(({rect,camera,scale,origin,panLimits:ownLimits},panel)=>{
      const limits=panLimits||ownLimits,panX=boundedPan(camera.panX||0,limits.minX,limits.maxX),panY=boundedPan(camera.panY||0,limits.minY,limits.maxY),point=p=>{const q=origin(p);return {...q,x:q.x+panX,y:q.y+panY}},visible=top?all.filter(({item,position})=>{
        if(drag?.type==='case'&&drag.index===index&&(drag.id===item.id||drag.items?.some(i=>i.id===item.id)))return drag.panel===panel;
        const raised=item.packed&&position.z>T.EPS;return panel===1?raised:!raised;
      }):all;
      const frozen=drag?.type==='case'&&drag.index===index&&drag.panel===panel?drag.projection:null,result=renderSceneData(active,visible,camera,frozen?.point||point,frozen?.scale||scale,waiting,index+'p'+panel),title=top?(panel?'Top row — Lifters':'Bottom row'):(panel?'Right side':'Left side');
      return {...result,rect,panel,title,viewport,panLimits:limits,hitBoxes:result.hitBoxes.map(box=>({...box,left:Math.max(rect.x,box.left),right:Math.min(rect.x+rect.width,box.right),top:Math.max(rect.y,box.top),bottom:Math.min(rect.y+rect.height,box.bottom)})).filter(b=>b.left<=b.right&&b.top<=b.bottom)};
    });
    let markup=panels.map(p=>{const id='tp-panel-'+index+'-'+p.panel,r=p.rect;return `<defs><clipPath id="${id}"><rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}"/></clipPath></defs><text x="${r.x+r.width/2}" y="${r.y-5}" class="tpSceneCaption tpPanelTitle" pointer-events="none">${p.title}</text><g data-tp-panel="${p.panel}" data-tool="${p.camera.tool||'select'}" clip-path="url(#${id})"><rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="transparent"/>${p.markup}</g>`}).join('');
    if(!top)markup+=`<line class="tpSideDivider" x1="8" y1="${viewport.height/2}" x2="${viewport.width-8}" y2="${viewport.height/2}" pointer-events="none"/>`;
    if(drag?.type==='marquee'&&drag.index===index&&drag.current){const r=selectionRect(drag.start,drag.current);markup+=`<rect class="tpSelectionBox" x="${r.left}" y="${r.top}" width="${r.right-r.left}" height="${r.bottom-r.top}" pointer-events="none"/>`}
    return {...panels[0],markup,panels,viewport,index,panLimits,hitBoxes:panels.flatMap(p=>p.hitBoxes)};
  }
  function scene(index){
    const active=truck(),v=sceneCamera(index),waiting=staging(active),all=active.items.map(item=>({item,position:item.packed?item:waiting.get(item.id)}));
    if(drag?.type==='case'){const previews=new Map((drag.previewItems||(drag.preview?[{...drag.preview,id:drag.id}]:[])).map(item=>[item.id,item]));for(const entry of all){const preview=previews.get(entry.item.id);if(preview){entry.position=preview;entry.item={...entry.item,...preview,packed:!drag.unpacked}}}}
    const layered=state().layout===1&&v.mode==='plan',visible=layered?all.filter(({item,position})=>{
      if(drag?.type==='case'&&drag.index===index&&(drag.id===item.id||drag.items?.some(i=>i.id===item.id)))return true;
      const raised=item.packed&&position.z>T.EPS;return index===4?raised:!raised;
    }):all;
    const viewport=sceneViewport(index);if(['top','sides'].includes(v.mode))return groupedScene(index,active,all,v,waiting,viewport);const trailer={x:0,y:0,z:0,width:active.width,length:active.length,height:active.height},projected=corners(trailer).map(p=>T.project(p,v));
    let minX=Math.min(...projected.map(p=>p.x)),maxX=Math.max(...projected.map(p=>p.x)),minY=Math.min(...projected.map(p=>p.y)),maxY=Math.max(...projected.map(p=>p.y));
    const marginX=showMeasurements?Math.min(72,viewport.width*.22):Math.min(30,viewport.width*.08),marginY=Math.min(70,viewport.height*.15),planFit=Math.min((viewport.width-2*marginX)/Math.max(1,maxX-minX),(viewport.height-2*marginY)/Math.max(1,maxY-minY));
    let fit=v.mode==='plan'?{scale:planFit,centerX:(minX+maxX)/2,centerY:(minY+maxY)/2,screenX:viewport.width/2,screenY:viewport.height/2}:v.mode==='orbit'&&v.orbitScale?{scale:Math.min(viewport.width,viewport.height)*v.orbitScale}:fit3DView(active,v,viewport);if(v.mode==='orbit'){const center=T.project({x:active.width/2,y:active.length/2,z:active.height/2},v);fit={...fit,scale:v.orbitScale?Math.min(viewport.width,viewport.height)*v.orbitScale:fit.scale,centerX:center.x,centerY:center.y,screenX:viewport.width/2,screenY:viewport.height/2}}const scale=fit.scale*v.zoom,offsetX=fit.screenX-fit.centerX*scale+(v.panX||0),offsetY=fit.screenY-fit.centerY*scale+(v.panY||0),point=p=>{const q=T.project(p,v);return {...q,x:q.x*scale+offsetX,y:q.y*scale+offsetY}};
    // Hold the projection during dragging so the scene does not move under the pointer.
    const fixed=drag?.type==='case'&&drag.index===index?drag.projection:null;
    if(fixed)return {...renderSceneData(active,visible,v,fixed.point,fixed.scale,waiting,index),viewport:fixed.viewport||viewport};
    return {...renderSceneData(active,visible,v,point,scale,waiting,index),viewport};
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
    const words=String(text).trim().split(/\s+/).filter(Boolean),padding=Math.min(4,width*.06,height*.06),available=width-2*padding;
    const wrap=size=>{const lines=[];let line='';for(const word of words){
      const next=line?line+' '+word:word;
      if(line&&caseTextWidth(next)*size>available){lines.push(line);line=word}else line=next;
    }if(line)lines.push(line);return lines};
    // Fit the longest whole word before wrapping; never break a word into fragments.
    let low=0,high=Math.min(18,(height-2*padding)/1.25,available/Math.max(.01,...words.map(caseTextWidth)));
    for(let i=0;i<14;i++){const size=(low+high)/2,lines=wrap(size);if(lines.length*size*1.25<=height-2*padding)low=size;else high=size}
    const size=low,lines=wrap(size);return {size,lines,padding,width:available,lineHeight:size*1.25};
  }
  function caseFaceFrame(q,local){
    // Fixed face coordinates: 100 drawing units per metre. Neither camera nor zoom
    // affects stripe spacing, label wrapping, font size or the face's reading direction.
    const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),width=distance(local[0],local[1])*.1,height=distance(local[0],local[3])*.1;
    const origin=q[3],u={x:q[2].x-origin.x,y:q[2].y-origin.y},v={x:q[0].x-origin.x,y:q[0].y-origin.y};
    if(!width||!height||Math.abs(u.x*v.y-u.y*v.x)<.05)return null;
    return {width,height,transform:`matrix(${u.x/width} ${u.y/width} ${v.x/height} ${v.y/height} ${origin.x} ${origin.y})`};
  }
  function caseFaceShade(vertices){
    // Fixed world-space lighting gives adjacent faces distinct tones. It does not
    // alter the stored colours or move the face's pattern/text with the camera.
    const a=vertices[0],b=vertices[1],c=vertices[2],u={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z},v={x:c.x-a.x,y:c.y-a.y,z:c.z-a.z},n={x:u.y*v.z-u.z*v.y,y:u.z*v.x-u.x*v.z,z:u.x*v.y-u.y*v.x},size=Math.hypot(n.x,n.y,n.z);
    return size?Math.max(0,Math.min(.36,.18-(.06*n.x+.10*n.y+.18*n.z)/size)):0;
  }
  function caseColourMarkup(item,index,face,frame){
    const presentation=callbacks.colourPresentation([item.colour,item.colour2,item.colour3]),colours=presentation.colours,fillId='tp-colours-'+index+'-'+item.id+'-'+face;
    const band=callbacks.stripeWidth(),edge=.3*96/25.4,patterned=colours.length>1&&frame;
    const defs=patterned?`<defs><pattern id="${fillId}" patternUnits="userSpaceOnUse" width="${colours.length*band}" height="${band}" patternTransform="${frame.transform} rotate(45)">${colours.map((colour,i)=>`<rect x="${i*band}" width="${band}" height="${band}" fill="${colour}"/>`+(colour.toLowerCase()==='#ffffff'?`<rect x="${i*band}" width="${edge}" height="${band}" fill="#000000"/><rect x="${(i+1)*band-edge}" width="${edge}" height="${band}" fill="#000000"/>`:'')).join('')}</pattern></defs>`:'';
    return {...presentation,defs,fill:patterned?'url(#'+fillId+')':colours[0]||'#ffffff'};
  }
  function caseLabelMarkup(name,frame,presentation=callbacks.colourPresentation([]),note=''){
    if(!frame)return '';
    const {width,height,transform}=frame,fit=fitCaseLabel(name,width,note?height*.78:height),noteSize=note?Math.min(fit.size*.7,fitCaseLabel(note,width,height*.2).size):0,block=fit.lines.length*fit.lineHeight+(note?noteSize*1.4:0),start=(height-block)/2+fit.size;
    return `<g transform="${transform}" pointer-events="none"><svg class="tpCaseLabel" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" overflow="hidden"><text text-anchor="middle" font-family="Arial" font-weight="600" font-size="${fit.size}" fill="${presentation.text}" stroke="${presentation.outline}" stroke-width="${presentation.outline==='transparent'?0:Math.min(.5*96/25.4,fit.size*.12)}" paint-order="stroke fill">${fit.lines.map((line,i)=>`<tspan x="${width/2}" y="${start+i*fit.lineHeight}" textLength="${Math.min(fit.width,caseTextWidth(line)*fit.size)}" lengthAdjust="spacingAndGlyphs">${esc(line)}</tspan>`).join('')}${note?`<tspan x="${width/2}" y="${start+(fit.lines.length-1)*fit.lineHeight+fit.size*.3+noteSize}" font-size="${noteSize}">${esc(note)}</tspan>`:''}</text></svg></g>`;
  }
  function gridMarkup(active,point){
    const step=active.width/4,segments=[],line=(x1,y1,x2,y2)=>{const a=point({x:x1,y:y1,z:0}),b=point({x:x2,y:y2,z:0});segments.push(`M${a.x},${a.y}L${b.x},${b.y}`)};
    for(let col=1;col<4;col++)line(col*step,0,col*step,active.length);
    const rows=Math.ceil(active.length/step),stride=Math.max(1,Math.ceil(rows/400));
    for(let row=1;row<rows;row+=stride){const y=active.length-row*step;line(0,y,active.width,y)}
    return `<path class="tpSnapGrid" data-grid-columns="4" d="${segments.join(' ')}" fill="none" stroke="#6a8caf" stroke-width="1" stroke-dasharray="5 4" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
  }
  function renderSceneData(active,all,v,point,scale,waiting,index){
    const tc=corners({x:0,y:0,z:0,width:active.width,length:active.length,height:active.height}).map(point),points=ps=>ps.map(p=>p.x.toFixed(2)+','+p.y.toFixed(2)).join(' '),outline=edges.map(([a,b])=>`M${tc[a].x},${tc[a].y}L${tc[b].x},${tc[b].y}`).join(' ');
    let markup=`<polygon points="${points(tc.slice(0,4))}" fill="#edf0f3" stroke="#526274" stroke-width="2"/><path d="${outline}" stroke="#7f8a99" stroke-width="1.5" fill="none" opacity=".7" pointer-events="none"/>`;
    if(active.snapToGrid)markup+=gridMarkup(active,point);
    if(all.some(entry=>!entry.item.packed)){const p=point({x:active.width+150,y:active.length,z:0});markup+=`<text x="${p.x}" y="${p.y-24}" class="tpSceneCaption">WAITING</text>`}
    const surfaces=[];
    for(const {item,position} of all){const base=T.definition(state(),item),d=T.dimensions(state(),item),b={...d,...position},selectedCase=(drag?.type==='marquee'?drag.ids:selectionIds()).includes(item.id),invalid=drag?.error&&(drag.id===item.id||drag.items?.some(i=>i.id===item.id));
      // Castors and face artwork rotate with the case when it is stood on end.
      const localPoint=p=>{const q=T.casePoint(state(),item,p,base,d);return {x:position.x+q.x,y:position.y+q.y,z:position.z+q.z}};
      const body={x:0,y:0,z:d.caster,width:base.width,length:base.length,height:d.bodyHeight,body:true};
      if(v.mode==='plan'){
        const face={wheels:5,tipped:1,side:4,wheelsUp:0}[T.orientation(item)],vertices=corners(body),local=faces[face].map(i=>vertices[i]),frame=caseFaceFrame(local.map(localPoint).map(point),local),appearance=caseColourMarkup(item,index,face,frame),q=corners(b).slice(4).map(point);
        markup+=appearance.defs;
        surfaces.push({depth:b.z,markup:`<g data-tp-item="${item.id}" tabindex="0" role="button" aria-label="${esc(base.name)}" class="tpCase"><title>${esc(base.name)} — ${item.packed?'Packed':'Waiting'}</title><polygon points="${points(q)}" fill="${invalid?'#ed7b7b':appearance.fill}" stroke="${selectedCase?'#0060d2':'#23384a'}" stroke-width="${selectedCase?4:1.5}"/>${caseLabelMarkup(base.name,frame,appearance,({side:'On-Side',wheelsUp:'Wheels-Up'})[T.orientation(item)]||'')}</g>`});continue;
      }
      const boxes=[body];
      if(!d.truss&&d.caster>0){const w=Math.min(65,base.width*.15),l=Math.min(90,base.length*.15);for(const x of [base.width*.08,base.width*.92-w])for(const y of [base.length*.08,base.length*.92-l]){const radius=Math.min(l*.5,d.caster*.4);boxes.push({x,y,z:0,width:w,length:l,height:d.caster,body:false,wheel:true});boxes.push({x:x+w*.3,y:y+l*.3,z:radius*2,width:w*.4,length:l*.4,height:d.caster-radius*2,body:false})}}
      for(const part of boxes){const mesh=partMesh(part),world=mesh.vertices.map(localPoint),ps=world.map(point);for(let f=0;f<mesh.faces.length;f++){const q=mesh.faces[f].map(i=>ps[i]),area=q.reduce((n,p,i)=>n+p.x*q[(i+1)%q.length].y-q[(i+1)%q.length].x*p.y,0);if(area>=-.1)continue;
        const frame=part.body?caseFaceFrame(q,mesh.faces[f].map(i=>mesh.vertices[i])):null,appearance=part.body?caseColourMarkup(item,index,f,frame):null,depth=q.reduce((n,p)=>n+p.depth,0)/q.length,faceColour=part.body?(invalid?'#ed7b7b':appearance.fill):'#303844',stroke=selectedCase&&part.body?'#0060d2':'#263646';
        if(appearance)markup+=appearance.defs;
        let content=`<polygon points="${points(q)}" fill="#ffffff" stroke="none"/><polygon points="${points(q)}" fill="${faceColour}" fill-opacity="1" stroke="${stroke}" stroke-width="${selectedCase&&part.body?2.8:1}"/>`;
        if(part.body){
          const shade=caseFaceShade(mesh.faces[f].map(i=>world[i]));
          content+=`<polygon class="tpCaseShade" points="${points(q)}" fill="#000000" opacity="${shade.toFixed(3)}" pointer-events="none"/><polygon points="${points(q)}" fill="none" stroke="${stroke}" stroke-width="${selectedCase?2.8:1}" pointer-events="none"/>`;
          content+=caseLabelMarkup(base.name,frame,appearance,({side:'On-Side',wheelsUp:'Wheels-Up'})[T.orientation(item)]||'');
        }
        surfaces.push({depth,markup:`<g data-tp-item="${item.id}" class="tpCase" tabindex="0" role="button" aria-label="${esc(base.name)}"><title>${esc(base.name)}</title>${content}</g>`});
      }}
    }
    markup+=surfaces.sort((a,b)=>a.depth-b.depth).map(f=>f.markup).join('');
    if(showMeasurements)markup+=measurementMarkup(active,all,point,v);markup+=trailerCaptionMarkup(active,point);
    const hitBoxes=all.map(({item,position})=>{const ps=corners({...T.dimensions(state(),item),...position}).map(point);return {id:item.id,left:Math.min(...ps.map(p=>p.x)),right:Math.max(...ps.map(p=>p.x)),top:Math.min(...ps.map(p=>p.y)),bottom:Math.max(...ps.map(p=>p.y))}});
    if(drag?.type==='marquee'&&drag.index===index&&drag.current){const r=selectionRect(drag.start,drag.current);markup+=`<rect class="tpSelectionBox" x="${r.left}" y="${r.top}" width="${r.right-r.left}" height="${r.bottom-r.top}" pointer-events="none"/>`}
    return {markup,point,scale,camera:v,waiting,index,hitBoxes};
  }
  function trailerRuler(active,point,axes=['y','x'],prefer='outside'){
    const dimensions={x:active.width,y:active.length,z:active.height},vertices=[];for(const x of [0,active.width])for(const y of [0,active.length])for(const z of [0,active.height])vertices.push(point({x,y,z}));
    const center={x:vertices.reduce((n,p)=>n+p.x,0)/8,y:vertices.reduce((n,p)=>n+p.y,0)/8};
    for(const axis of axes){const size=dimensions[axis],others=['x','y','z'].filter(k=>k!==axis),candidates=[];
      for(const first of [0,dimensions[others[0]]])for(const second of [0,dimensions[others[1]]]){
        const a=point({[axis]:0,[others[0]]:first,[others[1]]:second}),b=point({[axis]:size,[others[0]]:first,[others[1]]:second}),dx=b.x-a.x,dy=b.y-a.y,span=Math.hypot(dx,dy);if(span<30)continue;
        let nx=-dy/span,ny=dx/span;const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};if(nx*(center.x-mid.x)+ny*(center.y-mid.y)>0){nx=-nx;ny=-ny}
        if(vertices.some(p=>nx*(p.x-a.x)+ny*(p.y-a.y)>.01))continue;candidates.push({a,b,nx,ny,span,size,axis,mid});
      }
      if(candidates.length)return candidates.sort((a,b)=>prefer==='right'?b.mid.x-a.mid.x:Math.abs(a.b.x-a.a.x)>Math.abs(a.b.y-a.a.y)?b.mid.y-a.mid.y:a.mid.x-b.mid.x)[0];
    }return null;
  }
  function trailerRulers(active,point,v={}){return [trailerRuler(active,point),...(['left','right','front','back','sides'].includes(v.mode)?[trailerRuler(active,point,['z'],'right')]:[])].filter(Boolean)}
  function trailerCaptions(active,point){
    const rear=point({x:active.width/2,y:0,z:active.height/2}),front=point({x:active.width/2,y:active.length,z:active.height/2}),dx=front.x-rear.x,dy=front.y-rear.y,span=Math.hypot(dx,dy),vertices=corners({x:0,y:0,z:0,width:active.width,length:active.length,height:active.height}).map(point);
    if(span<1){const frontNear=front.depth>rear.depth,top=Math.min(...vertices.map(p=>p.y)),bottom=Math.max(...vertices.map(p=>p.y)),x=(front.x+rear.x)/2;return [{text:frontNear?'Front':'Rear',x,y:bottom+22,anchor:'middle'},{text:frontNear?'Rear':'Front',x,y:top-22,anchor:'middle'}]}
    return [[front,'Front',1],[rear,'Rear',-1]].map(([p,text,sign])=>{const nx=dx/span*sign,ny=dy/span*sign,beyond=Math.max(...vertices.map(v=>(v.x-p.x)*nx+(v.y-p.y)*ny))+24;let angle=Math.atan2(ny,nx)*180/Math.PI-90;while(angle>90)angle-=180;while(angle< -90)angle+=180;return {text,x:p.x+nx*beyond,y:p.y+ny*beyond,anchor:'middle',angle}});
  }
  function trailerCaptionMarkup(active,point){return `<g class="tpTrailerCaptions" pointer-events="none">${trailerCaptions(active,point).map(p=>`<text transform="translate(${p.x} ${p.y}) rotate(${p.angle||0})" x="0" y="0" text-anchor="middle" dominant-baseline="middle" class="tpSceneCaption">${p.text}</text>`).join('')}</g>`}
  function measurementMarkup(active,all,point,v){
    const segments=[],label=(p,text,anchor='middle')=>`<text x="${p.x}" y="${p.y}" text-anchor="${anchor}">${esc(text)}</text>`,line=(a,b)=>`<path d="M${a.x},${a.y}L${b.x},${b.y}"/>`;
    for(const ruler of trailerRulers(active,point,v)){const {a,b,nx,ny,span,size,axis}=ruler,offset=(p,d)=>({x:p.x+nx*d,y:p.y+ny*d}),start=offset(a,14),end=offset(b,14),step=unit().measurement==='imperial'?2438.4:2500,spacing=Math.max(45,length(size).length*6+12),ticks=[0];
      for(let i=1;i*step<size-T.EPS;i++)ticks.push(i*step);ticks.push(size);
      let lastLabel=0;const tape=[line(start,end)],anchor=nx<-.25?'end':nx>.25?'start':'middle';
      for(const n of ticks){const p={x:a.x+(b.x-a.x)*n/size,y:a.y+(b.y-a.y)*n/size},text=offset(p,26);const showLabel=n===0||n===size||(n-lastLabel)*span/size>=spacing&&(size-n)*span/size>=spacing;tape.push(line(offset(p,14),offset(p,20)).replace('<path',`<path data-tp-tick="${Number(n.toFixed(4))}"`),showLabel?label({x:text.x,y:text.y+3},length(n),anchor):'');if(showLabel)lastLabel=n}
      segments.push(`<g data-tp-ruler="${axis}" data-internal-size="${size}">${tape.join('')}</g>`);
    }
    const ids=selectionIds().filter(id=>all.some(({item})=>item.id===id)),visible=new Map(all.map(({item,position})=>[item.id,{...item,...position}])),preview={...active,items:active.items.map(item=>visible.get(item.id)||item)},m=T.measurements(state(),preview,ids),b=m.bounds;
    if(b&&v.mode==='plan'){
      const mid={x:b.x+b.width/2,y:b.y+b.length/2,z:b.z+b.height};
      for(const [key,a,end] of [
        ['left',{...mid,x:b.x},{...mid,x:b.x-m.left}],['right',{...mid,x:b.x+b.width},{...mid,x:b.x+b.width+m.right}],
        ['rear',{...mid,y:b.y},{...mid,y:b.y-m.rear}],['front',{...mid,y:b.y+b.length},{...mid,y:b.y+b.length+m.front}]
      ]){if(m[key]<=T.EPS)continue;const p=point(a),q=point(end);segments.push(line(p,q),label({x:(p.x+q.x)/2,y:(p.y+q.y)/2-5},length(m[key])))}
    }
    return `<g class="tpMeasureOverlay" pointer-events="none">${segments.join('')}</g>`;
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
  function renderScenes(){if(!host||tab!=='pack'||!truck())return;sceneMaps=[];host.querySelectorAll('[data-tp-scene]').forEach(svg=>{const index=Number(svg.dataset.tpScene),data=scene(index);sceneMaps[index]=data;svg.setAttribute('viewBox',`0 0 ${data.viewport.width} ${data.viewport.height}`);svg.innerHTML=data.markup;const viewport=svg.closest('.tpViewport'),cubes=viewport.querySelectorAll?viewport.querySelectorAll('.tpCube'):[viewport.querySelector('.tpCube')];for(const cube of cubes){const panel=cube.dataset?.panel===undefined?null:Number(cube.dataset.panel),v=sceneCamera(index,panel);cube.hidden=v.mode==='plan';cube.innerHTML=cubeMarkup(v)}})}
  function selectionRect(a,b){return {left:Math.min(a.x,b.x),right:Math.max(a.x,b.x),top:Math.min(a.y,b.y),bottom:Math.max(a.y,b.y)}}
  function casesInSelection(boxes,rect){return boxes.filter(box=>box.left<=rect.right&&box.right>=rect.left&&box.top<=rect.bottom&&box.bottom>=rect.top).map(box=>box.id)}
  function svgPoint(event,svg){const rect=svg.getBoundingClientRect(),box=svg.viewBox?.baseVal,width=box?.width||900,height=box?.height||600,ratio=Math.min(rect.width/width,rect.height/height),left=rect.left+(rect.width-width*ratio)/2,top=rect.top+(rect.height-height*ratio)/2;return {x:(event.clientX-left)/ratio,y:(event.clientY-top)/ratio}}
  function pointerDown(event){
    if(event.button!==0)return;if(tab==='cases'){const handle=event.target.closest('[data-tp-fill]');if(handle)startInventoryFill(event,handle);return}if(tab!=='pack')return;const cube=event.target.closest('[data-tp-cube]'),svg=event.target.closest('[data-tp-scene]');if((cube||svg)&&!commitPendingDetails())return;
    if(cube){const index=Number(cube.dataset.tpCube),panel=cube.dataset.panel===undefined?null:Number(cube.dataset.panel),v=sceneCamera(index,panel),original={...v};prepareOrbit(v,panelViewport(index,panel),panel!==null);drag={type:'orbit',pointerId:event.pointerId,index,panel,model:state(),original,startX:event.clientX,startY:event.clientY,yaw:v.yaw,pitch:v.pitch,face:event.target.closest('[data-tp-cube-face]')?.dataset.tpCubeFace,moved:false};host.setPointerCapture(event.pointerId);event.preventDefault();return}
    if(!svg)return;host.focus?.({preventScroll:true});const index=Number(svg.dataset.tpScene),position=svgPoint(event,svg),viewPanel=sceneCamera(index).mode==='sides'?(position.y<sceneViewport(index).height/2?0:1):null,v=sceneCamera(index,viewPanel),tool=v.tool||'select';
    if(tool==='pan'||tool==='rotate'){if(tool==='rotate'&&v.mode!=='orbit')prepareOrbit(v,panelViewport(index,viewPanel),viewPanel!==null);selected='';selectedGroup=[];renderInspector();renderScenes();drag={type:tool==='pan'?'pan':'orbit',index,panel:viewPanel,model:state(),original:{...v},start:svgPoint(event,svg),startX:event.clientX,startY:event.clientY,yaw:v.yaw,pitch:v.pitch,pointerId:event.pointerId,moved:false};host.setPointerCapture(event.pointerId);event.preventDefault();return}
    const target=event.target.closest('[data-tp-item]');if(!target){const start=svgPoint(event,svg);drag={type:'marquee',index,start,current:start,ids:[],base:event.shiftKey?selectionIds():[],boxes:sceneMaps[index]?.hitBoxes||[],pointerId:event.pointerId,moved:false};host.setPointerCapture(event.pointerId);event.preventDefault();return}const item=truck().items.find(i=>i.id===target.dataset.tpItem);if(!item)return;if(event.shiftKey){const ids=new Set(selectionIds());ids.has(item.id)?ids.delete(item.id):ids.add(item.id);selectedGroup=[...ids];selected=selectedGroup[0]||'';renderInspector();renderScenes();event.preventDefault();return}if(!selectionIds().includes(item.id))selectedGroup=[item.id];selected=item.id;renderInspector();renderScenes();const panel=Number(event.target.closest('[data-tp-panel]')?.dataset.tpPanel||0),projection=sceneMaps[index]?.panels?.[panel]||sceneMaps[index],origin=item.packed?{x:item.x,y:item.y,z:item.z}:projection.waiting.get(item.id),mode=projection.camera.mode,camera=projection.camera,edgeOn=mode==='orbit'&&Math.abs(Math.sin(camera.pitch*Math.PI/180))<.15,plane=['left','right'].includes(mode)?'yz':['front','back'].includes(mode)?'xz':edgeOn?(Math.abs(Math.sin(camera.yaw*Math.PI/180))>Math.abs(Math.cos(camera.yaw*Math.PI/180))?'yz':'xz'):'xy';drag={type:'case',pointerId:event.pointerId,index,panel,id:item.id,item:{...item},start:svgPoint(event,svg),origin:{...origin,...(!item.packed&&plane==='yz'?{x:0}:{}),...(!item.packed&&plane==='xz'?{y:0}:{})},projection,plane,preview:null,error:'',moved:false};if(selectionIds().length>1){const offset={x:drag.origin.x-origin.x,y:drag.origin.y-origin.y,z:0};drag.items=truck().items.filter(i=>selectionIds().includes(i.id)).map(i=>{const p=i.packed?i:projection.waiting.get(i.id);return {...i,x:p.x+offset.x,y:p.y+offset.y,z:p.z}})}host.setPointerCapture(event.pointerId);event.preventDefault();renderScenes();
  }
  function pointerMove(event){
    if(!drag)return;if(drag.type==='inventory-fill'){if(event.pointerId!==drag.pointerId)return;drag.clientY=event.clientY;updateInventoryFill();if(drag.frame===null)inventoryFillScroll();event.preventDefault();return}
    if(drag.type==='marquee'){drag.current=svgPoint(event,host.querySelector(`[data-tp-scene="${drag.index}"]`));if(Math.abs(drag.current.x-drag.start.x)+Math.abs(drag.current.y-drag.start.y)>3)drag.moved=true;drag.ids=[...new Set([...drag.base,...casesInSelection(drag.boxes,selectionRect(drag.start,drag.current))])];renderScenes();return}
    if(drag.type==='pan'){const svg=host.querySelector(`[data-tp-scene="${drag.index}"]`),p=svgPoint(event,svg),v=sceneCamera(drag.index,drag.panel);v.panX=Math.max(-100000,Math.min(100000,(drag.original.panX||0)+p.x-drag.start.x));v.panY=Math.max(-100000,Math.min(100000,(drag.original.panY||0)+p.y-drag.start.y));const limits=sceneMaps[drag.index]?.panels?.[drag.panel]?.panLimits||sceneMaps[drag.index]?.panLimits;if(limits){v.panX=boundedPan(v.panX,limits.minX,limits.maxX);v.panY=boundedPan(v.panY,limits.minY,limits.maxY)}drag.moved=true;renderScenes();return}
    if(drag.type==='orbit'){const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;const v=sceneCamera(drag.index,drag.panel);v.mode='orbit';if(!v.orbitScale)v.orbitScale=fit3DView(truck(),{...v,yaw:drag.yaw,pitch:drag.pitch},panelViewport(drag.index,drag.panel)).scale/Math.min(panelViewport(drag.index,drag.panel).width,panelViewport(drag.index,drag.panel).height);v.yaw=drag.yaw+dx*.65;v.pitch=Math.max(-60,Math.min(89,drag.pitch-dy*.65));renderScenes();return}
    const svg=host.querySelector(`[data-tp-scene="${drag.index}"]`),p=svgPoint(event,svg),dx=(p.x-drag.start.x)/drag.projection.scale,dy=(p.y-drag.start.y)/drag.projection.scale,delta=T.unprojectDelta(dx,dy,drag.projection.camera,drag.plane);if(!delta)return;if(Math.abs(dx)+Math.abs(dy)>5)drag.moved=true;
    const proposed={x:drag.origin.x+delta.x,y:drag.origin.y+delta.y,z:Math.max(0,drag.origin.z+delta.z)},active=truck();
    if(drag.items){
      const dx=proposed.x-drag.origin.x,dy=proposed.y-drag.origin.y,dz=Math.max(proposed.z-drag.origin.z,-Math.min(...drag.items.map(i=>i.z))),moved=drag.items.map(item=>({...item,x:item.x+dx,y:item.y+dy,z:item.z+dz}));
      drag.unpacked=moved.every(item=>item.x>=active.width+100||item.y>=active.length+100||item.x+T.dimensions(state(),item).width<-100);
      if(drag.unpacked){const ids=new Set(drag.items.map(i=>i.id));drag.previewItems=moved.map(item=>({...item,packed:false}));drag.error=T.truckError(state(),{...active,items:active.items.filter(i=>!ids.has(i.id))})}
      else{const result=T.groupPlacement(state(),active,drag.items,drag.id,proposed,drag.plane==='xy');drag.previewItems=result.items||moved;drag.error=result.error}
      notify(drag.error||(drag.unpacked?'Release to move selection to Waiting.':'Release to place selected cases.'),!!drag.error);renderScenes();return;
    }
    if(proposed.x>=active.width+100||proposed.y>=active.length+100||proposed.x+T.dimensions(state(),drag.item).width<-100){drag.preview={...proposed,packed:false};drag.error='';drag.unpacked=true}
    else{drag.unpacked=false;const position=active.snapToGrid?T.snapPosition(state(),active,drag.item,proposed):proposed,result=T.placement(state(),active,drag.item,position,drag.plane==='xy');drag.preview=result.item||position;drag.error=result.error}
    notify(drag.error|| (drag.unpacked?'Release to move to Waiting.':'Release to place case.'),!!drag.error);renderScenes();
  }
  function pointerUp(event){
    if(drag?.type==='inventory-fill'){finishInventoryFill(event);return}if(!drag)return;const current=drag;drag=null;try{host.releasePointerCapture(event.pointerId)}catch{}
    if(current.type==='marquee'){selectedGroup=current.moved?current.ids:current.base;selected=selectedGroup[0]||'';renderInspector();renderScenes();return}
    if(current.type==='pan'){save();render();return}
    if(current.type==='orbit'){if(!current.moved&&current.face)setView(current.index,current.face,current.panel);else{save();render()}return}
    if(!current.moved){renderScenes();return}if(current.error){notify(current.error,true);renderScenes();return}
    if(current.previewItems){const moved=new Map(current.previewItems.map(item=>[item.id,item]));transaction(next=>{const t=next.trucks.find(t=>t.id===next.activeTruckId);t.items=t.items.map(item=>!moved.has(item.id)?item:current.unpacked?{...item,packed:false,x:0,y:0,z:0}:{...item,...moved.get(item.id),packed:true})});return}
    if(current.preview)transaction(next=>{const t=next.trucks.find(t=>t.id===next.activeTruckId),i=t.items.findIndex(i=>i.id===current.id);t.items[i]=current.unpacked?{...t.items[i],packed:false,x:0,y:0,z:0}:{...t.items[i],...current.preview,packed:true}});
  }
  function cancelDrag(){if(drag?.type==='inventory-fill'){if(drag.frame!==null)root.cancelAnimationFrame?.(drag.frame);for(const row of drag.rows){const cell=row.querySelector(`[data-tp-fill-field="${drag.key}"]`);cell?.classList.remove('tpFillSource','tpFillTarget')}}if(['orbit','pan'].includes(drag?.type)&&callbacks&&drag.model===state()){const parent=sceneCamera(drag.index);if(parent.mode==='sides'&&[0,1].includes(drag.panel))parent.sideViews[drag.panel]={...drag.original};else state().views[drag.index===4?0:drag.index]={...drag.original}}const pointerId=drag?.pointerId;drag=null;if(pointerId!==undefined){try{host?.releasePointerCapture(pointerId)}catch{}}}
  root.LampyTruckPackView={mount,destroy,reset,setTab,getTab:()=>tab,labels};
})(globalThis);
