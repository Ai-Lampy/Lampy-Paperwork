/* Fixture Patch cover: summary, optional control details and committed notes. */
function patchPdfControlData(){
  const data=normaliseControlNetwork(app.controlNetwork),value=v=>String(v??'').trim()||'—';
  const consoles=data.consoles.map(item=>{
    const ref=consoleRefForItem(item),device={source:'console',id:item.id,interfaces:ipDeviceInterfaces(item,'console')},ports=deviceConfigPortsFor(device).filter(port=>port.category==='network');
    const network=slot=>{const port=ports[slot-1];return {protocol:value(port?port.protocol:item['protocol'+slot]),ip:value(port?port.ip:item['ip'+slot])}};
    const networks=[network(1),network(2)];
    return {protocols:networks.map(port=>port.protocol),cells:[[ref?.manufacturer||item.manufacturer,ref?.name||item.name].filter(Boolean).join(' ')||'Unknown Console',value(controlEffectiveName(item,'console')),value(item.softwareMode),value(controlDeviceSoftwareVersionText(item,'console')),...networks.map(port=>port.ip)]};
  });
  const npus=new Map();for(const item of data.npus){const ref=npuRefForItem(item),type=[ref?.manufacturer||item.manufacturer,ref?.name||item.name].filter(Boolean).join(' ')||'Unknown NPU';npus.set(type,(npus.get(type)||0)+1)}
  return {consoles,npus:[...npus].map(([type,quantity])=>({type,quantity})),parameters:homeParametersAvailable()};
}
function patchPdfCapacityMarkup(available,required=fixtureParametersRequired()){
  if(typeof available!=='number'||!Number.isFinite(available)||!Number.isFinite(required))return '';
  const enough=available>=required,label=enough?'Sufficient parameter capacity':'Insufficient parameter capacity';
  return `<svg class="patchPdfCapacityStatus" data-capacity="${enough?'sufficient':'insufficient'}" role="img" aria-label="${label}" viewBox="0 0 16 16" width="14" height="14" style="color:${enough?'#008a00':'#c00000'}"><path d="${enough?'M2 8 L6 12 L14 3':'M3 3 L13 13 M13 3 L3 13'}" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>`;
}
function patchPdfControlMarkup(data=patchPdfControlData()){
  const groups=new Map();for(const row of data.consoles){const key=JSON.stringify(row.protocols);if(!groups.has(key))groups.set(key,{protocols:row.protocols,rows:[]});groups.get(key).rows.push(row.cells)}
  if(!groups.size)groups.set('',{protocols:['Protocol 1','Protocol 2'],rows:[]});
  const tables=[...groups.values()].map((group,index)=>{
    const last=index===groups.size-1,headers=['Console Type','Console Name','Mode','Software Version',...group.protocols.map((name,i)=>name==='—'?'Protocol '+(i+1):name)];
    return `<table class="patchPdfSupplementTable patchPdfControlTable"><thead><tr>${headers.map(value=>`<th>${escapeHtml(value)}</th>`).join('')}</tr></thead><tbody>${group.rows.map(row=>`<tr>${row.map((value,i)=>`<td${i===0?' data-console-type':''}>${escapeHtml(String(value))}</td>`).join('')}</tr>`).join('')||'<tr><td colspan="6">No consoles added.</td></tr>'}${last&&data.npus.length?`<tr class="patchPdfCompactControl"><th colspan="4">NPU Type</th><th colspan="2">Quantity</th></tr>${data.npus.map(row=>`<tr><td colspan="4">${escapeHtml(row.type)}</td><td colspan="2">${row.quantity}</td></tr>`).join('')}`:''}${last?`<tr class="patchPdfCompactControl"><th colspan="4">Parameters Available</th><td colspan="2"><span class="patchPdfCapacityPair"><span class="patchPdfCapacityValue">${escapeHtml(typeof data.parameters==='number'?data.parameters.toLocaleString():String(data.parameters))}</span> ${patchPdfCapacityMarkup(data.parameters)}</span></td></tr>`:''}</tbody></table>`;
  });return `<section class="patchPdfControl">${tables.join('')}</section>`;
}
function patchPdfNoteItems(pdf){return Array.isArray(pdf.summaryNoteItems)?pdf.summaryNoteItems.filter(value=>typeof value==='string'):String(pdf.summaryNotes||'').split(/\r?\n/)}
function patchPdfNotesEditor(pdf){
  const host=$('patchPdfSummaryNotes');if(!host)return;host.replaceChildren();const items=patchPdfNoteItems(pdf);while(items.length<3)items.push('');items.forEach(value=>addPatchPdfNoteField(value));
  if($('patchPdfNoteStyle'))$('patchPdfNoteStyle').value=pdf.summaryNoteStyle==='numbered'?'numbered':'bullet';
}
function addPatchPdfNoteField(value='',focus=false){const host=$('patchPdfSummaryNotes');if(!host)return;const label=document.createElement('label'),input=document.createElement('textarea');label.textContent='Note '+(host.children.length+1);input.rows=2;input.value=value;input.setAttribute('aria-label',label.textContent);label.appendChild(input);host.appendChild(label);if(focus)input.focus()}
function patchPdfNotesColumns(items,style,width,measure){
  const columns=4,columnWidth=Math.max(1,(width-72)/columns);
  const chunks=items.map(value=>value.trim()).filter(Boolean).map((text,index)=>{const prefix=style==='numbered'?`${index+1}. `:'• ',indent=' '.repeat(prefix.length);return patchSummaryNoteLines(text,Math.max(1,columnWidth-measure(prefix)),measure).map((line,i)=>(i?indent:prefix)+line)});
  return {columns,chunks};
}
function layoutPatchPdfNotes(front){
  const notes=front.querySelector('.patchPdfSummaryNotes');if(!notes)return;
  const body=notes.querySelector('.patchPdfNotesBody'),items=JSON.parse(notes.dataset.items),style=getComputedStyle(body),font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,measure=text=>patchTextWidth(text,font);
  const layout=patchPdfNotesColumns(items,notes.dataset.listStyle,Math.max(1,notes.clientWidth-27),measure);
  body.style.gridTemplateColumns='repeat(4,minmax(0,1fr))';body.replaceChildren();
  layout.chunks.forEach(lines=>{const item=document.createElement('div');lines.forEach(text=>{const line=document.createElement('div');line.className='patchPdfSummaryNoteLine';line.textContent=text;item.appendChild(line)});body.appendChild(item)});
}
function appendPatchPdfFrontPage(pages,d,groups,pdf){
  const state=appendPatchPdfPage(pages,d),front=document.createElement('section'),tables=document.createElement('div'),details=document.createElement('aside');front.className='patchPdfFront';front.dataset.control=String(pdf.showControl===true);tables.className='patchPdfFrontTables';details.className='patchPdfFrontDetails';front.append(tables,details);state.page.appendChild(front);
  const totals=document.createElement('div');totals.className='patchPdfSummaryTotals';
  const parameter=document.createElement('div');parameter.className='patchPdfParameterTotal';parameter.textContent='Parameter Count - '+fixtureParametersRequired().toLocaleString();totals.appendChild(parameter);
  if(pdf.showSummary!==false){const rows=patchPdfSummaryRows(groups),summary=patchPdfSupplementElement('summary',rows);tables.appendChild(summary);const fixtureTotal=document.createElement('div');fixtureTotal.className='patchPdfFixtureTotal';fixtureTotal.textContent='Total Number of Fixtures = '+rows.reduce((sum,row)=>sum+row.quantity,0);totals.appendChild(fixtureTotal)}
  if(pdf.showUniverseTotal!==false){const universeTotal=document.createElement('div');universeTotal.className='patchPdfUniverseTotal';universeTotal.textContent='Patched Universes: '+patchPdfPatchedUniverses(groups);totals.appendChild(universeTotal)}
  details.appendChild(totals);
  if(pdf.showControl===true)tables.insertAdjacentHTML('beforeend',patchPdfControlMarkup());
  const items=patchPdfNoteItems(pdf).map(value=>value.trim()).filter(Boolean);
  if(pdf.showSummaryNotes!==false&&items.length){const notes=patchSummaryNotesBlock();notes.dataset.items=JSON.stringify(items);notes.dataset.listStyle=pdf.summaryNoteStyle==='numbered'?'numbered':'bullet';const body=document.createElement('div');body.className='patchPdfNotesBody';notes.appendChild(body);front.appendChild(notes)}
  fitPatchPdfFrontPage(front);state.page.querySelectorAll('img').forEach(image=>{if(!image.complete){const refit=()=>{if(front.isConnected)fitPatchPdfFrontPage(front)};image.addEventListener('load',refit,{once:true});image.addEventListener('error',refit,{once:true})}});return state;
}
function patchPdfConsoleTypeSize(text,width,measure){let size=10;while(size>7&&measure(text,size)>width)size=Math.max(7,size-.25);return size}
function fitPatchPdfConsoleTypes(front){front.querySelectorAll('[data-console-type]').forEach(cell=>{cell.style.fontSize='10pt';const style=getComputedStyle(cell),width=cell.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);cell.style.fontSize=patchPdfConsoleTypeSize(cell.textContent,width,(text,size)=>patchTextWidth(text,`${style.fontStyle} ${style.fontWeight} ${size}pt ${style.fontFamily}`))+'pt'})}
function patchPdfFrontSpace(front){const page=front.closest('.exportPage'),footer=page.querySelector('.pdfPageFooter'),factor=page.getBoundingClientRect().width/Math.max(1,page.offsetWidth);return (footer.getBoundingClientRect().top-front.getBoundingClientRect().top)/Math.max(.0001,factor)-8}
function fitPatchPdfFixtureTotal(details){
  const total=details.querySelector('.patchPdfFixtureTotal');if(!total)return;
  total.style.fontSize='';const style=getComputedStyle(total),width=Math.max(1,total.clientWidth-parseFloat(style.paddingLeft||0)-parseFloat(style.paddingRight||0)),base=parseFloat(style.fontSize)||16;
  const font=size=>`${style.fontStyle} ${style.fontWeight} ${size}px ${style.fontFamily}`;let size=base;
  while(size>1&&patchTextWidth(total.textContent,font(size))>width)size=Math.max(1,size-.25);
  total.style.fontSize=size+'px';
}
function fitPatchPdfFrontPage(front){
  if(!front)return;
  const tables=front.querySelector('.patchPdfFrontTables'),details=front.querySelector('.patchPdfFrontDetails'),notes=front.querySelector('.patchPdfSummaryNotes'),control=front.dataset.control==='true';
  front.style.transform='none';front.dataset.frontScale='1';
  for(const part of [tables,details,notes].filter(Boolean)){part.style.cssText='';part.dataset.frontScale='1'}
  tables.querySelectorAll('colgroup').forEach(group=>group.remove());
  const space=patchPdfFrontSpace(front);if(space<=0)throw new Error('The PDF header and footer leave no room for the front-page content.');
  front.style.height=space+'px';
  let notesHeight=0;
  if(notes){notes.style.width='100%';layoutPatchPdfNotes(front);const height=Math.max(1,notes.scrollHeight),scale=Math.min(1,space*.45/height);notesHeight=height*scale;notes.style.top=(space-notesHeight)+'px';notes.style.transform=`scale(${scale})`;notes.dataset.frontScale=String(scale)}
  const available=Math.max(1,space-notesHeight-(notes?16:0)),reserve=control?Math.min(230,front.clientWidth*.3):0,gap=control?24:0;
  tables.style.width=(front.clientWidth-reserve-gap)+'px';details.style.width=(control?reserve:front.clientWidth)+'px';
  fitPatchPdfConsoleTypes(front);fitPatchPdfFixtureTotal(details);
  const header=tables.querySelector('thead'),page=front.closest('.exportPage'),factor=page.getBoundingClientRect().width/Math.max(1,page.offsetWidth),top=control&&header?Math.max(0,(header.getBoundingClientRect().top-front.getBoundingClientRect().top)/Math.max(.0001,factor)):0;
  const tableHeight=tables.scrollHeight,detailHeight=details.scrollHeight,naturalHeight=control?Math.max(tableHeight,top+detailHeight):tableHeight+16+detailHeight,scale=Math.min(1,available/Math.max(1,naturalHeight));
  tables.style.transform=`scale(${scale})`;tables.dataset.frontScale=String(scale);
  details.style.left=(control?(front.clientWidth-reserve)*scale:0)+'px';details.style.top=((control?top:tableHeight+16)*scale)+'px';details.style.transform=`scale(${scale})`;details.dataset.frontScale=String(scale);
}
function patchPdfFrontTextScale(el){const front=el.closest?.('.patchPdfFront');if(!front)return 1;const part=el.closest('.patchPdfFrontTables,.patchPdfFrontDetails,.patchPdfSummaryNotes');return (Number(front.dataset.frontScale)||1)*(Number(part?.dataset.frontScale)||1)}
function patchPdfHasFrontPage(pdf){return pdf.showSummary!==false||pdf.showControl===true||pdf.showUniverseTotal!==false||(pdf.showSummaryNotes!==false&&patchPdfNoteItems(pdf).some(value=>value.trim()))}
function updatePatchPdfFrontOptions(){fixturePatchViewOptions.pdf.showControl=$('patchPdfShowControl')?.checked===true;fixturePatchViewOptions.pdf.showUniverseTotal=$('patchPdfShowUniverseTotal')?.checked!==false;persist();renderFixturePatchPdfPreview()}
