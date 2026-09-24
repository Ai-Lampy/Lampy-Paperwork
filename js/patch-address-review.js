/* Pure address proposals: never mutate the live patch. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LampyPatchAddress=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const text=value=>String(value??'').trim();
 const integer=value=>/^\d+$/.test(text(value))&&Number.isSafeInteger(Number(value))&&Number(value)>0;
 const universeKey=value=>integer(value)?String(Number(value)):text(value);
 function sort(rows){return rows.map((row,index)=>({row,index})).sort((a,b)=>(Number(!text(a.row.fixId))-Number(!text(b.row.fixId)))||text(a.row.fixId).localeCompare(text(b.row.fixId),'en',{numeric:true,sensitivity:'base'})||a.index-b.index).map(item=>item.row)}
 function sequence(rows,start){let cursor=text(start);return sort(rows).map(row=>{const result={...row,address:cursor};if(cursor!=='')cursor=integer(cursor)&&integer(row.channels)?String(Number(cursor)+Number(row.channels)):'Invalid footprint';return result})}
 function grouped(rows,start){const groups=new Map();for(const row of rows){const key=universeKey(row.universe);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)}return [...groups.values()].flatMap(group=>sequence(group,start))}
 function downstream(rows,edits,preserveOverrides=false){
  const selected=new Map();
  for(const edit of edits){const row=rows.find(item=>item.id===edit.id);if(!row)continue;selected.set(row.id,row);if(text(edit.value)!==''&&integer(row.address)&&integer(row.universe))for(const other of rows)if(universeKey(other.universe)===universeKey(row.universe)&&integer(other.address)&&Number(other.address)>Number(row.address))selected.set(other.id,other)}
  const groups=new Map();for(const row of rows.filter(row=>selected.has(row.id))){const key=universeKey(row.universe);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)}
  const proposals=[];
  for(const group of groups.values()){
   const ids=new Set(group.map(row=>row.id)),seeds=edits.filter(edit=>ids.has(edit.id)).sort((a,b)=>Number(rows.find(row=>row.id===a.id)?.address||Infinity)-Number(rows.find(row=>row.id===b.id)?.address||Infinity));
   proposals.push(...sequence(group,seeds[0].value));
  }
  // A single edit supplies the sequence start, even if its row is not the lowest ID.
  // Multi-cell paste/fill additionally preserves every explicit target value.
  if(preserveOverrides||edits.length>1)for(const edit of edits){const row=proposals.find(row=>row.id===edit.id);if(row)row.address=text(edit.value)}
  return proposals;
 }
 function validate(original,proposals){
  const ids=new Set(proposals.map(row=>row.id)),errors=new Map(proposals.map(row=>[row.id,[]])),spans=[];
  const add=(id,message)=>{if(errors.has(id)&&!errors.get(id).includes(message))errors.get(id).push(message)};
  for(const row of [...original.filter(row=>!ids.has(row.id)),...proposals]){
   const address=text(row.address);if(!address)continue;
   if(!integer(row.universe))add(row.id,'Universe is missing or invalid.');
   if(!integer(address)||Number(address)>512)add(row.id,'Address must be an integer from 1 to 512.');
   if(!integer(row.channels))add(row.id,'Channel footprint is missing or invalid.');
   if(!integer(address)||!integer(row.channels)||!integer(row.universe))continue;
   const start=Number(address),end=start+Number(row.channels)-1;
   if(end>512)add(row.id,`Footprint ends at ${end}, beyond 512.`);
   for(const old of spans)if(old.universe===universeKey(row.universe)&&start<=old.end&&end>=old.start){add(row.id,`Overlaps Fix ID ${text(old.row.fixId)||'—'} (${Math.max(start,old.start)}–${Math.min(end,old.end)}).`);add(old.row.id,`Overlaps Fix ID ${text(row.fixId)||'—'} (${Math.max(start,old.start)}–${Math.min(end,old.end)}).`)}
   spans.push({row,universe:universeKey(row.universe),start,end});
  }
  return proposals.map(row=>({id:row.id,errors:errors.get(row.id),state:errors.get(row.id).length?'invalid':text(row.address)?'valid':'blank'}));
 }
 function confirmed(original,proposals){const invalid=new Set(validate(original,proposals).filter(item=>item.errors.length).map(item=>item.id));return proposals.map(row=>({...row,address:invalid.has(row.id)?'':text(row.address)}))}
 return {sort,sequence,grouped,downstream,validate,confirmed};
});
