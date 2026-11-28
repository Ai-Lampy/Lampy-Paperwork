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
  const logos={};for(const key of ['tour','vendor','secondary']){const logo=source.logos?.[key];if(logo&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(logo.dataUrl)&&logo.dataUrl.length<=180000)logos[key]={name:text(logo.name),dataUrl:logo.dataUrl}}
  const typography={};for(const key of ['headerFont','subheaderFont','bodyFont'])if(font(source.typography?.[key]))typography[key]=font(source.typography[key]);
  return {schema:2,title:text(source.title)||'Fixture Patch',fixtures,positions,logos,typography,presentation:presentation(source.presentation),fixtureNameDisplay:source.fixtureNameDisplay==='short'?'short':'full',control:control(source.control),summaryNotes:(Array.isArray(source.summaryNotes)?source.summaryNotes:[]).slice(0,100).map(v=>text(v,4000)),summaryNoteStyle:source.summaryNoteStyle==='numbered'?'numbered':'bullet',revisionNotes:(Array.isArray(source.revisionNotes)?source.revisionNotes:[]).slice(0,500).map(row=>({version:text(row.version),date:text(row.date),note:text(row.note,4000)})),units:{measurement:source.units?.measurement==='imperial'?'imperial':'metric',weight:source.units?.weight==='lb'?'lb':'kg'}};
 }
 function note(source){const out={requestId:text(source?.requestId,100),fixtureId:text(source?.fixtureId,100),name:text(source?.name,120).trim(),jobRole:text(source?.jobRole,120).trim(),body:text(source?.body,2000).trim(),version:Number(source?.version)};if(!ID.test(out.requestId)||!ID.test(out.fixtureId)||!out.name||!out.jobRole||!out.body||!Number.isInteger(out.version)||out.version<1)throw Error('Enter your name, job role and a note.');return out}
 function token(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('')}
 function colour(seq){return `hsl(${Math.round(Number(seq)*137.508)%360} 65% 92%)`}
 return {snapshot,note,token,colour,TOKEN,ID};
});
