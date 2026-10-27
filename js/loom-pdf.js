/* Loom-only export. All source rows are read independently of live card disclosure. */
let loomPdfSession=null,loomPdfZoom='fit';
function loomPdfSource(){
  return loomDisplayGroups().flatMap(group=>[group.parent,...group.extensions].map(loom=>({
    ...loom,pdfGroupId:group.parent.id,cables:(loom.cables||[]).map(cable=>({...cable})),
    feeder:loom.parentLoomId?(loomById(loom.parentLoomId)?.name||group.parent.name||'Unnamed Loom'):''
  })));
}
function loomPdfRowMarkup(cable){return `<tr class="loomCableColouredRow" style="${loomCableRowStyle(cable)}">${[cable.label,cable.cableType,loomLengthText(cable.length,cable.unit),cable.notes].map(value=>`<td data-loom-cable-pdf-colours="${escapeAttr(loomCableColours(cable).join(','))}"><span>${escapeHtml(value||'')}</span></td>`).join('')}</tr>`}
function loomPdfSectionMarkup(loom){
  const colours=[...new Set([loom.colour1,loom.colour2,loom.colour3].map(value=>colourTextToHex(value,'')).filter(Boolean))];
  return `<section class="loomPdfSection"><div class="loomPdfHeading" data-loom-pdf-colours="${escapeAttr(colours.join(','))}" style="${loomHeadingStyle(loom)}"><span class="loomPdfKind">${loom.parentLoomId?'Extension':'Feeder'}</span><h3>${escapeHtml(loom.name||'Unnamed Loom')}</h3></div>${loom.feeder?`<p class="loomPdfFeeder">Feeder: ${escapeHtml(loom.feeder)}</p>`:''}<table class="loomPdfTable"><colgroup><col style="width:20%"><col style="width:30%"><col style="width:15%"><col style="width:35%"></colgroup><thead><tr><th>Label</th><th>Cable</th><th>Length</th><th>Notes</th></tr></thead><tbody></tbody></table></section>`;
}
function loomPdfRowGroups(loom){
  const rows=loom.cables.length?loom.cables.map(loomPdfRowMarkup):['<tr><td colspan="4">No cables in this loom.</td></tr>'];
  const ends=loom.endsTogether==='male'?'Male Ends Together':loom.endsTogether==='female'?'Female Ends Together':'';
  if(ends)rows[rows.length-1]+=`<tr class="loomPdfEnds"><td colspan="4">${ends}</td></tr>`;
  if(loom.boxIt)rows[rows.length-1]+=loomBoxItRowMarkup(loom,4);
  return rows;
}
function loomPdfDimensions(){const paper=$('loomPdfPaperSize')?.value||'A4',orient=$('loomPdfOrientation')?.value||'landscape',sizes={A4:[210,297],A3:[297,420],A2:[420,594],A1:[594,841],A0:[841,1189]},size=sizes[paper]||sizes.A4,w=orient==='portrait'?size[0]:size[1],h=orient==='portrait'?size[1]:size[0];return {paper,orient,w,h,ptW:w*72/25.4,ptH:h*72/25.4}}
function loomPdfCreatePage(host,d){
  const index=host.querySelectorAll('.exportPage').length,page=createExportPage(d,index,'Looms'),shell=document.createElement('div');shell.className='exportPageShell';page.classList.add('loomPdfPage');
  if(index===0){const title=document.createElement('div');title.className='powerPdfDocumentHeader';title.innerHTML=`<h2>Looms - ${escapeHtml(ensureProjectInfo().file.projectName||'Untitled Project')}</h2><h3>Version ${escapeHtml(ensureProjectInfo().file.version||'')}</h3>`;setUnifiedPdfHeaderCenter(page,title)}
  const content=document.createElement('div');content.className='loomPdfContent';page.appendChild(content);shell.appendChild(page);host.appendChild(shell);
  // Reserve chrome using a generous page-token width before measuring table rows.
  const values=pdfTemplateValues('Looms',99999,99999),settings=ensureProjectInfo().projectSettings.pdf;
  for(const [selector,attribute,templates] of [['.pdfPageFooter','footer',settings.footer],['.pdfLaterPageHeader','header',settings.laterHeader]]){
    const element=page.querySelector(selector);if(!element)continue;
    for(const key of ['left','centre','right']){const field=element.querySelector(`[data-pdf-${attribute}="${key}"]`);if(field)field.textContent=expandPdfTemplate(templates[key],values)}
    if(attribute==='footer')element.style.minHeight=Math.ceil(element.getBoundingClientRect().height)+'px';
    else page.style.setProperty('padding-top',Math.ceil(Math.max(35,element.getBoundingClientRect().bottom-page.getBoundingClientRect().top+8))+'px','important');
  }
  return {page,content};
}
function loomPdfFits(state){return state.content.getBoundingClientRect().bottom<=state.page.querySelector('.pdfPageFooter').getBoundingClientRect().top-6}
function loomPdfFitOversized(state){const box=state.content.getBoundingClientRect(),space=state.page.querySelector('.pdfPageFooter').getBoundingClientRect().top-box.top-6;if(space<=0)throw new Error('The PDF header and footer leave no room for loom tables.');const scale=Math.min(1,space/Math.max(1,box.height));if(scale<1){state.content.style.transformOrigin='top left';state.content.style.transform=`scale(${scale})`}}
function loomPdfCompleteSectionMarkup(loom){return loomPdfSectionMarkup(loom).replace('<tbody></tbody>',`<tbody>${loomPdfRowGroups(loom).join('')}</tbody>`)}
function loomPdfGroups(looms){
  const groups=new Map();
  for(const loom of looms){const key=loom.pdfGroupId||loom.id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(loom)}
  return [...groups.values()];
}
function loomPdfPageGroups(looms){
  const groups=loomPdfGroups(looms),packed=[];
  while(groups.length){
    const group=groups.shift(),partner=group.length===1?groups.findIndex(item=>item.length===1):-1;
    packed.push(partner>=0?[...group,...groups.splice(partner,1)[0]]:group);
  }
  return packed;
}
function loomPdfGroupMarkup(looms){
  const parent=looms.find(loom=>!loom.parentLoomId)||looms[0],extensions=looms.filter(loom=>loom!==parent);
  return `<div class="loomPdfGroup"><div>${loomPdfCompleteSectionMarkup(parent)}</div><div class="loomPdfExtensionStack">${extensions.map(loomPdfCompleteSectionMarkup).join('')}</div></div>`;
}
function buildLoomPdfPages(host,looms,d){
  let state=null,full=false;
  for(const group of loomPdfPageGroups(looms)){
    if(!state||full){state=loomPdfCreatePage(host,d);full=false}
    const template=document.createElement('template');template.innerHTML=loomPdfGroupMarkup(group);
    const section=template.content.firstElementChild,existing=state.content.children.length;
    state.content.appendChild(section);
    // Move an entire card to the next page instead of splitting its cable rows.
    if(!loomPdfFits(state)&&existing){section.remove();state=loomPdfCreatePage(host,d);state.content.appendChild(section)}
    // Only a card too tall for an empty page is scaled, as one complete unit.
    if(!loomPdfFits(state)){loomPdfFitOversized(state);full=true}
  }
  const pages=[...host.querySelectorAll('.exportPage')];finalisePdfPageChrome(pages);return pages;
}
function loomPdfRenderCurrent(session,version){return loomPdfSession===session&&session.version===version}
function renderLoomPdfPreview(){
  const session=loomPdfSession;if(!session||session.exporting)return session?.pending;
  const version=++session.version,d=loomPdfDimensions(),looms=loomPdfSource(),stage=document.createElement('div');stage.className='loomPdfBuild';stage.inert=true;stage.setAttribute('aria-hidden','true');document.body.appendChild(stage);
  const seed=loomPdfCreatePage(stage,d);seed.content.innerHTML=loomPdfPageGroups(looms).map(loomPdfGroupMarkup).join('');session.error=null;$('loomPdfInfo').textContent='Preparing loom pages…';
  session.pending=(async()=>{try{
    await deviceConfigPdfAssetsReady(stage);if(!loomPdfRenderCurrent(session,version))return;
    stage.replaceChildren();const pages=buildLoomPdfPages(stage,looms,d);
    if(!pages.length)throw new Error('No looms to export.');
    if(!loomPdfRenderCurrent(session,version))return;
    $('loomPdfPages').replaceChildren(...stage.children);session.dimensions=d;session.ready=true;
    $('loomPdfInfo').dataset.base=`${looms.length} looms • ${pages.length} pages • ${d.paper} ${d.orient}`;updateLoomPdfZoom();
  }catch(error){if(loomPdfRenderCurrent(session,version)){session.error=error;session.ready=false;$('loomPdfInfo').textContent=error.message}console.error(error)}finally{stage.remove()}})();return session.pending;
}
function loomPdfModal(){
  let modal=$('loomPdfModal');if(modal)return modal;modal=document.createElement('div');modal.id='loomPdfModal';modal.className='modal hidden';
  modal.innerHTML=`<div class="modalCard"><div class="modalHead"><h2>Looms PDF Export</h2><button class="close" type="button" aria-label="Close Looms PDF Export" onclick="closeLoomPdfPreview()">×</button></div><div class="exportControls"><div class="ctl"><label>Paper Size</label><select id="loomPdfPaperSize" onchange="renderLoomPdfPreview()">${['A4','A3','A2','A1','A0'].map(value=>`<option>${value}</option>`).join('')}</select></div><div class="ctl"><label>Orientation</label><select id="loomPdfOrientation" onchange="renderLoomPdfPreview()"><option value="landscape">Landscape</option><option value="portrait">Portrait</option></select></div><div class="ctl"><label>Zoom</label><div class="zoomControls">${['fit','0.5','0.75','1','1.25'].map(value=>`<button class="btn" data-loom-pdf-zoom="${value}" onclick="setLoomPdfZoom('${value}')">${value==='fit'?'Fit':Number(value)*100+'%'}</button>`).join('')}</div></div><div class="ctl"><p>All loom cards are included and expanded. Cable List is not included.</p></div><div class="ctl"><button class="btn primary" type="button" onclick="downloadLoomPdf()">Export to PDF</button></div><div id="loomPdfInfo" class="hint"></div></div><div class="pdfPageStage"><div id="loomPdfPages"></div></div></div>`;
  modal.addEventListener('click',event=>{if(event.target===modal)closeLoomPdfPreview()});document.body.appendChild(modal);return modal;
}
function openLoomPdfPreview(){if(!loomPdfSource().length){alert('Add a loom before exporting.');return}loomPdfSession={version:0,ready:false};loomPdfZoom='fit';loomPdfModal().classList.remove('hidden');beginPdfLogoPreview('looms','loomPdfModal');renderLoomPdfPreview()}
function closeLoomPdfPreview(){if(loomPdfSession?.exporting)return;const active=!!loomPdfSession;loomPdfSession=null;$('loomPdfModal')?.classList.add('hidden');if(active)endPdfLogoPreview()}
function setLoomPdfZoom(value){loomPdfZoom=value;updateLoomPdfZoom()}
function updateLoomPdfZoom(){const stage=document.querySelector('#loomPdfModal .pdfPageStage'),first=document.querySelector('#loomPdfPages .exportPage');if(!stage||!first)return;const fit=Math.min(1,(stage.clientWidth-36)/first.offsetWidth,(stage.clientHeight-36)/first.offsetHeight),scale=loomPdfZoom==='fit'?Math.max(.1,fit):Number(loomPdfZoom)||1;scalePdfPageShells('#loomPdfPages .exportPageShell',scale);document.querySelectorAll('[data-loom-pdf-zoom]').forEach(button=>button.classList.toggle('active',button.dataset.loomPdfZoom===String(loomPdfZoom)));const info=$('loomPdfInfo');if(info?.dataset.base)info.textContent=info.dataset.base+' • Zoom '+Math.round(scale*100)+'%'}
async function loomPreviewPdfBytes(){
  const session=loomPdfSession;if(!session)throw new Error('Loom export is closed.');let pending;do{pending=session.pending;await pending}while(loomPdfSession===session&&pending!==session.pending);
  if(loomPdfSession!==session||session.error||!session.ready)throw session.error||new Error('Loom pages are unavailable.');
  const modal=$('loomPdfModal');session.exporting=true;modal.inert=true;
  try{const images=[];for(const page of document.querySelectorAll('#loomPdfPages .exportPage'))images.push(await patchPdfPageToJpeg(page));return buildPdfImageFile(images,session.dimensions.ptW,session.dimensions.ptH)}finally{modal.inert=false;session.exporting=false}
}
async function downloadLoomPdf(){const button=document.querySelector('#loomPdfModal [onclick="downloadLoomPdf()"]');if(button)button.disabled=true;try{const bytes=await loomPreviewPdfBytes(),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),link=document.createElement('a');link.href=url;link.download=pdfExportFilename('looms');document.body.appendChild(link);link.click();setTimeout(()=>{URL.revokeObjectURL(url);link.remove()},1000)}catch(error){console.error(error);alert('Could not build the Looms PDF: '+error.message)}finally{if(button)button.disabled=false}}
function drawLoomPdfStripeCanvas(canvas,colours,scale=1){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,px=96/25.4*scale,band=(colours.length===2?9:6)*px,period=band*colours.length,edge=.5*px;
  ctx.fillStyle=colours[0]||'#fff';ctx.fillRect(0,0,w,h);if(colours.length<2)return;
  const draw=(start,end,colour)=>{const a=start*Math.SQRT2,b=end*Math.SQRT2;ctx.fillStyle=colour;ctx.beginPath();ctx.moveTo(a,0);ctx.lineTo(b,0);ctx.lineTo(b-h,h);ctx.lineTo(a-h,h);ctx.closePath();ctx.fill()};
  for(let start=-2*px-period;start<(w+h)/Math.SQRT2+period;start+=period)colours.forEach((colour,index)=>{const a=start+index*band,b=a+band;draw(a,b,colour);if(colour.toLowerCase()==='#ffffff'){draw(a,a+edge,'#000');draw(b-edge,b,'#000')}});
}
