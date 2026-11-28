/* Public snapshot allowlist. Never include a complete project or owner credentials. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LampyShareCore=api})(globalThis,function(){
 'use strict';
 const TOKEN=/^[a-f0-9]{64}$/,ID=/^[a-zA-Z0-9_-]{1,100}$/;
 const text=(v,n=200)=>String(v??'').slice(0,n);
 const fields=['fixId','universe','address','fixture','mode','channels','location','notes','colour1','colour2','colour3'];
 const font=v=>/^[a-zA-Z0-9 ,.'"_-]{1,200}$/.test(String(v||''))?String(v):undefined;
 function format(value){const v=value||{},out={};if(font(v.font))out.font=font(v.font);if(Number.isFinite(Number(v.fontSize)))out.fontSize=Math.max(8,Math.min(48,Number(v.fontSize)));if(['left','center','right'].includes(v.align))out.align=v.align;for(const key of ['bold','italic','underline'])if(typeof v[key]==='boolean')out[key]=v[key];if(['pt','px'].includes(v.unit))out.unit=v.unit;return out}
 function presentation(value){const v=value||{},out={columns:{},tableFormats:{},titleFormat:format(v.titleFormat)};for(const key of fields){if(typeof v.columns?.[key]==='boolean')out.columns[key]=v.columns[key];if(v.tableFormats?.[key])out.tableFormats[key]=format(v.tableFormats[key])}if(v.tableFormats?.universeAddress)out.tableFormats.universeAddress=format(v.tableFormats.universeAddress);out.sortBy=['fixId','universe','type','position'].includes(v.sortBy)?v.sortBy:'fixId';out.sortDir=v.sortDir==='desc'?'desc':'asc';out.universeAddress={enabled:v.universeAddress?.enabled===true,separator:text(v.universeAddress?.separator||' . ',12),visible:v.universeAddress?.visible!==false};out.page={paper:['A4','A3','A2','A1','A0'].includes(v.page?.paper)?v.page.paper:'A4',orientation:v.page?.orientation==='portrait'?'portrait':'landscape'};return out}
 function control(value){const v=value||{};return {consoles:(Array.isArray(v.consoles)?v.consoles:[]).slice(0,100).map(row=>({protocols:Array.from({length:2},(_,i)=>text(row.protocols?.[i]||'—')),cells:Array.from({length:6},(_,i)=>text(row.cells?.[i]||'—'))})),npus:(Array.isArray(v.npus)?v.npus:[]).slice(0,100).map(row=>({type:text(row.type),quantity:Math.max(0,Math.min(10000,Math.trunc(Number(row.quantity)||0)))})),parameters:typeof v.parameters==='number'&&Number.isFinite(v.parameters)?Math.max(0,Math.min(1e9,v.parameters)):text(v.parameters||'—')}}
 function pdfStyle(value){const v=value||{},out=format(v);delete out.fontSize;delete out.unit;if(Number.isFinite(Number(v.size)))out.size=Math.max(5,Math.min(72,Number(v.size)));if(/^#[a-f0-9]{6}$/i.test(v.colour||''))out.colour=v.colour;return out}
 function pdfExport(value){
  if(!value||typeof value!=='object')return null;
  const v=value,source=v.project||{},project={},options={},logos={};
  for(const key of ['paper','orientation']){const allowed=key==='paper'?['A4','A3','A2','A1','A0']:['portrait','landscape'];if(allowed.includes(source[key]))project[key]=source[key]}
  if([150,300,450].includes(source.dpi))project.dpi=source.dpi;
  project.firstHeader={title:pdfStyle(source.firstHeader?.title),subtitle:pdfStyle(source.firstHeader?.subtitle)};
  project.laterHeader=pdfStyle(source.laterHeader);project.footer={style:pdfStyle(source.footer?.style)};
  for(const group of ['laterHeader','footer'])for(const key of ['left','centre','right'])if(typeof source[group]?.[key]==='string')project[group][key]=text(source[group][key],2000);
  // Only the selected Patch filename structure is needed. Private owner/vendor fields are resolved by the owner into a visible filename part.
  const parts=Array.from({length:3},(_,i)=>{const part=v.filenameParts?.[i]||{};return {field:['version','document','project','date','blank','custom'].includes(part.field)?part.field:'blank',custom:text(part.custom,300)}});
  project.fileNames={separate:false,parts,structures:[],selections:{}};
  const defaults=source.documentDefaults?.patch||{},patch={};for(const key of ['paper','orientation','dpi','headerMainSize','headerSubSize']){const x=defaults[key];if(key==='paper'&&['A4','A3','A2','A1','A0'].includes(x)||key==='orientation'&&['portrait','landscape'].includes(x)||key==='dpi'&&[150,300,450].includes(x)||['headerMainSize','headerSubSize'].includes(key)&&Number.isFinite(x)&&x>=8&&x<=30)patch[key]=x}project.documentDefaults={patch};
  for(const key of ['headerMainSize','headerSubSize'])if(Number.isFinite(v.options?.[key]))options[key]=Math.max(8,Math.min(30,v.options[key]));
  for(const key of ['showSummary','showRevisionNotes','showSummaryNotes','showControl','showUniverseTotal'])if(typeof v.options?.[key]==='boolean')options[key]=v.options[key];
  for(const key of ['tour','vendor','secondary'])if(typeof v.logos?.[key]==='boolean')logos[key]=v.logos[key];
  return {project,options,logos,filenameParts:parts,version:text(v.version),versionDate:text(v.versionDate)};
 }
 function snapshot(source){
  if(!source||!Array.isArray(source.fixtures)||!source.fixtures.length||source.fixtures.length>5000)throw Error('Share between 1 and 5,000 fixtures.');
  const seen=new Set(),fixtures=source.fixtures.map(row=>{
   if(!row||!ID.test(row.id)||seen.has(row.id))throw Error('Each shared fixture needs a unique ID.');seen.add(row.id);
   const out={id:row.id};
   for(const key of ['fixId','manufacturer','fixture','shortName','mode','gdtfMode','location','colour1','colour2','colour3'])out[key]=text(row[key]);
   out.notes=text(row.notes,4000);
   for(const key of ['universe','address','channels','parameters','watts','weight']){const value=Number(row[key]);out[key]=row[key]!==null&&row[key]!==undefined&&row[key]!==''&&Number.isFinite(value)&&value>=0&&value<1e9?value:null}
   return out;
  });
  const positions=(Array.isArray(source.positions)?source.positions:[]).slice(0,5000).map(row=>({id:text(row.id,100),name:text(row.name),colour1:text(row.colour1),colour2:text(row.colour2),colour3:text(row.colour3)}));
  const logos={};for(const key of ['tour','vendor','secondary']){const logo=source.logos?.[key];if(logo&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(logo.dataUrl)&&logo.dataUrl.length<=200000)logos[key]={name:text(logo.name),dataUrl:logo.dataUrl}}
  const typography={};for(const key of ['headerFont','subheaderFont','bodyFont'])if(font(source.typography?.[key]))typography[key]=font(source.typography[key]);
  return {schema:2,title:text(source.title)||'Fixture Patch',patchName:text(source.patchName)||'Patch',logoVisibility:{vendor:typeof source.logoVisibility?.vendor==='boolean'?source.logoVisibility.vendor:!!logos.vendor,secondary:typeof source.logoVisibility?.secondary==='boolean'?source.logoVisibility.secondary:!!logos.secondary},fixtures,positions,logos,typography,pdfExport:pdfExport(source.pdfExport),presentation:presentation(source.presentation),fixtureNameDisplay:source.fixtureNameDisplay==='short'?'short':'full',control:control(source.control),summaryNotes:(Array.isArray(source.summaryNotes)?source.summaryNotes:[]).slice(0,100).map(v=>text(v,4000)),summaryNoteStyle:source.summaryNoteStyle==='numbered'?'numbered':'bullet',revisionNotes:(Array.isArray(source.revisionNotes)?source.revisionNotes:[]).slice(0,500).map(row=>({version:text(row.version),date:text(row.date),note:text(row.note,4000)})),units:{measurement:source.units?.measurement==='imperial'?'imperial':'metric',weight:source.units?.weight==='lb'?'lb':'kg'}};
 }
 function note(source){const general=source?.scope==='patch',parentSeq=source?.parentSeq==null?null:Number(source.parentSeq),out={requestId:text(source?.requestId,100),fixtureId:general?'':text(source?.fixtureId,100),name:text(source?.name,120).trim(),jobRole:text(source?.jobRole,120).trim(),body:text(source?.body,2000).trim(),version:Number(source?.version)};if(!ID.test(out.requestId)||(!general&&!ID.test(out.fixtureId))||(general&&source.fixtureId)||(source?.scope&&!['patch','fixture'].includes(source.scope))||(parentSeq!==null&&(!Number.isSafeInteger(parentSeq)||parentSeq<1))||!out.name||!out.jobRole||!out.body||!Number.isInteger(out.version)||out.version<1)throw Error('Enter your name, job role and a note.');if(general)out.scope='patch';if(parentSeq!==null)out.parentSeq=parentSeq;return out}
 function token(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('')}
 function colour(seq){return `hsl(${Math.round(Number(seq)*137.508)%360} 65% 92%)`}
 return {snapshot,note,token,colour,TOKEN,ID};
});
