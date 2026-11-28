/* Read-only access to projects saved by retired releases. No login or sync. */
(function(root){
 'use strict';
 const DATABASE='lampy-account-projects-v1';
 async function read(){
  if(!root.indexedDB)return [];
  if(root.indexedDB.databases&&!(await root.indexedDB.databases()).some(x=>x.name===DATABASE))return [];
  return new Promise((resolve,reject)=>{
   const request=root.indexedDB.open(DATABASE);
   request.onupgradeneeded=()=>{request.transaction.abort()};
   request.onerror=()=>request.error?.name==='AbortError'?resolve([]):reject(request.error);
   request.onblocked=()=>reject(Error('Close other Lampy tabs and try recovery again.'));
   request.onsuccess=()=>{
    const db=request.result;if(!db.objectStoreNames.contains('records')){db.close();resolve([]);return}
    const tx=db.transaction('records','readonly'),get=tx.objectStore('records').getAll();let records=[];
    get.onsuccess=()=>{records=get.result.filter(x=>!x.deleted&&x.payload&&x.kind==='project')};
    tx.oncomplete=()=>{db.close();resolve(records)};tx.onerror=()=>{db.close();reject(tx.error)};
   };
  });
 }
 function download(record){const link=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(record.payload)],{type:'application/json'}));link.href=url;link.download=(String(record.name||'Recovered project').replace(/[^a-z0-9_-]/gi,'-'))+'.lampy';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 async function show(){
  root.closeActionMenu?.();const dialog=document.createElement('dialog');dialog.className='shareDialog';const heading=document.createElement('h2');heading.textContent='Recover saved projects';dialog.append(heading);
  const description=document.createElement('p');description.textContent='Download projects saved in this browser by earlier releases. Use Open Project to open a downloaded file. This does not change your current project or the stored originals.';dialog.append(description);
  const close=document.createElement('button');close.className='btn';close.textContent='Close';close.onclick=()=>dialog.close();dialog.append(close);dialog.onclose=()=>dialog.remove();document.body.append(dialog);dialog.showModal();
  try{const records=await read();if(!records.length){const p=document.createElement('p');p.textContent='No earlier saved projects were found in this browser.';dialog.append(p)}
   for(const record of records){const row=document.createElement('p'),label=document.createElement('span');label.textContent=record.name+' — '+(record.updatedAt||'');const button=document.createElement('button');button.className='btn';button.textContent='Download';button.onclick=()=>download(record);row.append(label,' ',button);dialog.append(row)}
  }catch(error){const p=document.createElement('p');p.textContent='Could not read saved projects: '+error.message;dialog.append(p)}
 }
 root.LampyLocalRecovery={read,show};
})(globalThis);
