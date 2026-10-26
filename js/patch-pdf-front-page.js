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
function patchPdfControlMarkup(data=patchPdfControlData()){
  const groups=new Map();for(const row of data.consoles){const key=JSON.stringify(row.protocols);if(!groups.has(key))groups.set(key,{protocols:row.protocols,rows:[]});groups.get(key).rows.push(row.cells)}
  if(!groups.size)groups.set('',{protocols:['Protocol 1','Protocol 2'],rows:[]});
  const tables=[...groups.values()].map((group,index)=>{
    const last=index===groups.size-1,headers=['Console Type','Console Name','Mode','Software Version',...group.protocols.map((name,i)=>name==='—'?'Protocol '+(i+1):name)];
    return `<table class="patchPdfSupplementTable patchPdfControlTable"><colgroup>${[19,14,11,14,21,21].map(width=>`<col style="width:${width}%">`).join('')}</colgroup><thead><tr>${headers.map(value=>`<th>${escapeHtml(value)}</th>`).join('')}</tr></thead><tbody>${group.rows.map(row=>`<tr>${row.map((value,i)=>`<td${i===0?' data-console-type':''}>${escapeHtml(String(value))}</td>`).join('')}</tr>`).join('')||'<tr><td colspan="6">No consoles added.</td></tr>'}${last&&data.npus.length?`<tr class="patchPdfCompactControl"><th colspan="4">NPU Type</th><th colspan="2">Quantity</th></tr>${data.npus.map(row=>`<tr><td colspan="4">${escapeHtml(row.type)}</td><td colspan="2">${row.quantity}</td></tr>`).join('')}`:''}${last?`<tr class="patchPdfCompactControl"><th colspan="4">Parameters Available</th><td colspan="2">${escapeHtml(typeof data.parameters==='number'?data.parameters.toLocaleString():String(data.parameters))}</td></tr>`:''}</tbody></table>`;
  });return `<section class="patchPdfControl">${tables.join('')}</section>`;
}
function patchPdfNoteItems(pdf){return Array.isArray(pdf.summaryNoteItems)?pdf.summaryNoteItems.filter(value=>typeof value==='string'):String(pdf.summaryNotes||'').split(/\r?\n/)}
function patchPdfNotesEditor(pdf){
  const host=$('patchPdfSummaryNotes');if(!host)return;host.replaceChildren();const items=patchPdfNoteItems(pdf);while(items.length<3)items.push('');items.forEach(value=>addPatchPdfNoteField(value));
  if($('patchPdfNoteStyle'))$('patchPdfNoteStyle').value=pdf.summaryNoteStyle==='numbered'?'numbered':'bullet';
}
function addPatchPdfNoteField(value='',focus=false){const host=$('patchPdfSummaryNotes');if(!host)return;const label=document.createElement('label'),input=document.createElement('textarea');label.textContent='Note '+(host.children.length+1);input.rows=2;input.value=value;input.setAttribute('aria-label',label.textContent);label.appendChild(input);host.appendChild(label);if(focus)input.focus()}
function patchPdfNotesColumns(items,style,width,measure,maxColumns=3){
  const values=items.map(value=>value.trim()).filter(Boolean),wrap=w=>values.flatMap((text,index)=>{const prefix=style==='numbered'?`${index+1}. `:'• ',indent=' '.repeat(prefix.length);return patchSummaryNoteLines(text,Math.max(1,w-measure(prefix)),measure).map((line,i)=>(i?indent:prefix)+line)});
  let columns=1,lines=wrap(width/2-26);
  if(lines.length>4){columns=2;lines=wrap((width-24)/2);if(lines.length>8){columns=maxColumns;lines=wrap((width-24*(columns-1))/columns)}}
  const chunks=[];if(columns===1)chunks.push(lines);else for(let i=0;i<lines.length;i+=4)chunks.push(lines.slice(i,i+4));
  return {columns,chunks};
}
function layoutPatchPdfNotes(front){
  const notes=front.querySelector('.patchPdfSummaryNotes');if(!notes)return;
  const body=notes.querySelector('.patchPdfNotesBody'),items=JSON.parse(notes.dataset.items),style=getComputedStyle(body),font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,details=front.querySelector('.patchPdfFrontDetails'),measure=text=>patchTextWidth(text,font),control=front.dataset.control==='true';
  const layout=control?{columns:1,chunks:[items.flatMap((text,index)=>patchSummaryNoteLines(text,Math.max(1,details.clientWidth-32-24),measure).map((line,i)=>(i?'   ':notes.dataset.listStyle==='numbered'?`${index+1}. `:'• ')+line))]}:patchPdfNotesColumns(items,notes.dataset.listStyle,details.clientWidth-28,measure);
  notes.classList.toggle('manyNotes',layout.columns>1);body.style.gridTemplateColumns=`repeat(${layout.columns},minmax(0,1fr))`;body.replaceChildren();
  layout.chunks.forEach(lines=>{const column=document.createElement('div');lines.forEach(text=>{const line=document.createElement('div');line.className='patchPdfSummaryNoteLine';line.textContent=text;column.appendChild(line)});body.appendChild(column)});
}
function appendPatchPdfFrontPage(pages,d,groups,pdf){
  const state=appendPatchPdfPage(pages,d),front=document.createElement('section'),tables=document.createElement('div'),details=document.createElement('aside');front.className='patchPdfFront';front.dataset.control=String(pdf.showControl===true);tables.className='patchPdfFrontTables';details.className='patchPdfFrontDetails';front.append(tables,details);state.page.appendChild(front);
  if(pdf.showSummary!==false){const rows=patchPdfSummaryRows(groups),summary=patchPdfSupplementElement('summary',rows,{final:true,total:rows.reduce((sum,row)=>sum+row.quantity,0),universes:patchPdfPatchedUniverses(groups)});tables.appendChild(summary);const totals=summary.querySelector('.patchPdfSummaryTotals');if(totals)details.appendChild(totals)}
  if(pdf.showControl===true)tables.insertAdjacentHTML('beforeend',patchPdfControlMarkup());
  const items=patchPdfNoteItems(pdf).map(value=>value.trim()).filter(Boolean);
  if(pdf.showSummary!==false&&pdf.showSummaryNotes!==false&&items.length){const notes=patchSummaryNotesBlock();notes.dataset.items=JSON.stringify(items);notes.dataset.listStyle=pdf.summaryNoteStyle==='numbered'?'numbered':'bullet';const body=document.createElement('div');body.className='patchPdfNotesBody';notes.appendChild(body);details.appendChild(notes)}
  fitPatchPdfFrontPage(front);state.page.querySelectorAll('img').forEach(image=>{if(!image.complete){const refit=()=>{if(front.isConnected)fitPatchPdfFrontPage(front)};image.addEventListener('load',refit,{once:true});image.addEventListener('error',refit,{once:true})}});return state;
}
function patchPdfConsoleTypeSize(text,width,measure){let size=10;while(size>7&&measure(text,size)>width)size=Math.max(7,size-.25);return size}
function fitPatchPdfConsoleTypes(front){front.querySelectorAll('[data-console-type]').forEach(cell=>{cell.style.fontSize='10pt';const style=getComputedStyle(cell),width=cell.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);cell.style.fontSize=patchPdfConsoleTypeSize(cell.textContent,width,(text,size)=>patchTextWidth(text,`${style.fontStyle} ${style.fontWeight} ${size}pt ${style.fontFamily}`))+'pt'})}
function patchPdfFrontSpace(front){const page=front.closest('.exportPage'),footer=page.querySelector('.pdfPageFooter'),factor=page.getBoundingClientRect().width/Math.max(1,page.offsetWidth);return (footer.getBoundingClientRect().top-front.getBoundingClientRect().top)/Math.max(.0001,factor)-8}
function patchPdfStackedReferenceHeight(front){
  const reference=document.createElement('div');reference.style.cssText='position:absolute;visibility:hidden;left:-100000px;top:0;width:'+front.clientWidth+'px;display:flex;flex-direction:column';
  const tables=front.querySelector('.patchPdfFrontTables').cloneNode(true);tables.style.cssText='display:grid;gap:5mm;width:100%;position:static;transform:none';
  tables.querySelectorAll('[data-console-type]').forEach(cell=>cell.style.fontSize='10pt');tables.querySelectorAll('.patchPdfCompactControl th,.patchPdfCompactControl td').forEach(cell=>{cell.style.fontSize='10pt';cell.style.padding='2mm 1.5mm';cell.style.lineHeight='normal'});
  const control=tables.querySelector('.patchPdfControl');if(control){const title=document.createElement('h2');title.className='patchPdfSupplementTitle';title.textContent='Control';control.prepend(title)}
  const totals=front.querySelector('.patchPdfSummaryTotals');if(totals)tables.querySelector('.patchPdfSummary')?.appendChild(totals.cloneNode(true));reference.appendChild(tables);
  const notes=front.querySelector('.patchPdfSummaryNotes');if(notes){const copy=patchSummaryNotesBlock(),body=document.createElement('div');body.style.cssText='font-size:12pt;white-space:pre-wrap;line-height:1.35';body.textContent=JSON.parse(notes.dataset.items).join('\n');copy.appendChild(body);reference.appendChild(copy)}
  front.closest('.exportPage').appendChild(reference);const height=reference.scrollHeight;reference.remove();return height;
}
function fitPatchPdfFrontPage(front){
  if(!front)return;const tables=front.querySelector('.patchPdfFrontTables'),details=front.querySelector('.patchPdfFrontDetails');front.style.transform='none';front.style.height='auto';tables.style.transform='none';tables.dataset.frontScale='1';details.style.cssText='';details.dataset.frontScale='1';front.dataset.frontScale='1';
  const space=patchPdfFrontSpace(front);if(space<=0)throw new Error('The PDF header and footer leave no room for the front-page content.');
  if(front.dataset.control==='true'){
    // Retain natural table widths. Fit the stacked tables as a unit, leaving a readable detail column.
    const reserve=Math.min(220,front.clientWidth*.3),referenceHeight=patchPdfStackedReferenceHeight(front),scale=Math.min(1,(front.clientWidth-reserve-24)/Math.max(1,front.clientWidth),space/Math.max(1,referenceHeight,tables.scrollHeight));
    tables.style.transform=`scale(${scale})`;tables.dataset.frontScale=String(scale);
    const left=front.clientWidth*scale+24;details.style.left=left+'px';details.style.width=Math.max(1,front.clientWidth-left)+'px';
    const header=tables.querySelector('thead'),pageFactor=front.closest('.exportPage').getBoundingClientRect().width/front.closest('.exportPage').offsetWidth,top=header?(header.getBoundingClientRect().top-front.getBoundingClientRect().top)/Math.max(.0001,pageFactor):0;details.style.top=top+'px';
    layoutPatchPdfNotes(front);const detailScale=Math.min(1,Math.max(1,space-top)/Math.max(1,details.scrollHeight));details.style.transform=`scale(${detailScale})`;details.dataset.frontScale=String(detailScale);front.style.height=space+'px';
  }else{
    layoutPatchPdfNotes(front);const scale=Math.min(1,space/Math.max(1,front.scrollHeight));front.style.transform=`scale(${scale})`;front.dataset.frontScale=String(scale);
  }
  fitPatchPdfConsoleTypes(front);
}
function patchPdfFrontTextScale(el){const front=el.closest?.('.patchPdfFront');if(!front)return 1;const part=el.closest('.patchPdfFrontTables,.patchPdfFrontDetails');return (Number(front.dataset.frontScale)||1)*(Number(part?.dataset.frontScale)||1)}
function updatePatchPdfFrontOptions(){fixturePatchViewOptions.pdf.showControl=$('patchPdfShowControl')?.checked===true;persist();renderFixturePatchPdfPreview()}
