/* Per-cable colour drafts never enter project data before explicit confirmation. */
let loomCableColourEdit=null,loomCableStripeObserver=null;
function loomCableColours(cable){return ['colour1','colour2','colour3'].map(key=>colourTextToHex(cable?.[key]||'','')).filter(Boolean)}
function loomCableRowStyle(cable){const colours=loomCableColours(cable),p=colourSetPresentation(colours);return `--loom-row-background:${powerMultiColourBackground(colours)};--loom-row-text:${p.text};--loom-row-stroke:${p.outline==='transparent'?'0':'.5mm'}`}
function loomBoxItRowMarkup(loom,colspan=5){return String(loom.boxIt||'').trim()?`<tr class="loomEndsTogetherRow loomBoxItRow"><td colspan="${colspan}">Box It: ${escapeHtml(loom.boxIt)}</td></tr>`:''}
function loomCableStripeGeometry(cell){
  const table=cell.closest('table');if(!table)return null;const origin=table.getBoundingClientRect(),box=cell.getBoundingClientRect(),sx=origin.width/(table.offsetWidth||origin.width||1),sy=origin.height/(table.offsetHeight||origin.height||1);
  if(!origin.width||!origin.height)return null;
  return {width:origin.width/sx,height:origin.height/sy,x:(box.left-origin.left)/sx,y:(box.top-origin.top)/sy};
}
function syncLoomCableStripeGeometry(root=document){
  root.querySelectorAll('.loomCableColouredRow>td').forEach(cell=>{const box=loomCableStripeGeometry(cell);if(!box)return;cell.style.setProperty('--loom-stripe-size',`${box.width}px ${box.height}px`);cell.style.setProperty('--loom-stripe-position',`${-box.x}px ${-box.y}px`)});
}
function observeLoomCableStripes(view){
  loomCableStripeObserver?.disconnect();let frame=null;
  const update=()=>{if(frame!==null)cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{frame=null;if(view.isConnected)syncLoomCableStripeGeometry(view)})};
  if(typeof ResizeObserver!=='undefined'){loomCableStripeObserver=new ResizeObserver(update);view.querySelectorAll('[data-loom-table],.loomCableColouredRow').forEach(el=>loomCableStripeObserver.observe(el))}
  update();document.fonts?.ready.then(update);
}
// CSS's 135-degree gradient advances along (x+y)/sqrt(2), from the table origin.
function drawLoomCableStripeCanvas(canvas,colours,scale=1,geometry={x:0,y:0}){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,hexes=[...new Set(colours.map(colour=>colour.toLowerCase()))];ctx.fillStyle=hexes[0]||'#fff';ctx.fillRect(0,0,w,h);if(hexes.length<2)return;
  const band=Math.max(.5,parseFloat($('stripe')?.value||4)||4)*96/25.4*scale*Math.SQRT2,edge=.3*96/25.4*scale*Math.SQRT2,offset=(geometry.x+geometry.y)*scale;
  const paint=(a,b,colour)=>{ctx.fillStyle=colour;ctx.beginPath();ctx.moveTo(a,0);ctx.lineTo(b,0);ctx.lineTo(b-h,h);ctx.lineTo(a-h,h);ctx.closePath();ctx.fill()};
  for(let index=Math.floor(offset/band);index*band<=offset+w+h;index++){const a=index*band-offset,b=a+band,colour=hexes[((index%hexes.length)+hexes.length)%hexes.length];paint(a,b,colour);if(colour==='#ffffff'){paint(a,a+edge,'#000');paint(b-edge,b,'#000')}}
}
function loomColourRange(ids,start,end){const a=ids.indexOf(start),b=ids.indexOf(end);return a<0||b<0?[]:ids.slice(Math.min(a,b),Math.max(a,b)+1)}
function hideLoomCableColourPicker(){loomCableColourEdit?.picker?.remove();if(loomCableColourEdit)loomCableColourEdit.picker=null;hideColourMenu()}
function markLoomCableColourSelection(){const edit=loomCableColourEdit;if(!edit)return;edit.table.querySelectorAll('[data-loom-cable-row]').forEach(row=>{const selected=edit.selected.has(row.dataset.loomCableRow);row.classList.toggle('loomCableColourSelected',selected);row.setAttribute('aria-selected',String(selected))})}
function applyLoomSelectedColour(key,value){
  const edit=loomCableColourEdit;if(!edit||!['colour1','colour2','colour3'].includes(key))return;const colour=colourTextToHex(value,'');edit.selected.forEach(id=>{if(edit.values[id])edit.values[id][key]=colour});
  edit.table.querySelectorAll('[data-loom-cable-row]').forEach(row=>{const values=edit.values[row.dataset.loomCableRow];if(values)row.style.cssText=loomCableRowStyle(values)});syncLoomCableStripeGeometry(edit.table);
}
function showLoomCableColourPicker(){
  const edit=loomCableColourEdit;if(!edit||edit.shift||edit.drag||!edit.selected.size)return;hideLoomCableColourPicker();
  const selected=[...edit.selected].map(id=>edit.values[id]).filter(Boolean),picker=document.createElement('div');picker.className='loomCableColourPicker';picker.setAttribute('role','dialog');picker.setAttribute('aria-label','Selected cable colours');
  picker.innerHTML=`<strong>${selected.length} cable${selected.length===1?'':'s'}</strong><div class="loomCableColourPickerFields">${['colour1','colour2','colour3'].map((key,index)=>{const values=[...new Set(selected.map(value=>value[key]||''))],mixed=values.length>1;return `<label>Col ${index+1}${colourInputControl(`data-loom-cable-colour="${key}" data-allow-blank-colour="1" aria-label="Cable colour ${index+1}${mixed?' (mixed values)':''}"`,mixed?'':values[0],'#fff','color',mixed?'Mixed':'colour',true)}</label>`}).join('')}</div>`;
  document.body.appendChild(picker);edit.picker=picker;styleAllColourInputs(picker);
  picker.querySelectorAll('[data-loom-cable-colour]').forEach(input=>input.addEventListener('input',()=>{applyLoomSelectedColour(input.dataset.loomCableColour,input.value);styleColourTextInput(input)}));
  const box=picker.getBoundingClientRect();picker.style.left=Math.max(8,Math.min(edit.point.x,window.innerWidth-box.width-8))+'px';picker.style.top=Math.max(8,Math.min(edit.point.y+12,window.innerHeight-box.height-8))+'px';
}
function beginLoomCableColours(){
  const loom=loomById(activeLoomEditorId);if(!loom||loomCableColourEdit)return;
  const table=[...document.querySelectorAll('[data-loom-table]')].find(el=>el.dataset.loomTable===loom.id);if(!table)return;
  const rows=[...table.querySelectorAll('tbody tr[data-loom-cable-row]')];
  const edit=loomCableColourEdit={id:loom.id,values:Object.fromEntries(loom.cables.map(c=>[c.id,{colour1:c.colour1||'',colour2:c.colour2||'',colour3:c.colour3||''}])),selected:new Set(),ids:rows.map(row=>row.dataset.loomCableRow),point:{x:8,y:8},shift:false,drag:null,table,cleanup:[],controls:[...table.querySelectorAll('input[data-loom-cell],.loomDeleteCable')].map(control=>({control,disabled:control.disabled})),rows:rows.map(row=>({row,tabindex:row.getAttribute('tabindex'),selected:row.getAttribute('aria-selected')})),collapsed:table.closest('.loomCard')?.classList.contains('loomCardCollapsed')};
  table.closest('.loomCard')?.classList.remove('loomCardCollapsed');table.classList.add('loomColourTarget');edit.controls.forEach(({control})=>control.disabled=true);rows.forEach(row=>row.setAttribute('tabindex','0'));
  const pane=$('loomEditorPane'),rail=document.createElement('div');rail.className='loomColourRail';rail.innerHTML=`<strong>${escapeHtml(loomEditorDraft?.name||loom.name||'Unnamed Loom')}</strong><button class="btn primary" type="button" aria-label="Finish and save cable colours" onclick="finishLoomCableColours(true)">✓</button><button class="btn danger" type="button" aria-label="Cancel cable colours" onclick="finishLoomCableColours(false)">✕</button>`;pane.appendChild(rail);pane.classList.add('loomColourEditing');
  const on=(node,type,fn,options)=>{node.addEventListener(type,fn,options);edit.cleanup.push(()=>node.removeEventListener(type,fn,options))};
  const rowAt=event=>{const row=event.target.closest?.('[data-loom-cable-row]');return row&&table.contains(row)?row:null};
  on(table,'pointerdown',event=>{const row=rowAt(event);if(!row||event.button!==0)return;event.preventDefault();event.stopImmediatePropagation();hideLoomCableColourPicker();edit.shift=event.shiftKey;edit.point={x:event.clientX,y:event.clientY};const id=row.dataset.loomCableRow,base=event.shiftKey?new Set(edit.selected):new Set();edit.drag={start:id,end:id,base,pointer:event.pointerId};edit.selected=new Set([...base,id]);table.setPointerCapture(event.pointerId);markLoomCableColourSelection()},true);
  on(table,'pointermove',event=>{if(!edit.drag)return;edit.point={x:event.clientX,y:event.clientY};const row=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-loom-cable-row]');if(!row||!table.contains(row))return;edit.drag.end=row.dataset.loomCableRow;edit.selected=new Set([...edit.drag.base,...loomColourRange(edit.ids,edit.drag.start,edit.drag.end)]);markLoomCableColourSelection()},true);
  on(table,'pointerup',event=>{if(!edit.drag)return;event.preventDefault();event.stopImmediatePropagation();edit.drag=null;edit.shift=event.shiftKey;if(table.hasPointerCapture(event.pointerId))table.releasePointerCapture(event.pointerId);showLoomCableColourPicker()},true);
  const cancelDrag=()=>{if(!edit.drag)return;edit.selected=new Set(edit.drag.base);edit.drag=null;markLoomCableColourSelection()};on(table,'pointercancel',cancelDrag);on(table,'lostpointercapture',cancelDrag);
  on(table,'click',event=>{if(rowAt(event)){event.preventDefault();event.stopImmediatePropagation()}},true);
  on(table,'focusin',event=>{if(rowAt(event))event.stopImmediatePropagation()},true);
  on(table,'keydown',event=>{const row=rowAt(event);if(!row||!['Enter',' '].includes(event.key))return;event.preventDefault();event.stopImmediatePropagation();const id=row.dataset.loomCableRow;edit.selected=event.shiftKey?new Set([...edit.selected,id]):new Set([id]);edit.shift=event.shiftKey;const box=row.getBoundingClientRect();edit.point={x:box.left,y:box.bottom};markLoomCableColourSelection();showLoomCableColourPicker()},true);
  on(document,'keydown',event=>{if(event.key==='Shift'){edit.shift=true;hideLoomCableColourPicker()}});
  on(document,'keyup',event=>{if(event.key==='Shift'){edit.shift=false;showLoomCableColourPicker()}});
  on(window,'blur',()=>{edit.shift=false;cancelDrag();hideLoomCableColourPicker()});on(window,'resize',hideLoomCableColourPicker);on(document,'scroll',event=>{if(!event.target?.closest?.('.loomCableColourPicker,#colourMenu'))hideLoomCableColourPicker()},true);
  syncLoomCableStripeGeometry(table);
}
function finishLoomCableColours(save=false){
  const edit=loomCableColourEdit;if(!edit)return;hideLoomCableColourPicker();edit.cleanup.forEach(fn=>fn());loomCableColourEdit=null;
  if(edit.drag&&edit.table.hasPointerCapture(edit.drag.pointer))edit.table.releasePointerCapture(edit.drag.pointer);
  const loom=loomById(edit.id);let changed=false;
  if(save&&loom)loom.cables.forEach(cable=>{const values=edit.values[cable.id];if(!values)return;for(const key of ['colour1','colour2','colour3'])if((cable[key]||'')!==values[key]){cable[key]=values[key];changed=true}});
  edit.rows.forEach(({row,tabindex,selected})=>{const cable=loom?.cables.find(c=>c.id===row.dataset.loomCableRow);row.style.cssText=loomCableRowStyle(cable||{});row.classList.remove('loomCableColourSelected');for(const [key,value] of [['tabindex',tabindex],['aria-selected',selected]]){if(value===null)row.removeAttribute(key);else row.setAttribute(key,value)}});
  edit.controls.forEach(({control,disabled})=>control.disabled=disabled);edit.table.classList.remove('loomColourTarget');
  if(edit.collapsed)edit.table.closest('.loomCard')?.classList.add('loomCardCollapsed');
  $('loomEditorPane')?.classList.remove('loomColourEditing');$('loomEditorPane')?.querySelector('.loomColourRail')?.remove();syncLoomCableStripeGeometry(edit.table);
  if(changed){persist();refreshOpenPdfPreview()}
}
