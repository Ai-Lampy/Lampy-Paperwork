import Core from '../js/patch-sharing-core.js';
const PREFIX='/paperwork/account-api/shares',MAX_BYTES=1024*1024;
class Failure extends Error{constructor(status,message){super(message);this.status=status}}
function fail(status,message){throw new Failure(status,message)}
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
async function body(request){
 const reader=request.body?.getReader();if(!reader)fail(400,'Missing request.');let length=0,chunks=[];
 try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>MAX_BYTES){await reader.cancel();fail(413,'The shared patch must be smaller than 1 MiB.')}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 try{return JSON.parse(new TextDecoder().decode(bytes))}catch{fail(400,'Invalid JSON.')}
}
async function rate(db,key,limit,period=60000){
 const now=Math.floor(Date.now()/period);
 const result=await db.prepare('INSERT INTO patch_rate_limits(key,window,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET window=excluded.window,count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END RETURNING count').bind(key,now).first();
 if(result.count>limit)fail(429,'Too many requests. Try again shortly.');
}
function publicNote(row){return {seq:row.seq,fixtureId:row.fixture_id,fixtureLabel:row.fixture_label,name:row.name,jobRole:row.job_role,body:row.body,version:row.version,createdAt:row.created_at}}
export default {async fetch(request,env){
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
 try{
  const origin=request.headers.get('Origin'),allowed=(env.ALLOWED_ORIGINS||'https://ailampy.com').split(',').map(x=>x.trim());
  if(origin&&!allowed.includes(origin))fail(403,'Origin not allowed.');
  if(origin){headers['Access-Control-Allow-Origin']=origin;headers.Vary='Origin'}
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS','Access-Control-Allow-Headers':'Content-Type,X-Lampy-Owner,X-Lampy-Share'}});
  const url=new URL(request.url),prefix=env.SHARE_PREFIX||PREFIX;
  if(url.pathname==='/signed-out')return new Response(null,{status:303,headers:{...headers,Location:env.APP_URL||'https://ailampy.com/paperwork/'}});
  if(!url.pathname.startsWith(prefix+'/'))fail(410,'Sign-in and account services have been retired.');
  const parts=url.pathname.slice(prefix.length+1).split('/'),id=parts[0];if(!Core.ID.test(id)||parts.length>2)fail(404,'Shared patch not found.');
  const db=env.AUTH_DB;if(!db)fail(503,'Patch sharing is not configured.');
  const write=request.method!=='GET';if(write&&(!origin||!request.headers.get('Content-Type')?.startsWith('application/json')))fail(403,'Use the Lampy Paperwork sharing controls.');
  const owner=request.headers.get('X-Lampy-Owner'),viewer=request.headers.get('X-Lampy-Share');
  if((owner&&!Core.TOKEN.test(owner))||(viewer&&!Core.TOKEN.test(viewer)))fail(403,'Invalid sharing link.');
  const credential=owner||viewer;if(!credential)fail(403,'A sharing link is required.');
  const digest=await hash(credential),now=Date.now();
  let share=await db.prepare('SELECT * FROM patch_shares WHERE id=?').bind(id).first();
  if(request.method==='POST'&&parts.length===1&&!share){
   if(!owner)fail(403,'An owner link is required.');const input=await body(request);
   if(!Core.TOKEN.test(input.viewerToken)||input.viewerToken===owner)fail(400,'Invalid viewer token.');
   const snapshot=Core.snapshot(input.snapshot),encoded=JSON.stringify(snapshot);if(new TextEncoder().encode(encoded).length>800000)fail(413,'This patch is too large to share.');
   // Bound anonymous use on the free plan. IP values are hashed and never stored raw.
   await rate(db,'create-global',100,3600000);
   await db.prepare("DELETE FROM patch_rate_limits WHERE key LIKE 'create:%' AND window<?").bind(Math.floor(now/3600000)-1).run();
   await rate(db,'create:'+await hash(request.headers.get('CF-Connecting-IP')||'local'),10,3600000);
   const created=await db.prepare('INSERT OR IGNORE INTO patch_shares(id,owner_hash,viewer_hash,snapshot,created_at,updated_at) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM patch_shares)<200').bind(id,digest,await hash(input.viewerToken),encoded,now,now).run();
   if(!created.meta.changes){share=await db.prepare('SELECT * FROM patch_shares WHERE id=?').bind(id).first();if(!share||share.owner_hash!==digest)fail(409,'Sharing capacity reached or link identity already exists.')}else share=await db.prepare('SELECT * FROM patch_shares WHERE id=?').bind(id).first();
  }
  if(!share||digest!==(owner?share.owner_hash:share.viewer_hash))fail(404,'Shared patch not found.');
  if(share.revoked&&!owner)fail(410,'This sharing link has been revoked.');
  if(request.method==='GET'&&parts.length===1||request.method==='POST'&&parts.length===1&&owner){
   const after=Math.max(0,Number(url.searchParams.get('after'))||0);
   const notes=await db.prepare('SELECT * FROM patch_notes WHERE share_id=? AND seq>? ORDER BY seq LIMIT 251').bind(id,after).all();
   return new Response(JSON.stringify({id,version:share.version,revoked:!!share.revoked,readSeq:owner?share.read_seq:undefined,snapshot:JSON.parse(share.snapshot),more:notes.results.length>250,notes:notes.results.slice(0,250).map(publicNote)}),{headers});
  }
  if(request.method==='POST'&&parts[1]==='notes'){
   if(!viewer||owner)fail(403,'Use the viewer link to add notes.');
   const input=Core.note(await body(request));
   const prior=await db.prepare('SELECT * FROM patch_notes WHERE share_id=? AND request_id=?').bind(id,input.requestId).first();
   if(prior){if(prior.fixture_id!==input.fixtureId||prior.body!==input.body||prior.name!==input.name||prior.job_role!==input.jobRole||prior.version!==input.version)fail(409,'This note request has already been used.');return new Response(JSON.stringify(publicNote(prior)),{headers})}
   if(input.version!==share.version)fail(409,'The owner published a new patch. Refresh before sending your note.');
   const fixture=JSON.parse(share.snapshot).fixtures.find(row=>row.id===input.fixtureId);if(!fixture)fail(400,'Fixture is not in this shared patch.');
   await rate(db,'notes:'+id,30);
   const result=await db.prepare('INSERT OR IGNORE INTO patch_notes(share_id,request_id,fixture_id,fixture_label,name,job_role,body,version,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM patch_shares WHERE id=? AND version=? AND revoked=0) AND (SELECT COUNT(*) FROM patch_notes WHERE share_id=?)<10000 AND (SELECT COUNT(*) FROM patch_notes)<50000').bind(id,input.requestId,input.fixtureId,fixture.fixId+' · '+fixture.fixture,input.name,input.jobRole,input.body,input.version,now,id,input.version,id).run();
   if(!result.meta.changes)fail(409,'Patch changed or the note limit was reached. Refresh and try again.');
   const saved=await db.prepare('SELECT * FROM patch_notes WHERE share_id=? AND request_id=?').bind(id,input.requestId).first();return new Response(JSON.stringify(publicNote(saved)),{status:201,headers});
  }
  if(!owner)fail(403,'Only the owner link can manage this patch.');
  const input=await body(request);
  if(request.method==='PUT'&&parts[1]==='snapshot'){
   if(share.revoked)fail(410,'Create a new share after revoking a link.');
   const snapshot=JSON.stringify(Core.snapshot(input.snapshot));if(new TextEncoder().encode(snapshot).length>800000)fail(413,'This patch is too large to share.');
   const result=await db.prepare('UPDATE patch_shares SET snapshot=?,version=version+1,updated_at=? WHERE id=? AND version=? AND revoked=0').bind(snapshot,now,id,Number(input.version)||0).run();
   if(!result.meta.changes)fail(409,'Another owner window changed this patch. Refresh and try again.');
  }else if(request.method==='POST'&&parts[1]==='revoke')await db.prepare('UPDATE patch_shares SET revoked=1,updated_at=? WHERE id=?').bind(now,id).run();
  else if(request.method==='POST'&&parts[1]==='read')await db.prepare('UPDATE patch_shares SET read_seq=MAX(read_seq,MIN(?,COALESCE((SELECT MAX(seq) FROM patch_notes WHERE share_id=?),0))) WHERE id=?').bind(Math.max(0,Number(input.seq)||0),id,id).run();
  else fail(404,'Sharing action not found.');
  return new Response(JSON.stringify({ok:true}),{headers});
 }catch(error){return new Response(JSON.stringify({error:error instanceof Failure?error.message:error instanceof TypeError?'Invalid sharing request.':'Patch sharing is unavailable. Try again shortly.'}),{status:error.status|| (error.message?.startsWith('Share ')||error.message?.startsWith('Each shared')||error.message?.startsWith('Enter your')?400:503),headers})}
}};
