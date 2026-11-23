/* Offline app shell only. Authentication and private project bytes are never cached. */
'use strict';
const PREFIX='lampy-paperwork-offline:'+new URL(self.registration.scope).pathname+':';
const MANIFEST_URL=new URL('offline-manifest.json',self.registration.scope).href;
const VERSION='60',CACHE=PREFIX+VERSION+':shell-1';
async function hash(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('')}
async function manifest(){const cache=await caches.open(CACHE),response=await cache.match(MANIFEST_URL);return response?response.json():null}
async function network(request){try{return await fetch(request)}catch{return new Response('This asset is not available offline.',{status:503,headers:{'Content-Type':'text/plain'}})}}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const response=await fetch(MANIFEST_URL,{cache:'no-store'});if(!response.ok)throw Error('Offline manifest unavailable');
 const data=await response.clone().json();if(data.version!==VERSION||!Array.isArray(data.assets)||data.assets.length>5000)throw Error('Offline manifest version mismatch');
 const cache=await caches.open(CACHE),queue=[...data.assets];
 try{
  await Promise.all(Array.from({length:6},async()=>{while(queue.length){const entry=queue.shift(),url=new URL(entry.url,self.registration.scope);if(url.origin!==self.location.origin||!/^[a-f0-9]{64}$/.test(entry.sha256))throw Error('Invalid offline asset');const asset=await fetch(url,{cache:'reload',credentials:'omit'});if(!asset.ok||await hash(await asset.clone().arrayBuffer())!==entry.sha256)throw Error('Offline asset verification failed: '+entry.url);await cache.put(url,asset)}}));
  await cache.put(MANIFEST_URL,response);
 }catch(error){await caches.delete(CACHE);throw error}
 // Do not skipWaiting: open editors keep their current release until they close.
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.includes('/account-api/')||url.pathname.endsWith('/app-version.json')||url.pathname.endsWith('/offline-manifest.json'))return;
 event.respondWith((async()=>{
  const data=await manifest();if(!data)return network(request);
  const scope=new URL(self.registration.scope),shared=new URL(data.sharedBase,scope),cache=await caches.open(CACHE);
  const navigation=request.mode==='navigate'&&url.pathname.startsWith(scope.pathname);
  if(navigation){try{return await fetch(request)}catch{const cached=await cache.match(new URL('offline-shell.txt',scope));if(cached)return new Response(await cached.arrayBuffer(),{headers:{'Content-Type':'text/html; charset=utf-8'}});return new Response('The offline app is not available yet.',{status:503,headers:{'Content-Type':'text/plain'}})}}
  const version=url.searchParams.get('v');if(version&&version!==VERSION)return network(request);
  const clean=new URL(url);clean.search='';clean.hash='';
  const listed=data.assets.some(entry=>new URL(entry.url,scope).href===clean.href);
  const sharedAsset=['json/','images/'].some(path=>clean.pathname.startsWith(new URL(path,shared).pathname));
  if(!listed&&!sharedAsset)return network(request);
  const cached=await cache.match(clean);if(cached)return cached;
  const response=await network(request);
  if(response.ok&&response.type!=='opaque')event.waitUntil(cache.put(clean,response.clone()).catch(()=>{}));
  return response;
 })());
});
