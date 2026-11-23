const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const source=fs.readFileSync(require('node:path').join(__dirname,'../sw.js'),'utf8');
async function scenario(tampered=false,scope='https://example.test/paperwork/'){
 const shell='<!doctype html><h1>Offline project</h1>',handlers={},buckets=new Map();
 const digest=Buffer.from(await webcrypto.subtle.digest('SHA-256',Buffer.from(shell))).toString('hex');
 const manifest={version:'60',sharedBase:'./',assets:[{url:'offline-shell.txt',sha256:digest}]};
 let offline=false;
 const caches={async open(name){if(!buckets.has(name))buckets.set(name,new Map());const data=buckets.get(name);return {async match(key){return data.get(String(key))?.clone()},async put(key,response){data.set(String(key),response.clone())}}},async delete(name){return buckets.delete(name)},async keys(){return [...buckets.keys()]}};
 const self={registration:{scope},location:new URL(scope),clients:{claim:async()=>{}},addEventListener:(name,fn)=>handlers[name]=fn};
 vm.runInNewContext(source,{self,caches,URL,Response,crypto:webcrypto,fetch:async input=>{if(offline)throw Error('Offline');const url=String(input.url||input);if(url.endsWith('offline-manifest.json'))return Response.json(manifest);if(url.endsWith('offline-shell.txt'))return new Response(tampered?shell+'injected':shell,{headers:{'Content-Type':'text/plain'}});throw Error('Unexpected network URL: '+url)}});
 let install;handlers.install({waitUntil:p=>install=p});
 if(tampered){await assert.rejects(install,/verification failed/);assert.equal(buckets.size,0);return}
 await install;offline=true;
 let result;handlers.fetch({request:{url:scope+'?project=test',method:'GET',mode:'navigate'},respondWith:p=>result=p,waitUntil:()=>{}});
 const response=await result;assert.equal(response.headers.get('Content-Type'),'text/html; charset=utf-8');assert.equal(await response.text(),shell);
 result=null;handlers.fetch({request:{url:'https://api.example.test/account-api/projects',method:'GET',mode:'cors'},respondWith:p=>result=p});assert.equal(result,null,'private API must stay outside the shell cache');
}
(async()=>{await scenario();await scenario(true);console.log('PASS: verified plain-text shell renders as HTML offline; modified shell rejected; private API excluded.')})().catch(error=>{console.error(error);process.exitCode=1});
