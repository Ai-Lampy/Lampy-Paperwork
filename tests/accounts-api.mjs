import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createHandler} from '../backend/accounts-worker.mjs';
const CHUNK_BYTES=1024*1024;
const enc=new TextEncoder(),issuer='https://lampy-test.cloudflareaccess.com',audience='test-account-audience',origin='https://ailampy.com',prefix='/paperwork/account-api';
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'test-key',alg:'RS256'};
const b64=value=>Buffer.from(value).toString('base64url');
async function token(overrides={}){
 const header=b64(JSON.stringify({alg:'RS256',kid:'test-key'})),payload=b64(JSON.stringify({iss:issuer,aud:[audience],sub:'owner-subject',email:'owner@example.test',exp:Math.floor(Date.now()/1000)+3600,...overrides}));
 return header+'.'+payload+'.'+b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,enc.encode(header+'.'+payload)));
}
class MemoryR2{
 items=new Map();
 async put(key,value,options={}){
  const current=this.items.get(key),condition=options.onlyIf||{};
  if(condition.etagDoesNotMatch==='*'&&current)return null;
  if(condition.etagMatches&&current?.etag!==condition.etagMatches)return null;
  const bytes=typeof value==='string'?enc.encode(value):new Uint8Array(value);
  const etag=createHash('md5').update(bytes).digest('hex');
  const record={key,bytes:bytes.slice(),size:bytes.length,etag,httpEtag:'"'+etag+'"',customMetadata:options.customMetadata||{}};
  this.items.set(key,record);return {...record};
 }
 async head(key){const record=this.items.get(key);return record?{...record}:null}
 async get(key){const record=this.items.get(key);return record?{...record,body:new Blob([record.bytes]).stream(),json:async()=>JSON.parse(new TextDecoder().decode(record.bytes))}:null}
 async list({prefix}){return {objects:[...this.items.values()].filter(x=>x.key.startsWith(prefix)),truncated:false}}
}
const bucket=new MemoryR2(),env={ACCESS_ISSUER:issuer,ACCESS_AUDIENCE:audience,ALLOWED_EMAIL:'owner@example.test',ALLOWED_ORIGINS:origin,API_PREFIX:prefix,APP_URL:origin+'/paperwork/',PROJECTS:bucket};
const handler=createHandler({fetcher:async url=>{assert.equal(url,issuer+'/cdn-cgi/access/certs');return Response.json({keys:[jwk]})}}),jwt=await token();
async function call(path,{method='GET',body,headers={},auth=jwt}={}){
 return handler(new Request(origin+prefix+'/'+path,{method,headers:{Origin:origin,...(auth?{'Cf-Access-Jwt-Assertion':auth}:{}),...(method==='PUT'?{'X-Lampy-Request':'1','Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:typeof body==='string'||body instanceof Uint8Array?body:JSON.stringify(body)}),env);
}
async function upload(id,text,{name='Tour',deleted=false,kind='projects',condition={'If-None-Match':'*'}}={}){
 const writeId=crypto.randomUUID(),bytes=enc.encode(text),chunks=[];
 for(let index=0;index*CHUNK_BYTES<bytes.length;index++){
  const response=await call(`${kind}/${id}/chunks/${writeId}/${index}`,{method:'PUT',body:bytes.slice(index*CHUNK_BYTES,(index+1)*CHUNK_BYTES)});
  assert.equal(response.status,200);chunks.push(await response.json());
 }
 const manifest={schema:1,writeId,name,bytes:bytes.length,chunks,deleted};
 return {manifest,response:await call(`${kind}/${id}`,{method:'PUT',headers:condition,body:manifest})};
}
assert.equal((await call('session',{auth:null})).status,401);
assert.equal((await call('session',{auth:await token({email:'someone-else@example.test'})})).status,403);
assert.equal((await call('session',{auth:await token({aud:['another-app']})})).status,401);
assert.equal((await call('session',{auth:await token({iss:'https://attacker.invalid'})})).status,401);
assert.equal((await call('session',{auth:await token({exp:1})})).status,401);
assert.equal((await call('session',{auth:jwt.slice(0,-8)+'12345678'})).status,401);
assert.equal((await call('session',{headers:{Origin:'https://attacker.invalid'}})).status,403);
const session=await (await call('session')).json();assert.equal(session.user.email,'owner@example.test');assert.equal(session.user.id.length,64);
assert.equal((await call('login')).headers.get('Location'),env.APP_URL);
// Logout callback is public but cannot redirect to a caller-selected site or
// re-open an account project. Other API routes still require verified identity.
const signedOutRequest=new Request(origin+'/signed-out?returnTo=https://attacker.invalid/&account=old&project=old');
const signedOut=await handler(signedOutRequest,env);
assert.equal(signedOut.status,303);
assert.equal(signedOut.headers.get('Location'),origin+'/paperwork/?portal=signin');
assert.equal(signedOut.headers.get('Cache-Control'),'no-store');
assert.equal((await handler(new Request(origin+'/signed-out',{method:'POST'}),env)).status,405);
assert.equal((await handler(new Request(origin+'/signed-out/'),env)).status,401);
assert.equal((await handler(signedOutRequest,{...env,APP_URL:'https://attacker.invalid/'})).status,503);
assert.equal((await handler(signedOutRequest,{...env,APP_URL:origin+'/paperwork/?account=old&project=old#details'})).headers.get('Location'),origin+'/paperwork/?portal=signin');
assert.equal((await call('profile',{auth:null})).status,401);
// Profiles are independent of project payloads and derive identity only from Access.
const signup={schema:1,writeId:crypto.randomUUID(),name:'Account Tester',company:'Example Production',phone:'+44 0000',jobRole:'Lighting technician',county:'Test County',country:'United Kingdom',referral:'Colleague'};
assert.equal((await (await call('profile')).json()).profile,null);
assert.equal((await call('profile',{auth:null})).status,401);
assert.equal((await call('profile',{method:'PUT',body:signup})).status,428);
assert.equal((await call('profile',{method:'PUT',body:signup,headers:{'If-None-Match':'*','X-Lampy-Request':''}})).status,403);
assert.equal((await call('profile',{method:'PUT',body:{...signup,name:''},headers:{'If-None-Match':'*'}})).status,400);
assert.equal((await call('profile',{method:'PUT',body:{...signup,referral:'x'.repeat(501)},headers:{'If-None-Match':'*'}})).status,400);
const profileCreate=await call('profile',{method:'PUT',body:{...signup,email:'forged@example.test',owner:'forged',role:'admin'},headers:{'If-None-Match':'*'}});
assert.equal(profileCreate.status,200);const createdProfile=await profileCreate.json();
assert.equal(createdProfile.email,'owner@example.test');assert.equal(createdProfile.profile.email,undefined);assert.equal(createdProfile.profile.role,undefined);
assert.equal(createdProfile.profile.jobRole,signup.jobRole);assert.equal(createdProfile.profile.referral,signup.referral);
assert.equal((await (await call('profile',{auth:await token({sub:'different-subject'})})).json()).profile,null);
const profileRetry=await call('profile',{method:'PUT',body:signup,headers:{'If-None-Match':'*'}});
assert.equal(profileRetry.status,200);assert.equal((await profileRetry.json()).etag,createdProfile.etag);
assert.equal((await call('profile',{method:'PUT',body:{...signup,name:'Reused identity'},headers:{'If-Match':createdProfile.etag}})).status,409);
const changedProfile={...signup,writeId:crypto.randomUUID(),jobRole:'Production manager'};
const profileUpdate=await call('profile',{method:'PUT',body:changedProfile,headers:{'If-Match':createdProfile.etag}});assert.equal(profileUpdate.status,200);
const latestProfile=await profileUpdate.json();assert.equal(latestProfile.profile.createdAt,createdProfile.profile.createdAt);
assert.equal((await call('profile',{method:'PUT',body:{...signup,writeId:crypto.randomUUID()},headers:{'If-Match':createdProfile.etag}})).status,412);
assert.deepEqual((await (await call('profile')).json()).profile,latestProfile.profile);
assert.equal((await (await call('projects')).json()).items.length,0,'profiles never appear in project listings');
const text=JSON.stringify({app:{labels:[],distros:[],fixturePatch:[],projectInfo:{file:{projectName:'Tour'}}}});
const first=await upload('project-a',text);assert.equal(first.response.status,200);const firstResult=await first.response.json();
const listing=await (await call('projects')).json();assert.equal(listing.items.length,1);assert.equal(listing.items[0].name,'Tour');
const remote=await call('projects/project-a');assert.equal(remote.headers.get('ETag'),firstResult.etag);
assert.equal((await remote.json()).writeId,first.manifest.writeId);
const chunk=await call(`projects/project-a/chunks/${first.manifest.writeId}/0`);assert.equal(await chunk.text(),text);
assert.equal((await call(`projects/project-a/chunks/${first.manifest.writeId}/0`,{method:'PUT',body:'changed bytes'})).status,409);
const retry=await call('projects/project-a',{method:'PUT',body:first.manifest,headers:{'If-None-Match':'*'}});
assert.equal(retry.status,200,'lost-response retries confirm the committed save');assert.equal((await retry.json()).etag,firstResult.etag);
const incomplete={...first.manifest,writeId:crypto.randomUUID()};
assert.equal((await call('projects/project-a',{method:'PUT',body:incomplete,headers:{'If-Match':firstResult.etag}})).status,409);
assert.equal((await call('projects/project-a')).headers.get('ETag'),firstResult.etag,'incomplete uploads do not change the current project');
const updated=await upload('project-a',text+' ',{condition:{'If-Match':firstResult.etag}});assert.equal(updated.response.status,200);const latest=await updated.response.json();
const stale=await upload('project-a',text+'  ',{condition:{'If-Match':firstResult.etag}});assert.equal(stale.response.status,412);
assert.equal((await call('projects/project-a')).headers.get('ETag'),latest.etag,'stale clients cannot overwrite a newer manifest');
assert([...bucket.items.keys()].some(key=>key.includes('/history/project-a/')),'online revisions remain recoverable');
assert.equal((await call('projects/project-a',{method:'PUT',body:first.manifest})).status,428);
assert.equal((await call('projects/project-a',{method:'PUT',body:first.manifest,headers:{'X-Lampy-Request':'','If-Match':latest.etag}})).status,403);
assert.equal((await call(`projects/project-a/chunks/${crypto.randomUUID()}/0`,{method:'PUT',body:'x',headers:{'Content-Length':String(CHUNK_BYTES+1)}})).status,413);
assert.equal((await call(`projects/project-a/chunks/${crypto.randomUUID()}/64`,{method:'PUT',body:'x'})).status,400);
assert.equal((await call('projects/project-a',{auth:await token({sub:'another-owner-id'})})).status,404,'storage keys derive from verified identity');
const deleted=await upload('project-a',text,{deleted:true,condition:{'If-Match':latest.etag}});assert.equal(deleted.response.status,200);
assert.equal((await (await call('projects')).json()).items[0].deleted,true,'deletion uses a recoverable tombstone');
assert.equal((await upload('template-a','{"areas":["logos"]}',{kind:'templates',name:'Festival'})).response.status,200);
assert.equal((await (await call('templates')).json()).items.length,1);
assert.equal((await (await call('projects')).json()).items.length,1,'project and template collections remain separate');
const big=await upload('large-project','x'.repeat(CHUNK_BYTES+123));assert.equal(big.response.status,200);assert.equal(big.manifest.chunks.length,2);
assert.equal((await handler(new Request(origin+prefix+'/session'),{...env,ACCESS_AUDIENCE:''})).status,503,'missing configuration fails closed');
console.log('PASS: signed identity, owner isolation, origin/CSRF protection, bounded chunks, conditional commits, lost-response retries, history, incomplete uploads, templates and tombstones.');

// Exercise the actual browser transport, local repository and API together.
const {default:Sync}=await import('../js/account-sync.js');
const {default:Store}=await import('../js/account-project-store.js');
const {default:Core}=await import('../js/project-core.js');
const {default:Transfer}=await import('../js/project-transfer.js');
const {indexedDB}=await import('fake-indexeddb');
const dbName='sync-integration-'+crypto.randomUUID(),local=await Store.open({indexedDB,name:dbName});
const stalled=Sync.client({baseURL:origin+prefix+'/',timeout:25,validate:()=>{},fetcher:async(url,options)=>new Response(new ReadableStream({start(controller){options.signal.addEventListener('abort',()=>controller.error(Error('Aborted response body')))}}),{headers:{'Content-Type':'application/json'}})});
await assert.rejects(stalled.session(),/unavailable/,'a response that stalls after headers must time out');
let offline=false,loseResponse=false,corruptDownload=false;
const api=Sync.client({baseURL:origin+prefix+'/',validate:(kind,payload)=>kind==='project'?Core.validateProject(payload):Transfer.validateTemplate(payload),fetcher:async (url,options)=>{
 if(offline)throw Error('Offline');
 const request=new Request(url,{...options,headers:{...options.headers,Origin:origin,'Cf-Access-Jwt-Assertion':jwt}});
 const response=await handler(request,env);
 if(loseResponse&&request.method==='PUT'&&!new URL(url).pathname.includes('/chunks/')){loseResponse=false;assert.equal(response.status,200);throw Error('Connection lost after commit')}
 if(corruptDownload&&request.method==='GET'&&new URL(url).pathname.includes('/chunks/'))return new Response('corrupt');
 return response;
}});
try{
 const {user}=await api.session(),coordinator=Sync.coordinator({store:local,api,owner:user.id});
 const payload={fileType:'Lampy Paperwork Project',app:{labels:[],distros:[],fixturePatch:[],projectInfo:{file:{projectName:'Integrated'}},gdtfFiles:{imported:{base64:'retained-original-gdtf'}}}};
 const record=await local.create({owner:user.id,id:'integrated',name:'Integrated',payload});
 loseResponse=true;await assert.rejects(coordinator.syncOne('project',record.id),/unavailable/);
 const afterLoss=await local.read(user.id,'project',record.id);assert.equal(afterLoss.dirty,true);assert(afterLoss.pendingUpload?.writeId);
 const committed=await api.manifest('project',record.id);assert.equal(committed.writeId,afterLoss.pendingUpload.writeId);
 const retry=await coordinator.syncOne('project',record.id);assert.equal(retry.dirty,false);assert.equal(retry.remoteEtag,committed.etag,'retry acknowledges the original committed upload');
 const downloaded=await api.download('project',record.id);assert.deepEqual(downloaded.payload,payload);
 corruptDownload=true;await assert.rejects(api.download('project',record.id),/damaged/);corruptDownload=false;
 assert.equal((await local.read(user.id,'project',record.id)).payload.app.gdtfFiles.imported.base64,'retained-original-gdtf');
 const modified=structuredClone(payload);modified.app.projectInfo.file.projectName='Offline changes';
 await local.save({owner:user.id,id:record.id,expectedRevision:1,payload:modified});
 offline=true;await assert.rejects(coordinator.syncOne('project',record.id),/unavailable/);offline=false;
 assert.equal((await local.read(user.id,'project',record.id)).dirty,true);
 const recovered=await coordinator.syncOne('project',record.id);assert.equal(recovered.dirty,false);
 const otherPayload=structuredClone(payload);otherPayload.app.projectInfo.file.projectName='Other device';
 await api.upload({...recovered,payload:otherPayload},{writeId:crypto.randomUUID(),baseEtag:recovered.remoteEtag});
 const localPayload=structuredClone(payload);localPayload.app.projectInfo.file.projectName='Local competing edit';
 await local.save({owner:user.id,id:record.id,expectedRevision:recovered.revision,payload:localPayload});
 await assert.rejects(coordinator.syncOne('project',record.id),/online project changed/);
 const conflicted=await local.read(user.id,'project',record.id);assert(conflicted.conflict);assert.equal(conflicted.payload.app.projectInfo.file.projectName,'Local competing edit');
 const remoteConflict=await api.manifest('project',record.id);
 const rejected=await coordinator.acceptOnline('project',record.id,conflicted.revision,'"outdated-review"');assert.equal(rejected.ok,false);
 const accepted=await coordinator.acceptOnline('project',record.id,conflicted.revision,remoteConflict.etag);assert.equal(accepted.ok,true);assert.equal(accepted.record.payload.app.projectInfo.file.projectName,'Other device');
 assert((await local.recoveries(user.id,'project',record.id)).some(x=>x.payload.app.projectInfo.file.projectName==='Local competing edit'));
 await assert.rejects(Sync.coordinator({store:local,api,owner:'wrong-owner'}).syncOne('project',record.id),/different signed-in/);
 console.log('PASS: end-to-end local-store/API sync, verified downloads, lost commit response, stable retry identity, offline edits, concurrent-device conflicts and reviewed recovery.');
}finally{local.close();indexedDB.deleteDatabase(dbName)}
