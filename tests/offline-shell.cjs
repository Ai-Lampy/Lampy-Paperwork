const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/sw.js'),'utf8');
async function scenario(tampered=false,scope='https://example.test/paperwork/'){
 const shell='<!doctype html><h1>Offline project</h1>',handlers={},buckets=new Map();
 const digest=Buffer.from(await webcrypto.subtle.digest('SHA-256',Buffer.from(shell))).toString('hex');
 const manifest={version:'61',sharedBase:'./',assets:[{url:'offline-shell.txt',sha256:digest}]};
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
async function welcomeWithOlderWorker(){
 const path=require('node:path'),root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const version=html.match(/const VERSION='([^']+)'/)[1],current=JSON.parse(fs.readFileSync(path.join(root,'info_txt/welcome_message.json'),'utf8'));
 const scope='https://example.test/paperwork/',welcomeUrl=scope+'info_txt/welcome_message.json';
 const stale={title:'Old welcome',paragraphs:['Old account announcement']},handlers={},requests=[];
 const entries=new Map([[scope+'offline-manifest.json',Response.json({version:'0.1',sharedBase:'./',assets:[{url:'info_txt/welcome_message.json'}]})],[welcomeUrl,Response.json(stale)]]);
 const caches={async open(){return {async match(key){return entries.get(String(key))?.clone()},async put(key,response){entries.set(String(key),response.clone())}}}};
 let offline=false;
 const self={registration:{scope},location:new URL(scope),addEventListener:(name,fn)=>handlers[name]=fn};
 vm.runInNewContext(source.replace("const VERSION='"+version+"'","const VERSION='0.1'"),{self,caches,URL,Response,crypto:webcrypto,fetch:async request=>{requests.push(request.url||String(request));if(offline)throw Error('Offline');return Response.json(current)}});
 async function fetchThroughWorker(url){let response;handlers.fetch({request:{url:String(url),method:'GET',mode:'cors'},respondWith:p=>response=p,waitUntil:()=>{}});return response}
 assert.deepEqual(await (await fetchThroughWorker(welcomeUrl)).json(),stale,'Unversioned request reproduces the stale welcome');
 const page=vm.createContext({VERSION:version,WELCOME_MESSAGE_URL:'info_txt/welcome_message.json',document:{baseURI:scope},location:new URL(scope),URL,console:{warn(){}},fetch:fetchThroughWorker});
 for(const name of ['repoBasePath','jsonCandidateUrls','fetchJSONWithFallback','fallbackWelcomeMessage','normaliseWelcomeMessage','loadWelcomeMessage']){
  const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);
  vm.runInContext(html.slice(start,html.indexOf('\n',start)),page);
 }
 assert.deepEqual(JSON.parse(JSON.stringify(await page.loadWelcomeMessage())),current,'New page must bypass the previous worker welcome cache');
 assert(requests.some(url=>new URL(url).searchParams.get('v')===version));
 offline=true;
 assert.deepEqual(JSON.parse(JSON.stringify(await page.loadWelcomeMessage())),current,'Offline update must use the current page fallback instead of stale guidance');
}
(async()=>{await scenario();await scenario(true);await welcomeWithOlderWorker();console.log('PASS: verified offline shell, tamper rejection, private API exclusion, and current welcome with an older active worker online/offline.')})().catch(error=>{console.error(error);process.exitCode=1});
