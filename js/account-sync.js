/* Online transport and sync. Only verified complete snapshots reach local storage. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LampyAccountSync=api;})(globalThis,function(){
 'use strict';
 const MAX_BYTES=64*1024*1024,CHUNK_BYTES=1024*1024;
 class AccountError extends Error{constructor(message,status=0){super(message);this.name='AccountError';this.status=status}}
 async function digest(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('')}
 function client({baseURL,fetcher=globalThis.fetch,validate,timeout=30000}){
  const base=new URL(baseURL,globalThis.location?.href);if(base.protocol!=='https:'&&!(base.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(base.hostname)))throw Error('The account service requires HTTPS.');
  if(!base.pathname.endsWith('/'))base.pathname+='/';
  if(typeof validate!=='function')throw Error('A project validator is required.');
  async function request(path,options={}){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
   try{
    const result=await fetcher(new URL(path,base),{...options,credentials:'include',cache:'no-store',redirect:'error',signal:controller.signal,headers:{...options.headers,'X-Lampy-Request':'1'}});
    // Keep the timeout active while reading the body, not just until headers arrive.
    const limit=path.includes('/chunks/')?CHUNK_BYTES:2*1024*1024,reader=result.body?.getReader(),parts=[];let length=0;
    if(reader){try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();throw new AccountError('The account response exceeds the supported size.')}parts.push(value)}}finally{reader.releaseLock()}}
    const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength}
    if(!result.ok){let message;try{message=JSON.parse(new TextDecoder().decode(bytes)).error}catch{}throw new AccountError(message||'The account service could not complete the request.',result.status)}
    return new Response(bytes,{status:result.status,headers:result.headers});
   }catch(error){if(error instanceof AccountError)throw error;throw new AccountError('Online saving is unavailable. Your work remains on this device.')}finally{clearTimeout(timer)}
  }
  function collection(kind){if(kind!=='project'&&kind!=='template')throw Error('Invalid record type');return kind==='project'?'projects':'templates'}
  function path(kind,id){if(!/^[-a-zA-Z0-9_]{1,100}$/.test(id))throw Error('Invalid project identity');return collection(kind)+'/'+id}
  async function session(){const r=await request('session');if(!r.headers.get('Content-Type')?.includes('application/json'))throw new AccountError('Sign in to your account.',401);const data=await r.json();if(!/^[a-f0-9]{64}$/.test(data.user?.id))throw new AccountError('The account service returned an invalid identity.');return data}
  async function list(kind){const items=[];let cursor=null;const seen=new Set();do{const r=await request(collection(kind)+(cursor?'?cursor='+encodeURIComponent(cursor):'')),data=await r.json();if(!Array.isArray(data.items))throw new AccountError('Invalid project listing.');items.push(...data.items);cursor=data.cursor;if(cursor){if(seen.has(cursor)||items.length>10000)throw new AccountError('Project listing could not be completed.');seen.add(cursor)}}while(cursor);return items}
  async function manifest(kind,id){const response=await request(path(kind,id)),data=await response.json(),etag=data.storageEtag||response.headers.get('ETag');
   if(!/^"[a-f0-9]{32}"$/.test(etag||'')||data.id!==id||data.kind!==kind||data.schema!==1||!Array.isArray(data.chunks)||!data.chunks.length||data.chunks.length>64||!/^[-a-f0-9]{36}$/i.test(data.writeId)||!Number.isInteger(data.bytes)||data.bytes<1||data.bytes>MAX_BYTES||typeof data.name!=='string'||data.name.length>200||typeof data.deleted!=='boolean')throw new AccountError('Invalid online project manifest.');
   let size=0;for(const chunk of data.chunks){if(!/^[a-f0-9]{64}$/.test(chunk.sha256)||!Number.isInteger(chunk.bytes)||chunk.bytes<1||chunk.bytes>CHUNK_BYTES)throw new AccountError('Invalid online project chunk.');size+=chunk.bytes}if(size!==data.bytes)throw new AccountError('Invalid online project size.');
   return {...data,etag};
  }
  async function download(kind,id,knownManifest=null){
   const data=knownManifest||await manifest(kind,id),bytes=new Uint8Array(data.bytes);let offset=0;
   for(let i=0;i<data.chunks.length;i++){
    const r=await request(path(kind,id)+'/chunks/'+data.writeId+'/'+i),chunk=new Uint8Array(await r.arrayBuffer());
    if(chunk.length!==data.chunks[i].bytes||await digest(chunk)!==data.chunks[i].sha256)throw new AccountError('The online download is incomplete or damaged. The local project has not changed.');
    bytes.set(chunk,offset);offset+=chunk.length;
   }
   let payload;try{payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));validate(kind,payload)}catch(error){throw new AccountError('The online project did not pass validation: '+error.message)}
   return {manifest:data,payload};
  }
  async function upload(record,lease){
   validate(record.kind,record.payload);
   const bytes=new TextEncoder().encode(JSON.stringify(record.payload));if(bytes.length>MAX_BYTES)throw new AccountError('This project exceeds the 64 MiB online project limit. The complete local copy is retained.',413);
   let baseEtag=lease.baseEtag;
   if(baseEtag?.startsWith('W/')){
    // Recover older leases without discarding local edits.
    // Never replace a stale condition with the latest version unconditionally.
    const remote=await manifest(record.kind,record.id);
    if(remote.etag!==baseEtag.slice(2)&&remote.writeId!==lease.writeId)throw new AccountError('The online project changed. Review both versions before continuing.',412);
    baseEtag=remote.etag;
   }
   const chunks=[],route=path(record.kind,record.id);
   for(let offset=0;offset<bytes.length;offset+=CHUNK_BYTES){
    const chunk=bytes.slice(offset,offset+CHUNK_BYTES),sha256=await digest(chunk),r=await request(route+'/chunks/'+lease.writeId+'/'+chunks.length,{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:chunk}),result=await r.json();
    if(result.sha256!==sha256||result.bytes!==chunk.length)throw new AccountError('The upload could not be verified. The online project has not changed.');chunks.push({sha256,bytes:chunk.length});
   }
   const body={schema:1,writeId:lease.writeId,name:record.name,deleted:record.deleted,chunks,bytes:bytes.length};
   const response=await request(route,{method:'PUT',headers:{'Content-Type':'application/json',...(baseEtag?{'If-Match':baseEtag}:{'If-None-Match':'*'})},body:JSON.stringify(body)}),result=await response.json();
   if(!result.etag||result.writeId!==lease.writeId)throw new AccountError('The server did not confirm the saved project.');return result;
  }
  async function profile(){return (await request('profile')).json()}
  async function saveProfile(data,etag){return (await request('profile',{method:'PUT',headers:{'Content-Type':'application/json',...(etag?{'If-Match':etag}:{'If-None-Match':'*'})},body:JSON.stringify(data)})).json()}
  return {session,list,manifest,download,upload,profile,saveProfile,loginURL:new URL('login',base).href,logoutURL:new URL('/cdn-cgi/access/logout',base).href};
 }
 function coordinator({store,api,owner,onChange=()=>{}}){
  async function checkIdentity(){const data=await api.session();if(data.user.id!==owner)throw new AccountError('This device project belongs to a different signed-in account.',403);return data.user}
  async function syncOne(kind,id){
   await checkIdentity();const pending=await store.beginSync(owner,kind,id);if(!pending)return null;
   try{
    const result=await api.upload(pending.record,pending.lease),record=await store.finishSync(owner,kind,id,{token:pending.lease.token,etag:result.etag});onChange(record);return record;
   }catch(error){
    let conflict=null;if(error.status===412){try{const remote=await api.manifest(kind,id);conflict={etag:remote.etag,name:remote.name,updatedAt:remote.updatedAt,deleted:remote.deleted}}catch{conflict={message:'The online project changed. Reconnect to review both versions.'}}}
    const record=await store.finishSync(owner,kind,id,{token:pending.lease.token,error:error.message,conflict});onChange(record);throw error;
   }
  }
  async function pull(kind,id){
   await checkIdentity();const local=await store.read(owner,kind,id),remote=await api.manifest(kind,id);
   if(local?.remoteEtag===remote.etag)return {ok:true,record:local};
   if(local?.dirty)return {ok:false,conflict:true,current:local,remote};
   const {payload}=await api.download(kind,id,remote);
   if(!local){const record=await store.create({owner,kind,id,name:remote.name,payload,remoteEtag:remote.etag});if(remote.deleted){const updated=await store.acceptRemote({owner,kind,id,expectedRevision:record.revision,expectedEtag:remote.etag,payload,name:remote.name,etag:remote.etag,deleted:true});onChange(updated.record);return updated}onChange(record);return {ok:true,record}}
   const result=await store.acceptRemote({owner,kind,id,expectedRevision:local.revision,expectedEtag:local.remoteEtag,payload,name:remote.name,etag:remote.etag,deleted:remote.deleted});if(result.ok)onChange(result.record);return result;
  }
  async function acceptOnline(kind,id,reviewedRevision,reviewedEtag){
   await checkIdentity();const local=await store.read(owner,kind,id);if(!local||local.revision!==reviewedRevision)return {ok:false,reason:'The local project changed after the review.'};
   const remote=await api.manifest(kind,id);if(remote.etag!==reviewedEtag)return {ok:false,reason:'The online project changed after the review.'};
   const {payload}=await api.download(kind,id,remote),result=await store.acceptRemote({owner,kind,id,expectedRevision:local.revision,expectedEtag:local.remoteEtag,payload,name:remote.name,etag:remote.etag,deleted:remote.deleted});if(result.ok)onChange(result.record);return result;
  }
  return {checkIdentity,syncOne,pull,acceptOnline};
 }
 return {MAX_BYTES,CHUNK_BYTES,AccountError,client,coordinator,digest};
});
