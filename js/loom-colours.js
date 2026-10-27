/* Per-cable colour drafts never enter project data before explicit confirmation. */
let loomCableColourEdit=null;
function loomCableColours(cable){return ['colour1','colour2','colour3'].map(key=>colourTextToHex(cable?.[key]||'','')).filter(Boolean)}
function loomCableRowStyle(cable){const colours=loomCableColours(cable),p=colourSetPresentation(colours);return `--loom-row-background:${powerMultiColourBackground(colours)};--loom-row-text:${p.text};--loom-row-stroke:${p.outline==='transparent'?'0':'.5mm'}`}
function loomBoxItRowMarkup(loom,colspan=5){return String(loom.boxIt||'').trim()?`<tr class="loomEndsTogetherRow loomBoxItRow"><td colspan="${colspan}">Box It: ${escapeHtml(loom.boxIt)}</td></tr>`:''}
function beginLoomCableColours(){
  const loom=loomById(activeLoomEditorId);if(!loom||loomCableColourEdit)return;
  const table=[...document.querySelectorAll('[data-loom-table]')].find(el=>el.dataset.loomTable===loom.id);if(!table)return;
  loomCableColourEdit={id:loom.id,values:Object.fromEntries(loom.cables.map(c=>[c.id,{colour1:c.colour1||'',colour2:c.colour2||'',colour3:c.colour3||''}])),table,controls:[...table.querySelectorAll('input[data-loom-cell],.loomDeleteCable')].map(control=>({control,disabled:control.disabled})),collapsed:table.closest('.loomCard')?.classList.contains('loomCardCollapsed')};
  table.closest('.loomCard')?.classList.remove('loomCardCollapsed');loomCableColourEdit.controls.forEach(({control})=>control.disabled=true);
  const pane=$('loomEditorPane'),rail=document.createElement('div');rail.className='loomColourRail';rail.innerHTML=`<strong>${escapeHtml(loomEditorDraft?.name||loom.name||'Unnamed Loom')}</strong><button class="btn primary" type="button" aria-label="Finish and save cable colours" onclick="finishLoomCableColours(true)">✓</button><button class="btn danger" type="button" aria-label="Cancel cable colours" onclick="finishLoomCableColours(false)">✕</button>`;pane.appendChild(rail);pane.classList.add('loomColourEditing');
  table.querySelectorAll('tbody tr[data-loom-cable-row]').forEach(row=>{
    const id=row.dataset.loomCableRow,values=loomCableColourEdit.values[id];if(!values)return;
    const cell=row.querySelector('.loomDeleteCell'),fields=document.createElement('div');fields.className='loomCableColourFields';
    fields.innerHTML=['colour1','colour2','colour3'].map((key,index)=>`<label>Col ${index+1}${colourInputControl(`data-loom-cable-colour="${key}" data-allow-blank-colour="1"`,values[key],'#fff','color','colour',true)}</label>`).join('');cell.appendChild(fields);
    fields.querySelectorAll('[data-loom-cable-colour]').forEach(input=>input.addEventListener('input',()=>{if(!loomCableColourEdit)return;values[input.dataset.loomCableColour]=colourTextToHex(input.value,'');row.style.cssText=loomCableRowStyle(values);styleColourTextInput(input)}));styleAllColourInputs(fields);
  });
}
function finishLoomCableColours(save=false){
  const edit=loomCableColourEdit;if(!edit)return;loomCableColourEdit=null;
  const loom=loomById(edit.id);let changed=false;
  if(save&&loom)loom.cables.forEach(cable=>{const values=edit.values[cable.id];if(!values)return;for(const key of ['colour1','colour2','colour3'])if((cable[key]||'')!==values[key]){cable[key]=values[key];changed=true}});
  edit.table.querySelectorAll('[data-loom-cable-row]').forEach(row=>{const cable=loom?.cables.find(c=>c.id===row.dataset.loomCableRow);row.style.cssText=loomCableRowStyle(cable||{});row.querySelector('.loomCableColourFields')?.remove()});
  edit.controls.forEach(({control,disabled})=>control.disabled=disabled);
  if(edit.collapsed)edit.table.closest('.loomCard')?.classList.add('loomCardCollapsed');
  $('loomEditorPane')?.classList.remove('loomColourEditing');$('loomEditorPane')?.querySelector('.loomColourRail')?.remove();
  document.querySelector('#colourMenu')?.classList.add('hidden');
  if(changed){persist();refreshOpenPdfPreview()}
}
