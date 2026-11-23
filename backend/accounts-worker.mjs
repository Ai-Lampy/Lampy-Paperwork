/* Private V59 API. Project bytes are streamed in bounded, immutable chunks.
 * Access identity and conditional manifest writes protect every online save.
 * No website sessions, browser-supplied owner IDs or public storage buckets.
 */
const CHUNK_BYTES=1024*1024, MAX_BYTES=64*1024*1024, MAX_CHUNKS=64;
const ID=/^[a-zA-Z0-9_-]{1,100}$/, WRITE_ID=/^[a-f0-9-]{36}$/i, HASH=/^[a-f0-9]{64}$/;
const encoder=new TextEncoder();
class ApiError extends Error{constructor(status,message){super(message);this.status=status}}
function deny(status,message){throw new ApiError(status,message)}
function json(value,status=200,headers={}){return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}})}
async function bounded(request,limit){
 const length=request.headers.get('Content-Length');if(length!==null&&(!/^\d+$/.test(length)||Number(length)>limit))deny(413,'Upload exceeds the supported size.');
 if(!request.body)return new Uint8Array();
 const reader=request.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();deny(413,'Upload exceeds the supported size.')}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}return bytes;
}
async function readJSON(request,limit=32768){try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await bounded(request,limit)))}catch(e){if(e instanceof ApiError)throw e;deny(400,'Invalid JSON.')}}
async function sha256(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('')}
function base64url(value){if(!/^[A-Za-z0-9_-]+$/.test(value))deny(401,'Invalid sign-in token.');try{return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))}catch{deny(401,'Invalid sign-in token.')}}
async function identity(request,env,fetcher){
 if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_ISSUER||'')||!env.ACCESS_AUDIENCE||!env.ALLOWED_EMAIL)deny(503,'The account pilot is not configured.');
 const jwt=request.headers.get('Cf-Access-Jwt-Assertion')||'';
 if(jwt.length>16384)deny(401,'Invalid sign-in token.');const parts=jwt.split('.');if(parts.length!==3)deny(401,'Sign in to your account.');
 let header,claims;try{header=JSON.parse(new TextDecoder().decode(base64url(parts[0])));claims=JSON.parse(new TextDecoder().decode(base64url(parts[1])))}catch{deny(401,'Invalid sign-in token.')}
 if(header.alg!=='RS256'||typeof header.kid!=='string')deny(401,'Unsupported sign-in token.');
 const now=Math.floor(Date.now()/1000);
 if(claims.iss!==env.ACCESS_ISSUER||!Array.isArray(claims.aud)||!claims.aud.includes(env.ACCESS_AUDIENCE)||!Number.isFinite(claims.exp)||claims.exp<=now||(claims.nbf!==undefined&&(!Number.isFinite(claims.nbf)||claims.nbf>now+30))||typeof claims.sub!=='string'||!claims.sub||claims.sub.length>256)deny(401,'Your sign-in has expired or is invalid.');
 const response=await fetcher(env.ACCESS_ISSUER+'/cdn-cgi/access/certs',{signal:AbortSignal.timeout(10000)});
 if(!response.ok)deny(503,'Sign-in verification is temporarily unavailable.');
 const keys=await readJSON(response,65536),jwk=keys.keys?.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256'));
 if(!jwk)deny(401,'Sign in again.');
 let verified=false;try{const publicKey=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);verified=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',publicKey,base64url(parts[2]),encoder.encode(parts[0]+'.'+parts[1]))}catch{deny(401,'Invalid sign-in token.')}
 if(!verified)deny(401,'Invalid sign-in signature.');
 if(typeof claims.email!=='string'||claims.email.toLowerCase()!==env.ALLOWED_EMAIL.toLowerCase())deny(403,'This pilot is restricted to its owner.');
 return {id:await sha256(encoder.encode(claims.iss+'\n'+claims.sub)),email:claims.email};
}
function validateManifest(data){
 if(!data||typeof data!=='object'||data.schema!==1||typeof data.name!=='string'||!data.name.trim()||data.name.length>200||!WRITE_ID.test(data.writeId)||!Array.isArray(data.chunks)||!data.chunks.length||data.chunks.length>MAX_CHUNKS||typeof data.deleted!=='boolean')deny(400,'Invalid project manifest.');
 let total=0;for(const chunk of data.chunks){if(!chunk||!HASH.test(chunk.sha256)||!Number.isInteger(chunk.bytes)||chunk.bytes<1||chunk.bytes>CHUNK_BYTES)deny(400,'Invalid upload chunk.');total+=chunk.bytes}
 if(total!==data.bytes||total>MAX_BYTES)deny(400,'Invalid project size.');
 return {schema:1,name:data.name.trim(),writeId:data.writeId,chunks:data.chunks.map(x=>({sha256:x.sha256,bytes:x.bytes})),bytes:total,deleted:data.deleted};
}
function precondition(request){
 const match=request.headers.get('If-Match'),none=request.headers.get('If-None-Match');
 if(match&&none)deny(400,'Supply one version condition.');
 if(none==='*')return {etagDoesNotMatch:'*'};
 if(match&&/^"[a-f0-9]{32}"$/.test(match))return {etagMatches:match.slice(1,-1)};
 deny(428,'A project version condition is required.');
}
function objectSummary(object){const m=object.customMetadata||{};return {id:object.key.split('/').at(-1),name:decodeURIComponent(m.name||''),etag:object.httpEtag,updatedAt:m.updatedAt,deleted:m.deleted==='true',bytes:Number(m.bytes||0),writeId:m.writeId}}
function validateProfile(data){
 if(!data||data.schema!==1||!WRITE_ID.test(data.writeId||''))deny(400,'Invalid account details.');
 const profile={schema:1,writeId:data.writeId};
 for(const [key,limit] of Object.entries({name:120,company:160,phone:50,jobRole:120,county:120,country:120,referral:500})){
  if(typeof data[key]!=='string'||data[key].length>limit||/[\u0000-\u001f\u007f]/.test(data[key]))deny(400,'Invalid '+key+' field.');
  profile[key]=data[key].trim();
 }
 if(!profile.name)deny(400,'Enter your name.');
 return profile;
}
export function createHandler({fetcher=globalThis.fetch}={}){return async function handle(request,env){
 let cors={};try{
  const url=new URL(request.url),origin=request.headers.get('Origin'),allowed=(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(origin&&!allowed.includes(origin))deny(403,'Origin is not allowed.');
  if(origin)cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Access-Control-Expose-Headers':'ETag','Vary':'Origin'};
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'GET, PUT, OPTIONS','Access-Control-Allow-Headers':'Content-Type, If-Match, If-None-Match, X-Lampy-Request','Access-Control-Max-Age':'600'}});
  const user=await identity(request,env,fetcher);
  const prefix=env.API_PREFIX||'/paperwork/account-api';
  if(!url.pathname.startsWith(prefix+'/'))deny(404,'Not found.');
  const path=url.pathname.slice(prefix.length+1).split('/');
  if(path.length===1&&path[0]==='session'&&request.method==='GET')return json({user,limits:{chunkBytes:CHUNK_BYTES,maxBytes:MAX_BYTES}},200,cors);
  if(path.length===1&&path[0]==='login'&&request.method==='GET'){
   const destination=new URL(env.APP_URL);if(!allowed.includes(destination.origin))deny(503,'Invalid pilot destination.');
   return new Response(null,{status:303,headers:{Location:destination.href,'Cache-Control':'no-store'}});
  }
  if(!env.PROJECTS)deny(503,'Online project storage is not configured.');
  if(path.length===1&&path[0]==='profile'){
   const key=`owners/${user.id}/account/profile`,bucket=env.PROJECTS;
   if(request.method==='GET'){
    const object=await bucket.get(key);
    return json({profile:object?await object.json():null,etag:object?.httpEtag||null,email:user.email},200,cors);
   }
   if(request.method==='PUT'){
    if(!origin||request.headers.get('X-Lampy-Request')!=='1')deny(403,'Missing request protection.');
    if(!request.headers.get('Content-Type')?.startsWith('application/json'))deny(415,'Use JSON account details.');
    const condition=precondition(request),data=validateProfile(await readJSON(request,8192));
    const existing=await bucket.get(key),previous=existing?await existing.json():null;
    if(previous?.writeId===data.writeId){
     if(JSON.stringify(validateProfile(previous))!==JSON.stringify(data))deny(409,'An account update identity cannot be reused for different details.');
     return json({profile:previous,etag:existing.httpEtag,email:user.email},200,cors);
    }
    const now=new Date().toISOString(),profile={...data,createdAt:previous?.createdAt||now,updatedAt:now};
    const saved=await bucket.put(key,JSON.stringify(profile),{onlyIf:condition,httpMetadata:{contentType:'application/json'}});
    if(!saved)deny(412,'Your account details changed in another window. Your entries are retained; reload the saved details before trying again.');
    return json({profile,etag:saved.httpEtag,email:user.email},200,cors);
   }
   deny(405,'Method is not supported.');
  }
  const kind=path[0]==='projects'?'project':path[0]==='templates'?'template':null;
  if(!kind)deny(404,'Not found.');
  const bucket=env.PROJECTS,base=`owners/${user.id}/${kind}/`,currentPrefix=base+'current/';
  if(path.length===1&&request.method==='GET'){
   const cursor=url.searchParams.get('cursor')||undefined;if(cursor?.length>2048)deny(400,'Invalid cursor.');
   const page=await bucket.list({prefix:currentPrefix,limit:100,cursor,include:['customMetadata']});
   return json({items:page.objects.map(objectSummary),cursor:page.truncated?page.cursor:null},200,cors);
  }
  const id=path[1];if(!ID.test(id||''))deny(400,'Invalid project identity.');
  const currentKey=currentPrefix+id;
  if(path.length===2&&request.method==='GET'){
   const object=await bucket.get(currentKey);if(!object)deny(404,'Project not found.');
   // The CDN may weaken HTTP ETags during compression. Keep the exact R2
   // version inside the bounded manifest so clients retain a strong condition.
   const manifest=await object.json();
   return json({...manifest,storageEtag:object.httpEtag},200,{...cors,ETag:object.httpEtag});
  }
  if(path.length===5&&path[2]==='chunks'){
   const writeId=path[3],index=Number(path[4]);if(!WRITE_ID.test(writeId)||!/^\d+$/.test(path[4])||index<0||index>=MAX_CHUNKS)deny(400,'Invalid upload identity.');
   const chunkKey=`${base}chunks/${id}/${writeId}/${index}`;
   if(request.method==='GET'){
    const object=await bucket.get(chunkKey);if(!object)deny(404,'Upload chunk not found.');
    return new Response(object.body,{headers:{...cors,'Content-Type':'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Length':String(object.size)}});
   }
   if(request.method==='PUT'){
    if(!origin||request.headers.get('X-Lampy-Request')!=='1')deny(403,'Missing request protection.');
    const bytes=await bounded(request,CHUNK_BYTES);if(!bytes.length)deny(400,'An empty upload chunk is not valid.');
    const hash=await sha256(bytes),object=await bucket.put(chunkKey,bytes,{onlyIf:{etagDoesNotMatch:'*'},customMetadata:{sha256:hash},httpMetadata:{contentType:'application/octet-stream'}});
    if(!object){const prior=await bucket.head(chunkKey);if(!prior||prior.customMetadata?.sha256!==hash||prior.size!==bytes.length)deny(409,'This upload identity already contains different data.');}
    return json({sha256:hash,bytes:bytes.length},200,cors);
   }
  }
  if(path.length===2&&request.method==='PUT'){
   if(!origin||request.headers.get('X-Lampy-Request')!=='1')deny(403,'Missing request protection.');
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))deny(415,'Use a JSON project manifest.');
   const condition=precondition(request),data=validateManifest(await readJSON(request));
   // Idempotent retries can confirm a save whose response was lost.
   const existing=await bucket.get(currentKey),previous=existing?await existing.json():null;
   if(previous?.writeId===data.writeId){
    const priorComparable=validateManifest(previous);
    if(JSON.stringify(priorComparable)!==JSON.stringify(data))deny(409,'An upload identity cannot be reused for a different save.');
    return json({etag:existing.httpEtag,updatedAt:previous.updatedAt,writeId:data.writeId},200,{...cors,ETag:existing.httpEtag});
   }
   for(let index=0;index<data.chunks.length;index++){
    const expected=data.chunks[index],chunk=await bucket.head(`${base}chunks/${id}/${data.writeId}/${index}`);
    if(!chunk||chunk.size!==expected.bytes||chunk.customMetadata?.sha256!==expected.sha256)deny(409,'The upload is incomplete. Your online project has not changed.');
   }
   if(existing)await bucket.put(`${base}history/${id}/${existing.etag}`,JSON.stringify(previous),{onlyIf:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'}});
   const updatedAt=new Date().toISOString(),manifest={...data,id,kind,updatedAt};
   const saved=await bucket.put(currentKey,JSON.stringify(manifest),{onlyIf:condition,httpMetadata:{contentType:'application/json'},customMetadata:{name:encodeURIComponent(data.name),updatedAt,deleted:String(data.deleted),bytes:String(data.bytes),writeId:data.writeId}});
   if(!saved)deny(412,'The online project changed. Review both versions before continuing.');
   return json({etag:saved.httpEtag,updatedAt,writeId:data.writeId},200,{...cors,ETag:saved.httpEtag});
  }
  deny(405,'Method or route is not supported.');
 }catch(error){
  if(!(error instanceof ApiError))console.error(JSON.stringify({event:'account-api-error',type:error?.name||'Error'}));
  return json({error:error instanceof ApiError?error.message:'The account service is temporarily unavailable. Your local work is retained.'},error instanceof ApiError?error.status:503,cors);
 }
}}
export default {fetch:createHandler()};
