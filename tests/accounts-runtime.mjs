// Run the unmodified Worker in workerd with Miniflare's real R2 binding.
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Miniflare} from 'miniflare';
import Sync from '../js/account-sync.js';
import Core from '../js/project-core.js';
import Transfer from '../js/project-transfer.js';
const directory=await mkdtemp(path.join(tmpdir(),'lampy-worker-test-'));
const issuer='https://runtime-test.cloudflareaccess.com',origin='https://lampy.example',prefix='/paperwork/account-api';
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'runtime-test',alg:'RS256'};
async function token(overrides={}){
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const unsigned=encode({alg:'RS256',kid:jwk.kid})+'.'+encode({iss:issuer,aud:['pilot'],sub:'owner',email:'owner@example.test',exp:Math.floor(Date.now()/1000)+3600,...overrides});
 return unsigned+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(unsigned))).toString('base64url');
}
const jwt=await token();
const mf=new Miniflare({rootPath:directory,modules:true,scriptPath:fileURLToPath(new URL('../backend/accounts-worker.mjs',import.meta.url)),compatibilityDate:'2026-07-30',cf:false,r2Buckets:['PROJECTS'],bindings:{ACCESS_ISSUER:issuer,ACCESS_AUDIENCE:'pilot',ALLOWED_EMAIL:'owner@example.test',ALLOWED_ORIGINS:origin+',http://127.0.0.1:8790',API_PREFIX:prefix,APP_URL:origin+'/paperwork/pilot/'},outboundService:request=>{
 assert.equal(request.url,issuer+'/cdn-cgi/access/certs','Worker must only request its configured signing keys');return Response.json({keys:[jwk]});
}});
try{
 const request=(route,options={})=>mf.dispatchFetch(origin+prefix+'/'+route,options);
 assert.equal((await request('session')).status,401);
 assert.equal((await request('session',{headers:{'Cf-Access-Jwt-Assertion':await token({email:'someone@example.test'})}})).status,403);
 assert.equal((await request('session',{headers:{'Cf-Access-Jwt-Assertion':await token({exp:1})}})).status,401);
 const api=Sync.client({baseURL:origin+prefix+'/',validate:(kind,payload)=>kind==='project'?Core.validateProject(payload):Transfer.validateTemplate(payload),fetcher:(url,options)=>mf.dispatchFetch(url.href,{...options,headers:{...options.headers,Origin:origin,'Cf-Access-Jwt-Assertion':jwt}})});
 const {user}=await api.session();assert.match(user.id,/^[a-f0-9]{64}$/);
 const payload=Transfer.empty();payload.app.projectInfo.file.projectName='Runtime project';payload.app.gdtfFiles={imported:{base64:'A'.repeat(1024*1024+256)}};
 const record={id:'runtime-project',kind:'project',name:'Runtime project',deleted:false,payload};
 const firstLease={writeId:crypto.randomUUID(),baseEtag:null};
 const first=await api.upload(record,firstLease);assert.match(first.etag,/^"[a-f0-9]{32}"$/);
 assert.deepEqual((await api.download('project',record.id)).payload,payload,'real R2 preserves a multi-chunk project');
 assert.equal((await api.upload(record,firstLease)).etag,first.etag,'lost-response retry confirms the same commit');
 const second=await api.upload({...record,name:'Updated runtime project'},{writeId:crypto.randomUUID(),baseEtag:first.etag});
 await assert.rejects(api.upload({...record,name:'Stale edit'},{writeId:crypto.randomUUID(),baseEtag:first.etag}),error=>error.status===412);
 assert.equal((await api.manifest('project',record.id)).etag,second.etag);
 const bucket=await mf.getR2Bucket('PROJECTS');assert((await bucket.list({prefix:'owners/'+user.id+'/project/history/'+record.id+'/'})).objects.length>0,'R2 retains revision manifests');
 assert.equal((await api.list('project'))[0].name,'Updated runtime project');
 await api.upload({...record,deleted:true},{writeId:crypto.randomUUID(),baseEtag:second.etag});assert.equal((await api.list('project'))[0].deleted,true);
 const template=Transfer.createTemplate(payload,['settings'],{name:'Tour'});
 await api.upload({id:template.id,kind:'template',name:template.name,deleted:false,payload:template},{writeId:crypto.randomUUID(),baseEtag:null});
 assert.deepEqual((await api.download('template',template.id)).payload,template);
 assert.equal((await request('projects/'+record.id,{headers:{'Cf-Access-Jwt-Assertion':await token({sub:'different-subject'})}})).status,404);
 console.log('PASS: actual Workers runtime and R2 binding: signed identity, rejection, owner isolation, multi-chunk integrity, idempotent commits, conditional-write conflicts, revision history, listing, deletion and templates.');
 if(process.env.LAMPY_BROWSER_CHECK==='1')await (await import('./helpers/accounts-online-browser.mjs')).run({mf,jwt,api,user});
}finally{await mf.dispose();await rm(directory,{recursive:true,force:true})}
