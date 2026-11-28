/* Public snapshot allowlist. Never include a complete project or owner credentials. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LampyShareCore=api})(globalThis,function(){
 'use strict';
 const TOKEN=/^[a-f0-9]{64}$/,ID=/^[a-zA-Z0-9_-]{1,100}$/;
 const text=(v,n=200)=>String(v??'').slice(0,n);
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
  return {schema:1,title:text(source.title)||'Fixture Patch',fixtures,positions,units:{measurement:source.units?.measurement==='imperial'?'imperial':'metric',weight:source.units?.weight==='lb'?'lb':'kg'}};
 }
 function note(source){const out={requestId:text(source?.requestId,100),fixtureId:text(source?.fixtureId,100),name:text(source?.name,120).trim(),jobRole:text(source?.jobRole,120).trim(),body:text(source?.body,2000).trim(),version:Number(source?.version)};if(!ID.test(out.requestId)||!ID.test(out.fixtureId)||!out.name||!out.jobRole||!out.body||!Number.isInteger(out.version)||out.version<1)throw Error('Enter your name, job role and a note.');return out}
 function token(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('')}
 function colour(seq){return `hsl(${Math.round(Number(seq)*137.508)%360} 65% 92%)`}
 return {snapshot,note,token,colour,TOKEN,ID};
});
